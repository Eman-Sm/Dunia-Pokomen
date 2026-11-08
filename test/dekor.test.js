import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
const { newWarga } = await import('../lib/rules.js');
const { setJSON } = await import('../lib/db.js');
const ob = await import('../lib/obrolan.js');
const W = await import('../lib/wilayah.js');
const DK = await import('../lib/dekor.js');

test('Dekor Wilayah: default bendera, hanya ketua yang bisa mengganti hiasan wilayahnya', async () => {
  await setJSON('warga', 'ketdua', newWarga({ username: 'ketdua', nama: 'Raja', hewan: ['Singa'], spot: 5 }));
  await setJSON('warga', 'rakyat2', newWarga({ username: 'rakyat2', nama: 'Rakyat', hewan: ['Kucing'], spot: 6 }));
  await W.setCfg({ ketuaOtomatis: { 1: 'ketdua' } });
  assert.equal((await DK.semua(3))[1], 'bendera');
  const r = await DK.pilih({ token: await ob.tokenFor('ketdua'), tema: 'lampion' });
  assert.equal(r.wil, 1);
  assert.equal((await DK.semua(3))[1], 'lampion');
  const tr = await ob.tokenFor('rakyat2'), tk = await ob.tokenFor('ketdua');
  await assert.rejects(() => DK.pilih({ token: tr, tema: 'bunga' }), /Ketua/);
  await assert.rejects(() => DK.pilih({ token: tk, tema: 'kembang_api' }), /tidak dikenal/);
});
