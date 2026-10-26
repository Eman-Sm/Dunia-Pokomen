// Resolve a creature mentioned in a comment by its NAME (preferred) or @username.
// Duplicate names need the citizen number: "Raiko 47". Used by all comment commands
// (Tantang/Terima/Dukung/Tebak/Pilih) and Trakteer matching.
const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '');
export const nomor = (w) => (w.spot ?? 0) + 1;

/** returns { w } | { ambigu: [w...] } | { tidak: true } */
export function cariHewan(teks, warga) {
  const raw = String(teks || '').trim();
  if (!raw) return { tidak: true };
  const hidup = warga.filter((w) => !w.mati && !w.hidden);
  const at = /^@([\w.]+)/.exec(raw);
  if (at) { const w = hidup.find((x) => (x.username || x.u) === at[1].toLowerCase().replace(/\.$/, '')); return w ? { w } : { tidak: true }; }
  const m = /^(.*?)[\s#]*(\d{1,4})$/.exec(raw);
  if (m && m[1]) {
    const n = Number(m[2]); const w = hidup.find((x) => nomor(x) === n && norm(x.nama) === norm(m[1]));
    if (w) return { w };
  }
  const same = hidup.filter((x) => norm(x.nama) === norm(raw));
  if (same.length === 1) return { w: same[0] };
  if (same.length > 1) return { ambigu: same };
  const byUser = hidup.find((x) => (x.username || x.u) === raw.toLowerCase());
  return byUser ? { w: byUser } : { tidak: true };
}

/** reply text for an ambiguous name */
export function pesanAmbigu(nama, list) {
  return `Ada ${list.length} ${nama}: ` + list.map((w) => `${w.nama} ${nomor(w)} (@${w.username || w.u})`).join(', ') + '. Tulis lagi dengan nomornya ya!';
}

/** set of lower-cased names used by more than one living citizen */
export function namaKembar(warga) {
  const c = {};
  for (const w of warga) if (!w.mati && !w.hidden) { const k = norm(w.nama); c[k] = (c[k] || 0) + 1; }
  return new Set(Object.keys(c).filter((k) => c[k] > 1));
}
export { norm as normNama };
