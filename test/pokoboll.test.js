import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
globalThis.fetch = async () => new Response('{}');
const { newWarga } = await import('../lib/rules.js');
const { getJSON, setJSON, redis } = await import('../lib/db.js');
const PB = await import('../lib/pokoboll.js');
const E = await import('../lib/ekonomi.js');
const add = (u, nama, spot, x = {}) => setJSON('warga', u, { ...newWarga({ username: u, nama, hewan: ['Naga', 'Singa'], spot }), ...x });

test('Pokoboll: hanya 1, dibeli dengan 3 Batu Evolusi atau 45 Biji Kopi', async () => {
  await redis('SET', 'evo_batu', '1');
  await add('a', 'Ayu', 1, { batu: 2 }); await add('b', 'Bima', 2, { batu: 3 }); await add('c', 'Cici', 3);
  await E.bonusBiji('c', 50);
  assert.equal(await PB.hargaBiji(), 45);
  assert.deepEqual(PB.publik(await PB.getPB()), { tampil: false });
  await assert.rejects(PB.beli('b', 'batu'), /belum dijual/);
  await PB.tampil(true);
  await assert.rejects(PB.beli('a', 'batu'), /butuh 3/);
  await assert.rejects(PB.beli('a', 'biji'), /kurang/);
  await assert.rejects(PB.beli('a', 'kopi'), /Pilih cara bayar/);
  let umum = null;
  const r = await PB.beli('b', 'batu', { umumkan: async (t) => { umum = t; } });
  assert.equal(r.pokoboll.pemilik, 'b'); assert.equal((await getJSON('warga', 'b')).batu, 0); assert.match(umum, /TERJUAL/);
  await assert.rejects(PB.beli('c', 'biji'), /sudah terjual/);
  assert.equal((await E.saldo('c')).biji, 50); // tidak terpotong
  // pembelian dengan Biji Kopi (setelah pemilik direset oleh Admin)
  await PB.setPemilik(null);
  const r2 = await PB.beli('c', 'biji'); assert.equal(r2.pokoboll.pemilik, 'c'); assert.equal((await E.saldo('c')).biji, 5);
  assert.deepEqual(PB.publik(await PB.getPB(), 45).harga, { batu: 3, biji: 45 });
});
