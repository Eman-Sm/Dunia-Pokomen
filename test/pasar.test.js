import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
const { newWarga } = await import('../lib/rules.js');
const { setJSON, getJSON, redis } = await import('../lib/db.js');
const PK = await import('../lib/pakaian.js');
const E = await import('../lib/ekonomi.js');
const PS = await import('../lib/pasar.js');
await redis('SET', 'tier_schema', '6');
await redis('SET', 'evo_batu', '1');
const BUKA = Date.parse('2026-11-11T12:00:00+07:00') + 1000;

test('pasar: belum buka sebelum jadwal', async () => {
  await setJSON('warga', 'jual', newWarga({ username: 'jual', nama: 'Penjual', hewan: ['Kucing'], spot: 7 }));
  await setJSON('warga', 'beli', newWarga({ username: 'beli', nama: 'Pembeli', hewan: ['Anjing'], spot: 8 }));
  await assert.rejects(() => PS.pasang('jual', { item: 'pita', biji: 3 }, BUKA - 3600e3), /belum buka/);
});

test('pasar: harga ditentukan penjual, Biji Kopi pindah ke penjual, barang pindah lemari', async () => {
  await E.bonusBiji('jual', 10); await E.bonusBiji('beli', 30);
  await PK.beliPakai('jual', 'topi_penyihir'); // 10 → saldo 0, dipakai
  await assert.rejects(() => PS.pasang('jual', { item: 'topi_penyihir', biji: 0 }, BUKA), /harga/);
  await assert.rejects(() => PS.pasang('jual', { item: 'batu', biji: 10 }, BUKA), /Batu Evolusi tidak bisa/);
  const r = await PS.pasang('jual', { item: 'topi_penyihir', biji: 25 }, BUKA);
  let w = await getJSON('warga', 'jual');
  assert.deepEqual(w.lemari, []); assert.equal(PK.dipakai(w), null);
  assert.equal((await PS.publik())[0].biji, 25);
  await assert.rejects(() => PS.beli('jual', r.lapak.id, BUKA), /lapakmu sendiri/);
  await PS.beli('beli', r.lapak.id, BUKA);
  assert.equal((await E.saldo('beli')).biji, 5);
  assert.equal((await E.saldo('jual')).biji, 25);
  assert.deepEqual((await getJSON('warga', 'beli')).lemari, ['topi_penyihir']);
  assert.equal((await PS.publik()).length, 0);
  await assert.rejects(() => PS.beli('beli', r.lapak.id, BUKA), /sudah terjual/);
});

test('pasar: tarik kembali, saldo kurang ditolak', async () => {
  const r = await PS.pasang('beli', { item: 'topi_penyihir', biji: 100 }, BUKA);
  await assert.rejects(() => PS.beli('jual', r.lapak.id, BUKA), /kurang/);
  await PS.batal('beli', r.lapak.id, BUKA);
  assert.deepEqual((await getJSON('warga', 'beli')).lemari, ['topi_penyihir']);
  await assert.rejects(() => PS.batal('jual', r.lapak.id, BUKA), /tidak ditemukan/);
});
