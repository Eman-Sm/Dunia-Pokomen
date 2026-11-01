import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
globalThis.fetch = async () => new Response('{}');
const { newWarga } = await import('../lib/rules.js');
const { getJSON, setJSON, redis } = await import('../lib/db.js');
const PB = await import('../lib/pokoboll.js');
const E = await import('../lib/ekonomi.js');
const add = (u, nama, spot, x = {}) => setJSON('warga', u, { ...newWarga({ username: u, nama, hewan: ['Naga', 'Singa'], spot }), ...x });

test('Pokoboll: hanya 1, dibeli dengan 6 Batu Evolusi atau 100 Biji Kopi', async () => {
  await redis('SET', 'evo_batu', '1');
  await add('a', 'Ayu', 1, { batu: 5 }); await add('b', 'Bima', 2, { batu: 6 }); await add('c', 'Cici', 3);
  await E.bonusBiji('c', 110);
  assert.equal(await PB.hargaBiji(), 100);
  const SEBELUM = PB.MULAI_JUAL - 1000;
  assert.deepEqual(PB.publik(await PB.getPB(), 100, SEBELUM), { tampil: false });
  await assert.rejects(PB.beli('b', 'batu', { now: SEBELUM }), /belum dijual/);
  assert.equal(PB.publik(await PB.getPB(), 100, PB.MULAI_JUAL + 1).tampil, true); // otomatis dijual mulai 2 Nov 06.00
  await PB.tampil(true);
  await assert.rejects(PB.beli('a', 'batu'), /butuh 6/);
  await assert.rejects(PB.beli('a', 'biji'), /kurang/);
  await assert.rejects(PB.beli('a', 'kopi'), /Pilih cara bayar/);
  let umum = null;
  const r = await PB.beli('b', 'batu', { umumkan: async (t) => { umum = t; } });
  assert.equal(r.pokoboll.pemilik, 'b'); assert.equal((await getJSON('warga', 'b')).batu, 0); assert.match(umum, /TERJUAL/);
  await assert.rejects(PB.beli('c', 'biji'), /sudah terjual/);
  assert.equal((await E.saldo('c')).biji, 110); // tidak terpotong
  // pembelian dengan Biji Kopi (setelah pemilik direset oleh Admin)
  await PB.setPemilik(null);
  const r2 = await PB.beli('c', 'biji'); assert.equal(r2.pokoboll.pemilik, 'c'); assert.equal((await E.saldo('c')).biji, 10);
  const pub = PB.publik(await PB.getPB()); assert.deepEqual(pub.harga, { batu: 6, biji: 100 }); assert.equal(pub.eksklusif, true);
});
