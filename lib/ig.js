// Instagram API with Instagram Login (graph.instagram.com) helpers.
import { redis } from './db.js';

const VERSION = process.env.IG_API_VERSION ? '/' + process.env.IG_API_VERSION.replace(/^\//, '') : '';
const BASE = 'https://graph.instagram.com' + VERSION;

export async function getToken() {
  const t = await redis('GET', 'ig_token').catch(() => null);
  return t || process.env.IG_ACCESS_TOKEN || null;
}

async function call(path, params = {}, method = 'GET') {
  const token = await getToken();
  if (!token) throw new Error('Access token Instagram belum diatur (IG_ACCESS_TOKEN).');
  const url = new URL(path.startsWith('http') ? path : BASE + path);
  if (!path.startsWith('http')) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('access_token', token);
  }
  const r = await fetch(url, { method });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const e = new Error('Instagram API: ' + (j.error?.message || r.status));
    e.code = j.error?.code;
    throw e;
  }
  return j;
}

export async function me() {
  return call('/me', { fields: 'user_id,username' });
}

export async function listMedia(limit = 10) {
  const j = await call('/me/media', { fields: 'id,caption,timestamp,permalink,media_type', limit: String(limit) });
  return j.data || [];
}

const FIELDS_FULL = 'id,text,timestamp,username,like_count,from,replies{id,text,timestamp,username,like_count,from}';
const FIELDS_MIN = 'id,text,timestamp,username,from,replies{id,text,timestamp,username,from}';

function norm(c, mediaId, parentId = null) {
  return {
    id: c.id, text: c.text || '', timestamp: c.timestamp,
    username: c.username || c.from?.username, mediaId, parentId,
    likeCount: typeof c.like_count === 'number' ? c.like_count : undefined,
  };
}

export async function listComments(mediaId, max = 1000) {
  let fields = FIELDS_FULL;
  let page;
  try {
    page = await call(`/${mediaId}/comments`, { fields, limit: '50' });
  } catch (e) {
    if (e.code !== 100) throw e; // field not supported -> retry without like_count
    fields = FIELDS_MIN;
    page = await call(`/${mediaId}/comments`, { fields, limit: '50' });
  }
  const out = [];
  while (page) {
    for (const c of page.data || []) {
      out.push(norm(c, mediaId));
      for (const r of c.replies?.data || []) out.push(norm(r, mediaId, c.id));
    }
    if (out.length >= max || !page.paging?.next) break;
    page = await call(page.paging.next);
  }
  return out;
}

export async function refreshToken() {
  const token = await getToken();
  if (!token) throw new Error('Access token Instagram belum diatur (IG_ACCESS_TOKEN).');
  const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Refresh token gagal: ' + (j.error?.message || r.status));
  if (j.access_token) {
    await redis('SET', 'ig_token', j.access_token);
    await redis('SET', 'ig_token_refreshed', new Date().toISOString());
  }
  return { expires_in: j.expires_in };
}

export async function subscribeWebhooks() {
  return call('/me/subscribed_apps', { subscribed_fields: 'comments' }, 'POST');
}
