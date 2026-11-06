import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
const { newWarga, publicWarga } = await import('../lib/rules.js');
const { setJSON, getJSON, redis } = await import('../lib/db.js');
const PK = await import('../lib/pakaian.js');
const E = await import('../lib/ekonomi.js');
await redis('SET', 'tier_schema', '6');
await redis('SET', 'evo_batu', '1');

test('outfit: beli sekali, pakai & lepas gratis, tampil di data publik', async () => {
  await setJSON('warga', 'gaya', newWarga({ username: 'gaya', nama: 'Gaya', hewan: ['Kucing'], spot: 9 }));
  await E.bonusBiji('gaya', 20);
  const r = await PK.beliPakai('gaya', 'topi_penyihir');
  assert.equal(r.pakaian.kepala, 'topi_penyihir');
  assert.equal((await E.saldo('gaya')).biji, 10);
  await PK.beliPakai('gaya', 'syal');
  assert.equal((await E.saldo('gaya')).biji, 5);
  await PK.lepas('gaya', 'kepala');
  await PK.beliPakai('gaya', 'topi_penyihir'); // sudah punya: gratis
  assert.equal((await E.saldo('gaya')).biji, 5);
  await assert.rejects(() => PK.beliPakai('gaya', 'topi_koboi'), /kurang/);
  const pub = publicWarga(await getJSON('warga', 'gaya'));
  assert.deepEqual(pub.pakaian, { kepala: 'topi_penyihir', leher: 'syal' });
  await assert.rejects(() => PK.beliPakai('gaya', 'jubah_rahasia'), /tidak dikenal/);
});

test('daftar id di rules.js sama dengan katalog', () => {
  const w = { pakaian: {} };
  for (const x of PK.KATALOG) { w.pakaian = { [x.bagian]: x.id }; assert.deepEqual(publicWarga({ ...newWarga({ username: 'z', nama: 'Z', hewan: ['Kucing'], spot: 1 }), pakaian: w.pakaian }).pakaian, w.pakaian, x.id); }
});
