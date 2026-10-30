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
import { replyToComment, listComments, listMedia } from './ig.js';
import { cariHewan, pesanAmbigu, namaKembar, normNama, nomor } from './hewan.js';

export const UKURAN = 50;
export const wilayahOf = (w) => Math.floor((w.spot ?? 0) / UKURAN) + 1;
const key = (u) => String(u || '').toLowerCase().replace(/^@/, '');

const DEFAULT = {
  judul: 'Pemilihan Ketua Koloni per Wilayah',
  buka: '2026-10-27T10:00:00.000Z', // 17.00 WIB, saat video Hari ke-4 tayang
  tutup: '2026-10-28T05:00:00.000Z', // 28 Okt 12.00 WIB
  wilayah: [1, 3], // wilayah yang memilih
  ketuaOtomatis: { 2: 'vanzoka.7' }, // Ketua Koloni pertama memimpin wilayahnya
  ditetapkan: false,
  maxBalasPerHari: 400,
  post: '18141518632625467', // postingan Hari ke-4: like di komentar calon ikut dihitung
  tunda: [4], // 30 Okt: Wilayah 4 ditahan sampai diumumkan di video (lepas lewat admin pw_tunda)
};
export async function getCfg() { return { ...DEFAULT, ...((await getJSON('pw_cfg')) || {}) }; }
export async function setCfg(patch) { const next = { ...(await getCfg()), ...patch }; await redis('SET', 'pw_cfg', JSON.stringify(next)); return next; }
export const isOpen = (cfg, t = Date.now()) => t >= Date.parse(cfg.buka) && t <= Date.parse(cfg.tutup);
export const isClosed = (cfg, t = Date.now()) => t > Date.parse(cfg.tutup);

// ---- Jadwal per wilayah: { n: { buka, tutup, ditetapkan, post } }. Konfigurasi lama (buka/tutup/wilayah) dibaca sebagai jadwal.
export function jadwalOf(cfg) {
  const tunda = (cfg.tunda || []).map(Number);
  if (cfg.jadwal) return Object.fromEntries(Object.entries(cfg.jadwal).filter(([n, j]) => j.ditetapkan || !tunda.includes(Number(n))));
  return Object.fromEntries((cfg.wilayah || []).map((n) => [n, { buka: cfg.buka, tutup: cfg.tutup, ditetapkan: !!cfg.ditetapkan, post: cfg.post || null }]));
}
const jBuka = (j, t = Date.now()) => !!j && t >= Date.parse(j.buka) && t <= Date.parse(j.tutup);
const jTutup = (j, t = Date.now()) => !!j && t > Date.parse(j.tutup);
/** Ketua sebuah wilayah: Ketua otomatis (Hole) atau pemenang pemilihan wilayah itu. */
export function ketuaWilayah(cfg, n, hidup) {
  const kU = cfg.ketuaOtomatis?.[n];
  return (kU && hidup.find((w) => w.username === kU)) || hidup.find((w) => w.ketuaWilayah === n) || null;
}
/** Jumlah wilayah yang lahannya sudah dibuka di peta (1–3 selalu; wilayah berikutnya setelah pemilihannya dibuka). */
export async function jumlahWilayahBuka() {
  const cfg = await getCfg(); const J = jadwalOf(cfg); let n = 3;
  while (J[n + 1] || cfg.ketuaOtomatis?.[n + 1]) n++;
  return Math.min(5, n);
}
/** "Minggu, 1 November pukul 12.00 WIB" */
export function tglWIB(iso) {
  const d = new Date(Date.parse(iso) + 7 * 36e5);
  const H = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d.getUTCDay()];
  const B = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][d.getUTCMonth()];
  return `${H}, ${d.getUTCDate()} ${B} pukul ${String(d.getUTCHours()).padStart(2, '0')}.${String(d.getUTCMinutes()).padStart(2, '0')} WIB`;
}
/** Penutupan: 2 hari setelah dibuka, pukul 12.00 WIB. */
export function tutupDefault(now = Date.now()) {
  const d = new Date(now + 7 * 36e5); d.setUTCDate(d.getUTCDate() + 2); d.setUTCHours(12, 0, 0, 0);
  return new Date(d.getTime() - 7 * 36e5).toISOString();
}

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
  const J = jadwalOf(cfg);
  const t = Date.parse(c.timestamp || '') || Date.now();
  const adaYangBuka = Object.values(J).some((j) => jBuka(j, t));
  if (!w || w.mati) {
    if (!adaYangBuka) return null;
    await balas(c, cfg, `@${u} Kamu belum punya hewan di Dunia Pokomen, jadi belum bisa ${p.pilih ? 'memilih' : 'mencalonkan diri'}. Tulis hewanmu dulu (Nama: … | Hewan: … | Cerita: …) supaya dia lahir!`); return 'pw:bukan-warga';
  }
  const wil = wilayahOf(w);
  const j = J[wil];
  if (j && jTutup(j, t) && !adaYangBuka) {
    if (t - Date.parse(j.tutup) > 7 * 864e5) return null;
    await balas(c, cfg, `@${u} Pemilihan Ketua Koloni Wilayah ${wil} sudah ditutup. Hasilnya diumumkan di video berikutnya ya!`); return 'pw:tutup';
  }
  if (!j || t < Date.parse(j.buka) || jTutup(j, t)) {
    if (!adaYangBuka) return null;
    const hidup = (await hgetallJSON('warga')).filter((x) => !x.mati && !x.hidden);
    const k = ketuaWilayah(cfg, wil, hidup);
    await balas(c, cfg, `@${u} ${w.nama} warga Wilayah ${wil}${k ? `, yang sudah dipimpin Ketua ${k.nama}` : ''}, jadi Wilayah ${wil} tidak ikut pemilihan kali ini.`);
    return 'pw:wilayah-tidak-memilih';
  }
  const warga = (await hgetallJSON('warga')).filter((x) => !x.mati && !x.hidden);
  const kembar = namaKembar(warga);

  if (p.calon != null && !p.pilih) {
    const prev = await getJSON('pw_calon', u);
    await setJSON('pw_calon', u, { u, wilayah: wil, janji: p.calon || prev?.janji || null, t: prev?.t || c.timestamp || new Date(t).toISOString(), commentId: prev?.commentId || c.id });
    if (!prev) await balas(c, cfg, `@${u} ✅ ${namaTampil(w, kembar)} resmi jadi calon Ketua Koloni Wilayah ${wil}! Nilai = suara ("Pilih: ${namaTampil(w, kembar)}" dari tetangga satu wilayah) + like di komentarmu. Ditutup ${tglWIB(j.tutup)}.`);
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

const LEGACY_POST = DEFAULT.post;
const likesKey = (j) => (j.post && j.post !== LEGACY_POST ? 'pw_likes:' + j.post : 'pw_likes');
/**
 * Likes on every comment of each account in the post of each open election (refreshed at most every `menit`).
 * A round with no fixed post uses the newest post. Never throws.
 */
export async function segarkanLike(menit = 10, { force = false } = {}) {
  try {
    const cfg = await getCfg();
    const J = jadwalOf(cfg);
    let last = null;
    for (const j of Object.values(J)) {
      const post = j.post || null;
      const k = likesKey(j);
      const prev = await getJSON(k);
      last = prev;
      if (!post) continue;
      if (!force && (jTutup(j) && prev && Date.parse(prev.updatedAt) > Date.parse(j.tutup))) continue;
      if (!force && Date.now() < Date.parse(j.buka)) continue;
      if (!force && prev && Date.now() - Date.parse(prev.updatedAt) < menit * 6e4) continue;
      if (!force && (await redis('SET', 'pw_likes_lock:' + post, '1', 'NX', 'EX', '90')) !== 'OK') continue;
      const cs = await listComments(post, 5000);
      const per = {};
      for (const c of cs) { const u = key(c.username); if (u && typeof c.likeCount === 'number') per[u] = (per[u] || 0) + c.likeCount; }
      last = { updatedAt: new Date().toISOString(), per };
      await redis('SET', k, JSON.stringify(last));
    }
    return last;
  } catch { return getJSON('pw_likes').catch(() => null); }
}

/** Count votes (re-validated at count time). Score = valid votes + likes on the candidate's comments in the election post. */
export async function hasilWilayah() {
  const cfg = await getCfg();
  const J = jadwalOf(cfg);
  const [warga, calonL, suaraL] = await Promise.all([hgetallJSON('warga'), hgetallJSON('pw_calon'), hgetallJSON('pw_suara')]);
  const LKS = {};
  for (const [n, j] of Object.entries(J)) LKS[n] = (await getJSON(likesKey(j))) || null;
  const hidup = warga.filter((w) => !w.mati && !w.hidden);
  const byU = new Map(hidup.map((w) => [w.username, w]));
  const kembar = namaKembar(hidup);
  const wil = {};
  const maxW = Math.max(1, ...hidup.map(wilayahOf));
  for (let n = 1; n <= maxW; n++) {
    const j = J[n]; const k = ketuaWilayah(cfg, n, hidup);
    wil[n] = {
      n, memilih: !!j, warga: hidup.filter((w) => wilayahOf(w) === n).length, ketua: k ? { u: k.username, nama: namaTampil(k, kembar) } : null, calon: [], suara: 0,
      buka: j?.buka || null, tutup: j?.tutup || null, closed: j ? jTutup(j) : false, ditetapkan: !!j?.ditetapkan,
    };
  }
  const calon = new Map();
  for (const c of calonL) {
    const w = byU.get(c.u); if (!w) continue;
    const n = wilayahOf(w); if (!wil[n]?.memilih) continue;
    if (J[n] && c.t && Date.parse(c.t) < Date.parse(J[n].buka) - 864e5) continue; // calon dari ronde lama
    const LK = (LKS[n] && LKS[n].per) || {};
    calon.set(c.u, { u: c.u, nama: namaTampil(w, kembar), janji: c.janji, t: c.t, suara: 0, likes: LK[c.u] || 0, wilayah: n });
  }
  for (const s of suaraL) {
    const v = byU.get(s.pemilih); const k = calon.get(s.calon);
    if (!v || !k || s.pemilih === s.calon || wilayahOf(v) !== k.wilayah) continue;
    if (Date.parse(s.t) > Date.parse(J[k.wilayah].tutup)) continue;
    k.suara += 1; wil[k.wilayah].suara += 1;
  }
  for (const k of calon.values()) wil[k.wilayah].calon.push(k);
  for (const k of calon.values()) k.skor = k.suara + k.likes;
  for (const x of Object.values(wil)) x.calon.sort((a, b) => b.skor - a.skor || b.suara - a.suara || String(a.t).localeCompare(String(b.t)));
  // ronde "utama" untuk tampilan: yang sedang buka (tutup paling dekat), kalau tidak ada yang terakhir ditutup
  const rounds = Object.values(J);
  const aktif = rounds.filter((j) => jBuka(j)).sort((a, b) => Date.parse(a.tutup) - Date.parse(b.tutup))[0]
    || rounds.filter((j) => Date.now() < Date.parse(j.buka)).sort((a, b) => Date.parse(a.buka) - Date.parse(b.buka))[0]
    || rounds.sort((a, b) => Date.parse(b.tutup) - Date.parse(a.tutup))[0] || { buka: cfg.buka, tutup: cfg.tutup };
  const likesAt = Object.values(LKS).filter(Boolean).map((x) => x.updatedAt).sort().pop() || null;
  return { judul: cfg.judul, buka: aktif.buka, tutup: aktif.tutup, closed: jTutup(aktif), ditetapkan: rounds.every((j) => j.ditetapkan), ukuran: UKURAN, wilayah: wil, likesAt };
}

export function publicHasil(h) {
  return {
    ...h,
    wilayah: Object.fromEntries(Object.entries(h.wilayah).map(([n, x]) => [n, { ...x, calon: x.calon.slice(0, 30).map(({ u, nama, janji, suara, likes, skor }) => ({ u, nama, janji, suara, likes, skor })) }])),
  };
}

/**
 * After a region's election closes: give the winner the title and make the most-liked name proposal official.
 * Idempotent per region. Without `force`, throws when no region is waiting to be decided.
 */
export async function tetapkanPemenang({ force = false } = {}) {
  const cfg = await getCfg();
  const J = jadwalOf(cfg);
  const siap = Object.entries(J).filter(([, j]) => force || (jTutup(j) && !j.ditetapkan));
  if (!siap.length) throw new Error('Pemilihan belum ditutup');
  const h = await hasilWilayah();
  const hasil = [];
  const { log } = await import('./rules.js');
  for (const [nS, j] of siap) {
    const n = Number(nS); const x = h.wilayah[n];
    if (x) {
      const top = x.calon[0];
      if (!top || !top.skor) hasil.push({ wilayah: n, pemenang: null });
      else {
        const w = await getJSON('warga', top.u);
        if (w) {
          if (w.gelar !== 'Ketua Koloni') w.gelar = `Ketua Koloni Wilayah ${n}`;
          w.ketuaWilayah = n;
          await setJSON('warga', top.u, w);
          await log('legenda', `${w.nama} milik @${top.u} terpilih menjadi KETUA KOLONI WILAYAH ${n} dengan ${top.suara} suara + ${top.likes} like!`, { u: top.u });
          hasil.push({ wilayah: n, pemenang: top.u, suara: top.suara });
        }
      }
    }
    const nama = await resmikanNama(n);
    if (nama) await log('bangun', `🏷️ Nama resmi Wilayah ${n}: ${nama.toUpperCase()}! Nama ini terpasang di gapura wilayahnya.`);
    j.ditetapkan = true;
  }
  await setCfg({ jadwal: J, ditetapkan: Object.values(J).every((j) => j.ditetapkan) });
  return hasil;
}

/** Most-liked proposal of region n becomes official (unless it already has one). Returns the name or null. */
export async function resmikanNama(n) {
  const all = (await hgetallJSON('usul_wilayah')).filter((x) => x.wilayah === n && x.status !== 'ditolak');
  if (!all.length || all.some((x) => x.status === 'resmi')) return null;
  const top = all.sort((a, b) => (b.likes || 0) - (a.likes || 0) || String(a.t).localeCompare(String(b.t)))[0];
  top.status = 'resmi'; await setJSON('usul_wilayah', top.id, top);
  return top.nama;
}

/**
 * Open the naming + Ketua election for every region that has citizens but no leader and no schedule yet
 * (Wilayah 4 when citizen #151 is born, Wilayah 5 at #201, ...). Announces it in Kabar Desa & Obrolan.
 */
export async function bukaWilayahBaru({ now = Date.now(), post } = {}) {
  const cfg = await getCfg();
  const J = jadwalOf(cfg);
  const hidup = (await hgetallJSON('warga')).filter((w) => !w.mati && !w.hidden);
  const ada = [...new Set(hidup.map(wilayahOf))].sort((a, b) => a - b);
  const tunda = (cfg.tunda || []).map(Number); // wilayah yang ditahan sampai diumumkan di video
  const baru = ada.filter((n) => !J[n] && !ketuaWilayah(cfg, n, hidup) && !tunda.includes(n));
  if (!baru.length) return [];
  const dibuka = [];
  for (const n of baru) {
    if ((await redis('SET', 'pw_buka_lock:' + n, '1', 'NX', 'EX', '300')) !== 'OK') continue;
    let p = post;
    if (p === undefined) { try { p = (await listMedia(1))[0]?.id || null; } catch { p = null; } }
    J[n] = { buka: new Date(now).toISOString(), tutup: tutupDefault(now), ditetapkan: false, post: p };
    dibuka.push(n);
  }
  if (!dibuka.length) return [];
  await setCfg({ jadwal: J, ditetapkan: false });
  const { log } = await import('./rules.js');
  for (const n of dibuka) {
    const dari = (n - 1) * UKURAN + 1;
    const t = `🗺️ WILAYAH ${n} DIBUKA! Warga nomor ${dari}–${dari + UKURAN - 1} tinggal di sini. Usulkan nama dengan komen "Wilayah: nama" dan daftar jadi ketua dengan "Calon: janjimu". Ditutup ${tglWIB(J[n].tutup)}.`;
    await log('bangun', t);
    try { const ob = await import('./obrolan.js'); await ob.sistem('📢 ' + t.slice(0, 190)); } catch { /* ignore */ }
  }
  return dibuka;
}

// ---------------- Usulan nama wilayah: komentar "Wilayah: <nama>" ----------------
// Usulan masuk ke wilayah si pengusul (dari hewannya). Like terbanyak per wilayah menang (diumumkan Hari ke-5).
export async function usulWilayah(c, u, nama, w, sudah) {
  if (!w) { if (!sudah) await balas(c, await getCfg(), `@${u} Usulan nama wilayah hanya untuk pemilik hewan. Tulis hewanmu dulu supaya dia lahir, lalu usulkan nama untuk wilayahmu!`); return 'wil:bukan-warga'; }
  const wil = wilayahOf(w);
  // nama wilayah yang sudah resmi tidak menerima usulan baru (kecuali memperbarui like usulan yang sudah tercatat)
  const resmi = (await hgetallJSON('usul_wilayah')).find((x) => x.wilayah === wil && x.status === 'resmi');
  if (resmi && !(await getJSON('usul_wilayah', c.id))) {
    if (!sudah) await balas(c, await getCfg(), `@${u} Wilayah ${wil} sudah punya nama resmi: ${resmi.nama}! Usulan nama baru untuk wilayah ini sudah ditutup.`);
    return 'wil:sudah-resmi';
  }
  const dupKey = u + '|' + nama.toLowerCase();
  const firstId = await redis('HGET', 'usul_wilayah_kunci', dupKey);
  if (firstId && firstId !== c.id) return 'wil:dobel';
  if (!firstId) await redis('HSET', 'usul_wilayah_kunci', dupKey, c.id);
  const prev = await getJSON('usul_wilayah', c.id);
  await setJSON('usul_wilayah', c.id, {
    id: c.id, u, nama, wilayah: wil, mediaId: c.mediaId || null,
    likes: typeof c.likeCount === 'number' ? c.likeCount : (prev?.likes || 0),
    status: prev?.status || null, t: prev?.t || c.timestamp || new Date().toISOString(),
  });
  if (!prev && !sudah) await balas(c, await getCfg(), `@${u} 🏷️ Usulan nama "${nama}" untuk Wilayah ${wil} tercatat! Ajak tetangga satu wilayahmu like komentar ini. Like terbanyak jadi nama resmi.`);
  return prev ? 'wil:likes' : 'wil:usul';
}

export async function daftarUsulWilayah() {
  const all = (await hgetallJSON('usul_wilayah')).filter((x) => x.status !== 'ditolak');
  const out = {};
  for (const x of all) (out[x.wilayah] = out[x.wilayah] || []).push(x);
  for (const k of Object.keys(out)) out[k] = out[k].sort((a, b) => (b.status === 'resmi') - (a.status === 'resmi') || b.likes - a.likes || String(a.t).localeCompare(String(b.t))).slice(0, 15).map(({ id, u, nama, likes, status }) => ({ id, u, nama, likes, status }));
  return out;
}
