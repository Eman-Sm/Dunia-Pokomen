import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
process.env.IG_ACCESS_TOKEN = 'tok';
process.env.IG_USERNAME = 'duniapokomen';
const replies = [];
globalThis.fetch = async (url, opt = {}) => {
  const u = new URL(String(url));
  if (u.pathname.endsWith('/replies')) { replies.push({ id: u.pathname.split('/').slice(-2)[0], msg: u.searchParams.get('message') }); return new Response('{"id":"r"}'); }
  return new Response(JSON.stringify({ error: { message: 'x', code: 1 } }), { status: 400 });
};
const { processComment } = await import('../lib/rules.js');
const { redis } = await import('../lib/db.js');
await redis('SET', 'tier_schema', '6'); await redis('SET', 'evolusi_cerita_1', '1');
const now = () => new Date().toISOString();
const c = (id, username, text, extra = {}) => ({ id, username, text, mediaId: 'M1', timestamp: now(), ...extra });

test('komentar tidak sesuai format dibalas dengan format yang benar, sekali per akun per postingan', async () => {
  await processComment(c('1', 'andi', 'mau ikut dong min'));
  assert.equal(replies.length, 1);
  assert.match(replies[0].msg, /^@andi /);
  assert.match(replies[0].msg, /Nama: .*\| Hewan: .*\| Cerita:/);
  await processComment(c('2', 'andi', 'gimana caranya?'));
  assert.equal(replies.length, 1);
  await processComment(c('3', 'andi', 'halo lagi', { mediaId: 'M2' }));
  assert.equal(replies.length, 2);
});

test('yang tidak dibalas: emoji, tag teman, balasan, komentar lama, pendaftaran benar', async () => {
  await processComment(c('10', 'b1', '🔥🔥🔥'));
  await processComment(c('11', 'b2', '@temanku @temanlain'));
  await processComment(c('12', 'b3', 'keren banget', { parentId: '99' }));
  await processComment(c('13', 'b4', 'keren banget', { timestamp: '2026-01-01T00:00:00Z' }));
  await processComment(c('14', 'b5', 'Nama: Bolu | Hewan: Kucing + Naga'));
  await processComment(c('15', 'duniapokomen', 'terima kasih semua'), { ownUsername: 'duniapokomen' });
  assert.equal(replies.length, 2);
});

test('format sebagian: nama tanpa hewan dibalas khusus', async () => {
  await processComment(c('20', 'cici', 'Nama: Mochi'));
  assert.match(replies.at(-1).msg, /Mochi hampir lahir/);
});
