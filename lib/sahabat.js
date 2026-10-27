// "Sahabat Admin": the coffee supporter (Trakteer) with the highest total whose account owns a
// living citizen. Only one at a time (leaderboard). Purely cosmetic: a special crown + title.
// Trakteer does not tell us the Instagram username, so each supporter is matched by:
//   1. a manual link set in Ruang Admin (item.username; '-' = explicitly not a citizen)
//   2. the supporter name, if it equals a citizen's username (with or without @)
//   3. an @username written in the message
/** Trakteer's test webhook ("[ Stream Test ]", default unit "Cendol") is not a real supporter. */
export function isTest(item) {
  if (!item) return true;
  if (item.test) return true;
  return /^\s*\[.*test.*\]\s*$/i.test(String(item.nama || ''));
}
import { cariHewan } from './hewan.js';
const norm = (s) => String(s || '').toLowerCase().replace(/^@/, '').trim();

export function cocokkan(item, wargaByU) {
  if (item.username === '-') return null;
  if (item.username) return wargaByU[norm(item.username)] ? norm(item.username) : null;
  const n = norm(item.nama).replace(/\s+/g, '');
  if (n && wargaByU[n]) return n;
  for (const m of String(item.pesan || '').matchAll(/@([a-z0-9._]{2,30})/gi)) {
    const u = norm(m[1]).replace(/\.$/, '');
    if (wargaByU[u]) return u;
  }
  // creature name: "Icam" / "untuk Icam" / "Raiko 47"
  const all = Object.values(wargaByU);
  for (const cand of [item.nama, ...String(item.pesan || '').split(/[\n,.!|]/)]) {
    const r = cariHewan(String(cand || '').replace(/^(untuk|buat|dari|hewan|hewanku)\s+/i, '').trim(), all);
    if (r.w) return norm(r.w.username || r.w.u);
  }
  return null;
}

/** items: dukungan list (any order). warga: array of stored citizens. */
export function papanKopi(items, warga) {
  const byU = {};
  for (const w of warga) if (!w.mati && !w.hidden) byU[norm(w.username || w.u)] = w;
  const agg = {};
  for (const it of items) {
    if (!it || it.hidden || isTest(it)) continue;
    const u = cocokkan(it, byU);
    if (!u) continue;
    const a = (agg[u] = agg[u] || { u, nama: byU[u].nama, total: 0, sejak: '' });
    a.total += Number(it.jumlah) || 0;
    const t = String(it.t || '');
    if (t > a.sejak) a.sejak = t; // when this total was reached
  }
  // highest total first; on a tie the one who reached it first keeps the crown
  return Object.values(agg).filter((a) => a.total > 0)
    .sort((a, b) => b.total - a.total || a.sejak.localeCompare(b.sejak));
}

// Every coffee gives something back: Biji Kopi saldo (1 kopi = 5 Biji, spent once Toko Pokomen opens),
// a supporter badge by total (Perunggu 1+, Perak 5+, Emas 10+) shown on the card, map label and chat,
// and a 24-hour coffee aura around the creature.
export const BIJI_PER_KOPI = 5;
export function lencanaKopi(total) {
  const t = Number(total) || 0;
  if (t >= 10) return { kode: 'emas', nama: 'Pendukung Emas' };
  if (t >= 5) return { kode: 'perak', nama: 'Pendukung Perak' };
  if (t >= 1) return { kode: 'perunggu', nama: 'Pendukung Perunggu' };
  return null;
}
