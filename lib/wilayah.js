// ============================================================
//  WILAYAH & PEMILIHAN KETUA KOLONI PER WILAYAH (mulai Hari ke-4)
//  - Wilayah ditentukan nomor warga: No. 1–50 = Wilayah 1, 51–100 = Wilayah 2, dst.
//  - Ketua Koloni pertama (Hole) otomatis memimpin wilayahnya (Wilayah 2).
//  - Wilayah lain memilih lewat komentar:
//      Calon: <janji>          -> mendaftar sebagai calon di wilayahnya
//      Pilih: <nama hewan>     -> memberi suara (nama kembar + nomor, mis. "Raiko 47"; @username juga diterima)
//    Sah hanya bila pemilih & calon satu wilayah, bukan diri sendiri, calon sudah mendaftar.
//    1 akun = 1 suara; yang dihitung pilihan terakhir. Seri -> calon yang mendaftar lebih dulu.
// ============================================================
import { redis, getJSON, setJSON, hgetallJSON } from './db.js';
import { replyToComment } from './ig.js';
import { cariHewan, pesanAmbigu, namaKembar, normNama, nomor } from './hewan.js';

export const UKURAN = 50;
export const wilayahOf = (w) => Math.floor((w.spot ?? 0) / UKURAN) + 1;
const key = (u) => String(u || '').toLowerCase().replace(/^@/, '');

const DEFAULT = {
  judul: 'Pemilihan Ketua Koloni per Wilayah',
  buka: '2026-10-27T07:00:00.000Z', // 14.00 WIB (Hari ke-4)
  tutup: '2026-10-28T05:00:00.000Z', // 28 Okt 12.00 WIB
  wilayah: [1, 3], // wilayah yang memilih
  ketuaOtomatis: { 2: 'vanzoka.7' }, // Ketua Koloni pertama memimpin wilayahnya
  ditetapkan: false,
  maxBalasPerHari: 400,
};
export async function getCfg() { return { ...DEFAULT, ...((await getJSON('pw_cfg')) || {}) }; }
export async function setCfg(patch) { const next = { ...(await getCfg()), ...patch }; await redis('SET', 'pw_cfg', JSON.stringify(next)); return next; }
export const isOpen = (cfg, t = Date.now()) => t >= Date.parse(cfg.buka) && t <= Date.parse(cfg.tutup);
export const isClosed = (cfg, t = Date.now()) => t > Date.parse(cfg.tutup);

/** name as shown on the web: twin names get the citizen number */
export function namaTampil(w, kembar) { return w.nama + (kembar && kembar.has(normNama(w.nama)) ? ' ' + nomor(w) : ''); }

/** "Valtherion karena keren" -> tries the longest leading words that match a creature */
export function cariDariTeks(teks, warga) {
  const words = String(teks || '').replace(/[“”"'.,!?]+/g, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 5);
  let ambigu = null;
  for (let n = words.length; n >= 1; n--) {
    const r = cariHewan(words.slice(0, n).join(' '), warga);
    if (r.w) return r;
    if (r.ambigu && !ambigu) ambigu = r;
  }
  return ambigu || { tidak: true };
}

async function balas(c, cfg, msg) {
  if (!c.id) return;
  const day = 'pw_balas_' + new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  if (Number((await redis('GET', day)) || 0) >= cfg.maxBalasPerHari) return;
  await redis('INCR', day); await redis('EXPIRE', day, 172800);
  try { await replyToComment(c.id, msg); } catch { /* ignore (no token in tests / rate limit) */ }
}

/**
 * Handle a "Calon:" or "Pilih:" comment. Returns a result tag, or null when the comment is not
 * part of this election (so the normal comment flow continues).
 */
export async function prosesPemiluWilayah(c, u, p, w) {
  if (p.calon == null && !p.pilih) return null;
  const cfg = await getCfg();
  const t = Date.parse(c.timestamp || '') || Date.now();
  if (t < Date.parse(cfg.buka)) return null;
  if (isClosed(cfg, t)) { await balas(c, cfg, `@${u} Pemilihan Ketua Koloni per wilayah sudah ditutup. Hasilnya diumumkan di video berikutnya ya!`); return 'pw:tutup'; }
  if (!w || w.mati) { await balas(c, cfg, `@${u} Kamu belum punya hewan di Dunia Pokomen, jadi belum bisa ${p.pilih ? 'memilih' : 'mencalonkan diri'}. Tulis hewanmu dulu (Nama: … | Hewan: … | Cerita: …) supaya dia lahir!`); return 'pw:bukan-warga'; }
  const warga = (await hgetallJSON('warga')).filter((x) => !x.mati && !x.hidden);
  const kembar = namaKembar(warga);
  const wil = wilayahOf(w);
  const ketuaU = cfg.ketuaOtomatis?.[wil];
  if (!cfg.wilayah.includes(wil)) {
    const k = ketuaU && warga.find((x) => x.username === ketuaU);
    await balas(c, cfg, `@${u} ${w.nama} warga Wilayah ${wil}${k ? `, yang sudah dipimpin Ketua ${k.nama}` : ''}, jadi Wilayah ${wil} tidak ikut pemilihan kali ini.`);
    return 'pw:wilayah-tidak-memilih';
  }

  if (p.calon != null && !p.pilih) {
    const prev = await getJSON('pw_calon', u);
    await setJSON('pw_calon', u, { u, wilayah: wil, janji: p.calon || prev?.janji || null, t: prev?.t || c.timestamp || new Date(t).toISOString(), commentId: prev?.commentId || c.id });
    if (!prev) await balas(c, cfg, `@${u} ✅ ${namaTampil(w, kembar)} resmi jadi calon Ketua Koloni Wilayah ${wil}! Ajak tetangga satu wilayahmu komen "Pilih: ${namaTampil(w, kembar)}" sebelum besok pukul 12.00 WIB.`);
    return prev ? 'pw:calon-update' : 'pw:calon';
  }

  // Pilih:
  const r = cariDariTeks(p.pilih, warga);
  if (r.ambigu) { await balas(c, cfg, `@${u} ${pesanAmbigu(r.ambigu[0].nama, r.ambigu)}`); return 'pw:ambigu'; }
  if (!r.w) { await balas(c, cfg, `@${u} Hewan bernama "${String(p.pilih).slice(0, 30)}" tidak ditemukan. Cek nama calon di wilayahmu di link bio ya!`); return 'pw:tidak-ada'; }
  const target = r.w;
  if (target.username === u) { await balas(c, cfg, `@${u} Memilih diri sendiri tidak dihitung ya. Pilih calon lain di Wilayah ${wil}!`); return 'pw:diri-sendiri'; }
  const calon = await getJSON('pw_calon', target.username);
  const tw = wilayahOf(target);
  if (tw !== wil) { await balas(c, cfg, `@${u} ${namaTampil(target, kembar)} itu warga Wilayah ${tw}, kamu di Wilayah ${wil}. Kamu hanya bisa memilih calon dari wilayahmu. Lihat calonnya di link bio ya!`); return 'pw:beda-wilayah'; }
  if (!calon) { await balas(c, cfg, `@${u} ${namaTampil(target, kembar)} belum mencalonkan diri. Suaramu belum dihitung. Lihat daftar calon Wilayah ${wil} di link bio ya!`); return 'pw:bukan-calon'; }
  const prev = await getJSON('pw_suara', u);
  const ts = c.timestamp || new Date(t).toISOString();
  if (prev && String(prev.t) > String(ts)) return 'pw:suara-lama';
  await setJSON('pw_suara', u, { pemilih: u, calon: target.username, wilayah: wil, t: ts, commentId: c.id });
  await balas(c, cfg, `@${u} 🗳️ Suaramu untuk ${namaTampil(target, kembar)} (Wilayah ${wil}) tercatat!${prev && prev.calon !== target.username ? ' Pilihan sebelumnya diganti.' : ''}`);
  return prev ? 'pw:pilih-ganti' : 'pw:pilih';
}

/** Count votes (re-validated at count time). */
export async function hasilWilayah() {
  const cfg = await getCfg();
  const [warga, calonL, suaraL] = await Promise.all([hgetallJSON('warga'), hgetallJSON('pw_calon'), hgetallJSON('pw_suara')]);
  const hidup = warga.filter((w) => !w.mati && !w.hidden);
  const byU = new Map(hidup.map((w) => [w.username, w]));
  const kembar = namaKembar(hidup);
  const tutup = Date.parse(cfg.tutup);
  const wil = {};
  const maxW = Math.max(1, ...hidup.map(wilayahOf));
  for (let n = 1; n <= maxW; n++) {
    const kU = cfg.ketuaOtomatis?.[n]; const k = kU && byU.get(kU);
    wil[n] = { n, memilih: cfg.wilayah.includes(n), warga: hidup.filter((w) => wilayahOf(w) === n).length, ketua: k ? { u: k.username, nama: namaTampil(k, kembar) } : null, calon: [], suara: 0 };
  }
  const calon = new Map();
  for (const c of calonL) {
    const w = byU.get(c.u); if (!w) continue;
    const n = wilayahOf(w); if (!wil[n]?.memilih) continue;
    calon.set(c.u, { u: c.u, nama: namaTampil(w, kembar), janji: c.janji, t: c.t, suara: 0, wilayah: n });
  }
  for (const s of suaraL) {
    if (Date.parse(s.t) > tutup) continue;
    const v = byU.get(s.pemilih); const k = calon.get(s.calon);
    if (!v || !k || s.pemilih === s.calon || wilayahOf(v) !== k.wilayah) continue;
    k.suara += 1; wil[k.wilayah].suara += 1;
  }
  for (const k of calon.values()) wil[k.wilayah].calon.push(k);
  for (const x of Object.values(wil)) x.calon.sort((a, b) => b.suara - a.suara || String(a.t).localeCompare(String(b.t)));
  return { judul: cfg.judul, buka: cfg.buka, tutup: cfg.tutup, closed: isClosed(cfg), ditetapkan: !!cfg.ditetapkan, ukuran: UKURAN, wilayah: wil };
}

export function publicHasil(h) {
  return {
    ...h,
    wilayah: Object.fromEntries(Object.entries(h.wilayah).map(([n, x]) => [n, { ...x, calon: x.calon.slice(0, 30).map(({ u, nama, janji, suara }) => ({ u, nama, janji, suara })) }])),
  };
}

/** After closing: give the winners their title. Idempotent. */
export async function tetapkanPemenang({ force = false } = {}) {
  const cfg = await getCfg();
  if (!isClosed(cfg) && !force) throw new Error('Pemilihan belum ditutup');
  const h = await hasilWilayah();
  const hasil = [];
  for (const x of Object.values(h.wilayah)) {
    if (!x.memilih) continue;
    const top = x.calon[0];
    if (!top || !top.suara) { hasil.push({ wilayah: x.n, pemenang: null }); continue; }
    const w = await getJSON('warga', top.u);
    if (!w) continue;
    if (w.gelar !== 'Ketua Koloni') w.gelar = `Ketua Koloni Wilayah ${x.n}`;
    w.ketuaWilayah = x.n;
    await setJSON('warga', top.u, w);
    const { log } = await import('./rules.js');
    await log('legenda', `${w.nama} milik @${top.u} terpilih menjadi KETUA KOLONI WILAYAH ${x.n} dengan ${top.suara} suara!`, { u: top.u });
    hasil.push({ wilayah: x.n, pemenang: top.u, suara: top.suara });
  }
  await setCfg({ ditetapkan: true });
  return hasil;
}
