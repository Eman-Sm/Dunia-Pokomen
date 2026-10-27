// ============================================================
//  ITEM PENGGANTI (Toko Pokomen) — dirancang 27 Okt 2026
//  Dibayar lewat Kopi Admin (Trakteer), 1 Kopi = 5 Biji Kopi.
//    Pengganti Nama      7 Kopi (35 Biji)  -> ganti nama hewan, tingkat & nomor warga tetap
//    Pengganti Rupa      5 Kopi (25 Biji)  -> ganti gabungan hewan (wujud dasar)
//    Pengganti Elemen    5 Kopi (25 Biji)  -> ganti elemen (aktif mulai Mega Evolution)
//    Pengganti Kekuatan  5 Kopi (25 Biji)  -> ganti skill (aktif mulai Mythical)
//  Sekarang dipakai Admin secara manual setelah kopi masuk (Ruang Admin), nanti otomatis di Toko.
// ============================================================
import { redis, getJSON, setJSON } from './db.js';
import { cleanNama, cleanHewan, validNamaWilayah } from './parse.js';
import { log, CONFIG } from './rules.js';

export const KURS_BIJI = 5;
export const ITEM = {
  nama: { label: 'Pengganti Nama', kopi: 7, field: 'nama' },
  rupa: { label: 'Pengganti Rupa', kopi: 5, field: 'hewan' },
  elemen: { label: 'Pengganti Elemen', kopi: 5, field: 'elemen', minTier: 'elemen' },
  kekuatan: { label: 'Pengganti Kekuatan', kopi: 5, field: 'skill', minTier: 'skill' },
};
export const katalog = () => Object.entries(ITEM).map(([id, x]) => ({ id, label: x.label, kopi: x.kopi, biji: x.kopi * KURS_BIJI }));

const key = (u) => String(u || '').toLowerCase().replace(/^@/, '');

/** Validate + normalise the new value. Throws with a readable message. */
export function nilaiBaru(item, raw) {
  const v = String(raw || '').trim();
  if (!v) throw new Error('Isi nilai barunya');
  if (item === 'nama') {
    const n = cleanNama(v);
    if (!n || n.length < 2 || !validNamaWilayah(n)) throw new Error('Nama tidak valid (2–24 huruf, tanpa kalimat)');
    return n;
  }
  if (item === 'rupa') {
    const h = cleanHewan(v.split(/\s*(?:\+|&|,|\/| x | dan )\s*/i));
    if (!h.length) throw new Error('Tulis gabungan hewan, mis. "Penguin + Naga"');
    return h;
  }
  if (item === 'elemen') return v.replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).slice(0, 24);
  if (item === 'kekuatan') return v.slice(0, 120);
  throw new Error('Item tidak dikenal');
}

/** Apply an item to a citizen. `bukti` = Trakteer supporter name / note. */
export async function pakaiItem({ username, item, nilai, bukti = '', oleh = 'admin' }) {
  const it = ITEM[item]; if (!it) throw new Error('Item tidak dikenal');
  const u = key(username);
  const w = await getJSON('warga', u);
  if (!w || w.mati) throw new Error('Hewan tidak ditemukan / sudah mati');
  const baru = nilaiBaru(item, nilai);
  const lama = w[it.field] ?? null;
  w[it.field] = baru;
  if (item === 'nama') w.namaLama = [...(w.namaLama || []), lama].slice(-5);
  if (item === 'rupa' || item === 'nama') w.artStale = true; // card art should be redrawn
  w.item = [...(w.item || []), { item, t: new Date().toISOString() }].slice(-30);
  await setJSON('warga', u, w);
  const aktif = !it.minTier || w.tier >= CONFIG.unlock[it.minTier];
  const tampil = Array.isArray(baru) ? baru.join(' + ') : baru;
  const teks = item === 'nama' ? `${lama} milik @${u} kini bernama ${baru}!`
    : item === 'rupa' ? `${w.nama} milik @${u} berganti rupa menjadi ${tampil}!`
    : item === 'elemen' ? `${w.nama} milik @${u} kini ber-elemen ${baru}!`
    : `${w.nama} milik @${u} kini punya kekuatan baru: ${baru}!`;
  await log('item', teks, { u });
  const rec = { t: new Date().toISOString(), u, item, label: it.label, kopi: it.kopi, lama, baru, bukti: String(bukti).slice(0, 80), oleh };
  await redis('LPUSH', 'item_log', JSON.stringify(rec));
  await redis('LTRIM', 'item_log', 0, 499);
  return { ...rec, aktif, catatan: aktif ? null : `Tersimpan, tapi baru tampil saat ${w.nama} mencapai ${CONFIG.tiers[CONFIG.unlock[it.minTier]]}.` };
}

export async function riwayatItem(n = 50) {
  return ((await redis('LRANGE', 'item_log', 0, n - 1)) || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
}
