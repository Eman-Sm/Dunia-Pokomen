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
  const r2 = await E.beli('pega', { item: 'latihan', stat: 'nyawa' }); assert.equal(r2.naik, 10); assert.equal(r2.saldo, 12); // latihan 3 Biji
  await assert.rejects(E.beli('pega', { item: 'batu' }), /kurang/);
  assert.equal((await getJSON('warga', 'pega')).batu, 1);
  await E.bonusBiji('pega', 35);
  const r3 = await E.beli('pega', { item: 'nama', nilai: 'Pegasus' }); assert.equal(r3.saldo, 12);
  assert.equal((await getJSON('warga', 'pega')).nama, 'Pegasus');
});

test('Arena: jam buka, tantang, terima, duel, liga & juara musim', async () => {
  await add('kuat', 'Kuat', 3, 1); await add('lemah', 'Lemah', 2, 2);
  { const w = await getJSON('warga', 'kuat'); w.latih = { nyawa: 400, serang: 60, tahan: 60, cepat: 60 }; await setJSON('warga', 'kuat', w); }
  // tingkat terlalu jauh (Mythical vs Regular) ditolak
  await add('kecil', 'Kecil', 0, 3);
  await assert.rejects(A.tantang('kecil', 'Kuat', { now: SIANG }), /terlalu jauh tingkatnya/);
  await assert.rejects(A.tantang('kuat', 'Kecil', { now: SIANG }), /terlalu jauh tingkatnya/);
  await assert.rejects(A.tantang('lemah', 'Kuat', { now: MALAM }), /buka pukul/);
  const t = await A.tantang('lemah', 'Kuat', { now: SIANG });
  assert.equal(t.ke, 'kuat');
  await assert.rejects(A.tantang('lemah', 'Kuat', { now: SIANG + 1000 }), /sudah bertemu/);
  const d = await A.terima('kuat', '', { now: SIANG + 60000 });
  assert.equal(d.menang, 'kuat'); assert.ok(d.catatan.length >= 1);
  // replay is deterministic
  assert.deepEqual(A.simulasi(await getJSON('warga', 'lemah'), await getJSON('warga', 'kuat'), t.id).menang, d.menang);
  const D = (n) => new Date(SIANG + 7 * 36e5 + n * 864e5).toISOString().slice(0, 10); // tanggal WIB hari ke-n (D(0) = Senin 2 Nov)
  // musim: Musim 1 = 31 Okt – 8 Nov, lalu Senin–Minggu
  assert.equal(A.musimDari(SIANG).id, 'M1');
  assert.deepEqual(A.musimDari(SIANG + 7 * 864e5), { id: 'M2', nama: 'Musim 2', mulai: '2026-11-09', akhir: '2026-11-15' });
  let k = await A.klasemenLiga(A.musimDari(SIANG));
  assert.equal(k[0].u, 'kuat'); assert.equal(k[0].poin, 1); assert.equal(k[1].u, 'lemah'); assert.equal(k[1].poin, 0); // kalah −1, tapi poin terendah 0
  // diterima besok pagi → poin tetap pada hari tantangan
  const t2 = await A.tantang('lemah', 'Kuat', { now: SIANG + 864e5 });
  assert.equal(Date.parse(t2.sampai) - SIANG - 864e5, 12 * 36e5);
  const d1 = await A.terima('kuat', '', { now: SIANG + 864e5 + 9 * 36e5 });
  assert.equal(d1.tHitung, t2.t);
  assert.deepEqual((await getJSON('arena_poin', 'kuat')).ev.at(-1).slice(0, 2), [D(1), 1]);
  // menolak = kalah −2 (sudah bertanding di musim ini)
  await add('c10', 'Dahan', 2, 12);
  const t3 = await A.tantang('c10', 'Kuat', { now: SIANG + 864e5 + 1000 });
  const tl = await A.tolak('kuat', t3.id, { now: SIANG + 864e5 + 2000 });
  assert.equal(tl.hukuman.poin, 1); // 2 menang − 1
  // tidak dijawab 12 jam: tanpa hukuman bagi yang belum bertanding di musim ini; −2 bagi yang sudah
  await add('c11', 'Ranting', 2, 13);
  await A.tantang('kuat', 'Ranting', { now: SIANG + 864e5 + 3000 });
  assert.deepEqual(await A.sapuTantangan({ now: SIANG + 864e5 + 3000 + 12 * 36e5 + 1 }), []);
  await add('c12', 'Akar', 2, 14);
  await A.tantang('c12', 'Lemah', { now: SIANG + 864e5 + 4000 });
  const sw = await A.sapuTantangan({ now: SIANG + 864e5 + 4000 + 12 * 36e5 + 1 });
  assert.equal(sw[0].u, 'lemah'); assert.equal(sw[0].poin, 0);
  const rw = await A.riwayatDuel({ id: 'x', t: new Date(SIANG + 3 * 864e5).toISOString(), a: 'lemah', b: 'c12' });
  assert.equal(rw.lemah.daftar[0].menang, 0); assert.equal(rw.c12.main, 0);
  k = await A.klasemenLiga(A.musimDari(SIANG));
  const L = k.find((x) => x.u === 'lemah'); assert.equal(L.kalah, 2); assert.equal(L.wo, 1);
  await A.tantang('c11', 'Kuat', { now: SIANG + 2 * 864e5 }); assert.equal((await A.terima('kuat', '', { now: SIANG + 2 * 864e5 + 1000 })).menang, 'kuat');
  // juara musim: Senin 9 Nov 09.00 WIB, sekali saja
  assert.deepEqual(await A.cekJuara({ now: Date.parse('2026-11-09T08:00:00+07:00') }), []);
  const j = await A.cekJuara({ now: Date.parse('2026-11-09T09:01:00+07:00') });
  assert.deepEqual(j.map((x) => x.u), ['kuat']); assert.equal((await getJSON('warga', 'kuat')).batu, 1);
  assert.deepEqual(await A.cekJuara({ now: Date.parse('2026-11-09T10:00:00+07:00') }), []);
  // poin sama → head to head menentukan (meski lawannya menang lebih banyak)
  const M3 = A.musimDari(Date.parse('2026-11-17T10:00:00+07:00'));
  const ev = (u, list) => setJSON('arena_poin', u, { ev: list.map(([d, x, id]) => [d, x, id]) });
  await ev('hA', [['2026-11-17', 1, '1795400000001']]); // A mengalahkan B
  await ev('hB', [['2026-11-17', -1, '1795400000001'], ['2026-11-18', 1, '1795500000001'], ['2026-11-18', 1, '1795500000002'], ['2026-11-19', -1, '1795600000001']]);
  await redis('LPUSH', 'arena_duel', JSON.stringify({ id: '1795400000001', t: '2026-11-17T05:00:00.000Z', a: 'hA', b: 'hB', namaA: 'A', namaB: 'B', menang: 'hA', catatan: [] }));
  const k3 = await A.klasemenLiga(M3);
  assert.deepEqual(k3.map((x) => [x.u, x.poin, x.menang]), [['hA', 1, 1], ['hB', 1, 2]]);
  assert.equal(A.poinMusim([['2026-11-17', -1, '1'], ['2026-11-17', 1, '2'], ['2026-11-17', -1, '3'], ['2026-11-17', -1, '4']], M3), 0);
  // musim baru mulai dari nol
  assert.deepEqual(await A.klasemenLiga(A.musimDari(Date.parse('2026-11-10T10:00:00+07:00'))), []);
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
