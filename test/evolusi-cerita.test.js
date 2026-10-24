import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
globalThis.fetch = async () => new Response('{}');
const { birth, evolusiCeritaAwal, CONFIG } = await import('../lib/rules.js');
CONFIG.birthStoryEvolves = false; // simulate the old data
const { getJSON, setJSON, redis } = await import('../lib/db.js');
await redis('SET', 'tier_schema', '6');

test('warga yang sudah bercerita berevolusi sekali saja', async () => {
  await birth({ username: 'a', nama: 'A', hewan: ['Kucing'], cerita: 'suka tidur di gudang', mediaId: 'p1' });
  await birth({ username: 'b', nama: 'B', hewan: ['Naga'], cerita: '-', mediaId: 'p1' });
  await birth({ username: 'c', nama: 'C', hewan: ['Unicorn'], cerita: 'suka membuat sihir baru', mediaId: 'p1' });
  const c = await getJSON('warga', 'c'); c.cerita.push({ text: 'hari ini belajar mengendalikan sihir', mediaId: 'p1' }); await setJSON('warga', 'c', c);
  const r = await evolusiCeritaAwal();
  assert.equal(r.length, 2);
  assert.equal((await getJSON('warga', 'a')).tier, 1);
  assert.equal((await getJSON('warga', 'b')).tier, 0);
  assert.equal((await getJSON('warga', 'c')).tier, 2);
  assert.equal(await evolusiCeritaAwal(), null); // never runs twice
});
