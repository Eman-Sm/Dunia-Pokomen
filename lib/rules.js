// ============================================================
//  ATURAN DUNIA POKOMEN — ubah di sini sesuai kebutuhan
// ============================================================
import { prosesPemiluWilayah, usulWilayah } from './wilayah.js';
import { tokenFor, sistem as obSistem } from './obrolan.js';

export const CONFIG = {
  // nama tiap tingkat (index = tingkat)
  tiers: ['Regular', 'Pseudo-evo', 'Mega Evolution', 'Mythical Evolution', 'Legendary Evolution', 'God Mode'],
  // benefit tiap tingkat (tampil di website & kartu)
  benefits: [
    '-',
    'Tumbuh besar',
    'Elemen bangkit',
    'Armor dasar + Skill',
    '???', // Legendary: benefit baru tampil setelah diumumkan (lihat benefitsBaru)
    '???', // God Mode: idem
  ],
  // benefit yang tampil setelah aturan Batu Evolusi diumumkan (redis 'evo_batu' = '1')
  benefitsBaru: ['Nama emas + 1 outfit custom', 'Wujud baru, terbang bebas, cuaca, patung'],
  // tingkat tertinggi yang bisa dicapai otomatis lewat cerita (index: 3 = Mythical).
  // Tingkat di atasnya (Legendary, God Mode) hanya bisa diberikan Admin.
  maxAutoTier: 3,
  // Mythical → Legendary dan Legendary → God Mode: cerita (postingan baru) + Batu Evolusi.
  // Aktif hanya setelah diumumkan di video (redis 'evo_batu' = '1', lewat Ruang Admin).
  batuEvolusi: { 3: 2, 4: 3 },
  // fitur tingkat 4/5 (outfit, wujud) tidak ditanyakan ke pemilik selama benefitnya disembunyikan
  tanyaFiturRahasia: false,
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
import { parseComment, cleanNama, cleanHewan, validUsul, jawabanBebas, KATA_SKILL_RE } from './parse.js';
import { niatKomentar, cariHewan, DAFTAR_KUAT_RE } from './niat.js';
import { sendPrivateReply, sendDM, userProfile, replyToComment } from './ig.js';

/** Follow + comment rule: born only after the commenter replies to our DM and follows the account. */
export const requireFollow = () => process.env.REQUIRE_FOLLOW === '1';
const HANDLE = () => '@' + (process.env.IG_USERNAME || 'duniapokomen');
const SITE = () => process.env.SITE_URL || 'dunia-pokomen.vercel.app';
export const MSG = {
  ask: (nama) => `Halo! Admin Dunia Pokomen di sini. ${nama} siap lahir! Balas DM ini dengan kata LAHIR untuk mengonfirmasi. Pastikan kamu sudah follow ${HANDLE()} ya, karena hanya follower yang bisa jadi warga.`,
  born: (nama, u, tier = 'Regular', k = '') => `Selamat! ${nama} resmi lahir di Dunia Pokomen sebagai ${tier}. Buka link pribadimu ini, hewanmu langsung ditandai di peta dan kamu bisa ikut Obrolan Warga (jangan dibagikan ke orang lain ya): https://${SITE().replace(/^https?:\/\//, '')}/?u=${encodeURIComponent(u || '')}${k ? '&k=' + k : ''}#obrolan`,
  obrolan: (nama, u, k) => `Ini link pribadi ${nama} untuk Obrolan Warga 💬 Buka, lalu ngobrol dengan warga satu wilayah atau semua warga. Saat kamu menulis, ${nama} ikut bicara di dunia! JANGAN bagikan link ini ke siapa pun: https://${SITE().replace(/^https?:\/\//, '')}/?u=${encodeURIComponent(u)}&k=${k}#obrolan\n(Kalau link bocor, DM "OBROLAN BARU" untuk ganti link.)`,
  notFollowing: () => `Ups, kamu belum follow ${HANDLE()}. Follow dulu, lalu balas LAHIR lagi di sini ya!`,
  toko: (nama, u, k) => `Ini link pribadi ${nama} untuk Toko Pokomen, Tempat Latihan & Arena 🏪⚔️ Di sini kamu bisa cek Biji Kopi, beli Batu Evolusi, melatih ${nama}, dan menantang hewan lain. JANGAN bagikan link ini ke siapa pun: https://${SITE().replace(/^https?:\/\//, '')}/?u=${encodeURIComponent(u)}&k=${k}#toko`,
  already: (nama) => `${nama} sudah lahir kok. Cek di ${SITE()}\nMau ikut Obrolan Warga? Balas DM ini dengan kata OBROLAN untuk link pribadimu 💬`,
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
  lahirOtomatis: (u, nama, hewan, { namaDefault, hewanAcak, tier } = {}) => `@${u} 🐣 Selamat datang, warga baru! Hewanmu sudah LAHIR di Dunia Pokomen: ${nama} si ${hewan}${tier ? ` (langsung ${tier} berkat ceritanya!)` : ''}.${hewanAcak ? ' Jenis hewannya kami pilihkan untukmu.' : ''}${namaDefault ? `\n\nNamanya sementara pakai username kamu: "${nama}". Mau tetap pakai nama ini atau ganti? Kalau mau ganti, balas komentar ini dengan:\nNama: nama baru\n(ganti nama pertama GRATIS)` : ''}\n\nLihat ${nama} di peta lewat link di bio. Jangan lupa follow ${HANDLE()} ya!`,
  namaDiganti: (u, lama, baru) => `@${u} ✅ Nama hewanmu sudah diganti dari "${lama}" menjadi ${baru}! Sapa warga lain di Obrolan Warga (DM "OBROLAN" untuk link pribadimu).`,
  askWujud: (u, nama) => `@${u} ${nama} mencapai GOD MODE! Pilih wujud dasar barunya. Balas komentar ini dengan format "Wujud Dewa: ..." (contoh: ${CONFIG.wujudPilihan.join(', ')})`,
};

/** Ask the owner for missing data after reaching a tier (public comment reply). */
async function askIfMissing(w, commentId) {
  if (!commentId) return null;
  const U = CONFIG.unlock;
  let text = null, flag = null;
  const rahasia = !CONFIG.tanyaFiturRahasia;
  if (!rahasia && w.tier >= U.wujud && !w.wujud && !w.asked?.wujud) { text = MSG.askWujud(w.username, w.nama); flag = 'wujud'; }
  else if (!rahasia && w.tier >= U.outfit && !w.outfit && !w.asked?.outfit) { text = MSG.askOutfit(w.username, w.nama); flag = 'outfit'; }
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

/**
 * 12 Nov: pemilik yang sudah ditanya ("Skill apa yang dia punya?") sering menjawab tanpa format "Skill: ...".
 * Kalau komentarnya balasan yang menyebut akun kita (atau diawali kata "skill"), dan tidak berisi format lain,
 * anggap itu jawabannya. Mengembalikan { f, v } atau null.
 */
export function jawabTanya(w, c, p, ownUsername) {
  if (!w || !c) return null;
  const f = ['skill', 'elemen'].find((k) => w.asked?.[k] && !w[k] && (w.tier || 0) >= CONFIG.unlock[k] && (!w.asked[k] || !c.timestamp || String(c.timestamp) >= String(w.asked[k]).slice(0, 19)));
  if (!f || p[f]) return null;
  if ((p.nama && p.hewan) || p.usul || p.elemen || p.outfit || p.wujud || p.skill || p.tebak || p.tantang || p.terima != null || p.pilih || p.calon != null || p.cuaca || p.wilayahNama) return null;
  const own = String(ownUsername || process.env.IG_USERNAME || 'duniapokomen').toLowerCase().replace(/^@/, '');
  const text = String(c.text || '');
  const sebut = new RegExp('@' + own.replace(/[.]/g, '\\.') + '\\b', 'i').test(text);
  const kata = f === 'skill' ? KATA_SKILL_RE.test(text) : /^\s*(?:@[\w.]+[\s,]*)*elemen/i.test(text);
  if (!kata && !(c.parentId && sebut)) return null;
  const v = jawabanBebas(text, f);
  return v ? { f, v } : null;
}

/** Admin: tambah/kurangi Batu Evolusi seorang warga (mis. setelah kopi masuk). Tidak diumumkan. */
export async function tambahBatu(username, jumlah, bukti = '') {
  const u = String(username || '').toLowerCase().replace(/^@/, '').trim();
  const w = await getJSON('warga', u); if (!w || w.mati) throw new Error('Hewan tidak ditemukan / sudah mati');
  const n = Math.trunc(Number(jumlah) || 0); if (!n) throw new Error('jumlah kosong');
  w.batu = Math.max(0, (w.batu || 0) + n);
  w.batuLog = [...(w.batuLog || []), { n, bukti: String(bukti).slice(0, 80), t: new Date().toISOString() }].slice(-30);
  await setJSON('warga', u, w);
  return { u, nama: w.nama, batu: w.batu };
}

const key = (u) => String(u || '').toLowerCase().replace(/^@/, '');

/** Nama default dari username IG: "@budi_123" → "Budi_123" (maks 24 huruf). */
export function namaDariUsername(u) {
  const s = key(u).replace(/[^\p{L}\p{N}._]/gu, '').slice(0, 24) || 'Warga';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const HEWAN_ACAK = ['Kucing', 'Naga', 'Rubah', 'Kelinci', 'Panda', 'Burung Hantu', 'Axolotl', 'Serigala', 'Ikan Koi', 'Katak', 'Harimau', 'Penguin', 'Elang', 'Kura-kura'];
export function hewanAcak(u) {
  let h = 0; for (const ch of key(u)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = HEWAN_ACAK[h % HEWAN_ACAK.length];
  let b = HEWAN_ACAK[Math.floor(h / HEWAN_ACAK.length) % HEWAN_ACAK.length];
  if (b === a) b = HEWAN_ACAK[(HEWAN_ACAK.indexOf(a) + 1) % HEWAN_ACAK.length];
  return [a, b];
}

/**
 * 2 Nov: pendaftaran dipermudah. Komentar bukan-warga yang jelas ingin bergabung (menyebut hewan / "Hewan: ..." /
 * "mau ikut", "daftar", dll.) langsung dibuatkan hewannya: nama = username (bisa diganti gratis 1x), hewan = yang
 * disebut (atau dipilihkan acak). null bila komentar bukan ajakan bergabung.
 */
/** Cerita dari komentar bebas: label "Cerita:" atau kalimat setelah kata seperti "suka", "hobinya", "kebiasaannya". */
const CERITA_CUE = /\b(suka|hobi(?:nya)?|kebiasaan(?:nya)?|sering|selalu|senang|doyan|gemar|takut|pemalas|pemberani|penakut|jago|rajin|malas|biar|ceritanya|yang\s+bisa)\b/i;
const BUKAN_CERITA = /\b(video|vidio|konten|animasi|akun|ikut|daftar|gabung|join|format|cara(?:nya)?|min|admin|mimin|kak|bang|follow|like)\b/i;
export function ceritaDariKomentar(text, p = {}) {
  if (p.cerita && p.cerita.length >= CONFIG.minStoryLength) return p.cerita;
  const t = String(text || '').replace(/@[\w.]+/g, ' ').replace(/\s+/g, ' ').trim();
  const m = CERITA_CUE.exec(t);
  if (!m) return null;
  let tail = t.slice(m.index).replace(/^(ceritanya|biar)\s+/i, '').replace(/\s*\b(nama(?:nya)?|hewan(?:nya)?)\s*[:=].*$/i, '').trim();
  if (tail.length < CONFIG.minStoryLength || tail.split(' ').length < 3 || BUKAN_CERITA.test(tail)) return null;
  return tail.slice(0, 280);
}

export function bacaDaftarOtomatis(text, p, u) {
  if (p.usul || p.elemen || p.outfit || p.wujud || p.skill || p.calon != null || p.pilih || p.tantang || p.terima != null || p.cuaca || p.wilayahNama || p.tebak) return null;
  const sebut = p.hewan || cariHewan(text);
  const niat = niatKomentar(text, p);
  const ok = p.hewan || (p.nama && /\bnama(?:\s+hewan\w*)?\s*[:=]/i.test(String(text || ''))) || (niat === 'daftar' && (sebut.length || DAFTAR_KUAT_RE.test(String(text || '').replace(/@[\w.]+/g, ' '))));
  if (!ok) return null;
  const acak = !sebut.length;
  return { nama: p.nama || namaDariUsername(u), namaDefault: !p.nama, hewan: acak ? hewanAcak(u) : sebut, hewanAcak: acak, cerita: ceritaDariKomentar(text, p) };
}

export async function daftarOtomatis(c, u, p, { ts } = {}) {
  const d = bacaDaftarOtomatis(c.text, p, u);
  if (!d) return null;
  if (await getJSON('warga', u)) return null;
  const data = { username: u, nama: d.nama, hewan: d.hewan, cerita: d.cerita, mediaId: c.mediaId, commentId: c.id, timestamp: ts || c.timestamp || new Date().toISOString(), igsid: c.userId || null, namaDefault: d.namaDefault };
  // langsung lahir (juga saat wajib follow aktif) — pemilik diberi tahu lewat balasan komentar
  const w = await birth(data);
  try { await replyToComment(c.id, MSG.lahirOtomatis(u, w.nama, w.hewan.join(' + '), { namaDefault: d.namaDefault, hewanAcak: d.hewanAcak, tier: w.tier ? CONFIG.tiers[w.tier] : '' })); } catch (e) { w.balasError = e.message; await setJSON('warga', u, w); }
  return 'lahir:otomatis';
}

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
  // announce births & big evolutions in the public chat
  if (type === 'lahir' || type === 'legenda' || (type === 'evolusi' && /Mythical|Legendary|God Mode|KETUA/i.test(text))) {
    try { await obSistem((type === 'lahir' ? '🐣 ' : '⭐ ') + text.replace(/ milik @[\w.]+/, '').replace(/@([\w.]+) lahir sebagai/, 'Warga baru:') + (type === 'lahir' ? ' Sapa yuk!' : '')); } catch { /* ignore */ }
  }
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
  // region name suggestion "Wilayah: <nama>" (likes refresh on every sync)
  if (p.wilayahNama) {
    const r = await usulWilayah(c, u, p.wilayahNama, w && !w.mati ? w : null, !!already);
    if (!already) await redis('SADD', 'processed', c.id);
    return r;
  }
  if (already) return p.usul ? 'usul:likes-updated' : 'skip:seen';
  await redis('SADD', 'processed', c.id);

  // 3 Nov: "Tebak: ..." fasilitas berikutnya (hanya warga; tebakan terakhir yang dihitung)
  if (p.tebak) {
    if (!w || w.mati) return 'tebak:bukan-warga';
    const F = await import('./fasilitas.js');
    return (await F.tebak(u, p.tebak, { now: Date.parse(ts) || Date.now() })) ? 'tebak' : 'tebak:tutup';
  }
  // regional Ketua Koloni election: "Calon: ..." / "Pilih: <nama hewan>"
  if (p.calon != null || p.pilih) {
    const r = await prosesPemiluWilayah(c, u, p, w && !w.mati ? w : null);
    if (r) return r;
  }
  // Arena: "Tantang: nama hewan" / "Terima: nama penantang"
  if ((p.tantang || p.terima != null) && w && !w.mati) {
    const A = await import('./arena.js');
    if (await A.aktif()) {
      const balasArena = async (m) => { try { await replyToComment(c.id, `@${u} ${m}`); } catch { /* ignore */ } };
      try {
        if (p.tantang) {
          const t = await A.tantang(u, p.tantang);
          await obSistem(`⚔️ ${t.namaDari} menantang ${t.namaKe} di Arena! Berlaku 12 jam.`).catch(() => {});
          await balasArena(`⚔️ Tantangan untuk ${t.namaKe} terkirim! Pemiliknya bisa menerima dengan komentar "Terima: ${w.nama}" atau lewat website (jam buka Arena). Kalau tidak dijawab, kedua hewan bertarung otomatis.`);
          return 'arena:tantang';
        }
        const umumkan = async (t, uu) => { await log('arena', t, { u: uu }); await obSistem(t); };
        const d = await A.terima(u, p.terima, { umumkan });
        await balasArena(`⚔️ Tantangan diterima! Duel ${d.setup.B.nama} vs ${d.setup.A.nama} dimulai pukul ${d.pukul} WIB (5 menit lagi). Buka Arena di website (DM "ARENA" untuk link) untuk bertarung sendiri. Kalau tidak sempat, ${d.setup.B.nama} bertarung otomatis.`);
        return 'arena:terima';
      } catch (e) { await balasArena(e.message); return 'arena:gagal'; }
    }
  }
  // God Mode: "Cuaca: hujan bintang"
  if (p.cuaca) {
    const d = await import('./dewa.js');
    const { wilayahOf, daftarUsulWilayah } = await import('./wilayah.js');
    const namaWilayah = async (n) => { const l = (await daftarUsulWilayah())[n] || []; const r0 = l.find((x) => x.status === 'resmi'); return r0 ? `Wilayah ${r0.nama}` : null; };
    const r = await d.prosesCuaca(c, u, p.cuaca, w, { wilayahOf, log, obSistem, namaWilayah });
    if (r) return r;
  }

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
    const oto = await daftarOtomatis(c, u, p, { ts });
    if (oto) return oto;
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
  // nama default (username) boleh diganti gratis 1x dengan komentar "Nama: ..."
  if (w.namaDefault && p.nama && p.nama !== w.nama) {
    const lama = w.nama; w.nama = p.nama; w.namaDefault = false; changed = true; result = 'ganti-nama';
    await log('nama', `@${u} memberi nama hewannya: ${lama} kini bernama ${p.nama}!`, { u });
    try { await replyToComment(c.id, MSG.namaDiganti(u, lama, p.nama)); } catch { /* ignore */ }
  }
  const jt = jawabTanya(w, c, p, ownUsername);
  if (jt) { p[jt.f] = jt.v; p.cerita = null; }
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
    } else if (!usedPost && CONFIG.batuEvolusi[w.tier] && (await redis('GET', 'evo_batu')) === '1') {
      // Legendary / God Mode: cerita + Batu Evolusi
      const perlu = CONFIG.batuEvolusi[w.tier], punya = w.batu || 0, ke = CONFIG.tiers[w.tier + 1];
      if (punya >= perlu) {
        w.batu = punya - perlu; w.tier += 1;
        if (c.mediaId) w.evolusiPosts.push(c.mediaId);
        await log('legenda', `${w.nama} milik @${u} memakai ${perlu} Batu Evolusi dan berevolusi menjadi ${ke}!`, { u });
        try { await replyToComment(c.id, `@${u} ✨ ${w.nama} memakai ${perlu} Batu Evolusi dan kini menjadi ${ke.toUpperCase()}!`); } catch { /* ignore */ }
        result = 'evolusi-batu';
      } else {
        const kunci = 'evo_batu_balas:' + u + ':' + (c.mediaId || '');
        if ((await redis('SET', kunci, '1', 'NX', 'EX', String(7 * 86400))) === 'OK') {
          try { await replyToComment(c.id, `@${u} Cerita ${w.nama} tercatat! Untuk naik ke ${ke}, ${w.nama} butuh cerita + ${perlu} Batu Evolusi (sekarang punya ${punya}). Kumpulkan dulu ya!`); } catch { /* ignore */ }
        }
        result = 'cerita-kurang-batu';
      }
    } else {
      result = 'cerita';
    }
    changed = true;
  }
  if (changed) await setJSON('warga', u, w);
  return result;
}

/** Create a citizen (shared by comment flow, follow confirmation and admin). */
export async function birth({ username, nama, hewan, cerita, mediaId, commentId, timestamp, source = 'instagram', elemen = null, outfit = null, wujud = null, skill = null, igsid = null, namaDefault = false }) {
  const u = key(username);
  const spot = Number(await redis('INCR', 'spot_counter')) - 1;
  const w = newWarga({ username: u, nama, hewan, cerita, mediaId, commentId, timestamp, spot, source, elemen, outfit, wujud, skill, igsid });
  if (namaDefault) w.namaDefault = true;
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
export async function handleDM(igsid, { quiet = false, text = '' } = {}) {
  let prof;
  try { prof = await userProfile(igsid); } catch (e) { return 'error:' + e.message; }
  const u = key(prof.username || (await redis('HGET', 'igsid', igsid)) || '');
  if (!u) return 'skip:unknown';
  const existing = await getJSON('warga', u);
  const wait = await getJSON('menunggu', u);
  const minta = /^\s*obrolan(\s+baru)?\s*[.!]*\s*$/i.exec(String(text || ''));
  if (minta && existing && !existing.mati) {
    const k = await tokenFor(u, { baru: !!minta[1] });
    await sendDM(igsid, MSG.obrolan(existing.nama, u, k)).catch(() => {});
    return minta[1] ? 'obrolan:link-baru' : 'obrolan:link';
  }
  // Toko / Tempat Latihan / Arena / Dompet: link pribadi yang sama, langsung ke bagian Toko & Arena
  const mintaToko = /^\s*(toko|arena|dompet|latihan|tempat latihan)\s*[.!]*\s*$/i.exec(String(text || ''));
  if (mintaToko && existing && !existing.mati) {
    const k = await tokenFor(u);
    await sendDM(igsid, MSG.toko(existing.nama, u, k)).catch(() => {});
    return 'toko:link';
  }
  // 14 Nov: jawaban skill/elemen lewat DM ("Kekuatan: ...", "Skill: ...") — hanya mengisi yang masih kosong
  if (existing && !existing.mati && text) {
    const pd = parseComment(String(text));
    let isi = null;
    for (const f of ['skill', 'elemen']) {
      if (existing[f] || (existing.tier || 0) < CONFIG.unlock[f]) continue;
      let v = pd[f];
      if (!v && f === 'skill' && existing.asked?.skill && KATA_SKILL_RE.test(String(text))) v = jawabanBebas(text, 'skill');
      if (v) { isi = { f, v }; break; }
    }
    if (isi) {
      existing[isi.f] = isi.v; await setJSON('warga', u, existing);
      await log('evolusi', isi.f === 'skill' ? `${existing.nama} milik @${u} kini punya skill: ${isi.v}!` : `${existing.nama} milik @${u} kini ber-elemen ${isi.v}!`, { u });
      await sendDM(igsid, `✅ ${isi.f === 'skill' ? 'Skill' : 'Elemen'} ${existing.nama} tercatat: "${isi.v}". Sudah tampil di kartu warganya!`).catch(() => {});
      return 'dm:' + isi.f;
    }
  }
  if (!wait) {
    if (existing && quiet) return 'sudah-lahir:diam';
    if (existing) {
      // tell them only once; afterwards the admin can chat with them without the bot interrupting
      // citizens born before this rule (27 Okt malam) have already been told; stay quiet for them
      if (String(existing.lahir || '') < '2026-10-27T12:30:00.000Z') return 'sudah-lahir:diam';
      if (Number(await redis('SADD', 'sudah_lahir_dikirim', u)) === 0) return 'sudah-lahir:diam';
      await sendDM(igsid, MSG.already(existing.nama)).catch(() => {}); return 'sudah-lahir';
    }
    return 'skip:no-registration';
  }
  if (!prof.is_user_follow_business) {
    wait.lastCheck = new Date().toISOString(); wait.following = false;
    await setJSON('menunggu', u, wait);
    await sendDM(igsid, MSG.notFollowing()).catch(() => {});
    return 'belum-follow';
  }
  const w = await birth(wait);
  await sendDM(igsid, MSG.born(w.nama, w.username, CONFIG.tiers[w.tier], await tokenFor(w.username))).catch(() => {});
  if (w.namaDefault) await sendDM(igsid, `Nama hewanmu sementara pakai username kamu: "${w.nama}". Mau tetap atau ganti? Kalau mau ganti, komen di postingan mana saja: Nama: nama baru (ganti nama pertama GRATIS).`).catch(() => {});
  return 'lahir';
}

// 6 Nov: outfit Toko (lib/pakaian.js), hanya id yang dikenal
const PAKAIAN_OK = { kepala: /^(topi_pesta|pita|mahkota_bunga|topi_koboi|topi_penyihir)$/, mata: /^(kacamata_hitam|kacamata_bulat)$/, leher: /^(syal|dasi_kupu|kalung_lonceng|syal_w[1-6])$/ };
function pakaianDipakai(w) { const p = w.pakaian || {}, o = {}; for (const [b, re] of Object.entries(PAKAIAN_OK)) if (re.test(p[b] || '')) o[b] = p[b]; return Object.keys(o).length ? o : null; }
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
    pakaian: pakaianDipakai(w),
    batu: w.batu || 0,
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

/**
 * 2 Nov: warga hasil daftar otomatis/scan → komentar mereka SEBELUM lahir (yang dulu diabaikan) diperiksa ceritanya.
 * Aturan evolusi biasa: 1 evolusi per video, maksimal Mythical (maxAutoTier). komentarPerUser: { u: [komentar] }.
 */
export async function evolusiCeritaLama(komentarPerUser, { sebelum }) {
  const hasil = [];
  for (const [u, list] of Object.entries(komentarPerUser)) {
    const w = await getJSON('warga', u);
    if (!w || w.mati) continue;
    const awal = w.tier; let akhirId = null; let ubah = false;
    for (const c of list.filter((x) => String(x.timestamp) < sebelum).sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))) {
      const story = ceritaDariKomentar(c.text, parseComment(c.text));
      if (!story || w.cerita.some((x) => x.text === story)) continue;
      w.cerita.push({ text: story, mediaId: c.mediaId || null, t: c.timestamp }); ubah = true;
      if (w.cerita.length > 20) w.cerita = w.cerita.slice(-20);
      if (c.mediaId && w.evolusiPosts.includes(c.mediaId)) continue;
      if (w.tier < CONFIG.maxAutoTier) { w.tier += 1; if (c.mediaId) w.evolusiPosts.push(c.mediaId); akhirId = c.id; }
    }
    if (!ubah) continue;
    if (w.tier > awal) {
      await log('evolusi', `${w.nama} milik @${u} berevolusi menjadi ${CONFIG.tiers[w.tier]} berkat ceritanya!`, { u });
      await askIfMissing(w, akhirId);
    }
    await setJSON('warga', u, w);
    hasil.push({ u, nama: w.nama, dari: awal, ke: w.tier, cerita: w.cerita.map((x) => x.text).slice(-3) });
  }
  return hasil;
}
