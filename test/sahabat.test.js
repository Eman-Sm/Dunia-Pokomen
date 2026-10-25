import test from 'node:test';
import assert from 'node:assert/strict';
import { papanKopi, cocokkan } from '../lib/sahabat.js';

const warga = [
  { username: 'budi', nama: 'Bubu' }, { username: 'cici', nama: 'Cimo' }, { username: 'dodo', nama: 'Dodo', mati: true },
];
const byU = { budi: 1, cici: 1 };

test('pencocokan pengirim kopi ke warga', () => {
  assert.equal(cocokkan({ nama: '@Budi' }, byU), 'budi');
  assert.equal(cocokkan({ nama: 'Kak Ci', pesan: 'semangat! hewanku @cici.' }, byU), 'cici');
  assert.equal(cocokkan({ nama: 'budi', username: '-' }, byU), null);
  assert.equal(cocokkan({ nama: 'X', username: 'cici' }, byU), 'cici');
  assert.equal(cocokkan({ nama: 'Orang Lain' }, byU), null);
});

test('hanya kopi terbanyak jadi Sahabat Admin; seri = yang lebih dulu', () => {
  const items = [
    { nama: 'budi', jumlah: 2, t: '2026-10-25T10:00:00Z' },
    { nama: 'cici', jumlah: 1, t: '2026-10-25T09:00:00Z' },
    { nama: 'cici', jumlah: 1, t: '2026-10-25T11:00:00Z' },
    { nama: 'dodo', jumlah: 9, t: '2026-10-25T08:00:00Z' }, // dead citizen: ignored
    { nama: 'anon', jumlah: 5, t: '2026-10-25T08:00:00Z' }, // not a citizen: ignored
    { nama: 'budi', jumlah: 3, hidden: true }, // hidden by admin: ignored
  ];
  const p = papanKopi(items, warga);
  assert.deepEqual(p.map((x) => [x.u, x.total]), [['budi', 2], ['cici', 2]]);
  items.push({ nama: 'cici', jumlah: 1, t: '2026-10-25T12:00:00Z' });
  assert.equal(papanKopi(items, warga)[0].u, 'cici');
});

test('tes webhook Trakteer tidak dihitung', async () => {
  const { isTest } = await import('../lib/sahabat.js');
  assert.equal(isTest({ nama: '[ Stream Test ]' }), true);
  assert.equal(isTest({ nama: 'Seseorang' }), false);
  const p = papanKopi([{ nama: '[ Stream Test ]', username: 'budi', jumlah: 9, t: 'x' }, { nama: 'cici', jumlah: 1, t: 'y' }], warga);
  assert.deepEqual(p.map((x) => x.u), ['cici']);
});
