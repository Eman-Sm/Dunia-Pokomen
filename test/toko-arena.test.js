import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
globalThis.fetch = async () => new Response('{}');
const { processComment, newWarga } = await import('../lib/rules.js');
const { getJSON, setJSON, redis } = await import('../lib/db.js');
const S = await import('../lib/statistik.js');
const E = await import('../lib/ekonomi.js');
const A = await import('../lib/arena.js');
await redis('SET', 'tier_schema', '6'); await redis('SET', 'evolusi_cerita_1', 'selesai');
const add = async (u, nama, tier, spot) => { const w = newWarga({ username: u, nama, hewan: ['Naga'], spot }); w.tier = tier; await setJSON('warga', u, w); return w; };
const SIANG = Date.parse('2026-11-02T10:00:00+07:00'), MALAM = Date.parse('2026-11-02T22:00:00+07:00');

test('statistik setara per tingkat, latihan naik & ada batasnya', () => {
  const a = { tier: 0, nama: 'A' }, b = { tier: 0, nama: 'B' }, m = { tier: 3, nama: 'M' };
  assert.deepEqual(S.statistik(a), S.statistik(b));
  assert.deepEqual(S.statistik(a), { nyawa: 100, serang: 20, tahan: 20, cepat: 20 });
  assert.equal(S.statistik(m).serang, 35);
  const r = S.latihSekali(a, 'serang'); assert.equal(r.naik, 2); assert.equal(S.statistik(a).serang, 22);
  for (let i = 0; i < 3; i++) S.latihSekali(a, 'cepat');
  const sup = S.latihSekali(a, 'serang'); assert.equal(sup.superSesi, true); assert.equal(sup.naik, 4); // sesi ke-5
  assert.throws(() => { for (let i = 0; i < 20; i++) S.latihSekali(a, 'serang'); }, /maksimal/);
  assert.equal(S.statistik(a).serang, 30); // Regular: +10
});

test('Toko: saldo dari kopi, beli batu & latihan, saldo kurang ditolak', async () => {
  await add('pega', 'Pega', 3, 0);
  await redis('LPUSH', 'dukungan', JSON.stringify({ nama: 'pega', jumlah: 6, t: '2026-10-28T11:00:00Z' }));
  await assert.rejects(E.beli('pega', { item: 'batu' }), /belum buka/);
  await redis('SET', 'evo_batu', '1');
  assert.equal((await E.saldo('pega')).biji, 30);
  const r1 = await E.beli('pega', { item: 'batu' }); assert.equal(r1.batu, 1); assert.equal(r1.saldo, 15);
  const r2 = await E.beli('pega', { item: 'latihan', stat: 'nyawa' }); assert.equal(r2.naik, 10); assert.equal(r2.saldo, 5);
  await assert.rejects(E.beli('pega', { item: 'batu' }), /kurang/);
  assert.equal((await getJSON('warga', 'pega')).batu, 1);
  await E.bonusBiji('pega', 35);
  const r3 = await E.beli('pega', { item: 'nama', nilai: 'Pegasus' }); assert.equal(r3.saldo, 5);
  assert.equal((await getJSON('warga', 'pega')).nama, 'Pegasus');
});

test('Arena: jam buka, tantang, terima, duel, juara mingguan dapat batu', async () => {
  await add('kuat', 'Kuat', 3, 1); await add('lemah', 'Lemah', 0, 2);
  await assert.rejects(A.tantang('lemah', 'Kuat', { now: MALAM }), /buka pukul/);
  const t = await A.tantang('lemah', 'Kuat', { now: SIANG });
  assert.equal(t.ke, 'kuat');
  await assert.rejects(A.tantang('lemah', 'Kuat', { now: SIANG + 1000 }), /sudah bertemu/);
  const d = await A.terima('kuat', '', { now: SIANG + 60000 });
  assert.equal(d.menang, 'kuat'); assert.ok(d.catatan.length >= 2);
  const k = await A.klasemen(A.mingguKe(SIANG)); assert.equal(k[0].u, 'kuat'); assert.equal(k[0].menang, 1);
  // replay is deterministic
  assert.deepEqual(A.simulasi(await getJSON('warga', 'lemah'), await getJSON('warga', 'kuat'), t.id).menang, d.menang);
  const j = await A.tetapkanJuaraMinggu({ now: A.tutupMinggu(A.mingguKe(SIANG)) + 60000 });
  assert.equal(j[0].u, 'kuat'); assert.equal((await getJSON('warga', 'kuat')).batu, 1);
  assert.deepEqual(await A.tetapkanJuaraMinggu({ now: A.tutupMinggu(A.mingguKe(SIANG)) + 120000 }), []);
});

test('Arena lewat komentar', async () => {
  await add('c1', 'Cimo', 1, 3); await add('c2', 'Bolu', 1, 4);
  const realNow = Date.now; Date.now = () => SIANG + 5 * 36e5;
  try {
    const k = (u, text, id) => processComment({ id, username: u, text, mediaId: 'p7', timestamp: new Date(Date.now()).toISOString() });
    assert.equal(await k('c1', 'Tantang: Bolu', 'a1'), 'arena:tantang');
    assert.equal(await k('c2', 'Terima: Cimo', 'a2'), 'arena:duel');
    assert.equal(await k('c2', 'Terima: Cimo', 'a3'), 'arena:gagal');
  } finally { Date.now = realNow; }
});

test('replay tersimpan & prompt Google Flow', async () => {
  const { promptFlow } = await import('../lib/flowprompt.js');
  const d = (await A.duelTerbaru(5))[0];
  assert.ok(d.gerak.length >= 2); assert.equal(d.gerak.at(-1).hp.includes(0), true);
  assert.equal((await A.cariDuel(d.id)).id, d.id);
  const a = { ...(await getJSON('warga', d.a)), hewan: ['Naga Hitam', 'Singa'], elemen: 'Api' }, b = await getJSON('warga', d.b);
  const p = promptFlow(d, a, b, { rasio: '16:9' });
  assert.match(p, /black dragon and lion hybrid/); assert.match(p, /fire aura/); assert.match(p, /widescreen 16:9/); assert.match(p, /KLIP 1/); assert.match(p, /MENANG/);
});
