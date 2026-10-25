// Admin API — every request needs  Authorization: Bearer <ADMIN_PASSWORD>
// Body: { action: '...', ...params }
import { redis, getJSON, setJSON, hgetallJSON } from '../lib/db.js';
import { CONFIG, newWarga, log, birth, requireFollow, askIfMissing, ensureTierSchema, matikan, hidupkan } from '../lib/rules.js';
import { cekUnfollowOtomatis, bandingkanFollowers, parseFollowers } from '../lib/unfollow.js';
import { generateArt, quota as geminiQuota } from '../lib/gemini.js';
import { syncLatest, ownUsername } from '../lib/sync.js';
import { refreshToken, subscribeWebhooks, listMedia, me } from '../lib/ig.js';
import { json, bearer, safeEqual, hariKe } from '../lib/http.js';
import { getConfig as pemiluCfg, setConfig as pemiluSet, hitung as pemiluHitung, tetapkanKetua } from '../lib/pemilu.js';

const key = (u) => String(u || '').toLowerCase().replace(/^@/, '').trim();
const parseHewan = (h) => (Array.isArray(h) ? h : String(h || '').split(/\s*[+&,]\s*/)).map((s) => s.trim()).filter(Boolean).slice(0, 3);

const actions = {
  async status() {
    await ensureTierSchema();
    const [warga, pendingRaw, usulan, lastSync, refreshed, start, tokenSaved, dukRaw, trRaw, trRej] = await Promise.all([
      hgetallJSON('warga'), redis('LRANGE', 'pending', 0, 99), hgetallJSON('usulan'),
      redis('GET', 'last_sync'), redis('GET', 'ig_token_refreshed'), redis('GET', 'hari_pertama'), redis('GET', 'ig_token'),
      redis('LRANGE', 'dukungan', 0, 49), redis('GET', 'trakteer_last_raw'), redis('GET', 'trakteer_last_rejected'),
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
      dukungan: (dukRaw || []).map((s) => JSON.parse(s)),
      requireFollow: requireFollow(),
      menunggu: (await hgetallJSON('menunggu')).sort((a, b) => String(b.t).localeCompare(String(a.t))),
      trakteerLastRaw: trRaw || null,
      trakteerLastRejected: trRej ? JSON.parse(trRej) : null,
      trakteerReady: !!(process.env.TRAKTEER_URL && process.env.TRAKTEER_WEBHOOK_TOKEN),
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
    for (const f of ['elemen', 'outfit', 'wujud']) if (patch[f] !== undefined) w[f] = String(patch[f] || '').trim().slice(0, 120) || null;
    if (patch.tier !== undefined) w.tier = Math.max(0, Math.min(CONFIG.tiers.length - 1, Number(patch.tier)));
    let tanya = null;
    if (w.tier > before) {
      await log(w.tier === CONFIG.tiers.length - 1 ? 'legenda' : 'evolusi', `${w.nama} milik @${u} kini menjadi ${CONFIG.tiers[w.tier]}!`, { u });
      tanya = await askIfMissing(w, w.lastCommentId || w.commentId);
    }
    await setJSON('warga', u, w);
    return { ...w, tanya };
  },
  async set_art({ username, dataUrl }) {
    const u = key(username);
    const w = await getJSON('warga', u);
    if (!w) throw new Error('Warga tidak ditemukan');
    if (!/^data:image\/(webp|jpeg|png);base64,/.test(dataUrl || '')) throw new Error('Format gambar tidak dikenal');
    if (dataUrl.length > 900000) throw new Error('Gambar terlalu besar setelah dikompres (maks ±650 KB)');
    await redis('SET', 'art:' + u, dataUrl);
    w.artVer = Date.now();
    w.artTier = w.tier; // remember the stage the picture shows
    await setJSON('warga', u, w);
    await log('info', `Kartu Warga ${w.nama} milik @${u} kini punya gambar anime!`, { u });
    return { username: u, artVer: w.artVer };
  },
  async remove_art({ username }) {
    const u = key(username);
    const w = await getJSON('warga', u);
    if (!w) throw new Error('Warga tidak ditemukan');
    await redis('DEL', 'art:' + u);
    w.artVer = null;
    await setJSON('warga', u, w);
    return { removed: true };
  },
  async pemilu_status() {
    let media = [], mediaError = null;
    try { media = await listMedia(8); } catch (e) { mediaError = e.message; }
    return { cfg: await pemiluCfg(), hasil: await getJSON('pemilu_hasil'), media, mediaError };
  },
  async pemilu_set({ posts, wajib, tutup }) {
    const p = Array.isArray(posts) ? posts.filter(Boolean).slice(0, 6) : [];
    const wj = Array.isArray(wajib) ? wajib.filter((x) => p.includes(x)) : [];
    return pemiluSet({ posts: p, wajib: wj, tutup: tutup ? new Date(tutup).toISOString() : null });
  },
  async matikan({ username, usernames }) {
    const list = (usernames && usernames.length ? usernames : [username]).map(key).filter(Boolean).slice(0, 200);
    const hasil = [];
    for (const u of list) { try { await matikan(u, { sebab: 'unfollow', oleh: 'admin' }); hasil.push({ u, ok: true }); } catch (e) { hasil.push({ u, error: e.message }); } }
    return { mati: hasil.filter((x) => x.ok).length, hasil };
  },
  async hidupkan({ username }) { return hidupkan(username); },
  async cek_unfollow({ dryRun = false }) { return cekUnfollowOtomatis({ limit: 60, dryRun: !!dryRun }); },
  async banding_followers({ text, followers }) {
    const list = Array.isArray(followers) && followers.length ? followers : parseFollowers(text);
    return bandingkanFollowers(list);
  },
  async unfollow_status() {
    const last = await redis('GET', 'unfollow_last');
    const warga = await hgetallJSON('warga');
    return { last: last ? JSON.parse(last) : null, punyaId: warga.filter((w) => w.igsid && !w.mati).length, hidup: warga.filter((w) => !w.mati).length, mati: warga.filter((w) => w.mati).length, otomatis: process.env.CEK_UNFOLLOW !== '0' };
  },
  async gemini_status() { return geminiQuota(); },
  async gemini_art({ username, prompt, ref }) {
    const u = key(username);
    if (!(await getJSON('warga', u))) throw new Error('Warga tidak ditemukan');
    if (!prompt || prompt.length < 20) throw new Error('Prompt kosong');
    if (ref && ref.length > 200000) ref = null;
    const r = await generateArt({ prompt: String(prompt).slice(0, 4000), ref });
    return { username: u, ...r, quota: await geminiQuota() };
  },
  async pemilu_hitung() { return pemiluHitung({ force: true }); },
  async tetapkan_ketua({ username }) { return tetapkanKetua(username); },
  async approve_menunggu({ username }) {
    const x = await getJSON('menunggu', key(username));
    if (!x) throw new Error('Tidak ada di daftar tunggu');
    return birth({ ...x, source: 'manual-follow' });
  },
  async dismiss_menunggu({ username }) {
    await redis('HDEL', 'menunggu', key(username));
    return { dismissed: true };
  },
  async delete_warga({ username }) {
    await redis('DEL', 'art:' + key(username));
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
  async set_dukungan({ id, hidden }) {
    const list = (await redis('LRANGE', 'dukungan', 0, 199)) || [];
    const raw = list.find((s) => JSON.parse(s).id === id);
    if (!raw) throw new Error('Dukungan tidak ditemukan');
    const x = JSON.parse(raw); x.hidden = !!hidden;
    // replace in place: remove then re-insert at the same position
    const idx = list.indexOf(raw);
    const rebuilt = list.map((s, i) => (i === idx ? JSON.stringify(x) : s));
    await redis('DEL', 'dukungan');
    for (let i = rebuilt.length - 1; i >= 0; i--) await redis('LPUSH', 'dukungan', rebuilt[i]);
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
