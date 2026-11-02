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

test('2 Nov: ajakan bergabung langsung dibuatkan hewannya (nama = username), dibalas sekali', async () => {
  assert.equal(await processComment(c('1', 'andi', 'mau ikut dong min')), 'lahir:otomatis');
  assert.equal(replies.length, 1);
  assert.match(replies[0].msg, /^@andi /);
  assert.match(replies[0].msg, /LAHIR/);
  assert.match(replies[0].msg, /Nama: nama baru/);
  await processComment(c('2', 'andi', 'gimana cara daftarnya?'));
  assert.equal(replies.length, 1); // sudah jadi warga
  assert.equal(await processComment(c('3', 'dodi', 'aku mau kucing naga', { mediaId: 'M2' })), 'lahir:otomatis');
  assert.match(replies.at(-1).msg, /Kucing \+ Naga/);
});

test('yang tidak dibalas: emoji, tag teman, balasan obrolan, komentar lama, pendaftaran benar', async () => {
  const n = replies.length;
  await processComment(c('10', 'b1', '🔥🔥🔥'));
  await processComment(c('11', 'b2', '@temanku @temanlain'));
  await processComment(c('12', 'b3', 'keren banget', { parentId: '99' }));
  await processComment(c('13', 'b4', 'keren banget', { timestamp: '2026-01-01T00:00:00Z' }));
  await processComment(c('14', 'b5', 'Nama: Bolu | Hewan: Kucing + Naga'));
  await processComment(c('15', 'duniapokomen', 'terima kasih semua'), { ownUsername: 'duniapokomen' });
  assert.equal(replies.length, n);
});

test('nama tanpa hewan: hewannya dipilihkan, nama tetap pilihan sendiri', async () => {
  assert.equal(await processComment(c('20', 'cici', 'Nama: Mochi')), 'lahir:otomatis');
  assert.match(replies.at(-1).msg, /Mochi si .+ \+ /);
  assert.doesNotMatch(replies.at(-1).msg, /Nama: nama baru/);
});

test('komentar interaksi tidak dibalas format', async () => {
  const { niatKomentar } = await import('../lib/niat.js');
  const n = replies.length;
  for (const [i, t] of ['lucu banget pega nya', 'wkwk kasian ray', 'semangat min!', 'kapan hari ke-3?', 'Lulu cantik bgt', 'keren animasinya'].entries()) {
    assert.equal(niatKomentar(t), 'interaksi', t);
    assert.equal(await processComment(c('i' + i, 'fan' + i, t)), 'skip:interaksi');
  }
  assert.equal(replies.length, n);
  for (const t of ['min aku mau daftar', 'gimana caranya biar punya hewan?', 'kucingku namanya Mochi', 'boleh ikut ga', 'naga + singa', 'pengen punya hewan juga', 'hewanku belum lahir min']) assert.equal(niatKomentar(t), 'daftar', t);
});
