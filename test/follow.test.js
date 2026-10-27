import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
process.env.REQUIRE_FOLLOW = '1';
process.env.IG_ACCESS_TOKEN = 'tok';
process.env.IG_USERNAME = 'duniapokomen';
const sent = [];
let follows = false;
globalThis.fetch = async (url, opt = {}) => {
  const u = String(url);
  if (u.includes('/me/messages')) {
    const body = JSON.parse(opt.body); sent.push(body);
    return new Response(JSON.stringify({ recipient_id: body.recipient.comment_id ? 'IGSID-ani' : body.recipient.id, message_id: 'm' + sent.length }));
  }
  if (u.includes('/IGSID-ani')) return new Response(JSON.stringify({ id: 'IGSID-ani', username: 'ani', is_user_follow_business: follows }));
  return new Response(JSON.stringify({ error: { message: 'unexpected ' + u } }), { status: 400 });
};
const { processComment, handleDM } = await import('../lib/rules.js');
const { getJSON, redis: _r } = await import('../lib/db.js');
await _r('SET', 'tier_schema', '6');

test('wajib follow: komentar → DM → cek follow → lahir', async () => {
  const r = await processComment({ id: 'c1', username: 'ani', userId: 'IGSID-ani', text: 'Nama: Piyo | Hewan: Ayam + Naga | Cerita: suka tidur di atap', mediaId: 'p1' });
  assert.equal(r, 'menunggu');
  assert.equal(await getJSON('warga', 'ani'), null);
  assert.equal(sent[0].recipient.comment_id, 'c1');
  assert.match(sent[0].message.text, /LAHIR/);
  // replies but does not follow yet
  assert.equal(await handleDM('IGSID-ani'), 'belum-follow');
  assert.match(sent.at(-1).message.text, /belum follow/);
  assert.equal(await getJSON('warga', 'ani'), null);
  // follows, replies again
  follows = true;
  assert.equal(await handleDM('IGSID-ani'), 'lahir');
  assert.equal((await getJSON('warga', 'ani')).nama, 'Piyo');
  assert.equal(await getJSON('menunggu', 'ani'), null);
  assert.match(sent.at(-1).message.text, /Selamat/);
  // a second DM after birth
  assert.match(await handleDM('IGSID-ani'), /^sudah-lahir/);
  assert.equal(await handleDM('IGSID-ani'), 'sudah-lahir:diam'); // only told once
});
