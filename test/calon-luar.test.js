import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
process.env.IG_USERNAME = 'duniapokomen';
const { processComment, newWarga } = await import('../lib/rules.js');
const { setJSON, getJSON, redis } = await import('../lib/db.js');
const { hasilWilayah, setCfg, tetapkanPemenang } = await import('../lib/wilayah.js');
const { parseComment } = await import('../lib/parse.js');
const E = await import('../lib/ekonomi.js');
await redis('SET', 'tier_schema', '6'); await redis('SET', 'evolusi_cerita_1', 'selesai');
const add = (u, nama, spot, x = {}) => setJSON('warga', u, { ...newWarga({ username: u, nama, hewan: ['Naga'], spot }), ...x });
let id = 500;
const c = (u, text, ts = '2026-11-01T12:00:00.000Z') => processComment({ id: String(++id), username: u, text, mediaId: 'p6', timestamp: ts });

test('parse "Calon 4: janji"', () => {
  const p = parseComment('Calon 4: siap bantu warga baru');
  assert.equal(p.calon, 'siap bantu warga baru'); assert.equal(p.calonWil, 4);
  assert.equal(parseComment('Calon: rajin').calonWil, undefined);
});

test('calon dari luar wilayah: bayar 7 Biji Kopi, suara dihitung dari warga wilayah tujuan', async () => {
  const J = { 4: { buka: '2026-10-31T11:00:00.000Z', tutup: '2026-11-03T05:00:00.000Z', ditetapkan: false, post: null } };
  await setCfg({ jadwal: J, tunda: [], ketuaOtomatis: { 2: 'hole' } });
  await add('hole', 'Hole', 71); await add('kaya', 'Rubi', 10); await add('miskin', 'Tikus', 12); await add('ketua1', 'Valtherion', 20, { ketuaWilayah: 1 });
  await add('w4a', 'Dragotyr', 151); await add('w4b', 'Kiko', 152); await add('w4c', 'Momo', 153);
  // Toko belum buka → aturan lama (tidak berbayar, ditolak)
  assert.equal(await c('kaya', 'Calon: aku siap'), 'pw:wilayah-tidak-memilih');
  await redis('SET', 'evo_batu', '1');
  await E.bonusBiji('kaya', 10);
  assert.equal(await c('kaya', 'Calon: aku siap memimpin'), 'pw:calon-luar');
  assert.equal((await E.saldo('kaya')).biji, 3);
  assert.equal(await c('kaya', 'Calon: janji baru'), 'pw:calon-update'); // tidak bayar lagi
  assert.equal((await E.saldo('kaya')).biji, 3);
  assert.equal((await getJSON('pw_calon', 'kaya')).janji, 'janji baru');
  assert.equal(await c('miskin', 'Calon: ikut dong'), 'pw:luar-kurang-biji');
  assert.equal(await getJSON('pw_calon', 'miskin'), null);
  assert.equal(await c('ketua1', 'Calon: dua wilayah'), 'pw:luar-sudah-ketua');
  assert.equal(await c('hole', 'Calon: aku juga'), 'pw:luar-sudah-ketua');
  assert.equal(await c('kaya', 'Calon 5: salah nomor'), 'pw:luar-pilih-wilayah');
  // warga Wilayah 4 tetap gratis
  assert.equal(await c('w4a', 'Calon: jaga lahan baru'), 'pw:calon');
  // memilih: hanya warga Wilayah 4
  assert.equal(await c('w4b', 'Pilih: Rubi'), 'pw:pilih');
  assert.equal(await c('w4c', 'Pilih: Rubi'), 'pw:pilih');
  assert.equal(await c('miskin', 'Pilih: Rubi'), 'pw:wilayah-tidak-memilih');
  const h = await hasilWilayah();
  const k = h.wilayah[4].calon.find((x) => x.u === 'kaya');
  assert.equal(k.suara, 2); assert.equal(k.luar, 1);
  assert.equal(h.wilayah[4].calon[0].u, 'kaya');
  assert.equal(h.wilayah[1].calon.length, 0); // tidak muncul di wilayah asalnya
  const r = await tetapkanPemenang({ force: true });
  assert.equal(r.find((x) => x.wilayah === 4).pemenang, 'kaya');
  assert.equal((await getJSON('warga', 'kaya')).ketuaWilayah, 4);
});
