// ============================================================
//  ATURAN DUNIA POKOMEN — ubah di sini sesuai kebutuhan
// ============================================================
export const CONFIG = {
  // nama tiap tingkat (index = tingkat)
  tiers: ['Hewan Reguler', 'Evolusi 1', 'Evolusi 2', 'Legenda'],
  // tingkat tertinggi yang bisa dicapai otomatis lewat cerita.
  // Tingkat di atasnya (Legenda) hanya bisa diberikan Admin.
  maxAutoTier: 2,
  // cerita di komentar pendaftaran ikut dihitung sebagai evolusi?
  birthStoryEvolves: false,
  // satu postingan hanya bisa memberi 1 evolusi per warga (anti spam)
  oneEvolutionPerPost: true,
  // panjang minimal cerita agar dihitung
  minStoryLength: 12,
};

import { redis, getJSON, setJSON } from './db.js';
import { parseComment } from './parse.js';
import { sendPrivateReply, sendDM, userProfile } from './ig.js';

/** Follow + comment rule: born only after the commenter replies to our DM and follows the account. */
export const requireFollow = () => process.env.REQUIRE_FOLLOW === '1';
const HANDLE = () => '@' + (process.env.IG_USERNAME || 'duniapokomen');
const SITE = () => process.env.SITE_URL || 'dunia-pokomen.vercel.app';
export const MSG = {
  ask: (nama) => `Halo! Admin Dunia Pokomen di sini. ${nama} siap lahir! Balas DM ini dengan kata LAHIR untuk mengonfirmasi. Pastikan kamu sudah follow ${HANDLE()} ya, karena hanya follower yang bisa jadi warga.`,
  born: (nama) => `Selamat! ${nama} resmi lahir di Dunia Pokomen sebagai Hewan Reguler. Cari dia di peta: ${SITE()}`,
  notFollowing: () => `Ups, kamu belum follow ${HANDLE()}. Follow dulu, lalu balas LAHIR lagi di sini ya!`,
  already: (nama) => `${nama} sudah lahir kok. Cek di ${SITE()}`,
};

const key = (u) => String(u || '').toLowerCase().replace(/^@/, '');

export async function log(type, text, extra = {}) {
  await redis('LPUSH', 'log', JSON.stringify({ t: new Date().toISOString(), type, text, ...extra }));
  await redis('LTRIM', 'log', 0, 199);
}

export function newWarga({ username, nama, hewan, cerita, mediaId, commentId, timestamp, spot, source = 'instagram' }) {
  return {
    username: key(username),
    nama,
    hewan,
    tier: 0,
    spot,
    cerita: cerita ? [{ text: cerita, mediaId, t: timestamp }] : [],
    evolusiPosts: [],
    lahir: timestamp || new Date().toISOString(),
    commentId: commentId || null,
    mediaId: mediaId || null,
    hidden: false,
    spriteUrl: null,
    source,
  };
}

/**
 * Process one comment. Idempotent per comment id.
 * c = { id, text, username, mediaId, timestamp, likeCount, parentId }
 * returns a short string describing what happened
 */
export async function processComment(c, { ownUsername } = {}) {
  if (!c || !c.id || !c.username) return 'skip:invalid';
  const u = key(c.username);
  if (ownUsername && u === key(ownUsername)) return 'skip:own';
  const ts = c.timestamp || new Date().toISOString();
  const p = parseComment(c.text);

  // facility suggestions: always refresh like count
  if (p.usul) {
    const prev = await getJSON('usulan', c.id);
    await setJSON('usulan', c.id, {
      id: c.id, username: u, text: p.usul, mediaId: c.mediaId || null,
      likes: typeof c.likeCount === 'number' ? c.likeCount : (prev?.likes || 0),
      status: prev?.status || null, episode: prev?.episode || null, t: prev?.t || ts,
    });
  }

  const already = await redis('SISMEMBER', 'processed', c.id);
  if (already) return p.usul ? 'usul:likes-updated' : 'skip:seen';
  await redis('SADD', 'processed', c.id);

  let w = await getJSON('warga', u);
  if (!w) {
    if (p.nama && p.hewan) {
      const data = { username: u, nama: p.nama, hewan: p.hewan, cerita: p.cerita, mediaId: c.mediaId, commentId: c.id, timestamp: ts, igsid: c.userId || null };
      if (requireFollow()) {
        const prev = await getJSON('menunggu', u);
        const entry = { ...data, t: ts, dmSent: prev?.dmSent || false, dmError: null };
        if (!prev?.dmSent) {
          try {
            const r = await sendPrivateReply(c.id, MSG.ask(p.nama));
            entry.dmSent = true;
            if (r && r.recipient_id) entry.igsid = r.recipient_id;
          } catch (e) { entry.dmError = e.message; }
        }
        await setJSON('menunggu', u, entry);
        if (entry.igsid) await redis('HSET', 'igsid', entry.igsid, u);
        return 'menunggu';
      }
      await birth(data);
      return 'lahir';
    }
    if (p.usul) return 'usul';
    // could not understand: queue for admin
    if ((c.text || '').trim().length >= 6) {
      await redis('LPUSH', 'pending', JSON.stringify({ id: c.id, username: u, text: c.text, mediaId: c.mediaId || null, t: ts, parsed: p }));
      await redis('LTRIM', 'pending', 0, 299);
      return 'pending';
    }
    return 'skip:short';
  }

  // existing citizen
  let result = p.usul ? 'usul' : 'skip:nothing';
  const story = p.cerita && p.cerita.length >= CONFIG.minStoryLength ? p.cerita : null;
  if (story) {
    w.cerita.push({ text: story, mediaId: c.mediaId || null, t: ts });
    if (w.cerita.length > 20) w.cerita = w.cerita.slice(-20);
    const usedPost = CONFIG.oneEvolutionPerPost && c.mediaId && (w.evolusiPosts.includes(c.mediaId) || (w.mediaId === c.mediaId && !CONFIG.birthStoryEvolves));
    if (!usedPost && w.tier < CONFIG.maxAutoTier) {
      w.tier += 1;
      if (c.mediaId) w.evolusiPosts.push(c.mediaId);
      await log('evolusi', `${w.nama} milik @${u} berevolusi menjadi ${CONFIG.tiers[w.tier]}!`, { u });
      result = 'evolusi';
    } else {
      result = 'cerita';
    }
    await setJSON('warga', u, w);
  }
  return result;
}

/** Create a citizen (shared by comment flow, follow confirmation and admin). */
export async function birth({ username, nama, hewan, cerita, mediaId, commentId, timestamp, source = 'instagram' }) {
  const u = key(username);
  const spot = Number(await redis('INCR', 'spot_counter')) - 1;
  const w = newWarga({ username: u, nama, hewan, cerita, mediaId, commentId, timestamp, spot, source });
  if (cerita && CONFIG.birthStoryEvolves && w.tier < CONFIG.maxAutoTier) { w.tier += 1; if (mediaId) w.evolusiPosts.push(mediaId); }
  await setJSON('warga', u, w);
  await redis('HDEL', 'menunggu', u);
  await log('lahir', `@${u} lahir sebagai ${w.nama} (${w.hewan.join(' + ')})`, { u });
  return w;
}

/**
 * A DM arrived from igsid. If that person has a waiting registration, check follow status
 * and either give birth or ask them to follow first.
 */
export async function handleDM(igsid) {
  let prof;
  try { prof = await userProfile(igsid); } catch (e) { return 'error:' + e.message; }
  const u = key(prof.username || (await redis('HGET', 'igsid', igsid)) || '');
  if (!u) return 'skip:unknown';
  const existing = await getJSON('warga', u);
  const wait = await getJSON('menunggu', u);
  if (!wait) {
    if (existing) { await sendDM(igsid, MSG.already(existing.nama)).catch(() => {}); return 'sudah-lahir'; }
    return 'skip:no-registration';
  }
  if (!prof.is_user_follow_business) {
    wait.lastCheck = new Date().toISOString(); wait.following = false;
    await setJSON('menunggu', u, wait);
    await sendDM(igsid, MSG.notFollowing()).catch(() => {});
    return 'belum-follow';
  }
  const w = await birth(wait);
  await sendDM(igsid, MSG.born(w.nama)).catch(() => {});
  return 'lahir';
}

export function publicWarga(w) {
  return {
    u: w.username, nama: w.nama, hewan: w.hewan, tier: w.tier, tierNama: CONFIG.tiers[w.tier] || CONFIG.tiers[0],
    spot: w.spot, cerita: (w.cerita || []).slice(-3).map((c) => c.text), lahir: w.lahir, sprite: w.spriteUrl || null,
    art: w.artVer ? `api/art?u=${encodeURIComponent(w.username)}&v=${w.artVer}` : null,
  };
}
