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

test('Arena: jam buka, tantang, terima, duel, juara = 7 hari × min. 4 poin', async () => {
  await add('kuat', 'Kuat', 3, 1); await add('lemah', 'Lemah', 0, 2);
  await assert.rejects(A.tantang('lemah', 'Kuat', { now: MALAM }), /buka pukul/);
  const t = await A.tantang('lemah', 'Kuat', { now: SIANG });
  assert.equal(t.ke, 'kuat');
  await assert.rejects(A.tantang('lemah', 'Kuat', { now: SIANG + 1000 }), /sudah bertemu/);
  const d = await A.terima('kuat', '', { now: SIANG + 60000 });
  assert.equal(d.menang, 'kuat'); assert.ok(d.catatan.length >= 1);
  // replay is deterministic
  assert.deepEqual(A.simulasi(await getJSON('warga', 'lemah'), await getJSON('warga', 'kuat'), t.id).menang, d.menang);
  const D = (n) => new Date(SIANG + 7 * 36e5 + n * 864e5).toISOString().slice(0, 10); // tanggal WIB hari ke-n
  let b = await A.papanBeruntun(10, SIANG + 70000);
  assert.equal(b[0].u, 'kuat'); assert.equal(b[0].hariKe, 1); assert.equal(b[0].poin, 1);
  // hari pertama hanya 1 poin (< 4) → setelah hari itu final (besok 09.00), hitungan hilang
  assert.equal((await A.papanBeruntun(10, Date.parse(D(1) + 'T08:00:00+07:00'))).length, 1);
  assert.equal((await A.papanBeruntun(10, Date.parse(D(1) + 'T09:30:00+07:00'))).length, 0);
  // status: 7 hari × 4 poin → juara; satu hari 3 poin → mulai lagi dari hari berikutnya yang ada kemenangan
  const ev = (n, k) => Array.from({ length: k }, (_, i) => [D(n), 1, 'x' + n + '-' + i]);
  const now7 = Date.parse(D(6) + 'T20:00:00+07:00');
  let st = A.statusPoin({ ev: [0, 1, 2, 3, 4, 5, 6].flatMap((n) => ev(n, 4)) }, now7);
  assert.equal(st.juara, true); assert.equal(st.mulai, D(0));
  st = A.statusPoin({ ev: [0, 1, 2, 3, 4, 5].flatMap((n) => ev(n, 4)).concat(ev(6, 3)) }, now7);
  assert.equal(st.juara, undefined); assert.equal(st.hariKe, 7); assert.equal(st.poin, 3);
  st = A.statusPoin({ ev: [0, 1, 3, 4].flatMap((n) => ev(n, 4)).concat(ev(2, 3)) }, Date.parse(D(4) + 'T20:00:00+07:00'));
  assert.equal(st.mulai, D(3)); assert.equal(st.hariKe, 2); // hari ke-3 gagal → reset, mulai lagi dari D(3)
  st = A.statusPoin({ ev: [...ev(0, 5), [D(0), -2, 'k']] }, Date.parse(D(1) + 'T10:00:00+07:00'));
  assert.equal(st.aktif, false); // 5 menang − 2 (sekali kalah) = 3 < 4
  // cekJuara memberi batu sekali saja
  await setJSON('arena_poin', 'lemah', { ev: [0, 1, 2, 3, 4, 5, 6].flatMap((n) => ev(n, 4)) });
  const j = await A.cekJuara({ now: now7 });
  assert.deepEqual(j.map((x) => x.u), ['lemah']); assert.equal((await getJSON('warga', 'lemah')).batu, 1);
  assert.deepEqual(await A.cekJuara({ now: now7 + 60000 }), []);
  // diterima besok pagi → poin tetap pada hari tantangan
  const H8 = SIANG + 8 * 864e5;
  const t2 = await A.tantang('lemah', 'Kuat', { now: H8 });
  assert.equal(Date.parse(t2.sampai) - H8, 12 * 36e5);
  const d1 = await A.terima('kuat', '', { now: H8 + 9 * 36e5 });
  assert.equal(d1.tHitung, t2.t);
  const pk = await getJSON('arena_poin', 'kuat');
  assert.deepEqual(pk.ev.at(-1).slice(0, 2), [D(8), 1]);
  // kalah = −2
  assert.deepEqual((await getJSON('arena_poin', 'lemah')).ev.at(-1).slice(0, 2), [D(8), -2]);
  // menolak / tidak menjawab = −2 (hanya bila sedang dalam hitungan)
  await add('c10', 'Dahan', 0, 12);
  const t3 = await A.tantang('c10', 'Kuat', { now: H8 + 3000 });
  const tl = await A.tolak('kuat', t3.id, { now: H8 + 4000 });
  assert.ok(tl.hukuman); assert.equal(tl.hukuman.poin, -1);
  await add('c11', 'Ranting', 0, 13);
  await A.tantang('c11', 'Lemah', { now: H8 + 5000 });
  assert.deepEqual(await A.sapuTantangan({ now: H8 + 5000 + 6 * 36e5 }), []);
  assert.deepEqual(await A.sapuTantangan({ now: H8 + 5000 + 12 * 36e5 + 1 }), []); // lemah tidak dalam hitungan → tanpa hukuman
  await add('c12', 'Akar', 0, 14);
  await A.tantang('c12', 'Kuat', { now: H8 + 6000 });
  const sw = await A.sapuTantangan({ now: H8 + 6000 + 12 * 36e5 + 1 });
  assert.equal(sw[0].u, 'kuat'); assert.equal(sw[0].poin, -3);
  const rw = await A.riwayatDuel({ id: 'x', t: new Date(H8 + 13 * 36e5).toISOString(), a: 'kuat', b: 'c12' });
  assert.equal(rw.kuat.daftar[0].menang, 0); assert.equal(rw.c12.main, 0);
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
