import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
process.env.IG_USERNAME = 'duniapokomen';
const { processComment, newWarga } = await import('../lib/rules.js');
const { setJSON, redis } = await import('../lib/db.js');
const { hasilWilayah, setCfg, tetapkanPemenang, wilayahOf } = await import('../lib/wilayah.js');
const { parseComment } = await import('../lib/parse.js');
await redis('SET', 'tier_schema', '6'); await redis('SET', 'evolusi_cerita_1', 'selesai');
const add = (u, nama, spot) => setJSON('warga', u, newWarga({ username: u, nama, hewan: ['Naga'], spot }));
let id = 100;
const c = (u, text, ts = '2026-10-27T12:00:00.000Z') => processComment({ id: String(++id), username: u, text, mediaId: 'p4', timestamp: ts });

test('parse Calon / Pilih', () => {
  assert.equal(parseComment('Calon: siap menjaga hutan').calon, 'siap menjaga hutan');
  assert.equal(parseComment('Calon:').calon, '');
  assert.equal(parseComment('Pilih: Raiko 47').pilih, 'Raiko 47');
  assert.equal(parseComment('halo semua').calon, null);
});

test('pemilihan ketua per wilayah', async () => {
  await setCfg({ buka: '2026-10-27T07:00:00.000Z', tutup: '2026-10-28T05:00:00.000Z', wilayah: [1, 3], ketuaOtomatis: { 2: 'hole' }, ditetapkan: false });
  await add('val', 'Valtherion', 1); await add('a1', 'Bolu', 5); await add('a2', 'Raiko', 44); await add('a3', 'Raiko', 46);
  await add('hole', 'Hole', 71); await add('b1', 'Cimo', 60); await add('c1', 'Draco', 105); await add('c2', 'Lulu', 110);
  assert.equal(wilayahOf({ spot: 49 }), 1); assert.equal(wilayahOf({ spot: 50 }), 2);
  assert.equal(await c('val', 'Calon: kompak dan kuat'), 'pw:calon');
  assert.equal(await c('a2', 'Calon:'), 'pw:calon');
  assert.equal(await c('c1', 'Calon: jaga desa'), 'pw:calon');
  assert.equal(await c('b1', 'Calon: aku'), 'pw:wilayah-tidak-memilih');
  assert.equal(await c('a1', 'Pilih: Valtherion karena keren'), 'pw:pilih');
  assert.equal(await c('a3', 'Pilih: Raiko'), 'pw:ambigu');
  assert.equal(await c('a3', 'Pilih: Raiko 45'), 'pw:pilih');
  assert.equal(await c('val', 'Pilih: Valtherion'), 'pw:diri-sendiri');
  assert.equal(await c('c2', 'Pilih: Valtherion'), 'pw:beda-wilayah');
  assert.equal(await c('c2', 'Pilih: @c1'), 'pw:pilih');
  assert.equal(await c('a2', 'Pilih: Bolu'), 'pw:bukan-calon');
  assert.equal(await c('orang', 'Pilih: Valtherion'), 'pw:bukan-warga');
  // change of mind: latest counts
  assert.equal(await c('a1', 'Pilih: Raiko 45', '2026-10-27T13:00:00.000Z'), 'pw:pilih-ganti');
  assert.equal(await c('val', 'Pilih: Raiko 45'), 'pw:pilih');
  // after closing
  assert.equal(await c('a2', 'Pilih: Valtherion', '2026-10-28T06:00:00.000Z'), 'pw:tutup');
  const h = await hasilWilayah();
  assert.equal(h.wilayah[1].calon[0].u, 'a2'); assert.equal(h.wilayah[1].calon[0].suara, 3);
  assert.equal(h.wilayah[1].calon[0].nama, 'Raiko 45');
  assert.equal(h.wilayah[2].ketua.nama, 'Hole'); assert.equal(h.wilayah[2].memilih, false);
  assert.equal(h.wilayah[3].calon[0].suara, 1);
  // belum ditutup (tutup di masa depan) → menolak; tes tidak bergantung tanggal hari ini
  await setCfg({ tutup: new Date(Date.now() + 864e5).toISOString() });
  await assert.rejects(tetapkanPemenang());
  await setCfg({ tutup: '2026-10-28T05:00:00.000Z' });
  const r = await tetapkanPemenang({ force: true });
  assert.deepEqual(r.map((x) => x.pemenang), ['a2', 'c1']);
});

test('usulan nama wilayah', async () => {
  const { daftarUsulWilayah } = await import('../lib/wilayah.js');
  assert.equal(parseComment('Wilayah: Lembah Pelangi').wilayahNama, 'Lembah Pelangi');
  assert.equal(parseComment('wilayah: aku mau yang keren dong').wilayahNama, null);
  const k = (u, text, likeCount, cid) => processComment({ id: cid, username: u, text, mediaId: 'p4', timestamp: '2026-10-27T12:00:00.000Z', likeCount });
  assert.equal(await k('val', 'Wilayah: Lembah Pelangi', 3, 'w1'), 'wil:usul');
  assert.equal(await k('val', 'Wilayah: Lembah Pelangi', 9, 'w1'), 'wil:likes');
  assert.equal(await k('val', 'Wilayah: lembah pelangi', 1, 'w2'), 'wil:dobel');
  assert.equal(await k('c1', 'Wilayah: Hutan Kabut', 2, 'w3'), 'wil:usul');
  assert.equal(await k('orang', 'Wilayah: Kota Baru', 2, 'w4'), 'wil:bukan-warga');
  const d = await daftarUsulWilayah();
  assert.equal(d[1][0].nama, 'Lembah Pelangi'); assert.equal(d[1][0].likes, 9);
  assert.equal(d[3][0].nama, 'Hutan Kabut');
  // setelah nama resmi: usulan baru ditolak, usulan lama tetap bisa diperbarui like-nya
  const { getJSON, setJSON } = await import('../lib/db.js');
  const x = await getJSON('usul_wilayah', 'w1'); x.status = 'resmi'; await setJSON('usul_wilayah', 'w1', x);
  assert.equal(await k('val', 'Wilayah: Padang Baru', 5, 'w5'), 'wil:sudah-resmi');
  assert.equal(await k('val', 'Wilayah: Lembah Pelangi', 11, 'w1'), 'wil:likes');
  assert.equal(await k('c1', 'Wilayah: Hutan Lain', 1, 'w6'), 'wil:usul');
});

test('nilai = suara + like', async () => {
  const { setJSON } = await import('../lib/db.js');
  await redis('SET', 'pw_likes', JSON.stringify({ updatedAt: new Date().toISOString(), per: { val: 10 } }));
  const h = await hasilWilayah();
  assert.equal(h.wilayah[1].calon[0].u, 'val'); assert.equal(h.wilayah[1].calon[0].skor, 10 + h.wilayah[1].calon[0].suara);
});

test('wilayah baru otomatis: nama + pemilihan ketua', async () => {
  const { bukaWilayahBaru, getCfg, jadwalOf, tutupDefault } = await import('../lib/wilayah.js');
  const { getJSON } = await import('../lib/db.js');
  await setCfg({ ditetapkan: true, tunda: [] }); // ronde Wilayah 1 & 3 sudah selesai
  const now = Date.now(); const ts = new Date(now + 6e4).toISOString();
  assert.deepEqual(await bukaWilayahBaru({ now, post: null }), []); // belum ada warga Wilayah 4
  await add('d1', 'Kirin', 150); await add('d2', 'Momo', 151); await add('d3', 'Puff', 152);
  await setCfg({ tunda: [4] });
  assert.deepEqual(await bukaWilayahBaru({ now, post: null }), []); // ditahan sampai diumumkan
  await setCfg({ tunda: [] });
  assert.deepEqual(await bukaWilayahBaru({ now, post: null }), [4]);
  assert.deepEqual(await bukaWilayahBaru({ now, post: null }), []); // tidak dibuka dua kali
  const J = jadwalOf(await getCfg());
  assert.equal(J[4].tutup, tutupDefault(now)); assert.equal(J[1].ditetapkan, true);
  const k = (u, text, cid) => processComment({ id: cid, username: u, text, mediaId: 'p6', timestamp: ts, likeCount: 4 });
  assert.equal(await k('d1', 'Calon: wilayah utara jaya', 'n1'), 'pw:calon');
  assert.equal(await k('d2', 'Pilih: Kirin', 'n2'), 'pw:pilih');
  assert.equal(await k('d3', 'Pilih: Kirin', 'n3'), 'pw:pilih');
  assert.equal(await k('val', 'Calon: lagi', 'n4'), 'pw:wilayah-tidak-memilih'); // Wilayah 1 sudah punya ketua
  assert.equal(await k('d2', 'Wilayah: Lembah Utara', 'n5'), 'wil:usul');
  const h = await hasilWilayah();
  assert.equal(h.wilayah[4].memilih, true); assert.equal(h.wilayah[4].calon[0].suara, 2); assert.equal(h.closed, false);
  await assert.rejects(tetapkanPemenang()); // belum ditutup
  const r = await tetapkanPemenang({ force: true });
  assert.ok(r.some((x) => x.wilayah === 4 && x.pemenang === 'd1'));
  assert.equal((await getJSON('warga', 'd1')).gelar, 'Ketua Koloni Wilayah 4');
  assert.equal((await getJSON('usul_wilayah', 'n5')).status, 'resmi');
  assert.deepEqual(await bukaWilayahBaru({ now, post: null }), []);
});
