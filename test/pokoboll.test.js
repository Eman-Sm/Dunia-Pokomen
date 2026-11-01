import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
globalThis.fetch = async () => new Response('{}');
const { newWarga } = await import('../lib/rules.js');
const { getJSON, setJSON, redis } = await import('../lib/db.js');
const PB = await import('../lib/pokoboll.js');
const E = await import('../lib/ekonomi.js');
const add = (u, nama, spot) => setJSON('warga', u, newWarga({ username: u, nama, hewan: ['Kucing'], spot }));
const T0 = Date.parse('2026-11-03T12:00:00+07:00');

test('Pokoboll: tersembunyi, lelang, tawar, perpanjang, pemenang dibayar', async () => {
  await redis('SET', 'evo_batu', '1');
  await add('a', 'Ayu', 1); await add('b', 'Bima', 2); await add('c', 'Cici', 3);
  await E.bonusBiji('a', 100); await E.bonusBiji('b', 60); await E.bonusBiji('c', 200);
  assert.deepEqual(PB.publik(await PB.getPB()), { tampil: false });
  await PB.bukaLelang({ mulai: new Date(T0).toISOString(), selesai: new Date(T0 + 48 * 36e5).toISOString(), hargaAwal: 50, kelipatan: 5 }, T0);
  await assert.rejects(PB.tawar('a', 60, { now: T0 + 1000 }), /belum dibuka/); // belum ditampilkan
  await PB.tampil(true);
  await assert.rejects(PB.tawar('a', 40, { now: T0 + 1000 }), /minimal 50/);
  await assert.rejects(PB.tawar('b', 70, { now: T0 + 1000 }), /tidak boleh lebih dari saldo/);
  let p = await PB.tawar('a', 50, { now: T0 + 1000 }); assert.equal(p.lelang.tertinggi.u, 'a'); assert.equal(p.lelang.minimal, 55);
  p = await PB.tawar('b', 55, { now: T0 + 2000 }); assert.equal(p.lelang.tertinggi.u, 'b');
  // tawaran di 5 menit terakhir memperpanjang lelang
  const akhir = T0 + 48 * 36e5;
  p = await PB.tawar('c', 150, { now: akhir - 60000 }); assert.equal(Date.parse(p.lelang.selesai), akhir - 60000 + 5 * 6e4);
  // saldo c turun sebelum lelang ditutup → pemenang jatuh ke penawar berikutnya yang cukup
  await E.bonusBiji('c', -150);
  assert.equal(await PB.tutupLelang({ now: akhir }), null); // belum selesai (diperpanjang)
  const m = await PB.tutupLelang({ now: akhir + 10 * 6e4 });
  assert.equal(m.u, 'b'); assert.equal((await E.saldo('b')).biji, 5);
  assert.equal((await E.saldo('a')).biji, 100); // yang kalah tidak dipotong
  const x = await PB.getPB(); assert.equal(x.pemilik, 'b');
  assert.equal(PB.publik(x).pemilik, 'b');
  assert.equal(await PB.tutupLelang({ now: akhir + 20 * 6e4 }), null); // sekali saja
  await assert.rejects(PB.bukaLelang({ selesai: new Date(akhir + 864e5).toISOString() }, akhir), /sudah punya pemilik/);
  assert.ok(await getJSON('warga', 'b'));
});
