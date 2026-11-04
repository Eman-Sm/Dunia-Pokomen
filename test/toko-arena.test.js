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
// 2 Nov: duel dimulai 5 menit setelah diterima; tanpa ada yang main → tap rata-rata saat waktu habis
const terimaOto = async (u, id, now) => { const r = await A.terima(u, id, { now }); const sw = await A.sapuSesi({ now: Date.parse(r.setup.batas) + 1 }); return sw.find((d) => d.id === r.setup.id); };
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
  const d = await terimaOto('kuat', '', SIANG + 60000);
  assert.equal(d.menang, 'kuat'); assert.ok(d.catatan.length >= 1);
  // replay is deterministic
  assert.deepEqual(A.simulasi(await getJSON('warga', 'lemah'), await getJSON('warga', 'kuat'), t.id).menang, d.menang);
  const D = (n) => new Date(SIANG + 7 * 36e5 + n * 864e5).toISOString().slice(0, 10); // tanggal WIB hari ke-n (D(0) = Senin 2 Nov)
  // musim: Musim 1 = 31 Okt – 8 Nov, lalu Senin–Minggu
  assert.equal(A.musimDari(SIANG).id, 'M1');
  assert.deepEqual(A.musimDari(SIANG + 7 * 864e5), { id: 'M2', nama: 'Musim 2', mulai: '2026-11-09', akhir: '2026-11-15' });
  let k = await A.klasemenLiga(A.musimDari(SIANG));
  assert.equal(k[0].u, 'kuat'); assert.equal(k[0].poin, 1); assert.equal(k[1].u, 'lemah'); assert.equal(k[1].poin, 0); // kalah −1, tapi poin terendah 0
  // diterima besok → poin tetap pada hari tantangan; batas 12 jam dihitung dari jam BUKA saja (Selasa 10.00 → Rabu 08.00)
  const t2 = await A.tantang('lemah', 'Kuat', { now: SIANG + 864e5 });
  assert.equal(t2.sampai, new Date(Date.parse('2026-11-04T08:00:00+07:00')).toISOString());
  const d1 = await terimaOto('kuat', '', SIANG + 864e5 + 9 * 36e5);
  assert.equal(d1.tHitung, t2.t);
  assert.deepEqual((await getJSON('arena_poin', 'kuat')).ev.at(-1).slice(0, 2), [D(1), 1]);
  // 4 Nov: Lewati 2x gratis; maks. 3 tantangan masuk per hari
  await add('c10', 'Dahan', 2, 12); await add('c11', 'Ranting', 2, 13); await add('c12', 'Akar', 2, 14); await add('c13', 'Batang', 2, 15);
  const H1 = SIANG + 864e5;
  const ta = await A.tantang('c10', 'Kuat', { now: H1 + 1000 }); const la = await A.tolak('kuat', ta.id, { now: H1 + 1500 });
  assert.equal(la.lewati, true); assert.equal(la.sisaLewati, 1);
  const tb = await A.tantang('c11', 'Kuat', { now: H1 + 2000 }); assert.equal((await A.tolak('kuat', tb.id, { now: H1 + 2500 })).sisaLewati, 0);
  await assert.rejects(A.tantang('c12', 'Kuat', { now: H1 + 3000 }), /sudah menerima 3 tantangan/);
  const poinKuat = (await getJSON('arena_poin', 'kuat')).ev.length;
  // jatah Lewati habis → duel otomatis langsung
  const x1 = await A.tantang('c12', 'Lemah', { now: H1 + 4000 }); await A.tolak('lemah', x1.id, { now: H1 + 4100 });
  const x2 = await A.tantang('c10', 'Lemah', { now: H1 + 5000 }); await A.tolak('lemah', x2.id, { now: H1 + 5100 });
  const x3 = await A.tantang('c11', 'Lemah', { now: H1 + 6000 }); const lo = await A.tolak('lemah', x3.id, { now: H1 + 6100 });
  assert.equal(lo.otomatis, true); assert.equal(lo.duel.mode, 'otomatis'); assert.equal((await getJSON('arena_poin', 'kuat')).ev.length, poinKuat);
  // tidak dijawab → duel otomatis saat kedaluwarsa (bukan kalah W.O.)
  const t5 = await A.tantang('c13', 'Akar', { now: H1 + 7000 });
  const sw = await A.sapuTantangan({ now: Date.parse(t5.sampai) + 1 });
  assert.equal(sw.length, 1); assert.ok(['c13', 'c12'].includes(sw[0].menang));
  assert.equal((await A.cariDuel(sw[0].id)).mode, 'otomatis');
  // poin W.O. lama dikembalikan, sekali saja
  const pl = await getJSON('arena_poin', 'lemah'); pl.ev.push([D(1), -1, 'wo123']); await setJSON('arena_poin', 'lemah', pl);
  const kb = await A.kembalikanPoinWO(); assert.deepEqual(kb.find((x) => x.u === 'lemah'), { u: 'lemah', n: 1 });
  assert.ok(!(await getJSON('arena_poin', 'lemah')).ev.some((e) => String(e[2]).startsWith('wo')));
  assert.equal(await A.kembalikanPoinWO(), null);
  await A.tantang('c11', 'Kuat', { now: SIANG + 2 * 864e5 }); assert.equal((await terimaOto('kuat', '', SIANG + 2 * 864e5 + 1000)).menang, 'kuat');
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
    assert.equal(await k('c2', 'Terima: Cimo', 'a2'), 'arena:terima');
    assert.equal((await A.sapuSesi({ now: Date.now() + 14 * 6e4 })).length, 1);
    assert.equal(await k('c2', 'Terima: Cimo', 'a3'), 'arena:gagal');
  } finally { Date.now = realNow; }
});

test('replay tersimpan & prompt Google Flow', async () => {
  const { promptFlow } = await import('../lib/flowprompt.js');
  const d = (await A.duelTerbaru(5))[0];
  assert.ok(d.gerak.length >= 2); assert.equal(d.ko ? d.gerak.at(-1).hp.includes(0) : d.gerak.length === 18, true);
  assert.equal((await A.cariDuel(d.id)).id, d.id);
  const a = { ...(await getJSON('warga', d.a)), hewan: ['Naga Hitam', 'Singa'], elemen: 'Api' }, b = await getJSON('warga', d.b);
  const p = promptFlow(d, a, b, { rasio: '16:9' });
  assert.match(p, /black dragon and lion hybrid/); assert.match(p, /fire aura/); assert.match(p, /widescreen 16:9/); assert.match(p, /KLIP 1/); assert.match(p, /MENANG/);
});

test('Kartu Jurus + Main Langsung: kartu, sesi, tap menentukan hasil, sesi ditinggal', async () => {
  const D = await import('../public/duel-sim.js');
  const st = { nyawa: 175, serang: 35, tahan: 35, cepat: 35 };
  const P1 = { u: 'p1', nama: 'P1', stat: st, kartu: ['serang', 'serang', 'serang'], jurus: null };
  const P2 = { u: 'p2', nama: 'P2', stat: st, kartu: ['jurus', 'jurus', 'jurus'], jurus: 'Api' };
  // SERANG mengalahkan JURUS → P1 unggul di semua babak
  const h = D.jalankan('x1', P1, P2); assert.equal(h.menang, 'p1');
  assert.ok(h.gerak.some((g) => g.unggul === 'a'));
  // tap sempurna membalik keadaan
  const h2 = D.jalankan('x1', P1, P2, null, Array(18).fill('sempurna')); const h3 = D.jalankan('x1', P1, P2, null, Array(18).fill('meleset'));
  assert.ok(h2.sisa.p2 > h3.sisa.p2 || h2.menang === 'p2');
  // deterministik
  assert.deepEqual(D.jalankan('x2', P1, P2, null, ['bagus']).sisa, D.jalankan('x2', P1, P2, null, ['bagus']).sisa);
  // alur server
  const H = SIANG + 20 * 864e5;
  await add('m1', 'Mimi', 2, 21); await add('m2', 'Momo', 2, 22); await add('m3', 'Mumu', 2, 23);
  await assert.rejects(A.tantang('m1', 'Momo', { now: H }).then((t) => A.terima('m2', t.id, { now: H + 1000, kartu: ['serang'] })), /3 kartu/);
  const t1 = await A.tantang('m1', 'Mumu', { now: H, kartu: ['tahan', 'jurus', 'serang'] });
  assert.deepEqual(t1.kartuDari, ['tahan', 'jurus', 'serang']);
  const r = await A.terima('m3', t1.id, { now: H + 2000, kartu: ['serang', 'tahan', 'jurus'] });
  assert.equal(r.main, true); assert.deepEqual(r.setup.A.kartu, ['tahan', 'jurus', 'serang']); assert.equal(r.setup.serangan, 18);
  assert.equal(Date.parse(r.setup.mulai) - (H + 2000), 5 * 6e4); // mulai 5 menit setelah diterima
  const ses = await A.sesiUntuk('m1'); assert.equal(ses[0].sisi, 'a'); assert.equal((await A.sesiUntuk('m3'))[0].sisi, 'b');
  await assert.rejects(A.selesaiMain('m2', t1.id, []), /bukan duelmu/);
  await assert.rejects(A.selesaiMain('m3', t1.id, [], { now: H + 3000 }), /baru dimulai pukul/);
  const MULAI = Date.parse(r.setup.mulai);
  // kedua pemilik main: penerima dulu (menunggu lawan), lalu penantang → duel selesai
  assert.equal((await A.selesaiMain('m3', t1.id, Array(18).fill('sempurna'), { now: MULAI + 30000 })).menunggu, true);
  const d = await A.selesaiMain('m1', t1.id, Array(18).fill('meleset'), { now: MULAI + 40000 });
  assert.equal(d.mode, 'main'); assert.deepEqual(d.kartuB, ['serang', 'tahan', 'jurus']);
  const lokal = D.jalankan(t1.id, r.setup.A, r.setup.B, Array(18).fill('meleset'), Array(18).fill('sempurna'));
  assert.deepEqual(d.sisa, lokal.sisa); // hasil server = gabungan tap kedua pemain
  assert.equal((await A.selesaiMain('m3', t1.id, [])).id, d.id); // sudah selesai → kembalikan hasilnya
  // hanya satu yang main → lawan memakai tap rata-rata saat waktu habis
  await add('m4', 'Mama', 2, 24);
  const t2 = await A.tantang('m4', 'Momo', { now: H + 60000 });
  const r2 = await A.terima('m2', t2.id, { now: H + 61000, kartu: ['serang', 'serang', 'serang'] });
  const M2 = Date.parse(r2.setup.mulai);
  assert.equal((await A.selesaiMain('m2', t2.id, ['sempurna'], { now: M2 + 20000 })).menunggu, true);
  assert.deepEqual(await A.sapuSesi({ now: M2 + 3 * 6e4 }), []);
  const sw = await A.sapuSesi({ now: M2 + 7 * 6e4 });
  assert.equal(sw.length, 1); assert.equal(sw[0].gerak[0].tap.b, 'sempurna'); assert.ok(sw[0].gerak.slice(1).every((g) => g.tap.b === 'meleset' && g.tap.a === 'bagus'));
  // tombol "Siap, mulai sekarang!": satu pihak saja → tetap menunggu 5 menit; keduanya → mulai 3 detik lagi
  const t4 = await A.tantang('m3', 'Mama', { now: H + 3 * 36e5 });
  const r4 = await A.terima('m4', t4.id, { now: H + 3 * 36e5 + 1000, kartu: ['tahan', 'tahan', 'tahan'] });
  const s1 = await A.siap('m3', t4.id, { now: H + 3 * 36e5 + 20000 });
  assert.equal(s1.mulai, r4.setup.mulai); assert.deepEqual(s1.siap, { a: true, b: false });
  await assert.rejects(A.siap('m1', t4.id), /bukan duelmu/);
  const s2 = await A.siap('m4', t4.id, { now: H + 3 * 36e5 + 30000 });
  assert.equal(Date.parse(s2.mulai), H + 3 * 36e5 + 33000); assert.equal(Date.parse(s2.batas) - Date.parse(s2.mulai), A.MAIN_MS);
  assert.equal((await A.selesaiMain('m4', t4.id, ['bagus'], { now: H + 3 * 36e5 + 40000 })).menunggu, true); // boleh main setelah mulai
  // lewat komentar (tanpa kartu): tetap dijadwalkan, tak ada yang main → otomatis
  const t3 = await A.tantang('m1', 'Mama', { now: H + 2 * 36e5 });
  const d3 = await terimaOto('m4', t3.id, H + 2 * 36e5 + 1000); assert.equal(d3.mode, 'otomatis');
});
