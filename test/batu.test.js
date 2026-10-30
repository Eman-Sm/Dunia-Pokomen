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
