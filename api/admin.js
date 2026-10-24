// Admin API — every request needs  Authorization: Bearer <ADMIN_PASSWORD>
// Body: { action: '...', ...params }
import { redis, getJSON, setJSON, hgetallJSON } from '../lib/db.js';
import { CONFIG, newWarga, log } from '../lib/rules.js';
import { syncLatest, ownUsername } from '../lib/sync.js';
import { refreshToken, subscribeWebhooks, listMedia, me } from '../lib/ig.js';
import { json, bearer, safeEqual, hariKe } from '../lib/http.js';

const key = (u) => String(u || '').toLowerCase().replace(/^@/, '').trim();
const parseHewan = (h) => (Array.isArray(h) ? h : String(h || '').split(/\s*[+&,]\s*/)).map((s) => s.trim()).filter(Boolean).slice(0, 3);

const actions = {
  async status() {
    const [warga, pendingRaw, usulan, lastSync, refreshed, start, tokenSaved] = await Promise.all([
      hgetallJSON('warga'), redis('LRANGE', 'pending', 0, 99), hgetallJSON('usulan'),
      redis('GET', 'last_sync'), redis('GET', 'ig_token_refreshed'), redis('GET', 'hari_pertama'), redis('GET', 'ig_token'),
    ]);
    let account = null, igError = null;
    try { account = await me(); } catch (e) { igError = e.message; }
    return {
      account, igError, lastSync, tokenRefreshed: refreshed, tokenSource: tokenSaved ? 'database' : (process.env.IG_ACCESS_TOKEN ? 'env' : 'kosong'),
      hari: hariKe(start), hariPertama: start || process.env.POKOMEN_HARI_PERTAMA || null,
      tiers: CONFIG.tiers, config: CONFIG,
      warga: warga.sort((a, b) => a.spot - b.spot),
      pending: (pendingRaw || []).map((s) => JSON.parse(s)),
      usulan: usulan.sort((a, b) => b.likes - a.likes),
    };
  },
  async sync({ posts = 5 }) { return syncLatest(Math.min(25, Number(posts) || 5)); },
  async media() { return listMedia(10); },
  async refresh_token() { return refreshToken(); },
  async subscribe_webhook() { return subscribeWebhooks(); },
  async set_token({ token }) {
    if (!token || token.length < 20) throw new Error('Token tidak valid');
    await redis('SET', 'ig_token', token.trim());
    await redis('SET', 'ig_token_refreshed', new Date().toISOString());
    await redis('DEL', 'ig_username');
    return { saved: true, username: await ownUsername() };
  },
  async set_hari_pertama({ date }) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('Format tanggal: YYYY-MM-DD');
    await redis('SET', 'hari_pertama', date);
    return { hari: hariKe(date) };
  },
  async add_warga({ username, nama, hewan, cerita }) {
    const u = key(username);
    if (!u || !nama) throw new Error('username dan nama wajib diisi');
    if (await getJSON('warga', u)) throw new Error('Warga @' + u + ' sudah ada');
    const spot = Number(await redis('INCR', 'spot_counter')) - 1;
    const w = newWarga({ username: u, nama, hewan: parseHewan(hewan), cerita: cerita || null, spot, source: 'manual' });
    await setJSON('warga', u, w);
    await log('lahir', `@${u} lahir sebagai ${w.nama} (${w.hewan.join(' + ')})`, { u });
    return w;
  },
  async update_warga({ username, patch = {} }) {
    const u = key(username);
    const w = await getJSON('warga', u);
    if (!w) throw new Error('Warga tidak ditemukan');
    const before = w.tier;
    if (patch.nama !== undefined) w.nama = String(patch.nama).slice(0, 24);
    if (patch.hewan !== undefined) w.hewan = parseHewan(patch.hewan);
    if (patch.hidden !== undefined) w.hidden = !!patch.hidden;
    if (patch.spriteUrl !== undefined) w.spriteUrl = patch.spriteUrl || null;
    if (patch.cerita) w.cerita.push({ text: String(patch.cerita).slice(0, 280), mediaId: null, t: new Date().toISOString() });
    if (patch.tier !== undefined) w.tier = Math.max(0, Math.min(CONFIG.tiers.length - 1, Number(patch.tier)));
    await setJSON('warga', u, w);
    if (w.tier > before) await log(w.tier === CONFIG.tiers.length - 1 ? 'legenda' : 'evolusi', `${w.nama} milik @${u} kini menjadi ${CONFIG.tiers[w.tier]}!`, { u });
    return w;
  },
  async delete_warga({ username }) {
    await redis('HDEL', 'warga', key(username));
    return { deleted: true };
  },
  async resolve_pending({ id, approve, nama, hewan, cerita }) {
    const list = (await redis('LRANGE', 'pending', 0, 299)) || [];
    const raw = list.find((s) => JSON.parse(s).id === id);
    if (!raw) throw new Error('Komentar tidak ditemukan di antrean');
    await redis('LREM', 'pending', 1, raw);
    if (!approve) return { dismissed: true };
    const p = JSON.parse(raw);
    return actions.add_warga({ username: p.username, nama, hewan, cerita });
  },
  async set_usulan({ id, status, episode, likes }) {
    const x = await getJSON('usulan', id);
    if (!x) throw new Error('Usulan tidak ditemukan');
    if (status !== undefined) x.status = status || null;
    if (episode !== undefined) x.episode = episode || null;
    if (likes !== undefined) x.likes = Number(likes) || 0;
    await setJSON('usulan', id, x);
    if (status === 'dibangun') await log('bangun', `${x.text} usulan @${x.username} dibangun!`, {});
    return x;
  },
  async add_usulan({ text, username = 'admin', likes = 0 }) {
    const id = 'manual-' + Date.now();
    const x = { id, username: key(username), text, mediaId: null, likes: Number(likes) || 0, status: null, episode: null, t: new Date().toISOString() };
    await setJSON('usulan', id, x);
    return x;
  },
  async post_log({ text }) {
    await log('info', String(text).slice(0, 200));
    return { ok: true };
  },
};

export async function POST(request) {
  if (!process.env.ADMIN_PASSWORD) return json({ error: 'ADMIN_PASSWORD belum diatur di Vercel' }, 500);
  if (!safeEqual(bearer(request), process.env.ADMIN_PASSWORD)) return json({ error: 'Password salah' }, 401);
  let body = {};
  try { body = await request.json(); } catch { /* empty */ }
  const fn = actions[body.action];
  if (!fn) return json({ error: 'Aksi tidak dikenal: ' + body.action }, 400);
  try {
    return json({ ok: true, data: await fn(body) });
  } catch (e) {
    return json({ error: e.message }, 400);
  }
}
