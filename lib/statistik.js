// ============================================================
//  STATISTIK HEWAN (31 Okt 2026)
//  Semua hewan setara sesuai tingkatnya; bedanya hanya dari latihan di Tempat Latihan.
//    Nyawa, Serang, Tahan, Cepat
//  Latihan: 10 Biji Kopi / sesi -> +2 stat pilihan (Nyawa +10), dan setiap sesi ke-5 = Latihan Super (2x).
//  Batas latihan per stat naik mengikuti tingkat, jadi berevolusi = bisa berlatih lebih jauh lagi.
// ============================================================
export const STAT = ['nyawa', 'serang', 'tahan', 'cepat'];
export const LABEL = { nyawa: 'Nyawa', serang: 'Serang', tahan: 'Tahan', cepat: 'Cepat' };
export const BASE = { nyawa: 100, serang: 20, tahan: 20, cepat: 20 };
export const KALI_TINGKAT = [1, 1.2, 1.45, 1.75, 2.1, 2.5];
export const HARGA_LATIHAN = 10; // Biji Kopi
export const NAIK = { nyawa: 10, serang: 2, tahan: 2, cepat: 2 };
export const SUPER_TIAP = 5;

const tierOf = (w) => Math.max(0, Math.min(5, Number(w.tier) || 0));
export function dasar(w) {
  const k = KALI_TINGKAT[tierOf(w)];
  return Object.fromEntries(STAT.map((s) => [s, Math.round(BASE[s] * k)]));
}
/** maximum trained points per stat for this tier (Regular 10, Mythical 25, God Mode 35; Nyawa x5) */
export function batasLatih(w, s) { const b = 10 + 5 * tierOf(w); return s === 'nyawa' ? b * 5 : b; }
export function latihan(w) { return Object.fromEntries(STAT.map((s) => [s, Number((w.latih || {})[s]) || 0])); }
export function statistik(w) {
  const d = dasar(w), l = latihan(w);
  return Object.fromEntries(STAT.map((s) => [s, d[s] + Math.min(l[s], batasLatih(w, s))]));
}
export function kekuatan(w) { const s = statistik(w); return Math.round(s.nyawa / 5 + s.serang + s.tahan + s.cepat); }

/** Apply one training session (mutates w). Throws a readable error when the stat is maxed. */
export function latihSekali(w, s) {
  if (!STAT.includes(s)) throw new Error('Pilih yang mau dilatih: Nyawa, Serang, Tahan, atau Cepat');
  const l = latihan(w), batas = batasLatih(w, s);
  if (l[s] >= batas) throw new Error(`${LABEL[s]} ${w.nama} sudah maksimal untuk tingkat ini. Berevolusi dulu supaya bisa berlatih lagi!`);
  const ke = (Number(w.latihKe) || 0) + 1;
  const superSesi = ke % SUPER_TIAP === 0;
  const naik = Math.min(batas - l[s], NAIK[s] * (superSesi ? 2 : 1));
  w.latih = { ...l, [s]: l[s] + naik };
  w.latihKe = ke;
  return { stat: s, naik, superSesi, ke, sampaiSuper: SUPER_TIAP - (ke % SUPER_TIAP || SUPER_TIAP), statistik: statistik(w), batas };
}

/** Public shape for the website. */
export function publik(w) {
  const l = latihan(w);
  return { ...statistik(w), kuat: kekuatan(w), latihKe: Number(w.latihKe) || 0, maks: Object.fromEntries(STAT.map((s) => [s, l[s] >= batasLatih(w, s)])) };
}
