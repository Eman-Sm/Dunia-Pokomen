import test from 'node:test';
import assert from 'node:assert/strict';
import { parseComment } from '../lib/parse.js';

test('format resmi', () => {
  const p = parseComment('Nama: Bolu | Hewan: Kucing + Naga | Cerita: suka menghangatkan air mandi warga pakai napas api');
  assert.equal(p.nama, 'Bolu');
  assert.deepEqual(p.hewan, ['Kucing', 'Naga']);
  assert.match(p.cerita, /menghangatkan/);
});

test('format bebas seperti di video', () => {
  const p = parseComment('Namaku Bolu, mau jadi gabungan KUCING + NAGA ya Admin! Dia suka tidur di atap Balai Warga');
  assert.equal(p.nama, 'Bolu');
  assert.deepEqual(p.hewan, ['Kucing', 'Naga']);
  assert.match(p.cerita, /suka tidur/);
});

test('baris baru & tiga hewan', () => {
  const p = parseComment('nama: Piyo\nhewan: ayam + naga + ikan\ncerita: Piyo suka tidur di atap balai warga');
  assert.equal(p.nama, 'Piyo');
  assert.deepEqual(p.hewan, ['Ayam', 'Naga', 'Ikan']);
});

test('usulan fasilitas', () => {
  assert.equal(parseComment('Usul: kolam minum').usul, 'Kolam Minum');
  assert.equal(parseComment('min tolong bangun lumbung makanan dong').usul, 'Lumbung Makanan');
});

test('cerita lanjutan saja', () => {
  const p = parseComment('Cerita: hari ini Bolu belajar berenang di danau barat');
  assert.equal(p.nama, null);
  assert.match(p.cerita, /berenang/);
});

test('komentar biasa', () => {
  const p = parseComment('keren banget kontennya 🔥');
  assert.equal(p.nama, null); assert.equal(p.hewan, null);
});
