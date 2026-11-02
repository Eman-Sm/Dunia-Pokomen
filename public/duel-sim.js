// Mesin duel Arena "Kartu Jurus + Main Langsung" — dipakai bersama oleh server (lib/arena.js) dan browser (game).
// 3 babak × 6 serangan bergantian. Setiap pemilik memilih 1 kartu per babak:
//   SERANG mengalahkan JURUS, JURUS mengalahkan TAHAN, TAHAN mengalahkan SERANG.
//   Kartu yang unggul di babak itu: serangannya ×1.5.
//   Efek kartu sendiri: SERANG +10% damage · TAHAN damage diterima −20% · JURUS 50% peluang jurus andalan +25%.
// Saat main langsung, pemilik menekan tombol tepat waktu:
//   menyerang: SEMPURNA ×1.5 (kritis) · BAGUS ×1 · MELESET ×0.7
//   menangkis: SEMPURNA damage ×0.5 · BAGUS ×0.8 · MELESET ×1
//   Pemilik yang tidak main langsung memakai nilai rata-rata (BAGUS).
// Urutan angka acak per serangan tetap (tidak tergantung tap), jadi hasilnya bisa dihitung ulang persis.
export const KARTU = ['serang', 'tahan', 'jurus'];
export const UNGGUL = { serang: 'jurus', jurus: 'tahan', tahan: 'serang' };
export const KUALITAS = {
  sempurna: { serang: 1.5, tangkis: 0.5 },
  bagus: { serang: 1, tangkis: 0.8 },
  meleset: { serang: 0.7, tangkis: 1 },
};
export const BABAK = 3, PER_BABAK = 6;

export function rng(seed) {
  let x = 0; for (const ch of String(seed)) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return () => { x = (x + 0x6d2b79f5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const kartuValid = (k) => Array.isArray(k) && k.length === BABAK && k.every((x) => KARTU.includes(x));
export function kartuAcak(seed) { const R = rng('kartu' + seed); return Array.from({ length: BABAK }, () => KARTU[Math.floor(R() * 3)]); }
const q = (x) => (KUALITAS[x] ? x : 'bagus');

/**
 * Duel bertahap. A = penantang, B = penerima. setiap X: { u, nama, stat:{nyawa,serang,tahan,cepat}, kartu:[3], jurus }
 * mulai() → state;  giliran(state) → { i, babak, p:'a'|'b' } | null;  langkah(state, tapA, tapB) → gerak
 * tapX = kualitas tap pemilik X untuk serangan ini (menyerang bila X penyerang, menangkis bila X yang diserang).
 */
export function mulai(seed, A, B) {
  return { R: rng(seed), A, B, hp: { a: A.stat.nyawa, b: B.stat.nyawa }, i: 0, gerak: [], pertama: A.stat.cepat >= B.stat.cepat ? 'a' : 'b', selesai: false };
}
export function giliran(s) {
  if (s.selesai || s.i >= BABAK * PER_BABAK) return null;
  const lain = s.pertama === 'a' ? 'b' : 'a';
  return { i: s.i, babak: Math.floor(s.i / PER_BABAK), p: s.i % 2 === 0 ? s.pertama : lain };
}
export function langkah(s, tapA, tapB) {
  const g = giliran(s); if (!g) return null;
  const R = s.R; const r1 = R(), r2 = R(), r3 = R();
  const pS = g.p, lS = pS === 'a' ? 'b' : 'a';
  const P = pS === 'a' ? s.A : s.B, L = lS === 'a' ? s.A : s.B;
  const kP = P.kartu[g.babak], kL = L.kartu[g.babak];
  const unggul = UNGGUL[kP] === kL ? pS : UNGGUL[kL] === kP ? lS : null;
  const tapP = q(pS === 'a' ? tapA : tapB), tapL = q(lS === 'a' ? tapA : tapB);
  const hindar = Math.min(.25, .05 + Math.max(0, (L.stat.cepat - P.stat.cepat) * .004) + (kL === 'tahan' ? .05 : 0));
  const kartu = { a: s.A.kartu[g.babak], b: s.B.kartu[g.babak] };
  let ev;
  if (r1 < hindar) ev = { r: g.babak + 1, i: g.i, p: P.u, l: L.u, hindar: 1, sisiP: pS, unggul, kartu, tap: { a: q(tapA), b: q(tapB) } };
  else {
    let dmg = Math.max(2, P.stat.serang * (.85 + r2 * .3) - L.stat.tahan * .4);
    if (unggul === pS) dmg *= 1.5;
    if (kP === 'serang') dmg *= 1.1;
    if (kL === 'tahan') dmg *= .8;
    const pakaiJurus = kP === 'jurus' && !!P.jurus && r3 < .5;
    if (pakaiJurus) dmg *= 1.25;
    dmg *= KUALITAS[tapP].serang * KUALITAS[tapL].tangkis;
    dmg = Math.max(1, Math.round(dmg));
    s.hp[lS] = Math.max(0, s.hp[lS] - dmg);
    ev = { r: g.babak + 1, i: g.i, p: P.u, l: L.u, dmg, kritis: tapP === 'sempurna' ? 1 : 0, jurus: pakaiJurus ? P.jurus : null, sisiP: pS, unggul, kartu, tap: { a: tapA ? q(tapA) : 'bagus', b: tapB ? q(tapB) : 'bagus' } };
  }
  ev.hp = [s.hp.a, s.hp.b];
  s.gerak.push(ev); s.i++;
  if (s.hp.a <= 0 || s.hp.b <= 0) s.selesai = true;
  return ev;
}
export function hasil(s) {
  const { A, B } = s;
  let m;
  if (s.hp.a <= 0) m = 'b'; else if (s.hp.b <= 0) m = 'a';
  else { const ra = s.hp.a / A.stat.nyawa, rb = s.hp.b / B.stat.nyawa; m = ra > rb ? 'a' : rb > ra ? 'b' : (A.stat.cepat >= B.stat.cepat ? 'a' : 'b'); }
  return { menang: m === 'a' ? A.u : B.u, kalah: m === 'a' ? B.u : A.u, ko: s.hp.a <= 0 || s.hp.b <= 0, ronde: (s.gerak.at(-1) || { r: 1 }).r, sisa: { [A.u]: s.hp.a, [B.u]: s.hp.b }, nyawa: { [A.u]: A.stat.nyawa, [B.u]: B.stat.nyawa }, statA: A.stat, statB: B.stat, kartuA: A.kartu, kartuB: B.kartu, gerak: s.gerak };
}
/** Jalankan seluruh duel. tapsA / tapsB: daftar kualitas tap per serangan (null = rata-rata). */
export function jalankan(seed, A, B, tapsA = null, tapsB = null) {
  const s = mulai(seed, A, B); let k = 0;
  while (giliran(s)) { langkah(s, tapsA ? tapsA[k] || 'meleset' : 'bagus', tapsB ? tapsB[k] || 'meleset' : 'bagus'); k++; }
  return hasil(s);
}
