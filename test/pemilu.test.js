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
  const m = u.match(/\/(d1|d2|d3)\/comments/);
  if (m) return new Response(JSON.stringify({ data: COMMENTS[m[1]] }));
  return new Response(JSON.stringify({ error: { message: 'unexpected ' + u } }), { status: 400 });
};
const { hitung, tetapkanKetua, setConfig } = await import('../lib/pemilu.js');
const { setJSON, getJSON } = await import('../lib/db.js');

test('pemilu: hadir di dua hari + total like', async () => {
  await setConfig({ posts: ['d1', 'd2'], wajib: ['d1', 'd2'] });
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

test('pemilu: menunggu bila baru satu postingan', async () => {
  await setConfig({ posts: ['d1'], wajib: [], tutup: null });
  const h = await hitung({ force: true });
  assert.equal(h.menunggu, true);
  assert.equal(h.kandidat.length, 0);
  await setConfig({ posts: [] });
});

test('pemilu: hari hadir dulu, like jadi penentu saat seri', async () => {
  COMMENTS.d3 = [
    { id: 'c1', text: 'Kampanye: Aku hadir terus', username: 'suki', like_count: 1, timestamp: '2026-10-26T01:00:00+0000' },
    { id: 'c2', text: 'hadir', username: 'ray', like_count: 2, timestamp: '2026-10-26T01:10:00+0000' },
    { id: 'c3', text: 'hadir juga', username: 'pega', like_count: 1, timestamp: '2026-10-26T01:20:00+0000' },
  ];
  COMMENTS.d2.push({ id: 'b9', text: 'ikut', username: 'suki', like_count: 0, timestamp: '2026-10-25T05:00:00+0000' });
  COMMENTS.d2[0].like_count = 20;
  await setConfig({ posts: ['d1', 'd2', 'd3'], wajib: ['d2', 'd3'], tutup: null });
  const h = await hitung({ force: true });
  assert.deepEqual(h.wajib, ['d2', 'd3']);
  // all three attended 3 days; suki has fewest likes (50+0+1=51) but most... order by likes: suki 51, ray 1+20+2=23, pega 5+10+6+1=22
  assert.deepEqual(h.kandidat.map((k) => [k.u, k.hadir]), [['suki', 3], ['ray', 3], ['pega', 3]]);
  // someone who skipped day 1 ranks below everyone who came all three days, even with many likes
  COMMENTS.d2.push({ id: 'b10', text: 'baru', username: 'bintang', like_count: 500, timestamp: '2026-10-25T06:00:00+0000' });
  COMMENTS.d3.push({ id: 'c4', text: 'baru', username: 'bintang', like_count: 500, timestamp: '2026-10-26T06:00:00+0000' });
  const h2 = await hitung({ force: true });
  assert.equal(h2.kandidat.at(-1).u, 'bintang');
  assert.equal(h2.kandidat.at(-1).hadir, 2);
});
