import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
const S = await import('../lib/saran.js');
const api = await import('../api/saran.js');
const kirim = (b, ip = '1.1.1.1') => api.POST(new Request('https://x/api/saran', { method: 'POST', body: JSON.stringify(b), headers: { 'x-forwarded-for': ip } })).then((r) => r.json());

test('saran warga: tersimpan, batas 1 menit, bot ditolak diam-diam, hanya admin yang membaca', async () => {
  assert.match((await kirim({ pesan: 'hai' })).error, /minimal 5/);
  assert.equal((await kirim({ jenis: 'fitur', pesan: 'Tambah mode turnamen mingguan dong', nama: 'budi', bintang: 5 })).ok, true);
  assert.match((await kirim({ pesan: 'saran kedua cepat sekali' })).error, /1 menit/);
  assert.equal((await kirim({ pesan: 'spam dari bot', web: 'http://spam' }, '2.2.2.2')).ok, true);
  const d = await S.daftar();
  assert.equal(d.total, 1); assert.equal(d.baru, 1);
  assert.deepEqual([d.saran[0].jenis, d.saran[0].nama, d.saran[0].bintang], ['fitur', '@budi', 5]);
  assert.ok(!JSON.stringify(d).includes('1.1.1.1')); // IP tidak disimpan
  await S.tandaiDibaca(); assert.equal((await S.daftar()).baru, 0);
});
