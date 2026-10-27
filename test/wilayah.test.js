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
  await assert.rejects(tetapkanPemenang());
  const r = await tetapkanPemenang({ force: true });
  assert.deepEqual(r.map((x) => x.pemenang), ['a2', 'c1']);
});
