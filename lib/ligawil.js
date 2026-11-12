// ============================================================
//  LIGA WILAYAH (mulai Senin 16 Nov 2026)
//  6 wilayah bertanding sebagai tim. Skor harian wilayah = aktivitas warganya:
//    Hadir +1 (beruntun 3 hari +2, 5 hari +3) · Latihan +2/sesi (maks 3) · Duel Arena vs wilayah lawan hari itu: menang +5, kalah +1
//    Sorak di Obrolan +1 (maks 3) · Kopi Admin +10/kopi (maks 60/wilayah/hari) + "Semangat Kopi" +5% 24 jam
//  Skor wilayah = 20 penyumbang teratas (maks 25 poin/orang/hari, kopi di luar batas) + Duel Jagoan 20.00 (+15)
//  Senin–Jumat liga (menang 3, seri 1), Sabtu semifinal (1v4, 2v3), Minggu final. Pemanasan Jumat–Minggu (absen beruntun dihitung).
// ============================================================
import { redis, getJSON, setJSON, hgetallJSON } from './db.js';
import { wilayahOf } from './wilayah.js';
import { kekuatan } from './statistik.js';

export const MUSIM = { id: 'LW1', nama: 'Liga Wilayah Musim 1', mulai: '2026-11-16', pemanasan: '2026-11-13' };
export const N_WIL = 6, TOP = 20, CAP_ORANG = 25, CAP_KOPI = 60, JAM_JAGOAN = 20;
export const POIN = { hadir: 1, latihan: 2, menang: 5, kalah: 1, sorak: 1, kopi: 10, jagoan: 15, jagoanBertahan: 8 };
export const MAKS = { latihan: 3, sorak: 3 };
export const TAKTIK = {
  serbu: { label: 'Serbu', ket: 'Poin duel & Duel Jagoan ×1,5' },
  latihan: { label: 'Latihan Bersama', ket: 'Poin latihan ×1,5' },
  bertahan: { label: 'Pertahanan', ket: 'Kalah Duel Jagoan tetap dapat +8' },
};
// round robin 6 tim, 5 hari
export const JADWAL = [[[1, 6], [2, 5], [3, 4]], [[1, 5], [6, 4], [2, 3]], [[1, 4], [5, 3], [6, 2]], [[1, 3], [4, 2], [5, 6]], [[1, 2], [3, 6], [4, 5]]];

const key = (u) => String(u || '').toLowerCase().replace(/^@/, '').trim();
const wib = (t) => new Date(t + 7 * 36e5);
export const hari = (t = Date.now()) => wib(t).toISOString().slice(0, 10);
const tambahHari = (h, n) => new Date(Date.parse(h + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
export const hariKe = (h) => Math.round((Date.parse(h + 'T00:00:00Z') - Date.parse(MUSIM.mulai + 'T00:00:00Z')) / 864e5);
const akhirHari = (h) => Date.parse(h + 'T23:59:59+07:00');
export function tahap(t = Date.now()) {
  const h = hari(t), d = hariKe(h);
  if (h < MUSIM.pemanasan) return { kode: 'belum', d };
  if (d < 0) return { kode: 'pemanasan', d };
  if (d <= 4) return { kode: 'liga', d, label: `Hari ${d + 1}` };
  if (d === 5) return { kode: 'semifinal', d, label: 'Semifinal' };
  if (d === 6) return { kode: 'final', d, label: 'Final' };
  return { kode: 'selesai', d };
}
export const hariLaga = (t = Date.now()) => { const k = tahap(t).kode; return k === 'liga' || k === 'semifinal' || k === 'final'; };

async function hidup() { return (await hgetallJSON('warga')).filter((w) => !w.mati && !w.hidden); }

// ---------------------------------------------------------------- pencatatan
async function tambah(u, cat, n, t = Date.now()) {
  if (!hariLaga(t) || !n) return 0;
  u = key(u); const k = 'lw_poin:' + hari(t);
  const v = Number(await redis('HINCRBY', k, `${u}|${cat}`, String(n))); await redis('EXPIRE', k, String(40 * 864e5 / 1000));
  return v;
}
/** sesi latihan selesai (dipanggil dari ekonomi.beli) */
export async function catatLatihan(u, t = Date.now()) {
  if (!hariLaga(t)) return null;
  const k = 'lw_poin:' + hari(t), sudah = Number(await redis('HGET', k, `${key(u)}|latihan`) || 0);
  if (sudah >= MAKS.latihan * POIN.latihan) return null;
  await tambah(u, 'latihan', POIN.latihan, t); return POIN.latihan;
}
/** pesan di Obrolan (semua / ruang wilayah sendiri) */
export async function catatSorak(u, t = Date.now()) {
  if (!hariLaga(t)) return null;
  const k = 'lw_poin:' + hari(t), sudah = Number(await redis('HGET', k, `${key(u)}|sorak`) || 0);
  if (sudah >= MAKS.sorak * POIN.sorak) return null;
  await tambah(u, 'sorak', POIN.sorak, t); return POIN.sorak;
}
/** Kopi Admin masuk untuk warga u */
export async function catatKopi(u, jumlah = 1, t = Date.now(), wil = null) {
  const n = Math.max(1, Math.trunc(Number(jumlah) || 1));
  if (wil) { for (const h of [hari(t), hari(t + 864e5)]) { await redis('HSET', 'lw_buff:' + h, String(wil), '1'); await redis('EXPIRE', 'lw_buff:' + h, String(40 * 86400)); } }
  if (!hariLaga(t)) return null;
  await tambah(u, 'kopi', n * POIN.kopi, t); return n * POIN.kopi;
}
/** dipanggil setelah duel Arena tercatat */
export async function catatDuel(a, b, menang, t = Date.now()) {
  if (!hariLaga(t)) return null;
  const [wa, wb] = await Promise.all([getJSON('warga', key(a)), getJSON('warga', key(b))]);
  if (!wa || !wb) return null;
  const A = wilayahOf(wa), B = wilayahOf(wb); if (A === B) return null;
  const pasang = (await laga(hari(t))).some((p) => (p[0] === A && p[1] === B) || (p[0] === B && p[1] === A));
  if (!pasang) return null;
  const W = key(menang), K = W === key(a) ? key(b) : key(a);
  await tambah(W, 'duel', POIN.menang, t); await tambah(K, 'duel', POIN.kalah, t);
  return { menang: W, kalah: K };
}
/** absen harian */
export async function hadir(u, t = Date.now()) {
  u = key(u); const k = tahap(t).kode;
  if (k === 'belum') throw new Error('Liga Wilayah belum dimulai.');
  if (k === 'selesai') throw new Error('Liga Wilayah Musim 1 sudah selesai. Tunggu musim berikutnya!');
  const w = await getJSON('warga', u); if (!w || w.mati) throw new Error('Hewanmu tidak ditemukan.');
  const h = hari(t), st = (await getJSON('lw_hadir', u)) || { last: null, streak: 0, total: 0 };
  if (st.last === h) return { ok: true, sudah: true, streak: st.streak, poin: 0, pesan: 'Kamu sudah hadir hari ini. Sampai besok!' };
  st.streak = st.last === tambahHari(h, -1) ? st.streak + 1 : 1; st.last = h; st.total = (st.total || 0) + 1;
  await setJSON('lw_hadir', u, st);
  const poin = st.streak >= 5 ? 3 : st.streak >= 3 ? 2 : POIN.hadir;
  if (hariLaga(t)) await tambah(u, 'hadir', poin, t);
  const wil = wilayahOf(w);
  return { ok: true, streak: st.streak, poin: hariLaga(t) ? poin : 0, wil, pesan: hariLaga(t) ? `✅ ${w.nama} hadir untuk Wilayah ${wil}! +${poin} poin (beruntun ${st.streak} hari).` : `✅ ${w.nama} hadir! Pemanasan: hari beruntunmu (${st.streak}) sudah dihitung untuk Liga yang mulai Senin.` };
}

// ---------------------------------------------------------------- Ketua: jagoan & taktik
export async function aturKetua({ u, wil, jagoan, taktik }, t = Date.now()) {
  if (tahap(t).kode === 'selesai') throw new Error('Liga sudah selesai.');
  const h = wib(t).getUTCHours() >= JAM_JAGOAN ? hari(t + 864e5) : hari(t);
  const cur = (await getJSON('lw_ketua:' + h, String(wil))) || {};
  if (jagoan) {
    const w = (await hidup()).find((x) => x.username === key(jagoan) || String(x.nama).toLowerCase() === String(jagoan).toLowerCase());
    if (!w || wilayahOf(w) !== Number(wil)) throw new Error('Jagoan harus warga wilayahmu sendiri.');
    cur.jagoan = w.username;
  }
  if (taktik) { if (!TAKTIK[taktik]) throw new Error('Taktik tidak dikenal.'); cur.taktik = taktik; }
  cur.oleh = key(u); cur.t = new Date(t).toISOString();
  await setJSON('lw_ketua:' + h, String(wil), cur); await redis('EXPIRE', 'lw_ketua:' + h, String(40 * 86400));
  return { ok: true, hari: h, ...cur, pesan: `Disimpan untuk ${h === hari(t) ? 'hari ini' : 'besok'}.` };
}

// ---------------------------------------------------------------- jadwal & hasil
async function namaWilayah() {
  try { const W = await import('./wilayah.js'); const d = await W.daftarUsulWilayah(); const o = {}; for (const [n, l] of Object.entries(d || {})) { const r = (l || []).find((x) => x.status === 'resmi'); if (r) o[n] = r.nama; } return o; } catch { return {}; }
}
/** pasangan laga pada hari h */
export async function laga(h) {
  const d = hariKe(h);
  if (d >= 0 && d <= 4) return JADWAL[d];
  if (d === 5) { const k = await klasemen(tambahHari(MUSIM.mulai, 4)); const r = k.map((x) => x.wil); return r.length >= 4 ? [[r[0], r[3]], [r[1], r[2]]] : []; }
  if (d === 6) { const s = await hasilHari(tambahHari(MUSIM.mulai, 5)); if (!s || !s.laga || s.laga.length < 2) return []; const W = s.laga.map((l) => l.menang).filter(Boolean); return W.length === 2 ? [W] : []; }
  return [];
}
function jagoanDefault(warga, wil) {
  return warga.filter((w) => wilayahOf(w) === wil).sort((a, b) => kekuatan(b) - kekuatan(a))[0] || null;
}
async function duelJagoan(h, a, b, warga, ket) {
  const k = 'lw_jagoan:' + h, f = `${a}-${b}`;
  const lama = await getJSON(k, f); if (lama) return lama;
  const pick = (n) => { const id = (ket[n] || {}).jagoan; return warga.find((w) => w.username === id && wilayahOf(w) === n) || jagoanDefault(warga, n); };
  const A = pick(a), B = pick(b); if (!A || !B) return null;
  const { petarung } = await import('./arena.js'); const { jalankan, kartuAcak } = await import('../public/duel-sim.js');
  const id = `lw-${h}-${a}-${b}`, h_ = jalankan(id, petarung(A, kartuAcak(id + ':a')), petarung(B, kartuAcak(id + ':b')));
  const r = { a: A.username, b: B.username, namaA: A.nama, namaB: B.nama, menang: h_.menang, ko: !!h_.ko, ronde: h_.ronde, wilMenang: h_.menang === A.username ? a : b };
  await setJSON(k, f, r); await redis('EXPIRE', k, String(40 * 86400));
  return r;
}
/** skor semua wilayah pada hari h (live bila hari ini) */
export async function skorHari(h, now = Date.now(), wargaIn) {
  const warga = wargaIn || await hidup(); const byU = Object.fromEntries(warga.map((w) => [w.username, w]));
  let raw = (await redis('HGETALL', 'lw_poin:' + h)) || [];
  if (!Array.isArray(raw)) raw = Object.entries(raw).flat();
  const ket = {}; for (let n = 1; n <= N_WIL; n++) ket[n] = (await getJSON('lw_ketua:' + h, String(n))) || {};
  const buffRaw = (await redis('HGETALL', 'lw_buff:' + h)) || []; const buff = new Set(Array.isArray(buffRaw) ? buffRaw.filter((_, i) => i % 2 === 0).map(Number) : Object.keys(buffRaw).map(Number));
  const per = {}; // u -> {cat: n}
  for (let i = 0; i < raw.length; i += 2) { const [u, cat] = String(raw[i]).split('|'); (per[u] = per[u] || {})[cat] = Number(raw[i + 1]) || 0; }
  const S = {}; for (let n = 1; n <= N_WIL; n++) S[n] = { wil: n, orang: [], kopi: 0, jagoan: null, buff: buff.has(n), taktik: ket[n].taktik || null, jagoanPilih: ket[n].jagoan || null };
  for (const [u, c] of Object.entries(per)) {
    const w = byU[u]; if (!w) continue; const n = wilayahOf(w); if (!S[n]) continue; const tk = ket[n].taktik;
    const p = (c.hadir || 0) + (c.sorak || 0) + (c.latihan || 0) * (tk === 'latihan' ? 1.5 : 1) + (c.duel || 0) * (tk === 'serbu' ? 1.5 : 1);
    S[n].orang.push({ u, nama: w.nama, poin: Math.min(CAP_ORANG, Math.round(p)), kopi: c.kopi || 0 });
    S[n].kopi += c.kopi || 0;
  }
  const pairs = await laga(h);
  const jagoanSiap = now >= Date.parse(h + `T${JAM_JAGOAN}:00:00+07:00`);
  for (const [a, b] of pairs) {
    if (!jagoanSiap) continue;
    const r = await duelJagoan(h, a, b, warga, ket); if (!r) continue;
    for (const n of [a, b]) {
      const menang = r.wilMenang === n, tk = ket[n].taktik;
      const bonus = menang ? POIN.jagoan * (tk === 'serbu' ? 1.5 : 1) : (tk === 'bertahan' ? POIN.jagoanBertahan : 0);
      S[n].jagoan = { ...r, bonus: Math.round(bonus), menangKah: menang };
    }
  }
  for (const s of Object.values(S)) {
    s.orang.sort((x, y) => y.poin + y.kopi - (x.poin + x.kopi));
    const base = s.orang.slice().sort((x, y) => y.poin - x.poin).slice(0, TOP).reduce((a, x) => a + x.poin, 0);
    s.kopiPoin = Math.min(CAP_KOPI, s.kopi);
    s.skor = Math.round((base + s.kopiPoin + (s.jagoan ? s.jagoan.bonus : 0)) * (s.buff ? 1.05 : 1));
    s.aktif = s.orang.length;
  }
  return { hari: h, S, pairs };
}
/** hasil final suatu hari (disimpan setelah hari lewat) */
export async function hasilHari(h, now = Date.now()) {
  const cache = await getJSON('lw_hasil', h); if (cache) return cache;
  if (now <= akhirHari(h)) return null;
  const { S, pairs } = await skorHari(h, akhirHari(h) + 1);
  const r = {
    hari: h, d: hariKe(h),
    laga: pairs.map(([a, b]) => ({ a, b, skorA: S[a].skor, skorB: S[b].skor, menang: S[a].skor > S[b].skor ? a : S[b].skor > S[a].skor ? b : (S[a].aktif >= S[b].aktif ? a : b), seri: S[a].skor === S[b].skor, jagoan: S[a].jagoan })),
    wil: Object.fromEntries(Object.values(S).map((s) => [s.wil, { skor: s.skor, aktif: s.aktif, kopi: s.kopi, top: s.orang.slice(0, 10) }])),
    orang: Object.fromEntries(Object.values(S).flatMap((s) => s.orang.map((o) => [o.u, { poin: o.poin, kopi: o.kopi, wil: s.wil }]))),
  };
  await setJSON('lw_hasil', h, r);
  return r;
}
/** klasemen babak liga sampai hari h (inklusif, hanya hari yang sudah selesai) */
export async function klasemen(h = hari(), now = Date.now()) {
  const K = {}; for (let n = 1; n <= N_WIL; n++) K[n] = { wil: n, main: 0, menang: 0, seri: 0, kalah: 0, poin: 0, skor: 0 };
  for (let d = 0; d <= 4; d++) {
    const hh = tambahHari(MUSIM.mulai, d); if (hh > h) break;
    const r = await hasilHari(hh, now); if (!r) continue;
    for (const l of r.laga) {
      for (const [n, s, o] of [[l.a, l.skorA, l.skorB], [l.b, l.skorB, l.skorA]]) {
        const x = K[n]; x.main++; x.skor += s;
        if (s === o) { x.seri++; x.poin += 1; } else if (s > o) { x.menang++; x.poin += 3; } else x.kalah++;
      }
    }
  }
  return Object.values(K).sort((a, b) => b.poin - a.poin || b.skor - a.skor || a.wil - b.wil);
}

// ---------------------------------------------------------------- state publik
export async function publik({ u = null, now = Date.now() } = {}) {
  const tp = tahap(now), h = hari(now), nama = await namaWilayah();
  const warga = await hidup();
  const live = hariLaga(now) ? await skorHari(h, now, warga) : null;
  const kl = await klasemen(tambahHari(MUSIM.mulai, 4), now);
  const riwayat = []; for (let d = 0; d <= 6; d++) { const hh = tambahHari(MUSIM.mulai, d); if (hh >= h) break; const r = await hasilHari(hh, now); if (r) riwayat.push({ hari: hh, d, laga: r.laga }); }
  const jadwal = JADWAL.map((p, d) => ({ hari: tambahHari(MUSIM.mulai, d), d, laga: p }));
  let saya = null;
  if (u) {
    const w = warga.find((x) => x.username === key(u));
    if (w) {
      const st = (await getJSON('lw_hadir', w.username)) || {};
      const wil = wilayahOf(w), o = live ? (live.S[wil].orang.find((x) => x.u === w.username) || null) : null;
      const ketua = (await (await import('./obrolan.js')).daftarKetua()).find((k) => k.u === w.username) || null;
      saya = { u: w.username, nama: w.nama, wil, hadirHariIni: st.last === h, streak: st.last === h || st.last === tambahHari(h, -1) ? st.streak || 0 : 0, poinHariIni: o ? o.poin : 0, kopiHariIni: o ? o.kopi : 0, ketua: !!ketua };
    }
  }
  const wilJson = (s) => ({ wil: s.wil, nama: nama[s.wil] || null, skor: s.skor, aktif: s.aktif, kopi: s.kopi, buff: s.buff, taktik: s.taktik, jagoan: s.jagoan, top: s.orang.slice(0, 10).map(({ u: uu, nama: nm, poin, kopi }) => ({ u: uu, nama: nm, poin, kopi })) });
  return {
    musim: MUSIM, tahap: tp, hari: h, nama, poin: POIN, maks: MAKS, cap: { orang: CAP_ORANG, top: TOP, kopi: CAP_KOPI }, taktik: TAKTIK, jamJagoan: JAM_JAGOAN,
    hariIni: live ? { laga: live.pairs.map(([a, b]) => ({ a: wilJson(live.S[a]), b: wilJson(live.S[b]) })) } : null,
    klasemen: kl.map((x) => ({ ...x, nama: nama[x.wil] || null })), jadwal, riwayat,
    juara: await getJSON('lw_juara', MUSIM.id), saya,
  };
}

// ---------------------------------------------------------------- pengumuman & hadiah (dipanggil dari tick dunia)
export async function sapu({ umumkan, bonus, now = Date.now() } = {}) {
  const tp = tahap(now); if (tp.kode === 'belum') return null;
  const nama = await namaWilayah(); const nm = (n) => `W${n}${nama[n] ? ' ' + nama[n] : ''}`;
  if ((await redis('SET', 'lw_umum_pemanasan:' + MUSIM.id, '1', 'NX')) === 'OK' && umumkan) {
    await umumkan('🏆 LIGA WILAYAH dimulai Senin 16 Nov! 6 wilayah bertanding sebagai tim. Setiap hari: Hadir, Latihan, Duel melawan wilayah lawan, Sorak di Obrolan, dan Kopi Admin = poin untuk wilayahmu. Pemanasan mulai sekarang: tekan "Hadir" di website untuk membangun hari beruntun!');
  }
  // umumkan hasil setiap hari laga yang sudah lewat
  for (let d = 0; d <= 6; d++) {
    const h = tambahHari(MUSIM.mulai, d); if (now <= akhirHari(h)) break;
    if ((await redis('SET', `lw_umum:${MUSIM.id}:${h}`, '1', 'NX')) !== 'OK') continue;
    const r = await hasilHari(h, now); if (!r || !umumkan) continue;
    const judul = d <= 4 ? `Hari ${d + 1}` : d === 5 ? 'Semifinal' : 'FINAL';
    const isi = r.laga.map((l) => `${nm(l.a)} ${l.skorA}–${l.skorB} ${nm(l.b)}`).join(' · ');
    await umumkan(`🏆 LIGA WILAYAH ${judul}: ${isi}`);
  }
  // hadiah akhir musim (sekali)
  if (tp.kode === 'selesai' && (await redis('SET', 'lw_hadiah:' + MUSIM.id, '1', 'NX')) === 'OK') {
    const fin = await hasilHari(tambahHari(MUSIM.mulai, 6), now), semi = await hasilHari(tambahHari(MUSIM.mulai, 5), now);
    if (!fin || !fin.laga[0] || !semi) return null;
    const juara1 = fin.laga[0].menang, juara2 = fin.laga[0].a === juara1 ? fin.laga[0].b : fin.laga[0].a;
    const kalahSemi = semi.laga.map((l) => ({ n: l.menang === l.a ? l.b : l.a, s: l.menang === l.a ? l.skorB : l.skorA })).sort((x, y) => y.s - x.s);
    const juara3 = kalahSemi[0] ? kalahSemi[0].n : null;
    // total poin musim per orang
    const tot = {}, kopi = {};
    for (let d = 0; d <= 6; d++) { const r = await hasilHari(tambahHari(MUSIM.mulai, d), now); if (!r) continue; for (const [u, o] of Object.entries(r.orang || {})) { tot[u] = (tot[u] || 0) + o.poin + o.kopi; kopi[u] = (kopi[u] || 0) + o.kopi; } }
    const warga = await hidup(); const byU = Object.fromEntries(warga.map((w) => [w.username, w]));
    const hadiahWil = { [juara1]: 5, [juara2]: 3, ...(juara3 ? { [juara3]: 2 } : {}) };
    let n = 0;
    for (const [u, p] of Object.entries(tot)) { const w = byU[u]; if (!w || p < 10) continue; const b = hadiahWil[wilayahOf(w)]; if (b && bonus) { await bonus(u, b, 'Liga Wilayah'); n++; } }
    const ketua = (await (await import('./obrolan.js')).daftarKetua()).find((k) => k.wil === juara1);
    const piagam = async (u, teks, batu) => { const w = await getJSON('warga', u); if (!w) return; if (batu) { w.batu = (w.batu || 0) + 1; w.batuLog = [...(w.batuLog || []), { n: 1, bukti: teks, t: new Date(now).toISOString() }].slice(-30); } w.piagam = [...(w.piagam || []), teks].slice(-10); await setJSON('warga', u, w); };
    if (ketua) await piagam(ketua.u, `Ketua Juara ${MUSIM.nama}`, true);
    const mvp = Object.entries(tot).sort((a, b) => b[1] - a[1])[0];
    if (mvp) await piagam(mvp[0], `MVP ${MUSIM.nama}`, true);
    const sup = Object.entries(kopi).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0];
    if (sup) await piagam(sup[0], `Suporter Wilayah ${MUSIM.nama}`, false);
    const J = { juara1, juara2, juara3, mvp: mvp ? { u: mvp[0], nama: byU[mvp[0]]?.nama, poin: mvp[1] } : null, suporter: sup ? { u: sup[0], nama: byU[sup[0]]?.nama } : null, ketua: ketua || null, penerimaBiji: n, t: new Date(now).toISOString() };
    await setJSON('lw_juara', MUSIM.id, J);
    if (umumkan) await umumkan(`🏆🏆 JUARA ${MUSIM.nama.toUpperCase()}: ${nm(juara1)}! Juara 2: ${nm(juara2)}${juara3 ? `, Juara 3: ${nm(juara3)}` : ''}. ${n} warga aktif mendapat Biji Kopi.${J.mvp ? ` MVP: ${J.mvp.nama} (+1 Batu Evolusi).` : ''}${ketua ? ` Ketua juara ${ketua.nama} +1 Batu Evolusi.` : ''}`);
    return J;
  }
  return null;
}
