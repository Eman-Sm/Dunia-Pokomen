import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
const { newWarga } = await import('../lib/rules.js');
const { setJSON, getJSON, redis } = await import('../lib/db.js');
const LW = await import('../lib/ligawil.js');
const T = (s) => Date.parse(s + '+07:00');
// 2 warga per wilayah
for (let n = 1; n <= 6; n++) for (let k = 0; k < 2; k++) await setJSON('warga', `w${n}${k}`, newWarga({ username: `w${n}${k}`, nama: `H${n}${k}`, hewan: ['Kucing'], spot: (n - 1) * 50 + k }));

test('tahap & jadwal', () => {
  assert.equal(LW.tahap(T('2026-11-12T10:00:00')).kode, 'belum');
  assert.equal(LW.tahap(T('2026-11-14T10:00:00')).kode, 'pemanasan');
  assert.equal(LW.tahap(T('2026-11-16T10:00:00')).kode, 'liga');
  assert.equal(LW.tahap(T('2026-11-21T10:00:00')).kode, 'semifinal');
  assert.equal(LW.tahap(T('2026-11-22T10:00:00')).kode, 'final');
  assert.equal(LW.tahap(T('2026-11-23T10:00:00')).kode, 'selesai');
  const all = LW.JADWAL.flat().map((p) => p.slice().sort().join('-')); assert.equal(new Set(all).size, 15);
});

test('hadir: pemanasan membangun beruntun, poin naik di hari laga', async () => {
  let r = await LW.hadir('w10', T('2026-11-14T09:00:00')); assert.equal(r.poin, 0); assert.equal(r.streak, 1);
  r = await LW.hadir('w10', T('2026-11-15T09:00:00')); assert.equal(r.streak, 2);
  r = await LW.hadir('w10', T('2026-11-16T09:00:00')); assert.equal(r.streak, 3); assert.equal(r.poin, 2);
  r = await LW.hadir('w10', T('2026-11-16T15:00:00')); assert.equal(r.sudah, true);
});

test('latihan & sorak dibatasi, duel hanya vs lawan hari itu', async () => {
  const t = T('2026-11-16T10:00:00');
  for (let i = 0; i < 5; i++) await LW.catatLatihan('w11', t);
  for (let i = 0; i < 5; i++) await LW.catatSorak('w11', t);
  assert.equal(await LW.catatDuel('w10', 'w20', 'w10', t), null); // W1 vs W2 bukan laga hari 1 (W1 vs W6)
  assert.deepEqual(await LW.catatDuel('w10', 'w60', 'w10', t), { menang: 'w10', kalah: 'w60' });
  await LW.catatKopi('w60', 2, t, 6);
  const { S } = await LW.skorHari('2026-11-16', t);
  assert.equal(S[1].orang.find((o) => o.u === 'w11').poin, 9); // latihan 6 + sorak 3
  assert.equal(S[1].orang.find((o) => o.u === 'w10').poin, 7); // hadir 2 + menang 5
  assert.equal(S[6].kopi, 20); assert.equal(S[6].buff, true);
  assert.equal(S[1].skor, 16); assert.equal(S[6].skor, Math.round((1 + 20) * 1.05));
});

test('ketua: jagoan wilayah sendiri & duel jagoan 20.00', async () => {
  await assert.rejects(() => LW.aturKetua({ u: 'w10', wil: 1, jagoan: 'w20' }, T('2026-11-17T09:00:00')), /wilayahmu/);
  const r = await LW.aturKetua({ u: 'w10', wil: 1, jagoan: 'w11', taktik: 'serbu' }, T('2026-11-17T09:00:00'));
  assert.equal(r.hari, '2026-11-17');
  const { S } = await LW.skorHari('2026-11-17', T('2026-11-17T20:30:00'));
  assert.ok(S[1].jagoan); assert.equal(S[1].jagoan.a === 'w11' || S[1].jagoan.b === 'w11', true);
});

test('klasemen, semifinal, final, hadiah', async () => {
  const bonus = []; const umum = [];
  // hari 1..5 sudah ada skor di hari 1; sisanya 0-0 (seri / menang aktif)
  const k = await LW.klasemen('2026-11-20', T('2026-11-23T10:00:00'));
  assert.equal(k.length, 6); assert.equal(k[0].main, 5);
  const semi = await LW.laga('2026-11-21'); assert.equal(semi.length, 2);
  const J = await LW.sapu({ umumkan: async (t) => umum.push(t), bonus: async (u, n) => bonus.push([u, n]), now: T('2026-11-23T10:00:00') });
  assert.ok(J && J.juara1); assert.ok(umum.some((t) => /JUARA/.test(t)));
  assert.ok(umum.some((t) => /Hari 1/.test(t)));
  const lagi = await LW.sapu({ umumkan: async (t) => umum.push(t), now: T('2026-11-23T11:00:00') }); assert.equal(lagi, null);
});
