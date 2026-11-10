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
  await setJSON('warga', 'dagang', newWarga({ username: 'dagang', nama: 'Dagang', hewan: ['Kucing'], spot: 7 }));
  await assert.rejects(() => PS.jual('dagang', { jenis: 'outfit', id: 'pita' }, BUKA - 3600e3), /belum buka/);
});

test('pasar: jual outfit kembali dengan harga Toko, lepas kalau dipakai', async () => {
  await E.bonusBiji('dagang', 20);
  await PK.beliPakai('dagang', 'topi_penyihir'); // 10
  assert.equal((await E.saldo('dagang')).biji, 10);
  const d = PS.daganganDari(await getJSON('warga', 'dagang'));
  assert.deepEqual(d.map((x) => [x.id, x.biji, x.dipakai]), [['topi_penyihir', 10, true]]);
  const r = await PS.jual('dagang', { jenis: 'outfit', id: 'topi_penyihir' }, BUKA);
  assert.equal(r.biji, 10);
  assert.equal((await E.saldo('dagang')).biji, 20);
  const w = await getJSON('warga', 'dagang');
  assert.deepEqual(w.lemari, []); assert.equal(PK.dipakai(w), null);
  await assert.rejects(() => PS.jual('dagang', { jenis: 'outfit', id: 'topi_penyihir' }, BUKA), /tidak punya/);
});

test('pasar: hanya batu hasil belanja Toko yang bisa dijual', async () => {
  const w = await getJSON('warga', 'dagang');
  w.batu = 1; w.batuLog = [{ n: 1, bukti: 'Ketua Wilayah 1', t: 'x' }]; await setJSON('warga', 'dagang', w);
  await assert.rejects(() => PS.jual('dagang', { jenis: 'batu' }, BUKA), /hadiah/);
  await E.beli('dagang', { item: 'batu' }); // 15 → saldo 5, batu 2
  assert.equal((await E.saldo('dagang')).biji, 5);
  await PS.jual('dagang', { jenis: 'batu' }, BUKA);
  const w2 = await getJSON('warga', 'dagang');
  assert.equal(w2.batu, 1); assert.equal((await E.saldo('dagang')).biji, 20);
  await assert.rejects(() => PS.jual('dagang', { jenis: 'batu' }, BUKA), /hadiah/);
});
