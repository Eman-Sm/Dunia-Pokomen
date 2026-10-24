// ============================================================
//  ATURAN DUNIA POKOMEN — ubah di sini sesuai kebutuhan
// ============================================================
export const CONFIG = {
  // nama tiap tingkat (index = tingkat)
  tiers: ['Regular', 'Pseudo-evo', 'Mega Evolution', 'Mythical Evolution', 'Legendary Evolution', 'God Mode'],
  // benefit tiap tingkat (tampil di website & kartu)
  benefits: [
    '-',
    'Tumbuh besar',
    'Elemen bangkit',
    'Armor dasar',
    'Outfit custom',
    'Ganti wujud dasar (Mecha, Mecha Beast, Kristal, dll.)',
  ],
  // tingkat tertinggi yang bisa dicapai otomatis lewat cerita (index: 3 = Mythical).
  // Tingkat di atasnya (Legendary, God Mode) hanya bisa diberikan Admin.
  maxAutoTier: 3,
  // tingkat saat fitur terbuka (index)
  unlock: { besar: 1, elemen: 2, armor: 3, outfit: 4, wujud: 5 },
  // pilihan yang ditawarkan saat bertanya ke pemilik
  elemenPilihan: ['Api', 'Air', 'Angin', 'Tanah', 'Petir', 'Es', 'Daun', 'Cahaya', 'Kegelapan'],
  wujudPilihan: ['Mecha', 'Mecha Beast', 'Cyborg', 'Kristal', 'Roh Cahaya', 'Kaiju'],
  // cerita di komentar pendaftaran ikut dihitung sebagai evolusi?
  birthStoryEvolves: false,
  // satu postingan hanya bisa memberi 1 evolusi per warga (anti spam)
  oneEvolutionPerPost: true,
  // panjang minimal cerita agar dihitung
  minStoryLength: 12,
};

import { redis, getJSON, setJSON } from './db.js';
import { parseComment, cleanNama, cleanHewan, validUsul } from './parse.js';
import { sendPrivateReply, sendDM, userProfile, replyToComment } from './ig.js';

/** Follow + comment rule: born only after the commenter replies to our DM and follows the account. */
export const requireFollow = () => process.env.REQUIRE_FOLLOW === '1';
const HANDLE = () => '@' + (process.env.IG_USERNAME || 'duniapokomen');
const SITE = () => process.env.SITE_URL || 'dunia-pokomen.vercel.app';
export const MSG = {
  ask: (nama) => `Halo! Admin Dunia Pokomen di sini. ${nama} siap lahir! Balas DM ini dengan kata LAHIR untuk mengonfirmasi. Pastikan kamu sudah follow ${HANDLE()} ya, karena hanya follower yang bisa jadi warga.`,
  born: (nama) => `Selamat! ${nama} resmi lahir di Dunia Pokomen sebagai Hewan Reguler. Cari dia di peta: ${SITE()}`,
  notFollowing: () => `Ups, kamu belum follow ${HANDLE()}. Follow dulu, lalu balas LAHIR lagi di sini ya!`,
  already: (nama) => `${nama} sudah lahir kok. Cek di ${SITE()}`,
  askElemen: (u, nama) => `@${u} ${nama} mencapai MEGA EVOLUTION! Elemen apa yang bangkit dalam dirinya? Balas komentar ini dengan format "Elemen: ..." (contoh: ${CONFIG.elemenPilihan.join(', ')})`,
  askOutfit: (u, nama) => `@${u} ${nama} mencapai LEGENDARY EVOLUTION! Mau pakai outfit apa? Balas komentar ini dengan format "Outfit: ..." (contoh: Outfit: jubah ninja merah dengan syal emas)`,
  askWujud: (u, nama) => `@${u} ${nama} mencapai GOD MODE! Pilih wujud dasar barunya. Balas komentar ini dengan format "Wujud Dewa: ..." (contoh: ${CONFIG.wujudPilihan.join(', ')})`,
};

/** Ask the owner for missing data after reaching a tier (public comment reply). */
async function askIfMissing(w, commentId) {
  if (!commentId) return null;
  const U = CONFIG.unlock;
  let text = null, flag = null;
  if (w.tier >= U.wujud && !w.wujud && !w.asked?.wujud) { text = MSG.askWujud(w.username, w.nama); flag = 'wujud'; }
  else if (w.tier >= U.outfit && !w.outfit && !w.asked?.outfit) { text = MSG.askOutfit(w.username, w.nama); flag = 'outfit'; }
  else if (w.tier >= U.elemen && !w.elemen && !w.asked?.elemen) { text = MSG.askElemen(w.username, w.nama); flag = 'elemen'; }
  if (!text) return null;
  try {
    await replyToComment(commentId, text);
    w.asked = { ...(w.asked || {}), [flag]: new Date().toISOString() };
    return 'tanya-' + flag;
  } catch (e) { w.askError = e.message; return 'tanya-gagal'; }
}
export { askIfMissing };

const key = (u) => String(u || '').toLowerCase().replace(/^@/, '');

export async function log(type, text, extra = {}) {
  await redis('LPUSH', 'log', JSON.stringify({ t: new Date().toISOString(), type, text, ...extra }));
  await redis('LTRIM', 'log', 0, 199);
}

export function newWarga({ username, nama, hewan, cerita, mediaId, commentId, timestamp, spot, source = 'instagram', elemen = null, outfit = null, wujud = null }) {
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
    elemen, outfit, wujud,
    lastCommentId: commentId || null,
    asked: {},
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
  await ensureTierSchema();
  const u = key(c.username);
  if (ownUsername && u === key(ownUsername)) return 'skip:own';
  const ts = c.timestamp || new Date().toISOString();
  const p = parseComment(c.text);

  // facility suggestions: always refresh like count
  if (p.usul) {
    // one suggestion per user per facility name: likes go to the first comment
    const dupKey = u + '|' + p.usul.toLowerCase();
    const firstId = await redis('HGET', 'usulan_kunci', dupKey);
    if (firstId && firstId !== c.id) p.usul = null;
    else if (!firstId) await redis('HSET', 'usulan_kunci', dupKey, c.id);
  }
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
      const data = { username: u, nama: p.nama, hewan: p.hewan, cerita: p.cerita, mediaId: c.mediaId, commentId: c.id, timestamp: ts, igsid: c.userId || null, elemen: p.elemen, outfit: p.outfit, wujud: p.wujud };
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
    if (p.elemen || p.outfit || p.wujud) return 'skip:bukan-warga';
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
  let changed = false;
  w.lastCommentId = c.id;
  for (const f of ['elemen', 'outfit', 'wujud']) {
    if (p[f] && p[f] !== w[f]) {
      w[f] = p[f]; changed = true; result = f;
      if (w.tier >= CONFIG.unlock[f]) await log('evolusi', `${w.nama} milik @${u} kini ${f === 'elemen' ? 'ber-elemen ' : f === 'outfit' ? 'memakai outfit ' : 'berwujud '}${p[f]}!`, { u });
    }
  }
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
      await askIfMissing(w, c.id);
    } else {
      result = 'cerita';
    }
    changed = true;
  }
  if (changed) await setJSON('warga', u, w);
  return result;
}

/** Create a citizen (shared by comment flow, follow confirmation and admin). */
export async function birth({ username, nama, hewan, cerita, mediaId, commentId, timestamp, source = 'instagram', elemen = null, outfit = null, wujud = null }) {
  const u = key(username);
  const spot = Number(await redis('INCR', 'spot_counter')) - 1;
  const w = newWarga({ username: u, nama, hewan, cerita, mediaId, commentId, timestamp, spot, source, elemen, outfit, wujud });
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
    // features only show once their tier is reached
    elemen: w.tier >= CONFIG.unlock.elemen ? (w.elemen || null) : null,
    outfit: w.tier >= CONFIG.unlock.outfit ? (w.outfit || null) : null,
    wujud: w.tier >= CONFIG.unlock.wujud ? (w.wujud || null) : null,
    gelar: w.gelar || null,
    art: w.artVer ? `api/art?u=${encodeURIComponent(w.username)}&v=${w.artVer}` : null,
  };
}

/** One-time migration from the old 4-tier scheme (Legenda = 3) to the 6-tier scheme. */
export async function ensureTierSchema() {
  if ((await redis('GET', 'nama_fix')) !== '1') {
    const { hgetallJSON } = await import('./db.js');
    for (const w of await hgetallJSON('warga')) {
      const nama = cleanNama(w.nama) || w.nama;
      const hewan = cleanHewan(w.hewan, nama);
      if (nama !== w.nama || JSON.stringify(hewan) !== JSON.stringify(w.hewan)) {
        w.nama = nama; if (hewan.length) w.hewan = hewan;
        await setJSON('warga', w.username, w);
      }
    }
    await redis('SET', 'nama_fix', '1');
  }
  if ((await redis('GET', 'usul_fix')) !== '1') {
    const { hgetallJSON } = await import('./db.js');
    for (const x of await hgetallJSON('usulan')) {
      if (!x.status && !validUsul(x.text)) { x.status = 'ditolak'; x.alasan = 'format tidak valid (otomatis)'; await setJSON('usulan', x.id, x); }
    }
    await redis('SET', 'usul_fix', '1');
  }
  if ((await redis('GET', 'tier_schema')) === '6') return;
  const { hgetallJSON } = await import('./db.js');
  for (const w of await hgetallJSON('warga')) {
    if (w.tier === 3) { w.tier = 4; await setJSON('warga', w.username, w); }
  }
  await redis('SET', 'tier_schema', '6');
}
