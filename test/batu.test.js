import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
globalThis.fetch = async () => new Response('{}');
const { processComment, newWarga, tambahBatu, CONFIG } = await import('../lib/rules.js');
const { getJSON, setJSON, redis } = await import('../lib/db.js');
await redis('SET', 'tier_schema', '6'); await redis('SET', 'evolusi_cerita_1', 'selesai');
const c = (u, text, mediaId, id) => processComment({ id, username: u, text, mediaId, timestamp: new Date().toISOString() });

test('Legendary & God Mode: cerita + Batu Evolusi (aktif setelah diumumkan)', async () => {
  const w = newWarga({ username: 'm', nama: 'Mito', hewan: ['Naga'], spot: 3 }); w.tier = 3; await setJSON('warga', 'm', w);
  assert.equal(CONFIG.benefits[4], '???'); assert.equal(CONFIG.benefits[5], '???');
  // belum aktif: cerita di Mythical tidak menaikkan tingkat
  assert.equal(await c('m', 'Cerita: hari ini Mito terbang ke gunung', 'q1', 'b1'), 'cerita');
  await redis('SET', 'evo_batu', '1');
  assert.equal(await c('m', 'Cerita: Mito menjaga desa semalaman', 'q2', 'b2'), 'cerita-kurang-batu');
  await tambahBatu('m', 2, 'tes');
  assert.equal(await c('m', 'Cerita: Mito menemukan gua kristal', 'q3', 'b3'), 'evolusi-batu');
  let x = await getJSON('warga', 'm'); assert.equal(x.tier, 4); assert.equal(x.batu, 0);
  await tambahBatu('m', 3);
  assert.equal(await c('m', 'Cerita: Mito bertarung dengan badai', 'q3', 'b4'), 'cerita'); // postingan yang sama: tidak naik lagi
  assert.equal(await c('m', 'Cerita: Mito bertarung dengan badai besar', 'q4', 'b5'), 'evolusi-batu');
  x = await getJSON('warga', 'm'); assert.equal(x.tier, 5); assert.equal(x.batu, 0);
  assert.equal(await c('m', 'Cerita: Mito sudah jadi dewa sekarang', 'q5', 'b6'), 'cerita'); // God Mode = tertinggi
});

test('God Mode memanggil cuaca seminggu sekali; outfit hanya 1 pakaian', async () => {
  const { parseComment } = await import('../lib/parse.js');
  const { cuacaAktif, jenisCuaca } = await import('../lib/dewa.js');
  assert.equal(parseComment('Outfit: jubah merah, topi emas dan pedang').outfit, 'jubah merah');
  assert.equal(jenisCuaca('hujan bintang dong'), 'bintang'); assert.equal(jenisCuaca('badai petir'), 'petir'); assert.equal(jenisCuaca('panas'), null);
  const g = newWarga({ username: 'g', nama: 'Gaia', hewan: ['Naga'], spot: 5 }); g.tier = 5; await setJSON('warga', 'g', g);
  const l = newWarga({ username: 'l', nama: 'Lumo', hewan: ['Kucing'], spot: 6 }); l.tier = 4; await setJSON('warga', 'l', l);
  assert.equal(await c('l', 'Cuaca: hujan bintang', 'r1', 'c1'), 'cuaca:bukan-dewa');
  assert.equal(await c('g', 'Cuaca: panas terik', 'r1', 'c2'), 'cuaca:tidak-dikenal');
  assert.equal(await c('g', 'Cuaca: hujan bintang', 'r1', 'c3'), 'cuaca:bintang');
  const a = await cuacaAktif(); assert.equal(a.length, 1); assert.equal(a[0].wilayah, 1); assert.equal(a[0].jenis, 'bintang');
  assert.equal(await c('g', 'Cuaca: salju', 'r1', 'c4'), 'cuaca:tunggu');
});

