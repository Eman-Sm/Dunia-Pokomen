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

test('usulan fasilitas: hanya format resmi dan nama fasilitas singkat', () => {
  assert.equal(parseComment('Usul: kolam minum').usul, 'Kolam Minum');
  assert.equal(parseComment('Usulan: Sarang Hangat').usul, 'Sarang Hangat');
  assert.equal(parseComment('usul fasilitas: kubangan lumpur').usul, 'Kubangan Lumpur');
  // free-form / chatty text is no longer a suggestion
  assert.equal(parseComment('min tolong bangun lumbung makanan dong').usul, null);
  assert.equal(parseComment('Usul: Fasilitas untuk hewanku').usul, null);
  assert.equal(parseComment('Usul: buatkan sarang untuk Pega yang nyaman bersama hewan lain').usul, null);
  assert.equal(parseComment('Usul: buat bisa keliling map min pasti seru').usul, null);
  assert.equal(parseComment('Usul: Pega kesepian 🥲').usul, null);
  assert.equal(parseComment('Usul: taman bermain?').usul, null);
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

test('skill dibaca dari komentar', async () => {
  const { parseComment } = await import('../lib/parse.js');
  assert.equal(parseComment('Skill: menyemburkan api dari mulut').skill, 'menyemburkan api dari mulut');
  assert.equal(parseComment('Jurus: terbang ke awan').skill, 'terbang ke awan');
  assert.equal(parseComment('Nama: Bolu | Hewan: Kucing + Naga | Skill: petir').skill, 'petir');
});
