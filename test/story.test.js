import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
process.env.IG_ACCESS_TOKEN = 'tok';
const sent = [];
globalThis.fetch = async (url, opt = {}) => {
  const u = String(url);
  if (opt.method === 'POST') { sent.push(u); return new Response('{}'); }
  if (u.includes('/me/conversations')) return new Response(JSON.stringify({ data: [{ id: 'C1' }] }));
  if (u.includes('/C1?')) return new Response(JSON.stringify({ messages: { data: [
    { id: 'M1', created_time: '2026-10-25T11:05:00+0000', from: { id: 'ID-budi', username: 'budi' }, message: 'Lulu keren!', story: { reply_to: { id: 'S1', link: 'https://x/s1' } } },
    { id: 'M2', created_time: '2026-10-25T11:06:00+0000', from: { id: 'ID-budi', username: 'budi' }, message: 'halo biasa' },
  ] } }));
  if (u.includes('/ID-budi?')) return new Response(JSON.stringify({ username: 'budi', is_user_follow_business: true }));
  return new Response(JSON.stringify({ error: { message: 'x', code: 1 } }), { status: 400 });
};
const { storyInfo, fromWebhook, syncStoryReplies, listStoryReplies } = await import('../lib/story.js');
const { handleDM } = await import('../lib/rules.js');
const { setJSON } = await import('../lib/db.js');

test('story reply & mention dikenali, DM biasa tidak', () => {
  assert.equal(storyInfo({ text: 'hai' }), null);
  assert.equal(storyInfo({ reply_to: { story: { id: 'S1', url: 'u' } } }).jenis, 'balasan');
  assert.equal(storyInfo({ attachments: [{ type: 'story_mention', payload: { url: 'u' } }] }).jenis, 'mention');
});

test('balasan story tersimpan, tidak dobel, dan warga tidak dikirimi DM otomatis', async () => {
  await setJSON('warga', 'budi', { username: 'budi', nama: 'Bubu', hewan: ['Kucing'] });
  const m = { sender: { id: 'ID-budi' }, timestamp: 1792929000000, message: { mid: 'W1', text: '🔥', reply_to: { story: { id: 'S2', url: 'https://x/s2' } } } };
  assert.equal(await fromWebhook(m), 'disimpan');
  assert.equal(await fromWebhook(m), 'sudah-ada');
  assert.equal(await handleDM('ID-budi', { quiet: true }), 'sudah-lahir:diam');
  assert.equal(sent.length, 0);
  const r = await syncStoryReplies();
  assert.deepEqual(r, { percakapan: 1, balasanDitemukan: 1, baru: 1 });
  const L = await listStoryReplies();
  assert.equal(L.total, 2);
  assert.equal(L.balasan.find((x) => x.mid === 'W1').warga.nama, 'Bubu');
  assert.equal(L.perStory.length, 2);
});
