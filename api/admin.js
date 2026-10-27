// Admin API — every request needs  Authorization: Bearer <ADMIN_PASSWORD>
// Body: { action: '...', ...params }
import { redis, getJSON, setJSON, hgetallJSON } from '../lib/db.js';
import { CONFIG, newWarga, log, birth, requireFollow, askIfMissing, ensureTierSchema, matikan, hidupkan } from '../lib/rules.js';
import { cekUnfollowOtomatis, bandingkanFollowers, parseFollowers } from '../lib/unfollow.js';
import { generateArt, quota as geminiQuota } from '../lib/gemini.js';
import { listStoryReplies, syncStoryReplies } from '../lib/story.js';
import { papanKopi, cocokkan } from '../lib/sahabat.js';
import { syncLatest, ownUsername } from '../lib/sync.js';
import { refreshToken, subscribeWebhooks, listMedia, listComments, me, sendDM } from '../lib/ig.js';
import { json, bearer, safeEqual, hariKe } from '../lib/http.js';
import { katalog, pakaiItem, riwayatItem } from '../lib/item.js';
import * as ob from '../lib/obrolan.js';
import { getCfg as pwCfg, setCfg as pwSet, hasilWilayah, tetapkanPemenang } from '../lib/wilayah.js';
import { getConfig as pemiluCfg, setConfig as pemiluSet, hitung as pemiluHitung, tetapkanKetua } from '../lib/pemilu.js';

const HEX = /^#[0-9a-f]{6}$/i;
const cleanPal = (p) => (p && HEX.test(p.body) ? { body: p.body, acc: HEX.test(p.acc) ? p.acc : null, acc2: HEX.test(p.acc2) ? p.acc2 : null } : null);
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
      kopiBoard: papanKopi((await redis('LRANGE', 'dukungan', 0, 199) || []).map((s) => JSON.parse(s)), warga),
      requireFollow: requireFollow(),
      menunggu: (await hgetallJSON('menunggu')).sort((a, b) => String(b.t).localeCompare(String(a.t))),
      trakteerLastRaw: trRaw || null,
      trakteerLastRejected: trRej ? JSON.parse(trRej) : null,
      trakteerReady: !!(process.env.TRAKTEER_URL && process.env.TRAKTEER_WEBHOOK_TOKEN),
    };
  },
  async cari_komentar({ username, posts = 5 }) {
    const u = key(username); if (!u) throw new Error('username kosong');
    const media = await listMedia(Math.min(10, Number(posts) || 5));
    const out = [];
    for (const m of media) {
      const cs = await listComments(m.id, 3000);
      for (const c of cs) if (key(c.username) === u) out.push({ ...c, post: (m.caption || '').slice(0, 40), processed: !!(await redis('SISMEMBER', 'processed', c.id)) });
    }
    return { username: u, komentar: out };
  },
  async kirim_dm({ igsid, username, text }) {
    // only works within 24 hours after the user's last message to the account (Instagram rule)
    let id = String(igsid || '').trim();
    if (!id && username) { const w = await getJSON('warga', key(username)); id = w?.igsid || ''; }
    if (!id) throw new Error('ID Instagram (igsid) belum diketahui');
    if (!text || String(text).length > 900) throw new Error('Isi pesan kosong / terlalu panjang');
    await sendDM(id, String(text));
    return { terkirim: true, igsid: id };
  },
  async story_list() { return listStoryReplies(); },
  async story_sync({ max = 100 }) {
    let ownId = null; try { ownId = (await me()).user_id || null; } catch { /* ignore */ }
    return syncStoryReplies({ maxConv: Math.min(300, Number(max) || 100), ownId: ownId ? String(ownId) : null });
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
  async add_warga({ username, nama, hewan, cerita, igsid }) {
    const u = key(username);
    if (!u || !nama) throw new Error('username dan nama wajib diisi');
    if (await getJSON('warga', u)) throw new Error('Warga @' + u + ' sudah ada');
    const spot = Number(await redis('INCR', 'spot_counter')) - 1;
    const w = newWarga({ username: u, nama, hewan: parseHewan(hewan), cerita: cerita || null, spot, source: 'manual', igsid: igsid ? String(igsid) : null });
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
    for (const f of ['elemen', 'outfit', 'wujud', 'skill']) if (patch[f] !== undefined) w[f] = String(patch[f] || '').trim().slice(0, 120) || null;
    if (patch.tier !== undefined) w.tier = Math.max(0, Math.min(CONFIG.tiers.length - 1, Number(patch.tier)));
    let tanya = null;
    if (w.tier > before) {
      await log(w.tier === CONFIG.tiers.length - 1 ? 'legenda' : 'evolusi', `${w.nama} milik @${u} kini menjadi ${CONFIG.tiers[w.tier]}!`, { u });
      tanya = await askIfMissing(w, w.lastCommentId || w.commentId);
    }
    await setJSON('warga', u, w);
    return { ...w, tanya };
  },
  async set_art({ username, dataUrl, pal }) {
    const u = key(username);
    const w = await getJSON('warga', u);
    if (!w) throw new Error('Warga tidak ditemukan');
    if (!/^data:image\/(webp|jpeg|png);base64,/.test(dataUrl || '')) throw new Error('Format gambar tidak dikenal');
    if (dataUrl.length > 900000) throw new Error('Gambar terlalu besar setelah dikompres (maks ±650 KB)');
    await redis('SET', 'art:' + u, dataUrl);
    w.artVer = Date.now();
    w.artTier = Math.min(3, w.tier); // stage the picture shows (Mythical is the final art stage)
    w.pal = cleanPal(pal) || null; // world colours follow the card art
    await setJSON('warga', u, w);
    await log('info', `Kartu Warga ${w.nama} milik @${u} kini punya gambar anime!`, { u });
    return { username: u, artVer: w.artVer };
  },
  async set_pal({ username, pal }) {
    const u = key(username);
    const w = await getJSON('warga', u);
    if (!w) throw new Error('Warga tidak ditemukan');
    w.pal = cleanPal(pal);
    if (!w.pal) throw new Error('Warna tidak valid');
    await setJSON('warga', u, w);
    return { username: u, pal: w.pal };
  },
  async set_sprite({ username, dataUrl }) {
    const u = key(username);
    const w = await getJSON('warga', u);
    if (!w) throw new Error('Warga tidak ditemukan');
    if (!/^data:image\/png;base64,/.test(dataUrl || '')) throw new Error('Sprite harus PNG transparan');
    if (dataUrl.length > 300000) throw new Error('Sprite terlalu besar');
    await redis('SET', 'sprite:' + u, dataUrl);
    w.spriteVer = Date.now(); w.spriteTier = w.tier;
    await setJSON('warga', u, w);
    return { username: u, spriteVer: w.spriteVer };
  },
  async remove_sprite({ username }) {
    const u = key(username);
    const w = await getJSON('warga', u);
    if (!w) throw new Error('Warga tidak ditemukan');
    await redis('DEL', 'sprite:' + u);
    w.spriteVer = null;
    await setJSON('warga', u, w);
    return { removed: true };
  },
  async remove_art({ username }) {
    const u = key(username);
    const w = await getJSON('warga', u);
    if (!w) throw new Error('Warga tidak ditemukan');
    await redis('DEL', 'art:' + u);
    w.artVer = null; w.pal = null;
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
  async pw_status() { return { cfg: await pwCfg(), hasil: await hasilWilayah() }; },
  async pw_set({ tutup, buka, wilayah, ketuaOtomatis }) {
    const patch = {};
    if (tutup) patch.tutup = new Date(tutup).toISOString();
    if (buka) patch.buka = new Date(buka).toISOString();
    if (Array.isArray(wilayah)) patch.wilayah = wilayah.map(Number).filter(Boolean);
    if (ketuaOtomatis && typeof ketuaOtomatis === 'object') patch.ketuaOtomatis = ketuaOtomatis;
    return pwSet(patch);
  },
  async pw_tetapkan({ force }) { return tetapkanPemenang({ force: !!force }); },
  async item_katalog() { return { katalog: katalog(), riwayat: await riwayatItem(50) }; },
  async pakai_item({ username, item, nilai, bukti }) { return pakaiItem({ username, item, nilai, bukti }); },
  async ob_info() { return ob.adminInfo(); },
  async ob_list({ ruang = 'semua' }) { return ob.adminList(ruang); },
  async ob_hapus({ id, tampil }) { return ob.adminHapus(id, !!tampil); },
  async ob_bisukan({ username, menit }) { return ob.adminBisukan(username, Number(menit) || 0); },
  async ob_kunci({ on }) { return ob.adminKunci(!!on); },
  async ob_kata({ tambah, hapus }) { return ob.adminKata(tambah, hapus); },
  async ob_link({ username, baru }) {
    const u = key(username); const w = await getJSON('warga', u); if (!w) throw new Error('warga tidak ditemukan');
    const k = await ob.tokenFor(u, { baru: !!baru });
    return { link: `https://${(process.env.SITE_URL || 'dunia-pokomen.vercel.app').replace(/^https?:\/\//, '')}/?u=${encodeURIComponent(u)}&k=${k}#obrolan` };
  },
  async usul_wilayah_list() { return hgetallJSON('usul_wilayah'); },
  async usul_wilayah_status({ id, status }) {
    const x = await getJSON('usul_wilayah', String(id)); if (!x) throw new Error('usulan tidak ditemukan');
    x.status = ['ditolak', 'resmi'].includes(status) ? status : null; await setJSON('usul_wilayah', x.id, x); return x;
  },
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
  async link_dukungan({ id, username }) {
    const list = (await redis('LRANGE', 'dukungan', 0, 199)) || [];
    const idx = list.findIndex((s) => JSON.parse(s).id === id);
    if (idx < 0) throw new Error('Dukungan tidak ditemukan');
    const x = JSON.parse(list[idx]);
    const u = username === '-' ? '-' : key(username);
    if (u && u !== '-' && !(await getJSON('warga', u))) throw new Error('@' + u + ' belum punya hewan di dunia');
    x.username = u || null;
    await redis('LSET', 'dukungan', idx, JSON.stringify(x));
    return { id, username: x.username };
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
