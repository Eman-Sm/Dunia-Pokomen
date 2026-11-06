// ============================================================
//  OUTFIT TOKO (6 Nov 2026): aksesori yang terlihat di sprite hewan, untuk SEMUA tingkat.
//  Beli sekali (Biji Kopi) -> masuk lemari; pakai / lepas gratis kapan saja.
//  Satu barang per bagian tubuh: kepala, mata, leher.
//  Gambarnya ada di public/pakaian.js (dipakai creature.js & creature-hd.js).
// ============================================================
import { getJSON, setJSON } from './db.js';
import { bayarBiji } from './ekonomi.js';

export const BAGIAN = { kepala: 'Kepala', mata: 'Mata', leher: 'Leher' };
export const KATALOG = [
  { id: 'topi_pesta', bagian: 'kepala', label: 'Topi Pesta', biji: 6 },
  { id: 'pita', bagian: 'kepala', label: 'Pita Manis', biji: 5 },
  { id: 'mahkota_bunga', bagian: 'kepala', label: 'Mahkota Bunga', biji: 8 },
  { id: 'topi_koboi', bagian: 'kepala', label: 'Topi Koboi', biji: 8 },
  { id: 'topi_penyihir', bagian: 'kepala', label: 'Topi Penyihir', biji: 10 },
  { id: 'kacamata_hitam', bagian: 'mata', label: 'Kacamata Hitam', biji: 6 },
  { id: 'kacamata_bulat', bagian: 'mata', label: 'Kacamata Bulat', biji: 5 },
  { id: 'syal', bagian: 'leher', label: 'Syal Rajut', biji: 6 },
  { id: 'dasi_kupu', bagian: 'leher', label: 'Dasi Kupu-kupu', biji: 5 },
  { id: 'kalung_lonceng', bagian: 'leher', label: 'Kalung Lonceng', biji: 5 },
];
export const barang = (id) => KATALOG.find((x) => x.id === id) || null;
const key = (u) => String(u || '').toLowerCase().replace(/^@/, '').trim();

/** pakaian yang sedang dipakai, hanya id yang dikenal */
export function dipakai(w) {
  const p = (w && w.pakaian) || {}, out = {};
  for (const b of Object.keys(BAGIAN)) { const x = barang(p[b]); if (x && x.bagian === b) out[b] = x.id; }
  return Object.keys(out).length ? out : null;
}

async function wargaHidup(u) {
  const w = await getJSON('warga', u);
  if (!w || w.mati) throw new Error('Hewanmu tidak ditemukan.');
  return w;
}

/** Beli barang (kalau belum punya) lalu langsung dipakai. */
export async function beliPakai(u, id) {
  u = key(u); const x = barang(id); if (!x) throw new Error('Outfit tidak dikenal.');
  let w = await wargaHidup(u);
  const punya = new Set(w.lemari || []);
  let saldo = null;
  if (!punya.has(x.id)) {
    saldo = await bayarBiji(u, x.biji, 'outfit', x.label);
    w = await wargaHidup(u); // baca ulang setelah bayar
    w.lemari = [...new Set([...(w.lemari || []), x.id])];
  }
  w.pakaian = { ...(w.pakaian || {}), [x.bagian]: x.id };
  await setJSON('warga', u, w);
  return { ok: true, pesan: punya.has(x.id) ? `👕 ${w.nama} memakai ${x.label}!` : `🛍️ ${x.label} dibeli dan langsung dipakai ${w.nama}!`, lemari: w.lemari, pakaian: dipakai(w), saldo };
}

/** Lepas barang di satu bagian tubuh (gratis). */
export async function lepas(u, bagian) {
  u = key(u); if (!BAGIAN[bagian]) throw new Error('Bagian tidak dikenal.');
  const w = await wargaHidup(u);
  const p = { ...(w.pakaian || {}) }; delete p[bagian]; w.pakaian = p;
  await setJSON('warga', u, w);
  return { ok: true, pesan: `${w.nama} melepas ${BAGIAN[bagian].toLowerCase()}nya.`, lemari: w.lemari || [], pakaian: dipakai(w) };
}
export const lemariDari = (w) => ({ lemari: (w && w.lemari) || [], pakaian: dipakai(w) });
