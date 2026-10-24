import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
process.env.POKOMEN_MEMORY_DB = '1';
process.env.IG_APP_SECRET = 'rahasia';
process.env.IG_USERNAME = 'duniapokomen';
process.env.IG_WEBHOOK_VERIFY_TOKEN = 'verif';
process.env.ADMIN_PASSWORD = 'admin123';
const { processComment } = await import('../lib/rules.js');
const { getJSON } = await import('../lib/db.js');
const webhook = await import('../api/webhook.js');
const dunia = await import('../api/dunia.js');
const admin = await import('../api/admin.js');

test('lahir, evolusi, anti-spam, legenda', async () => {
  const c = (id, u, text, mediaId) => ({ id, username: u, text, mediaId, timestamp: new Date().toISOString() });
  assert.equal(await processComment(c('1', 'budi', 'Nama: Bolu | Hewan: Kucing + Naga | Cerita: suka menghangatkan air mandi warga', 'post1')), 'lahir');
  assert.equal(await processComment(c('1', 'budi', 'Nama: Bolu | Hewan: Kucing + Naga', 'post1')), 'skip:seen');
  // story on the same post as birth does not evolve
  assert.equal(await processComment(c('2', 'budi', 'Cerita: Bolu suka tidur di atas awan', 'post1')), 'cerita');
  // story on a new post -> Evolusi 1
  assert.equal(await processComment(c('3', 'budi', 'Cerita: Bolu belajar berenang di danau barat', 'post2')), 'evolusi');
  // second story on the same post -> no extra evolution
  assert.equal(await processComment(c('4', 'budi', 'Cerita: Bolu menangkap ikan pakai ekornya', 'post2')), 'cerita');
  assert.equal(await processComment(c('5', 'budi', 'Cerita: Bolu menolong anak ayam yang tersesat', 'post3')), 'evolusi');
  // max auto tier reached (2)
  assert.equal(await processComment(c('6', 'budi', 'Cerita: Bolu menjaga gerbang desa sepanjang malam', 'post4')), 'cerita');
  assert.equal((await getJSON('warga', 'budi')).tier, 2);
  // own comments ignored, unknown text goes to pending
  assert.equal(await processComment(c('7', 'duniapokomen', 'Nama: X | Hewan: A + B', 'post1'), { ownUsername: 'duniapokomen' }), 'skip:own');
  assert.equal(await processComment(c('8', 'sari', 'aku mau ikut dong min, jadi apa ya', 'post1')), 'pending');
  // facility suggestion with likes
  assert.equal(await processComment({ ...c('9', 'rina', 'Usul: kolam minum', 'post1'), likeCount: 12 }), 'usul');
});

test('webhook: verifikasi & tanda tangan', async () => {
  const g = await webhook.GET(new Request('https://x/api/webhook?hub.mode=subscribe&hub.verify_token=verif&hub.challenge=abc'));
  assert.equal(await g.text(), 'abc');
  const body = JSON.stringify({ object: 'instagram', entry: [{ id: '1', time: 1761300000, changes: [{ field: 'comments', value: {
    id: 'w1', text: 'Namaku Piyo, ayam + naga. Dia suka tidur di atap Balai Warga', from: { id: '9', username: 'ani' }, media: { id: 'post5', media_product_type: 'REELS' } } }] }] });
  const bad = await webhook.POST(new Request('https://x/api/webhook', { method: 'POST', body, headers: { 'x-hub-signature-256': 'sha256=00' } }));
  assert.equal(bad.status, 401);
  const sig = 'sha256=' + crypto.createHmac('sha256', 'rahasia').update(body).digest('hex');
  const ok = await webhook.POST(new Request('https://x/api/webhook', { method: 'POST', body, headers: { 'x-hub-signature-256': sig } }));
  assert.deepEqual((await ok.json()).results, ['lahir']);
});

test('api publik & admin', async () => {
  const d = await (await dunia.GET()).json();
  assert.equal(d.jumlahWarga, 2);
  assert.equal(d.warga[0].nama, 'Bolu');
  assert.equal(d.usulan[0].text, 'Kolam Minum');
  const call = (body, pw = 'admin123') => admin.POST(new Request('https://x/api/admin', { method: 'POST', body: JSON.stringify(body), headers: { authorization: 'Bearer ' + pw } }));
  assert.equal((await call({ action: 'status' }, 'salah')).status, 401);
  const r = await (await call({ action: 'update_warga', username: 'budi', patch: { tier: 3 } })).json();
  assert.equal(r.data.tier, 3);
  const add = await (await call({ action: 'add_warga', username: '@tiktok_user', nama: 'Kiko', hewan: 'Rubah + Ikan' })).json();
  assert.deepEqual(add.data.hewan, ['Rubah', 'Ikan']);
  const d2 = await (await dunia.GET()).json();
  assert.equal(d2.jumlahWarga, 3);
  assert.ok(d2.log.some((l) => l.type === 'legenda'));
});
