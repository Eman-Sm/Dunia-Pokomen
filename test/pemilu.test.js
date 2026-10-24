import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
process.env.IG_ACCESS_TOKEN = 'tok';
process.env.IG_USERNAME = 'duniapokomen';
process.env.ADMIN_PASSWORD = 'pw';
const COMMENTS = {
  d1: [
    { id: 'a1', text: 'Nama: Pega | Hewan: Kuda Putih', username: 'pega', like_count: 5, timestamp: '2026-10-24T01:00:00+0000' },
    { id: 'a2', text: 'Nama: Ray | Hewan: Rubah', username: 'ray', like_count: 1, timestamp: '2026-10-24T02:00:00+0000' },
    { id: 'a3', text: 'Nama: Suki | Hewan: Komodo', username: 'suki', like_count: 50, timestamp: '2026-10-24T03:00:00+0000' },
    { id: 'a4', text: 'halo', username: 'duniapokomen', like_count: 99, timestamp: '2026-10-24T03:00:00+0000' },
  ],
  d2: [
    { id: 'b1', text: 'Kampanye: Berry gratis untuk semua!', username: 'ray', like_count: 20, timestamp: '2026-10-25T01:00:00+0000' },
    { id: 'b2', text: 'Kampanye: Koloni yang damai', username: 'pega', like_count: 10, timestamp: '2026-10-25T02:00:00+0000',
      replies: { data: [{ id: 'b2r', text: 'setuju', username: 'pega', like_count: 6, timestamp: '2026-10-25T02:30:00+0000' }] } },
  ],
};
globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.includes('/me/media')) return new Response(JSON.stringify({ data: [{ id: 'd2' }, { id: 'd1' }] }));
  const m = u.match(/\/(d1|d2)\/comments/);
  if (m) return new Response(JSON.stringify({ data: COMMENTS[m[1]] }));
  return new Response(JSON.stringify({ error: { message: 'unexpected ' + u } }), { status: 400 });
};
const { hitung, tetapkanKetua, setConfig } = await import('../lib/pemilu.js');
const { setJSON, getJSON } = await import('../lib/db.js');

test('pemilu: hadir di dua hari + total like', async () => {
  const h = await hitung({ force: true });
  assert.deepEqual(h.posts, ['d1', 'd2']);
  assert.equal(h.jumlahCalon, 2);              // suki only came on day 1, own account ignored
  const ray = h.kandidat.find((k) => k.u === 'ray'), pega = h.kandidat.find((k) => k.u === 'pega');
  assert.equal(ray.likes, 21);                  // 1 + 20
  assert.equal(pega.likes, 21);                 // 5 + 10 + 6 (reply counts too)
  assert.equal(ray.kampanye, 'Berry gratis untuk semua!');
  assert.ok(!h.kandidat.some((k) => k.u === 'suki' || k.u === 'duniapokomen'));
});

test('pemilu: seri dimenangkan yang komentar lebih awal, lalu tetapkan ketua', async () => {
  const h = await hitung({ force: true });
  assert.equal(h.kandidat[0].likes, h.kandidat[1].likes);
  assert.equal(h.kandidat[0].u, 'pega');
  await setJSON('warga', 'pega', { username: 'pega', nama: 'Pega', hewan: ['Kuda Putih'], tier: 0, spot: 0, cerita: [] });
  const w = await tetapkanKetua('@pega');
  assert.equal(w.gelar, 'Ketua Koloni');
  // closed elections keep their result
  await setConfig({ tutup: new Date(Date.now() - 1000).toISOString() });
  COMMENTS.d2[0].like_count = 999;
  const frozen = await hitung();
  assert.equal(frozen.kandidat[0].u, 'pega');
  assert.equal((await getJSON('warga', 'pega')).gelar, 'Ketua Koloni');
});
