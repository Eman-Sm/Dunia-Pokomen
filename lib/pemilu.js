// ============================================================
//  PEMILIHAN KETUA KOLONI
//  Calon  = akun yang berkomentar di SEMUA postingan yang dihitung (default: Hari ke-1 & Hari ke-2)
//  Skor   = total like di semua komentarnya pada postingan-postingan itu
//  Seri   = yang berkomentar lebih awal menang
//  Gelar "Ketua Koloni" hanya kosmetik; ditetapkan Admin.
// ============================================================
import { redis, getJSON, hgetallJSON, setJSON } from './db.js';
import { listMedia, listComments } from './ig.js';
import { parseComment } from './parse.js';
import { log } from './rules.js';

const key = (u) => String(u || '').toLowerCase().replace(/^@/, '');

export async function getConfig() {
  return (await getJSON('pemilu_cfg')) || { posts: [], tutup: null, judul: 'Pemilihan Ketua Koloni' };
}
export async function setConfig(cfg) {
  const cur = await getConfig();
  const next = { ...cur, ...cfg };
  await redis('SET', 'pemilu_cfg', JSON.stringify(next));
  return next;
}
export const isClosed = (cfg) => !!(cfg.tutup && Date.now() > Date.parse(cfg.tutup));

/** Recount from Instagram. Returns the stored result. */
export async function hitung({ force = false } = {}) {
  const cfg = await getConfig();
  const prev = await getJSON('pemilu_hasil');
  if (prev && isClosed(cfg) && !force) return prev;
  let posts = cfg.posts && cfg.posts.length ? cfg.posts : (await listMedia(2)).map((m) => m.id).reverse();
  const own = key(process.env.IG_USERNAME || (await redis('GET', 'ig_username')) || '');
  const per = new Map(); // u -> { hadir:Set, likes, komentar, kampanye, first }
  let likesAvailable = false;
  for (const mediaId of posts) {
    const comments = await listComments(mediaId, 5000);
    for (const c of comments) {
      const u = key(c.username);
      if (!u || u === own) continue;
      if (!per.has(u)) per.set(u, { hadir: new Set(), likes: 0, komentar: 0, kampanye: null, first: c.timestamp });
      const x = per.get(u);
      x.hadir.add(mediaId);
      x.komentar += 1;
      if (typeof c.likeCount === 'number') { x.likes += c.likeCount; likesAvailable = true; }
      if (String(c.timestamp) < String(x.first)) x.first = c.timestamp;
      const k = parseComment(c.text).kampanye;
      if (k) x.kampanye = k;
    }
  }
  const warga = new Map((await hgetallJSON('warga')).map((w) => [w.username, w]));
  const menunggu = posts.length < 2; // the election needs both Day 1 and Day 2
  const kandidat = menunggu ? [] : [...per.entries()]
    .filter(([, x]) => x.hadir.size === posts.length)
    .map(([u, x]) => ({ u, nama: warga.get(u)?.nama || null, likes: x.likes, komentar: x.komentar, kampanye: x.kampanye, first: x.first }))
    .sort((a, b) => b.likes - a.likes || String(a.first).localeCompare(String(b.first)));
  const hasil = {
    posts, updatedAt: new Date().toISOString(), tutup: cfg.tutup || null, closed: isClosed(cfg),
    menunggu, likesAvailable, jumlahPeserta: per.size, jumlahCalon: kandidat.length, kandidat: kandidat.slice(0, 100),
  };
  await redis('SET', 'pemilu_hasil', JSON.stringify(hasil));
  return hasil;
}

/** Recount at most every `minutes` (used by the public endpoint). Never throws. */
export async function hitungJikaBasi(minutes = 20) {
  try {
    const cfg = await getConfig();
    const prev = await getJSON('pemilu_hasil');
    if (prev && (isClosed(cfg) || Date.now() - Date.parse(prev.updatedAt) < minutes * 60e3)) return prev;
    const lock = await redis('SET', 'pemilu_lock', '1', 'NX', 'EX', '90');
    if (lock !== 'OK') return prev;
    return await hitung();
  } catch { return getJSON('pemilu_hasil').catch(() => null); }
}

export async function tetapkanKetua(username) {
  const u = key(username);
  const w = await getJSON('warga', u);
  if (!w) throw new Error('Akun ini belum punya hewan di Dunia Pokomen');
  for (const x of await hgetallJSON('warga')) {
    if (x.gelar === 'Ketua Koloni' && x.username !== u) { x.gelar = null; await setJSON('warga', x.username, x); }
  }
  w.gelar = 'Ketua Koloni';
  await setJSON('warga', u, w);
  await log('legenda', `${w.nama} milik @${u} terpilih menjadi KETUA KOLONI pertama!`, { u });
  return w;
}

export function publicPemilu(h, cfg) {
  if (!h) return { tutup: cfg?.tutup || null, closed: isClosed(cfg || {}), kandidat: [], jumlahCalon: 0 };
  return {
    tutup: h.tutup, closed: h.closed || isClosed(cfg || {}), updatedAt: h.updatedAt, likesAvailable: h.likesAvailable, menunggu: !!h.menunggu,
    jumlahCalon: h.jumlahCalon, jumlahPeserta: h.jumlahPeserta,
    kandidat: h.kandidat.slice(0, 10).map(({ u, nama, likes, komentar, kampanye }) => ({ u, nama, likes, komentar, kampanye })),
  };
}
