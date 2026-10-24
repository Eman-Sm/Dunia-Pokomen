import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
process.env.IG_ACCESS_TOKEN = 'tok';
process.env.IG_USERNAME = 'duniapokomen';
const follow = { 'ID-budi': true, 'ID-cici': false };
globalThis.fetch = async (url) => {
  const u = String(url);
  for (const id of Object.keys(follow)) if (u.includes('/' + id + '?')) return new Response(JSON.stringify({ id, is_user_follow_business: follow[id] }));
  return new Response(JSON.stringify({ error: { message: 'no consent', code: 230 } }), { status: 400 });
};
const { processComment, matikan, hidupkan } = await import('../lib/rules.js');
const { cekUnfollowOtomatis, parseFollowers, bandingkanFollowers } = await import('../lib/unfollow.js');
const { getJSON, redis } = await import('../lib/db.js');
await redis('SET', 'tier_schema', '6');

const born = async (id, u, uid, nama) => processComment({ id, username: u, userId: uid, text: `Nama: ${nama} | Hewan: Kucing | Cerita: suka tidur`, mediaId: 'p1' });

test('igsid disimpan saat lahir dan dicek otomatis: hanya yang jelas unfollow yang mati', async () => {
  assert.equal(await born('a1', 'budi', 'ID-budi', 'Budi'), 'lahir');
  assert.equal(await born('a2', 'cici', 'ID-cici', 'Cici'), 'lahir');
  assert.equal(await born('a3', 'dodo', 'ID-dodo', 'Dodo'), 'lahir');
  assert.equal((await getJSON('warga', 'cici')).igsid, 'ID-cici');
  const r = await cekUnfollowOtomatis({ limit: 10 });
  assert.deepEqual(r.unfollow, ['cici']);
  assert.equal(r.tidakBisaDicek, 1);           // dodo: Instagram did not answer -> stays alive
  assert.ok((await getJSON('warga', 'cici')).mati);
  assert.equal((await getJSON('warga', 'dodo')).mati, null);
  assert.equal((await getJSON('warga', 'budi')).mati, null);
});

test('hewan mati mengabaikan cerita, tapi pemilik bisa mendaftar hewan baru', async () => {
  const r = await processComment({ id: 'a4', username: 'cici', text: 'Cerita: Cici menari di bawah hujan setiap sore', mediaId: 'p2' });
  assert.equal(r, 'skip:mati');
  assert.equal(await born('a5', 'cici', 'ID-cici', 'Cici Dua'), 'lahir');
  const w = await getJSON('warga', 'cici');
  assert.equal(w.nama, 'Cici Dua'); assert.equal(w.mati, null); assert.equal(w.tier, 0);
  const graves = await redis('HGETALL', 'makam');
  assert.ok(graves && Object.keys(graves).length >= 1);
});

test('admin bisa mematikan dan menghidupkan; gelar ikut kembali', async () => {
  const w = await getJSON('warga', 'budi'); w.gelar = 'Ketua Koloni';
  const { setJSON } = await import('../lib/db.js'); await setJSON('warga', 'budi', w);
  await matikan('budi');
  assert.equal((await getJSON('warga', 'budi')).gelar, null);
  await hidupkan('budi');
  const b = await getJSON('warga', 'budi');
  assert.equal(b.mati, null); assert.equal(b.gelar, 'Ketua Koloni');
});

test('daftar followers dari unduhan Instagram (JSON & HTML)', async () => {
  const json = JSON.stringify([{ string_list_data: [{ href: 'https://www.instagram.com/budi', value: 'budi' }] }, { string_list_data: [{ value: 'x1' }] },
    { string_list_data: [{ value: 'x2' }] }, { string_list_data: [{ value: 'x3' }] }, { string_list_data: [{ value: 'x4' }] }]);
  assert.deepEqual(parseFollowers(json).sort(), ['budi', 'x1', 'x2', 'x3', 'x4']);
  const html = '<a href="https://www.instagram.com/budi">budi</a><a href="https://www.instagram.com/_u/x9">x9</a>';
  assert.deepEqual(parseFollowers(html).sort(), ['budi', 'x9']);
  const r = await bandingkanFollowers(parseFollowers(json));
  assert.deepEqual(r.bukanFollower.map((x) => x.username).sort(), ['cici', 'dodo']);
});
