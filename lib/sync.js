import { redis } from './db.js';
import { listMedia, listComments, me, refreshToken } from './ig.js';
import { processComment } from './rules.js';

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
