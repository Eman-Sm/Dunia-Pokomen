import test from 'node:test';
import assert from 'node:assert/strict';
import { cariHewan, pesanAmbigu, namaKembar } from '../lib/hewan.js';
const W = [
  { username: 'prayogaaliffiant', nama: 'Raiko', spot: 44 }, { username: '26april2003.exe', nama: 'Raiko', spot: 46 },
  { username: 'gd.biantara', nama: 'Valtherion', spot: 1 }, { username: 'x', nama: 'King Fire', spot: 85 }, { username: 'mati', nama: 'Hantu', spot: 9, mati: { t: 1 } },
];
test('cari hewan lewat nama, nomor, atau @username', () => {
  assert.equal(cariHewan('Valtherion', W).w.username, 'gd.biantara');
  assert.equal(cariHewan('valtherion', W).w.username, 'gd.biantara');
  assert.equal(cariHewan('kingfire', W).w.username, 'x');
  assert.equal(cariHewan('Raiko 47', W).w.username, '26april2003.exe');
  assert.equal(cariHewan('Raiko #45', W).w.username, 'prayogaaliffiant');
  assert.equal(cariHewan('@gd.biantara', W).w.nama, 'Valtherion');
  assert.equal(cariHewan('Raiko', W).ambigu.length, 2);
  assert.equal(cariHewan('Hantu', W).tidak, true);
  assert.match(pesanAmbigu('Raiko', cariHewan('Raiko', W).ambigu), /Raiko 45 \(@prayogaaliffiant\), Raiko 47 \(@26april2003\.exe\)/);
  assert.deepEqual([...namaKembar(W)], ['raiko']);
});
test('kopi dicocokkan lewat nama hewan', async () => {
  const { papanKopi } = await import('../lib/sahabat.js');
  const p = papanKopi([{ nama: 'Rafi', pesan: 'untuk Valtherion', jumlah: 2, t: 'a' }], W);
  assert.equal(p[0].u, 'gd.biantara');
});
