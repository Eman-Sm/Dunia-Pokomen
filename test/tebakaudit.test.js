import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
const { newWarga } = await import('../lib/rules.js');
const { setJSON, redis } = await import('../lib/db.js');
const F = await import('../lib/fasilitas.js');
const E = await import('../lib/ekonomi.js');

test('audit tebakan: jawaban sinonim (pemulihan) dapat hadiah sekali, yang sudah dapat tidak dobel', async () => {
  for (const [u, n] of [['pulih1', 'Pulih'], ['klin1', 'Klin'], ['salah1', 'Salah'], ['tanpalabel', 'Bebas']]) await setJSON('warga', u, newWarga({ username: u, nama: n, hewan: ['Kucing'], spot: 20 + n.length }));
  const t = '2026-11-06T02:00:00.000Z';
  await setJSON('tebak:klinik', 'pulih1', { u: 'pulih1', teks: 'tempat pemulihan pokomen', t });
  await setJSON('tebak:klinik', 'klin1', { u: 'klin1', teks: 'klinik', t });
  await setJSON('tebak:klinik', 'salah1', { u: 'salah1', teks: 'kolam renang', t });
  const komentar = [{ username: 'tanpalabel', text: 'pasti rumah sakit hewan', timestamp: '2026-11-05T20:00:00+0000' }, { username: 'tanpalabel', text: 'rumah sakit', timestamp: '2026-11-07T20:00:00+0000' }];
  const lama = /klinik|rumah sakit|\brs\b|dokter|puskesmas|obat|perawat|apotek/i;
  const cek = await F.auditTebak('klinik', { komentar, kunciLama: lama });
  const st = Object.fromEntries(cek.hasil.map((x) => [x.u, x.status]));
  assert.deepEqual(st, { pulih1: 'baru-benar', klin1: 'sudah-dapat', salah1: 'salah', tanpalabel: 'baru-benar' });
  const r = await F.auditTebak('klinik', { apply: true, komentar, kunciLama: lama, bonus: (u, n) => E.bonusBiji(u, n) });
  assert.equal(r.baru, 2);
  assert.equal((await E.saldo('pulih1')).biji, 2);
  assert.equal((await E.saldo('klin1')).biji, 0);
  const lagi = await F.auditTebak('klinik', { apply: true, komentar, kunciLama: lama, bonus: (u, n) => E.bonusBiji(u, n) });
  assert.equal(lagi.baru, 0);
  assert.equal((await E.saldo('pulih1')).biji, 2);
  await redis('DEL', 'x');
});
