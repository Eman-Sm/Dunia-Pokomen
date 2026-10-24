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
      const spot = Number(await redis('INCR', 'spot_counter')) - 1;
      w = newWarga({ username: u, nama: p.nama, hewan: p.hewan, cerita: p.cerita, mediaId: c.mediaId, commentId: c.id, timestamp: ts, spot });
      if (p.cerita && CONFIG.birthStoryEvolves && w.tier < CONFIG.maxAutoTier) {
        w.tier += 1; w.evolusiPosts.push(c.mediaId);
      }
      await setJSON('warga', u, w);
      await log('lahir', `@${u} lahir sebagai ${w.nama} (${w.hewan.join(' + ')})`, { u });
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

export function publicWarga(w) {
  return {
    u: w.username, nama: w.nama, hewan: w.hewan, tier: w.tier, tierNama: CONFIG.tiers[w.tier] || CONFIG.tiers[0],
    spot: w.spot, cerita: (w.cerita || []).slice(-3).map((c) => c.text), lahir: w.lahir, sprite: w.spriteUrl || null,
  };
}
