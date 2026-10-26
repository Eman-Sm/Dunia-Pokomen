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
    'Armor dasar + Skill',
    'Outfit custom',
    'Ganti wujud dasar (Mecha, Mecha Beast, Kristal, dll.)',
  ],
  // tingkat tertinggi yang bisa dicapai otomatis lewat cerita (index: 3 = Mythical).
  // Tingkat di atasnya (Legendary, God Mode) hanya bisa diberikan Admin.
  maxAutoTier: 3,
  // tingkat saat fitur terbuka (index)
  unlock: { besar: 1, elemen: 2, armor: 3, skill: 3, outfit: 4, wujud: 5 },
  // pilihan yang ditawarkan saat bertanya ke pemilik
  elemenPilihan: ['Api', 'Air', 'Angin', 'Tanah', 'Petir', 'Es', 'Daun', 'Cahaya', 'Kegelapan'],
  wujudPilihan: ['Mecha', 'Mecha Beast', 'Cyborg', 'Kristal', 'Roh Cahaya', 'Kaiju'],
  // cerita di komentar pendaftaran ikut dihitung sebagai evolusi?
  birthStoryEvolves: true, // cerita saat mendaftar langsung membuat hewan lahir sebagai Pseudo-evo
  // satu postingan hanya bisa memberi 1 evolusi per warga (anti spam)
  oneEvolutionPerPost: true,
  // panjang minimal cerita agar dihitung
  minStoryLength: 12,
  // public reply with the correct registration format to non-citizen comments we cannot read
  autoBalasFormat: process.env.AUTO_BALAS_FORMAT !== '0',
  balasFormatMaxPerHari: Number(process.env.AUTO_BALAS_FORMAT_MAX || 150),
  balasFormatMaxUmurJam: 72,
};

import { redis, getJSON, setJSON } from './db.js';
import { parseComment, cleanNama, cleanHewan, validUsul } from './parse.js';
import { niatKomentar } from './niat.js';
import { sendPrivateReply, sendDM, userProfile, replyToComment } from './ig.js';

/** Follow + comment rule: born only after the commenter replies to our DM and follows the account. */
export const requireFollow = () => process.env.REQUIRE_FOLLOW === '1';
const HANDLE = () => '@' + (process.env.IG_USERNAME || 'duniapokomen');
const SITE = () => process.env.SITE_URL || 'dunia-pokomen.vercel.app';
export const MSG = {
  ask: (nama) => `Halo! Admin Dunia Pokomen di sini. ${nama} siap lahir! Balas DM ini dengan kata LAHIR untuk mengonfirmasi. Pastikan kamu sudah follow ${HANDLE()} ya, karena hanya follower yang bisa jadi warga.`,
  born: (nama, u, tier = 'Regular') => `Selamat! ${nama} resmi lahir di Dunia Pokomen sebagai ${tier}. Buka link ini, hewanmu langsung ditandai di peta: https://${SITE().replace(/^https?:\/\//, '')}/peta.html?u=${encodeURIComponent(u || '')}`,
  notFollowing: () => `Ups, kamu belum follow ${HANDLE()}. Follow dulu, lalu balas LAHIR lagi di sini ya!`,
  already: (nama) => `${nama} sudah lahir kok. Cek di ${SITE()}`,
  askElemen: (u, nama) => `@${u} ${nama} mencapai MEGA EVOLUTION! Elemen apa yang bangkit dalam dirinya? Balas komentar ini dengan format "Elemen: ..." (contoh: ${CONFIG.elemenPilihan.join(', ')})`,
  askOutfit: (u, nama) => `@${u} ${nama} mencapai LEGENDARY EVOLUTION! Mau pakai outfit apa? Balas komentar ini dengan format "Outfit: ..." (contoh: Outfit: jubah ninja merah dengan syal emas)`,
  askSkill: (u, nama) => `@${u} ${nama} mencapai MYTHICAL EVOLUTION dan bisa mengeluarkan SKILL! Skill apa yang dia punya? Balas komentar ini dengan format "Skill: ..." (contoh: Skill: menyemburkan api, Skill: terbang, Skill: menghilang). Skill akan tampil terus di dunia!`,
  formatFull: [
    (u) => `@${u} Halo! Biar hewanmu bisa lahir di Dunia Pokomen, tulis komentar dengan format ini ya:\n\nNama: Bolu | Hewan: Kucing + Naga | Cerita: suka menghangatkan air mandi warga\n\nKalau Cerita ikut diisi, hewanmu langsung lahir sebagai Pseudo-evo! Jangan lupa follow ${HANDLE()}`,
    (u) => `@${u} Mau punya hewan di Dunia Pokomen? Komen pakai format ini:\n\nNama: (nama hewanmu) | Hewan: (jenis, boleh gabungan) | Cerita: (kebiasaan uniknya)\n\nContoh: Nama: Mochi | Hewan: Kelinci + Axolotl | Cerita: suka tidur di bawah jamur. Follow ${HANDLE()} dulu ya!`,
    (u) => `@${u} Pendaftaran warga pakai format ini ya:\n\nNama: ... | Hewan: ... | Cerita: ...\n\nContoh: Nama: Kiko | Hewan: Rubah + Ikan | Cerita: suka mencuri ikan dari sungai. Ada cerita = langsung Pseudo-evo! Wajib follow ${HANDLE()}`,
  ],
  formatHewan: (u, nama) => `@${u} ${nama} hampir lahir! Tinggal tambahkan jenis hewannya. Komen lagi seperti ini:\n\nNama: ${nama} | Hewan: Kucing + Naga | Cerita: kebiasaan uniknya\n\nJangan lupa follow ${HANDLE()}`,
  formatNama: (u, hewan) => `@${u} ${hewan} yang lucu! Tinggal kasih nama. Komen lagi seperti ini:\n\nNama: (nama hewanmu) | Hewan: ${hewan} | Cerita: kebiasaan uniknya\n\nJangan lupa follow ${HANDLE()}`,
  askWujud: (u, nama) => `@${u} ${nama} mencapai GOD MODE! Pilih wujud dasar barunya. Balas komentar ini dengan format "Wujud Dewa: ..." (contoh: ${CONFIG.wujudPilihan.join(', ')})`,
};

/** Ask the owner for missing data after reaching a tier (public comment reply). */
async function askIfMissing(w, commentId) {
  if (!commentId) return null;
  const U = CONFIG.unlock;
  let text = null, flag = null;
  if (w.tier >= U.wujud && !w.wujud && !w.asked?.wujud) { text = MSG.askWujud(w.username, w.nama); flag = 'wujud'; }
  else if (w.tier >= U.outfit && !w.outfit && !w.asked?.outfit) { text = MSG.askOutfit(w.username, w.nama); flag = 'outfit'; }
  else if (w.tier >= U.skill && !w.skill && !w.asked?.skill) { text = MSG.askSkill(w.username, w.nama); flag = 'skill'; }
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

/** Reply under a comment from a non-citizen that is not a valid registration, with the correct format.
 *  At most once per account per post, only on fresh comments, with a daily cap. */
async function balasFormat(c, u, p) {
  if (!CONFIG.autoBalasFormat || !c.id || c.parentId) return null;
  const text = String(c.text || '');
  const bare = text.replace(/@[\w.]+/g, '').replace(/[^\p{L}\p{N}]/gu, '');
  if (bare.length < 2) return null; // only emoji, punctuation or tagging friends
  const t = Date.parse(c.timestamp || '');
  if (t && Date.now() - t > CONFIG.balasFormatMaxUmurJam * 36e5) return null;
  const once = u + '|' + (c.mediaId || '-');
  if (await redis('SISMEMBER', 'format_dibalas', once)) return null;
  const day = 'format_hari_' + new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  if (Number(await redis('GET', day) || 0) >= CONFIG.balasFormatMaxPerHari) return 'format:batas-harian';
  const hewan = (p.hewan || []).join(' + ');
  const msg = p.nama && !p.hewan ? MSG.formatHewan(u, p.nama)
    : p.hewan && !p.nama ? MSG.formatNama(u, hewan)
    : MSG.formatFull[parseInt(String(c.id).replace(/\D/g, '').slice(-4) || '0', 10) % MSG.formatFull.length](u);
  await redis('SADD', 'format_dibalas', once);
  await redis('INCR', day); await redis('EXPIRE', day, 172800);
  try { await replyToComment(c.id, msg); return 'format:dibalas'; }
  catch (e) { return 'format:gagal ' + e.message; }
}

export async function log(type, text, extra = {}) {
  await redis('LPUSH', 'log', JSON.stringify({ t: new Date().toISOString(), type, text, ...extra }));
  await redis('LTRIM', 'log', 0, 199);
}

export function newWarga({ username, nama, hewan, cerita, mediaId, commentId, timestamp, spot, source = 'instagram', elemen = null, outfit = null, wujud = null, skill = null, igsid = null }) {
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
    elemen, outfit, wujud, skill,
    lastCommentId: commentId || null,
    asked: {},
    source,
    igsid: igsid || null,
    mati: null,
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

  let w = await getJSON('warga', u);
  if (w && c.userId && !w.igsid) { w.igsid = String(c.userId); await setJSON('warga', u, w); }

  const already = await redis('SISMEMBER', 'processed', c.id);
  if (already) return p.usul ? 'usul:likes-updated' : 'skip:seen';
  await redis('SADD', 'processed', c.id);

  // a dead citizen stays a grave; the owner can only start over with a new registration
  if (w && w.mati) {
    if (!(p.nama && p.hewan)) return 'skip:mati';
    await kuburkan(w);
    w = null;
  }
  if (!w) {
    if (p.nama && p.hewan) {
      const data = { username: u, nama: p.nama, hewan: p.hewan, cerita: p.cerita, mediaId: c.mediaId, commentId: c.id, timestamp: ts, igsid: c.userId || null, elemen: p.elemen, outfit: p.outfit, wujud: p.wujud, skill: p.skill };
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
    // read the intent: only people who want to register get the format; chatting is left alone
    const niat = niatKomentar(c.text, p);
    if (niat === 'interaksi' && !(p.elemen || p.outfit || p.wujud || p.skill)) return 'skip:interaksi';
    const fmt = await balasFormat(c, u, p);
    const tag = '';
    if (p.elemen || p.outfit || p.wujud || p.skill) return 'skip:bukan-warga' + tag;
    // wants to register but could not be read: queue for admin
    if ((c.text || '').trim().length >= 6) {
      await redis('LPUSH', 'pending', JSON.stringify({ id: c.id, username: u, text: c.text, mediaId: c.mediaId || null, t: ts, parsed: p, formatDibalas: fmt === 'format:dibalas' }));
      await redis('LTRIM', 'pending', 0, 299);
      return 'pending' + tag;
    }
    return 'skip:short' + tag;
  }

  // existing citizen
  let result = p.usul ? 'usul' : 'skip:nothing';
  let changed = false;
  w.lastCommentId = c.id;
  for (const f of ['elemen', 'outfit', 'wujud', 'skill']) {
    if (p[f] && p[f] !== w[f]) {
      w[f] = p[f]; changed = true; result = f;
      if (w.tier >= CONFIG.unlock[f]) await log('evolusi', `${w.nama} milik @${u} kini ${f === 'elemen' ? 'ber-elemen ' : f === 'outfit' ? 'memakai outfit ' : f === 'skill' ? 'punya skill: ' : 'berwujud '}${p[f]}!`, { u });
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
export async function birth({ username, nama, hewan, cerita, mediaId, commentId, timestamp, source = 'instagram', elemen = null, outfit = null, wujud = null, skill = null, igsid = null }) {
  const u = key(username);
  const spot = Number(await redis('INCR', 'spot_counter')) - 1;
  const w = newWarga({ username: u, nama, hewan, cerita, mediaId, commentId, timestamp, spot, source, elemen, outfit, wujud, skill, igsid });
  if (cerita && ceritaValid({ text: cerita }) && CONFIG.birthStoryEvolves && w.tier < CONFIG.maxAutoTier) { w.tier += 1; if (mediaId) w.evolusiPosts.push(mediaId); }
  await setJSON('warga', u, w);
  await redis('HDEL', 'menunggu', u);
  const lalu = await redis('HGET', 'makam_terakhir', u);
  await log('lahir', lalu ? `@${u} kembali dan melahirkan ${w.nama} (${w.hewan.join(' + ')}). Semoga kali ini dirawat!` : `@${u} lahir sebagai ${w.nama} (${w.hewan.join(' + ')})${w.tier ? ' dan langsung ' + CONFIG.tiers[w.tier] + ' berkat ceritanya!' : ''}`, { u });
  return w;
}

/**
 * A DM arrived from igsid. If that person has a waiting registration, check follow status
 * and either give birth or ask them to follow first.
 */
export async function handleDM(igsid, { quiet = false } = {}) {
  let prof;
  try { prof = await userProfile(igsid); } catch (e) { return 'error:' + e.message; }
  const u = key(prof.username || (await redis('HGET', 'igsid', igsid)) || '');
  if (!u) return 'skip:unknown';
  const existing = await getJSON('warga', u);
  const wait = await getJSON('menunggu', u);
  if (!wait) {
    if (existing && quiet) return 'sudah-lahir:diam';
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
  await sendDM(igsid, MSG.born(w.nama, w.username, CONFIG.tiers[w.tier])).catch(() => {});
  return 'lahir';
}

export function publicWarga(w) {
  return {
    u: w.username, nama: w.nama, hewan: w.hewan, tier: w.tier, tierNama: CONFIG.tiers[w.tier] || CONFIG.tiers[0],
    spot: w.spot, cerita: (w.cerita || []).slice(-3).map((c) => c.text), lahir: w.lahir,
    sprite: w.spriteVer ? `api/art?u=${encodeURIComponent(w.username)}&k=sprite&v=${w.spriteVer}` : (w.spriteUrl || null),
    // features only show once their tier is reached
    elemen: w.tier >= CONFIG.unlock.elemen ? (w.elemen || null) : null,
    outfit: w.tier >= CONFIG.unlock.outfit ? (w.outfit || null) : null,
    wujud: w.tier >= CONFIG.unlock.wujud ? (w.wujud || null) : null,
    skill: w.tier >= CONFIG.unlock.skill ? (w.skill || null) : null,
    gelar: w.gelar || null,
    mati: w.mati || null,
    art: w.artVer ? `api/art?u=${encodeURIComponent(w.username)}&v=${w.artVer}` : null,
    pal: w.artVer && w.pal ? w.pal : null,
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
  if ((await redis('GET', 'tier_schema')) === '6') { await evolusiCeritaAwal(); return; }
  const { hgetallJSON } = await import('./db.js');
  for (const w of await hgetallJSON('warga')) {
    if (w.tier === 3) { w.tier = 4; await setJSON('warga', w.username, w); }
  }
  await redis('SET', 'tier_schema', '6');
  await evolusiCeritaAwal();
}

const ceritaValid = (c) => { const t = String(c?.text || '').trim(); return t.length >= CONFIG.minStoryLength && /[a-z]{3}/i.test(t); };

/**
 * One-time (25 Okt 2026): citizens that already told a story evolve.
 * Each valid story = 1 level, up to Mythical (maxAutoTier). Never lowers a tier.
 */
export async function evolusiCeritaAwal() {
  if ((await redis('SET', 'evolusi_cerita_1', 'jalan', 'NX')) !== 'OK') return null;
  const { hgetallJSON } = await import('./db.js');
  const hasil = [];
  for (const w of await hgetallJSON('warga')) {
    if (w.mati || w.hidden) continue;
    const n = (w.cerita || []).filter(ceritaValid).length;
    const target = Math.min(n, CONFIG.maxAutoTier);
    if (target <= w.tier) continue;
    w.tier = target;
    for (const c of w.cerita) if (c.mediaId && !w.evolusiPosts.includes(c.mediaId)) w.evolusiPosts.push(c.mediaId);
    await askIfMissing(w, w.lastCommentId || w.commentId);
    await setJSON('warga', w.username, w);
    await log('evolusi', `${w.nama} milik @${w.username} berevolusi menjadi ${CONFIG.tiers[w.tier]} berkat ceritanya!`, { u: w.username });
    hasil.push({ u: w.username, tier: w.tier });
  }
  await redis('SET', 'evolusi_cerita_1', JSON.stringify({ t: new Date().toISOString(), jumlah: hasil.length, hasil }));
  return hasil;
}


// ============================================================
//  UNFOLLOW = HEWAN MATI (diterlantarkan pemiliknya)
// ============================================================
export const SEBAB = { unfollow: 'diterlantarkan pemiliknya (unfollow)' };

/** Mark a citizen dead. Its grave stays on the map. */
export async function matikan(username, { sebab = 'unfollow', oleh = 'admin' } = {}) {
  const u = key(username);
  const w = await getJSON('warga', u);
  if (!w) throw new Error('Warga @' + u + ' tidak ditemukan');
  if (w.mati) return w;
  w.mati = { t: new Date().toISOString(), sebab, oleh };
  if (w.gelar) { w.gelarLalu = w.gelar; w.gelar = null; }
  await setJSON('warga', u, w);
  await log('mati', `${w.nama} milik @${u} mati karena ${SEBAB[sebab] || sebab}. Beristirahatlah dengan tenang.`, { u });
  return w;
}

/** Undo a death (admin mistake / owner followed again and asked nicely). */
export async function hidupkan(username) {
  const u = key(username);
  const w = await getJSON('warga', u);
  if (!w) throw new Error('Warga @' + u + ' tidak ditemukan');
  if (!w.mati) return w;
  w.mati = null;
  if (w.gelarLalu) { w.gelar = w.gelarLalu; w.gelarLalu = null; }
  await setJSON('warga', u, w);
  await log('info', `Keajaiban! ${w.nama} milik @${u} hidup kembali.`, { u });
  return w;
}

/** Move a dead citizen to the graveyard so its owner can register a new animal. */
export async function kuburkan(w) {
  const id = w.username + ':' + (w.mati?.t || new Date().toISOString());
  await setJSON('makam', id, { ...w, makamId: id });
  await redis('HSET', 'makam_terakhir', w.username, id);
  await redis('HDEL', 'warga', w.username);
}

export function publicMakam(w) {
  return { u: w.username, nama: w.nama, hewan: w.hewan, tier: w.tier, tierNama: CONFIG.tiers[w.tier] || CONFIG.tiers[0], spot: w.spot, lahir: w.lahir, mati: w.mati, cerita: [], makam: true };
}
