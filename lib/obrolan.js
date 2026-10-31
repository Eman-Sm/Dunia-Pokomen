// ============================================================
//  OBROLAN WARGA (aktif setelah video Hari ke-4, 27 Okt 2026)
//  Ruang: "semua" (alun-alun) + "w1".."wN" (per wilayah). Semua orang bisa membaca;
//  menulis hanya pemilik hewan hidup dengan link pribadi (?u=&k=token) dari DM "OBROLAN".
//  Di ruang wilayah hanya warga wilayah itu yang bisa menulis.
//  Batas: 200 huruf, jeda 3 detik, tanpa batas harian, pesan sama berulang ditolak.
//  Tidak ada pesan pribadi antar-warga. Filter kata kasar/link/nomor HP/ajakan pindah.
// ============================================================
import crypto from 'node:crypto';
import { redis, getJSON, setJSON, hgetallJSON } from './db.js';
import { wilayahOf } from './wilayah.js';
import { namaKembar, normNama, nomor } from './hewan.js';
import { papanKopi, lencanaKopi } from './sahabat.js';

export const MAX_LEN = 200;
export const JEDA_DETIK = 3;
const KEEP = 200;
const UMUR_HARI = 7;
const key = (u) => String(u || '').toLowerCase().replace(/^@/, '').trim();

// ---------------------------------------------------------------- tokens (personal secret link)
export async function tokenFor(u, { baru = false } = {}) {
  u = key(u);
  let t = await redis('HGET', 'ob_token', u);
  if (t && !baru) return t;
  if (t) await redis('HDEL', 'ob_token_u', t);
  t = crypto.randomBytes(9).toString('base64url');
  await redis('HSET', 'ob_token', u, t); await redis('HSET', 'ob_token_u', t, u);
  return t;
}
export async function userFromToken(t) {
  if (!t || typeof t !== 'string' || t.length > 40) return null;
  return (await redis('HGET', 'ob_token_u', t)) || null;
}

// ---------------------------------------------------------------- filter
const KASAR = ['anjing', 'anjg', 'anjir', 'bangsat', 'bngst', 'babi', 'kontol', 'kntl', 'memek', 'mmk', 'ngentot', 'ngentod', 'entot', 'jancok', 'jancuk', 'cok', 'asu', 'goblok', 'goblog', 'tolol', 'bego', 'idiot', 'kampret', 'bajingan', 'tai', 'taik', 'pepek', 'peler', 'pelacur', 'lonte', 'sundal', 'bencong', 'banci', 'perek', 'fuck', 'fck', 'shit', 'bitch', 'dick', 'pussy', 'porn', 'bokep', 'sange', 'coli', 'kafir', 'cina', 'negro', 'monyet lu', 'monyet kau'];
const leet = (s) => s.toLowerCase().replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/@/g, 'a').replace(/\$/g, 's');
export async function kataTerlarang() {
  const extra = (await redis('SMEMBERS', 'ob_kata')) || [];
  return [...KASAR, ...extra];
}
/** returns null if fine, otherwise the reason shown to the writer */
export function cekPesan(text, kata = KASAR) {
  const t = String(text || '');
  if (!t.trim()) return 'Pesan kosong.';
  if (t.length > MAX_LEN) return `Maksimal ${MAX_LEN} huruf.`;
  if (/(https?:\/\/|www\.|\b[\w-]+\.(com|id|net|org|xyz|me|io|ly|co)\b)/i.test(t)) return 'Link tidak boleh dikirim di obrolan.';
  if (/(\+?62|\b0)8[\d\s.-]{7,}/.test(t) || /\d[\d\s.-]{9,}\d/.test(t)) return 'Nomor HP tidak boleh dikirim di obrolan.';
  if (/\b(wa|whatsapp|telegram|tele|line|dm|inbox|pv|japri)\b.{0,20}\b(aku|gw|gue|saya|ku|ya|yuk|dong|aja)\b|\b(pindah|lanjut|chat)\b.{0,12}\b(wa|whatsapp|telegram|dm|japri|pv)\b/i.test(t)) return 'Obrolan pindah ke tempat lain tidak diperbolehkan. Tetap di sini ya!';
  if (/@[\w.]{3,}/.test(t)) return 'Sebut nama hewannya saja, bukan @akun.';
  const flat = leet(t).replace(/[^a-z\s]/g, '');
  const squash = flat.replace(/\s+/g, '').replace(/(.)\1+/g, '$1');
  for (const k of kata) {
    const kk = k.toLowerCase();
    if (new RegExp('(^|\\s)' + kk.replace(/\s+/g, '\\s+') + '($|\\s)').test(flat)) return 'Pesanmu mengandung kata yang tidak sopan.';
    if (kk.length >= 5 && squash.includes(kk.replace(/(.)\1+/g, '$1'))) return 'Pesanmu mengandung kata yang tidak sopan.';
  }
  return null;
}

// ---------------------------------------------------------------- rooms
export const ruangValid = (r) => r === 'semua' || /^w[1-9]$/.test(r);
const listKey = (r) => 'ob:' + r;

async function wargaInfo(u) {
  const w = await getJSON('warga', u);
  if (!w || w.mati || w.hidden) return null;
  return w;
}
function pub(m) { const { pemilikHash, ...rest } = m; return rest; }

export async function baca(ruang, sejak = 0) {
  if (!ruangValid(ruang)) throw new Error('ruang tidak dikenal');
  const raw = (await redis('LRANGE', listKey(ruang), 0, KEEP - 1)) || [];
  const hidden = new Set((await redis('SMEMBERS', 'ob_hidden')) || []);
  const batas = Date.now() - UMUR_HARI * 864e5;
  const out = [];
  for (const s of raw) {
    let m; try { m = JSON.parse(s); } catch { continue; }
    if (!m || m.id <= sejak || Date.parse(m.t) < batas || hidden.has(String(m.id))) continue;
    out.push(pub(m));
  }
  return out.reverse(); // oldest first
}

export async function status() {
  return { kunci: (await redis('GET', 'ob_lock')) === '1' };
}

export async function tulis({ token, ruang, text }) {
  const u = await userFromToken(token);
  if (!u) return { error: 'Link pribadimu tidak berlaku. DM "OBROLAN" ke @duniapokomen untuk link baru.' };
  if ((await redis('GET', 'ob_lock')) === '1') return { error: 'Obrolan sedang dikunci Admin sebentar.' };
  if (!ruangValid(ruang)) return { error: 'Ruang tidak dikenal.' };
  const w = await wargaInfo(u);
  if (!w) return { error: 'Hanya pemilik hewan yang masih hidup yang bisa menulis.' };
  const wil = wilayahOf(w);
  if (ruang !== 'semua' && ruang !== 'w' + wil) return { error: `Kamu warga Wilayah ${wil}. Di ruang wilayah lain kamu hanya bisa membaca.` };
  const mute = Number(await redis('HGET', 'ob_mute', u) || 0);
  if (mute && (mute < 0 || mute > Date.now())) return { error: mute < 0 ? 'Kamu dibisukan Admin.' : `Kamu dibisukan Admin sampai ${new Date(mute + 7 * 36e5).toISOString().slice(11, 16)} WIB.` };
  text = String(text || '').replace(/\s+/g, ' ').trim();
  const bad = cekPesan(text, await kataTerlarang());
  if (bad) return { error: bad };
  if ((await redis('SET', 'ob_rl:' + u, '1', 'NX', 'EX', String(JEDA_DETIK))) !== 'OK') return { error: `Tunggu ${JEDA_DETIK} detik sebelum mengirim lagi.` };
  const h = crypto.createHash('sha1').update(text.toLowerCase()).digest('hex').slice(0, 12);
  if ((await redis('GET', 'ob_last:' + u)) === h) return { error: 'Pesan yang sama sudah terkirim.' };
  await redis('SET', 'ob_last:' + u, h, 'EX', '600');
  const id = Number(await redis('INCR', 'ob_seq'));
  const semua = await hgetallJSON('warga');
  const kembar = namaKembar(semua.filter((x) => !x.mati && !x.hidden));
  let lencana = null;
  try {
    const duk = ((await redis('LRANGE', 'dukungan', 0, 199)) || []).map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
    const me = papanKopi(duk, semua).find((x) => x.u === u); if (me) lencana = lencanaKopi(me.total)?.kode || null;
  } catch { /* ignore */ }
  const g = w.gelar || null;
  const m = { id, ruang, u, nama: w.nama + (kembar.has(normNama(w.nama)) ? ' ' + nomor(w) : ''), tier: w.tier || 0, wil, gelar: g, kopi: lencana, text, t: new Date().toISOString() };
  await redis('LPUSH', listKey(ruang), JSON.stringify(m));
  await redis('LTRIM', listKey(ruang), 0, KEEP - 1);
  try { const d = await import('./dewa.js'); await d.catatAktif(u, { obSistem: sistem }); } catch { /* ignore */ }
  return { ok: true, pesan: m };
}

export async function sistem(text, ruang = 'semua') {
  const id = Number(await redis('INCR', 'ob_seq'));
  const m = { id, ruang, sistem: true, text: String(text).slice(0, 200), t: new Date().toISOString() };
  await redis('LPUSH', listKey(ruang), JSON.stringify(m));
  await redis('LTRIM', listKey(ruang), 0, KEEP - 1);
  return m;
}

export async function lapor({ token, id }) {
  const u = await userFromToken(token);
  if (!u) return { error: 'Login dulu dengan link pribadimu untuk melapor.' };
  id = String(Number(id));
  await redis('SADD', 'ob_lapor:' + id, u);
  const n = Number(await redis('SCARD', 'ob_lapor:' + id));
  await redis('ZADD', 'ob_laporan', String(n), id);
  if (n >= 3) await redis('SADD', 'ob_hidden', id);
  return { ok: true, disembunyikan: n >= 3 };
}

// ---------------------------------------------------------------- admin
export async function adminList(ruang) {
  const raw = (await redis('LRANGE', listKey(ruang), 0, KEEP - 1)) || [];
  const hidden = new Set((await redis('SMEMBERS', 'ob_hidden')) || []);
  return raw.map((s) => { try { const m = JSON.parse(s); m.hidden = hidden.has(String(m.id)); return m; } catch { return null; } }).filter(Boolean);
}
export async function adminLaporan() {
  const z = (await redis('ZREVRANGE', 'ob_laporan', 0, 49, 'WITHSCORES')) || [];
  const out = [];
  for (let i = 0; i < z.length; i += 2) out.push({ id: Number(z[i]), laporan: Number(z[i + 1]) });
  return out;
}
export async function adminHapus(id, tampil = false) { if (tampil) await redis('SREM', 'ob_hidden', String(id)); else await redis('SADD', 'ob_hidden', String(id)); return { ok: true }; }
export async function adminBisukan(u, menit) {
  u = key(u);
  if (!menit) { await redis('HDEL', 'ob_mute', u); return { ok: true, bisu: false }; }
  await redis('HSET', 'ob_mute', u, String(menit < 0 ? -1 : Date.now() + menit * 6e4)); return { ok: true, bisu: true };
}
export async function adminKunci(on) { if (on) await redis('SET', 'ob_lock', '1'); else await redis('DEL', 'ob_lock'); return { kunci: !!on }; }
export async function adminKata(tambah, hapus) {
  if (tambah) await redis('SADD', 'ob_kata', String(tambah).toLowerCase().trim());
  if (hapus) await redis('SREM', 'ob_kata', String(hapus).toLowerCase().trim());
  return { kata: (await redis('SMEMBERS', 'ob_kata')) || [] };
}
export async function adminInfo() {
  const mute = (await hgetallRaw('ob_mute'));
  return { kunci: (await redis('GET', 'ob_lock')) === '1', bisu: mute, kata: (await redis('SMEMBERS', 'ob_kata')) || [], laporan: await adminLaporan() };
}
async function hgetallRaw(k) {
  const a = (await redis('HGETALL', k)) || [];
  if (!Array.isArray(a)) return a;
  const o = {}; for (let i = 0; i < a.length; i += 2) o[a[i]] = Number(a[i + 1]); return o;
}
