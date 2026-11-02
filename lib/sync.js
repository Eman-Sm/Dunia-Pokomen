import { redis } from './db.js';
import { listMedia, listComments, me, refreshToken } from './ig.js';
import { processComment, daftarOtomatis } from './rules.js';
import { getJSON } from './db.js';
import { parseComment } from './parse.js';

export async function ownUsername() {
  let u = process.env.IG_USERNAME || (await redis('GET', 'ig_username'));
  if (!u) {
    try { u = (await me()).username; if (u) await redis('SET', 'ig_username', u); } catch { /* ignore */ }
  }
  return u || null;
}

/** Pull comments of the latest N posts and process them. */
export async function syncLatest(posts = 5) {
  const own = await ownUsername();
  const media = await listMedia(posts);
  const summary = { posts: media.length, comments: 0, results: {} };
  for (const m of media) {
    const comments = await listComments(m.id);
    // oldest first so births happen before evolutions
    comments.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    for (const c of comments) {
      const r = await processComment(c, { ownUsername: own });
      summary.comments++;
      const k = r.split(':')[0];
      summary.results[k] = (summary.results[k] || 0) + 1;
    }
  }
  await redis('SET', 'last_sync', new Date().toISOString());
  return summary;
}

/** Refresh the long-lived token if it is older than `days`. */
export async function maybeRefreshToken(days = 20) {
  const last = await redis('GET', 'ig_token_refreshed');
  if (last && Date.now() - Date.parse(last) < days * 864e5) return { skipped: true, last };
  return refreshToken();
}

/**
 * 2 Nov: scan komentar di SEMUA video untuk orang yang ingin bergabung tapi hewannya belum lahir
 * (format salah / tanpa nama). Hewannya langsung dibuatkan lewat daftarOtomatis. Bisa dicicil: dari..sampai = indeks video.
 */
export async function scanDaftar({ dari = 0, sampai = 100, media = null } = {}) {
  const own = await ownUsername();
  const semua = media || await listMedia(100);
  const hasil = { video: 0, komentar: 0, lahir: [], menunggu: [], total: semua.length };
  const dilihat = new Set();
  for (const m of semua.slice(dari, sampai)) {
    hasil.video++;
    const comments = await listComments(m.id);
    comments.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    for (const c of comments) {
      hasil.komentar++;
      const u = String(c.username || '').toLowerCase().replace(/^@/, '');
      if (!u || dilihat.has(u) || (own && u === own.toLowerCase())) continue;
      if (await getJSON('warga', u)) { dilihat.add(u); continue; }
      const r = await daftarOtomatis(c, u, parseComment(c.text));
      if (!r) continue;
      dilihat.add(u);
      await redis('SADD', 'processed', c.id);
      (r.startsWith('lahir') ? hasil.lahir : hasil.menunggu).push({ u, text: String(c.text).slice(0, 80), media: m.id });
    }
  }
  return hasil;
}
