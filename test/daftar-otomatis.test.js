import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
process.env.IG_ACCESS_TOKEN = 'tok';
const balasan = [];
globalThis.fetch = async (url, opt) => { balasan.push(decodeURIComponent(String(url) + ' ' + String(opt?.body || '')).replace(/\+/g, ' ')); return new Response('{"id":"1"}'); };
const { processComment, bacaDaftarOtomatis, namaDariUsername } = await import('../lib/rules.js');
const { getJSON } = await import('../lib/db.js');
const { parseComment } = await import('../lib/parse.js');
const c = (id, username, text) => ({ id, username, text, mediaId: 'm1', timestamp: new Date().toISOString() });

test('komentar bebas "Hewan:Komodo sama cicak nama kocak ..." langsung lahir dengan nama = username', async () => {
  const r = await processComment(c('k1', 'si.kocak_99', 'Hewan:Komodo sama cicak  nama kocak cerita biar bisa bersantai sama tidur'));
  assert.equal(r, 'lahir:otomatis');
  const w = await getJSON('warga', 'si.kocak_99');
  assert.equal(w.nama, 'Si.kocak_99'); assert.deepEqual(w.hewan, ['Komodo', 'Cicak']); assert.equal(w.namaDefault, true);
  assert.ok(balasan.some((b) => /LAHIR/.test(b) && /Nama: nama baru/.test(b)));
  // ganti nama gratis 1x
  assert.equal(await processComment(c('k2', 'si.kocak_99', 'Nama: Kocak')), 'ganti-nama');
  const w2 = await getJSON('warga', 'si.kocak_99'); assert.equal(w2.nama, 'Kocak'); assert.equal(w2.namaDefault, false);
  assert.equal(await processComment(c('k3', 'si.kocak_99', 'Nama: Lain')), 'skip:nothing'); // kedua kali tidak bisa
});

test('ajakan tanpa hewan → hewan dipilihkan; obrolan biasa tidak melahirkan', async () => {
  assert.equal(await processComment(c('k4', 'budi', 'min ikut dong')), 'lahir:otomatis');
  const w = await getJSON('warga', 'budi'); assert.equal(w.hewan.length, 2); assert.equal(w.nama, 'Budi');
  assert.equal(await processComment(c('k5', 'ani', 'aku mau kucing naga')), 'lahir:otomatis');
  assert.deepEqual((await getJSON('warga', 'ani')).hewan, ['Kucing', 'Naga']);
  for (const t of ['namanya lucu banget', 'ikut seneng liatnya', 'keren kak!', 'Valtherion kuat banget']) assert.equal(bacaDaftarOtomatis(t, parseComment(t), 'x'), null, t);
  // format lengkap tetap pakai nama pilihan sendiri
  assert.equal(await processComment(c('k6', 'cici', 'Nama: Mochi | Hewan: Kelinci')), 'lahir');
  assert.equal((await getJSON('warga', 'cici')).namaDefault, undefined);
  assert.equal(namaDariUsername('@itsme_amm012'), 'Itsme_amm012');
});

test('cerita bebas saat daftar & komentar lama sebelum lahir dihitung untuk evolusi', async () => {
  const { evolusiCeritaLama } = await import('../lib/rules.js');
  assert.equal(await processComment(c('e1', 'eko', 'aku mau kucing naga yang suka tidur di atap rumah')), 'lahir:otomatis');
  const w = await getJSON('warga', 'eko'); assert.equal(w.tier, 1); assert.equal(w.cerita[0].text, 'suka tidur di atap rumah');
  const lama = [
    { id: 'o1', text: 'kucing naga ku hobinya makan ikan asin tiap pagi', mediaId: 'm1', timestamp: '2026-10-30T00:00:00Z' }, // video sama → tanpa evolusi
    { id: 'o2', text: 'dia suka terbang ke awan sambil bernyanyi', mediaId: 'm2', timestamp: '2026-10-31T00:00:00Z' },
    { id: 'o3', text: 'keren banget min', mediaId: 'm3', timestamp: '2026-10-31T01:00:00Z' },
    { id: 'o4', text: 'kebiasaannya mencuri kue dari dapur warga', mediaId: 'm4', timestamp: '2026-11-03T00:00:00Z' }, // sesudah lahir → diproses biasa
  ];
  const h = await evolusiCeritaLama({ eko: lama }, { sebelum: '2026-11-02T08:50:00Z' });
  assert.equal(h[0].dari, 1); assert.equal(h[0].ke, 2);
  assert.equal((await getJSON('warga', 'eko')).cerita.length, 3);
});
