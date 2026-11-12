// ============================================================
//  ARENA POKOMEN (aktif setelah video Hari ke-6: redis 'evo_batu' = '1')
//  Buka 07.00–21.00 WIB. Duel 1 lawan 1, diatur otomatis:
//    1. Penantang: tombol "Tantang" di website (link pribadi) atau komentar "Tantang: nama hewan"
//    2. Yang ditantang: tombol "Terima" di website atau komentar "Terima: nama penantang" (berlaku 12 jam).
//       4 Nov: tidak dijawab = duel OTOMATIS saat kedaluwarsa (bukan kalah). "Lewati" gratis 2x/hari, lebih dari itu = duel otomatis.
//       Batas 12 jam dihitung dari jam buka Arena saja. Tiap hewan maks. 3 tantangan masuk per hari.
//       Duel yang diterima besok tetap dihitung pada waktu tantangan diberikan.
//    3. Duel langsung dihitung dari statistik (tingkat + latihan) + sedikit keberuntungan, hasilnya diumumkan.
//  Juara mingguan (menang terbanyak Senin–Minggu, ditutup Minggu 21.00 WIB) mendapat 1 Batu Evolusi.
// ============================================================
import { redis, getJSON, setJSON, hgetallJSON } from './db.js';
import { statistik } from './statistik.js';
import { cariHewan, pesanAmbigu } from './hewan.js';
import { jalankan, kartuValid, kartuAcak, BABAK, PER_BABAK } from '../public/duel-sim.js';

export const JAM_BUKA = 7, JAM_TUTUP = 21;
export const MAKS_TANTANG_HARIAN = 5;
export const SELISIH_TINGKAT = 1;
const TINGKAT = ['Regular', 'Pseudo-evo', 'Mega Evolution', 'Mythical Evolution', 'Legendary Evolution', 'God Mode'];
const namaTingkat = (t) => TINGKAT[Number(t) || 0] || TINGKAT[0];
const BERLAKU_MS = 12 * 36e5; // 1 Nov: tantangan berlaku 12 jam (4 Nov: dihitung dari jam BUKA Arena saja)
export const MAKS_DITANTANG_HARIAN = 3, JATAH_LEWATI = 2;
/** waktu kedaluwarsa: 12 jam ARENA BUKA setelah `now` (jam tutup tidak dihitung); tantangan Minggu habis paling lambat Senin 08.30 */
export function batasJawab(now) {
  let t = now, sisa = BERLAKU_MS;
  for (let k = 0; k < 10 && sisa > 0; k++) {
    const d = hari(t), bukaT = Date.parse(d + `T${String(JAM_BUKA).padStart(2, '0')}:00:00+07:00`), tutupT = Date.parse(d + `T${JAM_TUTUP}:00:00+07:00`);
    if (t < bukaT) t = bukaT;
    if (t >= tutupT) { t = bukaT + 864e5; continue; }
    const pakai = Math.min(sisa, tutupT - t); t += pakai; sisa -= pakai;
    if (sisa > 0) t = bukaT + 864e5;
  }
  const w = wib(now); if (w.getUTCDay() === 0) t = Math.min(t, Date.parse(hari(now + 864e5) + 'T08:30:00+07:00'));
  return t;
}
const key = (u) => String(u || '').toLowerCase().replace(/^@/, '').trim();
const wib = (t = Date.now()) => new Date(t + 7 * 36e5);
export const aktif = async () => (await redis('GET', 'evo_batu')) === '1';
export function buka(t = Date.now()) { const h = wib(t).getUTCHours(); return h >= JAM_BUKA && h < JAM_TUTUP; }
const hari = (t = Date.now()) => wib(t).toISOString().slice(0, 10);
/** week key: the Monday (WIB) of this week */
export function mingguKe(t = Date.now()) { const d = wib(t); const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow); return d.toISOString().slice(0, 10); }
/** Sunday 21:00 WIB closing the week that starts on Monday `minggu` */
export function tutupMinggu(minggu) { return Date.parse(minggu + 'T21:00:00+07:00') + 6 * 864e5; }

// deterministic RNG so a duel can be replayed from its id
function rng(seed) { let x = 0; for (const ch of String(seed)) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return () => { x = (x + 0x6d2b79f5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Pure duel simulation. a, b = stored citizens. Returns { menang, kalah, ronde, sisa, catatan[] } */
export function simulasi(a, b, seed) {
  const R = rng(seed);
  const S = { [a.username]: statistik(a), [b.username]: statistik(b) };
  const hp = { [a.username]: S[a.username].nyawa, [b.username]: S[b.username].nyawa };
  const catatan = [], gerak = [];
  const jurus = (w) => (w.skill ? String(w.skill).split(/[,+]/)[0].trim().slice(0, 30) : null);
  let ronde = 0;
  while (ronde < 20 && hp[a.username] > 0 && hp[b.username] > 0) {
    ronde++;
    const urut = S[a.username].cepat + R() * 6 >= S[b.username].cepat + R() * 6 ? [a, b] : [b, a];
    for (const [p, l] of [urut, [urut[1], urut[0]]]) {
      if (hp[p.username] <= 0 || hp[l.username] <= 0) continue;
      const sp = S[p.username], sl = S[l.username];
      const hindar = .05 + Math.max(0, Math.min(.15, (sl.cepat - sp.cepat) * .004));
      if (R() < hindar) { gerak.push({ r: ronde, p: p.username, l: l.username, hindar: 1, hp: [hp[a.username], hp[b.username]] }); if (catatan.length < 9) catatan.push(`${l.nama} menghindar dengan lincah!`); continue; }
      let dmg = Math.max(2, Math.round(sp.serang * (.85 + R() * .3) - sl.tahan * .4));
      const kritis = R() < .08 + (sp.cepat > sl.cepat ? .04 : 0);
      if (kritis) dmg = Math.round(dmg * 1.6);
      hp[l.username] = Math.max(0, hp[l.username] - dmg);
      const j = jurus(p), pakaiJurus = !!j && R() < .6;
      gerak.push({ r: ronde, p: p.username, l: l.username, dmg, kritis: kritis ? 1 : 0, jurus: pakaiJurus ? j : null, hp: [hp[a.username], hp[b.username]] });
      if (catatan.length < 9 && (kritis || R() < .35)) catatan.push(`${p.nama}${pakaiJurus ? ` memakai ${j}` : ' menyerang'}${kritis ? ' — KRITIS!' : ''} (-${dmg})`);
    }
  }
  let menang;
  if (hp[a.username] <= 0) menang = b; else if (hp[b.username] <= 0) menang = a;
  else menang = hp[a.username] / S[a.username].nyawa >= hp[b.username] / S[b.username].nyawa ? a : b;
  const kalah = menang === a ? b : a;
  catatan.push(`🏆 ${menang.nama} MENANG!`);
  return { menang: menang.username, kalah: kalah.username, ronde, sisa: { [a.username]: hp[a.username], [b.username]: hp[b.username] }, nyawa: { [a.username]: S[a.username].nyawa, [b.username]: S[b.username].nyawa }, statA: S[a.username], statB: S[b.username], catatan, gerak };
}

async function semuaHidup() { return (await hgetallJSON('warga')).filter((w) => !w.mati && !w.hidden); }

/** Create a challenge. target = name / @username / username. */
export async function tantang(u, target, { now = Date.now(), kartu } = {}) {
  if (!(await aktif())) throw new Error('Arena belum dibuka.');
  if (!buka(now)) throw new Error(`Arena buka pukul ${String(JAM_BUKA).padStart(2, '0')}.00–${JAM_TUTUP}.00 WIB.`);
  u = key(u);
  const warga = await semuaHidup();
  const me = warga.find((w) => w.username === u); if (!me) throw new Error('Kamu belum punya hewan yang hidup.');
  const r = cariHewan(String(target || '').replace(/^@/, ''), warga);
  const lawan = r.w || warga.find((w) => w.username === key(target));
  if (!lawan) throw new Error(r.ambigu ? pesanAmbigu(r.ambigu[0].nama, r.ambigu) : `Hewan "${String(target).slice(0, 30)}" tidak ditemukan.`);
  if (lawan.username === u) throw new Error('Tidak bisa menantang diri sendiri.');
  // 1 Nov: hanya boleh menantang hewan setingkat, 1 tingkat di atas, atau 1 tingkat di bawah
  if (Math.abs((Number(me.tier) || 0) - (Number(lawan.tier) || 0)) > SELISIH_TINGKAT) {
    throw new Error(`${lawan.nama} (${namaTingkat(lawan.tier)}) terlalu jauh tingkatnya dari ${me.nama} (${namaTingkat(me.tier)}). Kamu hanya bisa menantang hewan setingkat, 1 tingkat di atas, atau 1 tingkat di bawah.`);
  }
  const kMasuk = `arena_masuk:${lawan.username}:${hari(now)}`;
  if (Number(await redis('GET', kMasuk) || 0) >= MAKS_DITANTANG_HARIAN) throw new Error(`${lawan.nama} sudah menerima ${MAKS_DITANTANG_HARIAN} tantangan hari ini. Coba lagi besok ya!`);
  const nHari = Number(await redis('INCR', `arena_n:${u}:${hari(now)}`)); await redis('EXPIRE', `arena_n:${u}:${hari(now)}`, 172800);
  if (nHari > MAKS_TANTANG_HARIAN) throw new Error(`Maksimal ${MAKS_TANTANG_HARIAN} tantangan per hari. Besok lagi ya!`);
  const pasangan = [u, lawan.username].sort().join('|');
  if ((await redis('SET', `arena_pasang:${pasangan}:${hari(now)}`, '1', 'NX', 'EX', '172800')) !== 'OK') throw new Error(`${me.nama} dan ${lawan.nama} sudah bertemu hari ini. Coba lawan lain!`);
  await redis('INCR', kMasuk); await redis('EXPIRE', kMasuk, 172800);
  const id = String(now) + Math.floor(Math.random() * 1000), sampaiT = batasJawab(now);
  const t = { id, dari: u, ke: lawan.username, namaDari: me.nama, namaKe: lawan.nama, t: new Date(now).toISOString(), sampai: new Date(sampaiT).toISOString(), aturan: 'oto', kartuDari: kartuValid(kartu) ? kartu : kartuAcak(id), kartuPilih: kartuValid(kartu) ? 1 : 0 };
  await setJSON('arena_tantang', id, t);
  await kabar(t.ke, `⚔️ ${t.namaKe} DITANTANG ${t.namaDari} di Arena! Terima sampai ${hariJam(sampaiT)} WIB lewat website (DM "ARENA" untuk link) atau komen "Terima: ${t.namaDari}". Kalau tidak dijawab, ${t.namaKe} tetap bertarung OTOMATIS.`, 'tantang' + id);
  return t;
}

export async function tantanganUntuk(u, now = Date.now()) {
  u = key(u);
  return (await hgetallJSON('arena_tantang')).filter((t) => Date.parse(t.sampai) > now && (t.ke === u || t.dari === u)).sort((a, b) => String(b.t).localeCompare(String(a.t)));
}
export async function tantanganTerbuka(now = Date.now()) {
  return (await hgetallJSON('arena_tantang')).filter((t) => Date.parse(t.sampai) > now).sort((a, b) => String(b.t).localeCompare(String(a.t))).slice(0, 20);
}

// ---------------- Kartu Jurus + Main Langsung ----------------
export const MAIN_MS = 6 * 6e4; // waktu bermain setelah duel dimulai; lewat dari itu duel ditutup
export const JEDA_MS = 5 * 6e4; // 2 Nov: duel dimulai 5 menit setelah tantangan diterima, supaya kedua pemilik bisa standby
const jamWIB = (t) => new Date(t + 7 * 36e5).toISOString().slice(11, 16).replace(':', '.');
const HARI_NAMA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const hariJam = (t) => (hari(t) === hari(Date.now()) ? 'hari ini' : HARI_NAMA[wib(t).getUTCDay()]) + ' pukul ' + jamWIB(t);
async function kabar(u, teks, kunci) { try { const { kabari } = await import('./kabar.js'); return await kabari(u, teks, { kunci }); } catch { return 'gagal'; } }
const jurusOf = (w) => (w.skill ? String(w.skill).split(/[,+]/)[0].trim().slice(0, 30) : null);
export function petarung(w, kartu) { return { u: w.username, nama: w.nama, stat: statistik(w), kartu, jurus: jurusOf(w) }; }
function ringkas(h, A, B) {
  const nm = { [A.u]: A.nama, [B.u]: B.nama }, out = [];
  for (const g of h.gerak) {
    if (out.length >= 9) break;
    if (g.hindar) { if (Math.random() < .5) out.push(`${nm[g.l]} menghindar dengan lincah!`); continue; }
    if (g.kritis || g.jurus || g.unggul === g.sisiP) out.push(`${nm[g.p]}${g.jurus ? ` memakai ${g.jurus}` : ' menyerang'}${g.kritis ? ' — SEMPURNA!' : ''} (-${g.dmg})`);
  }
  if (h.ko) out.push(`${nm[h.kalah]} tumbang! K.O.!`);
  return out;
}
/** Catat duel yang sudah selesai: daftar duel, poin Liga, pengumuman. */
async function catatDuel(t, a, b, h, A, B, { now, umumkan, mode }) {
  const duel = { id: t.id, t: new Date(now).toISOString(), tHitung: t.t, a: a.username, b: b.username, namaA: a.nama, namaB: b.nama, tierA: a.tier, tierB: b.tier, mode, ...h, catatan: ringkas(h, A, B) };
  await siapkanPoin(); // susun dari riwayat lama dulu, sebelum duel ini dicatat
  await redis('LPUSH', 'arena_duel', JSON.stringify(duel)); await redis('LTRIM', 'arena_duel', 0, 199);
  const mg = mingguKe(now);
  await redis('ZINCRBY', 'arena_menang:' + mg, '1', h.menang);
  await redis('ZINCRBY', 'arena_main:' + mg, '1', a.username); await redis('ZINCRBY', 'arena_main:' + mg, '1', b.username);
  const W = h.menang === a.username ? a : b, K = W === a ? b : a;
  const hrT = hari(Date.parse(t.t) || now); // dihitung pada hari tantangan diberikan
  await catatPoin(W.username, hrT, POIN_MENANG, t.id); await catatPoin(K.username, hrT, POIN_KALAH, t.id);
  try { await (await import('./ligawil.js')).catatDuel(a.username, b.username, h.menang, now); } catch { /* ignore */ }
  if (umumkan) { try { await umumkan(`⚔️ ARENA: ${W.nama} mengalahkan ${K.nama}${h.ko ? ' dengan K.O.' : ''} di babak ${h.ronde}!${mode === 'main' ? ' (main langsung)' : ''}`, W.username); } catch { /* ignore */ } }
  return duel;
}

/**
 * Terima tantangan. Tanpa `kartu` (mis. lewat komentar "Terima:"): duel otomatis, kartu acak, tap rata-rata.
 * Dengan `kartu` (website): mulai sesi MAIN LANGSUNG → { main: true, setup }; hasil dikirim lewat selesaiMain().
 */
export async function terima(u, idAtauNama, { now = Date.now(), umumkan, kartu } = {}) {
  if (!(await aktif())) throw new Error('Arena belum dibuka.');
  if (!buka(now)) throw new Error(`Arena buka pukul ${String(JAM_BUKA).padStart(2, '0')}.00–${JAM_TUTUP}.00 WIB.`);
  u = key(u);
  const list = (await tantanganUntuk(u, now)).filter((t) => t.ke === u);
  const q = String(idAtauNama || '').toLowerCase().replace(/^@/, '').trim();
  const t = list.find((x) => x.id === q) || list.find((x) => x.namaDari.toLowerCase() === q || x.dari === q) || (q ? null : list[0]);
  if (!t) throw new Error('Tidak ada tantangan yang bisa diterima (mungkin sudah lewat 12 jam).');
  if (kartu !== undefined && !kartuValid(kartu)) throw new Error('Pilih 3 kartu: satu untuk setiap babak.');
  if ((await redis('HDEL', 'arena_tantang', t.id)) !== 1) throw new Error('Tantangan ini sudah diproses.');
  const [a, b] = await Promise.all([getJSON('warga', t.dari), getJSON('warga', t.ke)]);
  if (!a || a.mati || !b || b.mati) throw new Error('Salah satu hewan sudah tidak ada.');
  const A = petarung(a, kartuValid(t.kartuDari) ? t.kartuDari : kartuAcak(t.id));
  // 2 Nov: duel dijadwalkan 5 menit lagi; KEDUA pemilik bisa main langsung (pemilik yang tidak datang = tap rata-rata)
  const B = petarung(b, kartuValid(kartu) ? kartu : kartuAcak(t.id + ':b'));
  const mulaiT = now + JEDA_MS;
  const sesi = { t, A, B, diterima: new Date(now).toISOString(), mulai: new Date(mulaiT).toISOString(), batas: new Date(mulaiT + MAIN_MS).toISOString(), taps: {} };
  await setJSON('arena_sesi', t.id, sesi);
  const pukul = jamWIB(mulaiT);
  await kabar(t.dari, `⚔️ ${t.namaKe} MENERIMA tantangan ${t.namaDari}! Duel dimulai pukul ${pukul} WIB (5 menit lagi). Buka Arena di website (DM "ARENA" untuk link) dan bersiap TAP. Tidak datang = bertarung otomatis.`, 'terima' + t.id);
  if (umumkan) { try { await umumkan(`⚔️ ARENA: ${t.namaKe} menerima tantangan ${t.namaDari}! Duel dimulai pukul ${pukul} WIB.`, t.ke); } catch { /* ignore */ } }
  return { main: true, jadwal: true, mulai: sesi.mulai, pukul, setup: setupSesi(sesi) };
}
/** 3 Nov: tombol "Siap, mulai sekarang!" — kalau KEDUA pemilik menekannya, duel langsung dimulai (3 detik lagi). */
export const SIAP_MS = 3000;
export async function siap(u, id, { now = Date.now() } = {}) {
  u = key(u); id = String(id || '');
  const sesi = await getJSON('arena_sesi', id);
  if (!sesi) throw new Error('Duel ini sudah selesai.');
  const sisi = sesi.t.dari === u ? 'a' : sesi.t.ke === u ? 'b' : null;
  if (!sisi) throw new Error('Ini bukan duelmu.');
  if (now >= Date.parse(sesi.mulai)) return setupSesi(sesi); // sudah dimulai
  sesi.siap = { ...(sesi.siap || {}), [sisi]: new Date(now).toISOString() };
  if (sesi.siap.a && sesi.siap.b) {
    const m = now + SIAP_MS;
    sesi.mulai = new Date(m).toISOString(); sesi.batas = new Date(m + MAIN_MS).toISOString(); sesi.langsung = true;
  }
  await setJSON('arena_sesi', id, sesi);
  return setupSesi(sesi);
}
export function setupSesi(s) { return { id: s.t.id, seed: s.t.id, A: s.A, B: s.B, mulai: s.mulai, batas: s.batas, serangan: BABAK * PER_BABAK, siap: { a: !!(s.siap || {}).a, b: !!(s.siap || {}).b } }; }
/** Duel terjadwal / berlangsung milik u (untuk tombol MAIN di website). */
export async function sesiUntuk(u) {
  u = key(u);
  return (await hgetallJSON('arena_sesi')).filter((s) => s.t.dari === u || s.t.ke === u)
    .map((s) => ({ ...setupSesi(s), sisi: s.t.dari === u ? 'a' : 'b', sudahMain: !!(s.taps || {})[s.t.dari === u ? 'a' : 'b'] }));
}
/** Kirim tap salah satu pemilik. Duel selesai bila keduanya sudah main, atau saat waktu bermain habis. */
export async function selesaiMain(u, id, taps, { now = Date.now(), umumkan } = {}) {
  u = key(u); id = String(id || '');
  const sesi = await getJSON('arena_sesi', id);
  if (!sesi) { const d = await cariDuel(id); if (d) return d; throw new Error('Sesi duel tidak ditemukan atau sudah selesai.'); }
  const sisi = sesi.t.dari === u ? 'a' : sesi.t.ke === u ? 'b' : null;
  if (!sisi) throw new Error('Ini bukan duelmu.');
  if (now < Date.parse(sesi.mulai || 0) - 5000) throw new Error(`Duel baru dimulai pukul ${jamWIB(Date.parse(sesi.mulai))} WIB.`);
  sesi.taps = sesi.taps || {};
  if (!sesi.taps[sisi]) {
    sesi.taps[sisi] = (Array.isArray(taps) ? taps : []).slice(0, BABAK * PER_BABAK).map((x) => (['sempurna', 'bagus', 'meleset'].includes(x) ? x : 'meleset'));
    await setJSON('arena_sesi', id, sesi);
  }
  const lain = sisi === 'a' ? 'b' : 'a';
  if (!sesi.taps[lain] && now <= Date.parse(sesi.batas)) return { menunggu: true, id, batas: sesi.batas };
  return tutupSesi(sesi, { now, umumkan });
}
async function tutupSesi(sesi, { now, umumkan }) {
  const s2 = (await getJSON('arena_sesi', sesi.t.id)) || sesi; // ambil tap terbaru
  if ((await redis('HDEL', 'arena_sesi', sesi.t.id)) !== 1) throw new Error('Duel ini sudah selesai.');
  const tp = s2.taps || {};
  const [a, b] = await Promise.all([getJSON('warga', s2.t.dari), getJSON('warga', s2.t.ke)]);
  // pemilik yang tidak main = tap rata-rata (BAGUS); yang berhenti di tengah = sisa tap MELESET
  const h = jalankan(s2.t.id, s2.A, s2.B, tp.a || null, tp.b || null);
  return catatDuel(s2.t, a || { username: s2.A.u, nama: s2.A.nama }, b || { username: s2.B.u, nama: s2.B.nama }, h, s2.A, s2.B, { now, umumkan, mode: tp.a || tp.b ? 'main' : 'otomatis' });
}
/** Sesi main langsung yang ditinggal: selesaikan dengan tap MELESET. */
export async function sapuSesi({ now = Date.now(), umumkan } = {}) {
  const out = [];
  for (const s of await hgetallJSON('arena_sesi')) { if (now > Date.parse(s.batas)) { try { out.push(await tutupSesi(s, { now, umumkan })); } catch { /* ignore */ } } }
  return out;
}
/** 4 Nov: "Lewati" (dulu Tolak). Jatah 2x per hari tanpa akibat; lebih dari itu → duel otomatis langsung. */
export async function tolak(u, id, { now = Date.now(), umumkan } = {}) {
  u = key(u); const t = await getJSON('arena_tantang', String(id));
  if (!t || (t.ke !== u && t.dari !== u)) throw new Error('Tantangan tidak ditemukan.');
  if (t.dari === u) {
    if ((await redis('HDEL', 'arena_tantang', t.id)) !== 1) return { ok: true };
    await kabar(t.ke, `${t.namaDari} membatalkan tantangannya untuk ${t.namaKe}. Tidak ada poin yang berubah.`, 'batal' + t.id);
    return { ok: true };
  }
  const k = `arena_lewati:${u}:${hari(now)}`;
  if (Number(await redis('GET', k) || 0) < JATAH_LEWATI) {
    const n = Number(await redis('INCR', k)); await redis('EXPIRE', k, 172800);
    if ((await redis('HDEL', 'arena_tantang', t.id)) !== 1) return { ok: true };
    await kabar(t.dari, `${t.namaKe} sedang tidak bisa bertarung dan melewati tantangan ${t.namaDari}. Tidak ada poin yang berubah. Coba lawan lain yuk!`, 'tolak' + t.id);
    return { ok: true, lewati: true, sisaLewati: JATAH_LEWATI - n };
  }
  const d = await duelOtomatis(t, { now, umumkan, alasan: 'dilewati' });
  return { ok: true, otomatis: true, duel: d };
}
/** Tantangan tidak dijawab / jatah lewati habis → kedua hewan bertarung otomatis (kartu & tap rata-rata). */
async function duelOtomatis(t, { now, umumkan, alasan }) {
  await redis('HDEL', 'arena_tantang', t.id);
  const [a, b] = await Promise.all([getJSON('warga', t.dari), getJSON('warga', t.ke)]);
  if (!a || a.mati || !b || b.mati) return null;
  const A = petarung(a, kartuAcak(t.id + ':a')), B = petarung(b, kartuAcak(t.id + ':b'));
  const h = jalankan(t.id, A, B);
  const d = await catatDuel(t, a, b, h, A, B, { now, umumkan, mode: 'otomatis' });
  await kabar(t.ke, `⚔️ Tantangan ${t.namaDari} ${alasan === 'dilewati' ? 'dilewati lebih dari 2x hari ini' : 'tidak dijawab'}, jadi ${t.namaKe} bertarung OTOMATIS: ${h.menang === b.username ? 'MENANG' : 'kalah'}! Lihat replay di Arena.`, 'oto' + t.id);
  return d;
}
/** Tantangan yang kedaluwarsa tanpa jawaban → duel otomatis (sejak 4 Nov tidak ada lagi kalah WO). */
export async function sapuTantangan({ now = Date.now(), umumkan } = {}) {
  const out = [];
  for (const t of await hgetallJSON('arena_tantang')) {
    if (Date.parse(t.sampai) > now) continue;
    if ((await redis('HDEL', 'arena_tantang', t.id)) !== 1) continue;
    if (t.aturan !== 12 && t.aturan !== 'oto') continue; // tantangan lama sekali (aturan 2 jam): kedaluwarsa saja
    try { const d = await duelOtomatis(t, { now, umumkan, alasan: 'tidak dijawab' }); if (d) out.push({ id: d.id, menang: d.menang }); } catch { /* ignore */ }
  }
  return out;
}
/** 4 Nov: semua kekalahan W.O. (-1) musim ini dikembalikan. Sekali saja. */
export async function kembalikanPoinWO() {
  if ((await redis('SET', 'arena_wo_kembali_v1', '1', 'NX')) !== 'OK') return null;
  await siapkanPoin();
  const hasil = [];
  for (const [u, r] of Object.entries(await semuaPoin())) {
    const n = (r.ev || []).filter((e) => String(e[2] || '').startsWith('wo')).length;
    if (!n) continue;
    r.ev = r.ev.filter((e) => !String(e[2] || '').startsWith('wo')); await setJSON(PK, u, r); hasil.push({ u, n });
  }
  await redis('SET', 'arena_wo_kembali_hasil', JSON.stringify(hasil));
  return hasil;
}

/** riwayat duel kedua petarung SEBELUM duel ini (dari 200 duel terakhir), untuk kartu di replay */
export async function riwayatDuel(d) {
  const all = await duelTerbaru(200); const i = all.findIndex((x) => x.id === d.id);
  const lama = i >= 0 ? all.slice(i + 1) : all.filter((x) => Date.parse(x.t) < Date.parse(d.t));
  const rek = (u) => {
    const ds = lama.filter((x) => !x.wo && (x.a === u || x.b === u)); let beruntun = 0;
    for (const x of ds) { if (x.menang === u) beruntun++; else break; }
    return { main: ds.length, menang: ds.filter((x) => x.menang === u).length, beruntun, daftar: ds.slice(0, 5).map((x) => ({ id: x.id, lawan: (x.a === u ? x.namaB : x.namaA) + (x.wo ? ' (tidak bertarung)' : ''), menang: x.menang === u ? 1 : 0 })) };
  };
  return { [d.a]: rek(d.a), [d.b]: rek(d.b) };
}
export async function cariDuel(id) { return (await duelTerbaru(200)).find((d) => d.id === String(id)) || null; }
export async function duelTerbaru(n = 15) { return ((await redis('LRANGE', 'arena_duel', 0, n - 1)) || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean); }
export async function klasemen(minggu = mingguKe(), n = 10) {
  const z = (await redis('ZREVRANGE', 'arena_menang:' + minggu, 0, n - 1, 'WITHSCORES')) || [];
  const out = []; for (let i = 0; i < z.length; i += 2) out.push({ u: z[i], menang: Number(z[i + 1]) });
  for (const x of out) x.main = Number((await redis('ZSCORE', 'arena_main:' + minggu, x.u)) || 0);
  return out;
}

// ---------------- LIGA ARENA (klasemen per musim) ----------------
// Poin (hari = tanggal WIB saat TANTANGAN diberikan): menang +1, kalah -1, poin terendah 0 (tidak ada minus).
// 4 Nov: tidak dijawab = duel otomatis; W.O. lama dikembalikan (kembalikanPoinWO).
// Musim 1: 31 Okt – Minggu 8 Nov. Setelah itu tiap minggu Senin–Minggu.
// Juara musim (poin tertinggi, > 0) ditetapkan Senin pukul 09.00 WIB (tantangan Minggu malam masih bisa dijawab
// 12 jam) dan mendapat 1 Batu Evolusi. Poin sama: head to head (duel langsung antara keduanya di musim itu), lalu lebih banyak menang,
// lalu lebih sedikit kalah, lalu yang lebih dulu bertanding.
export const POIN_MENANG = 1, POIN_KALAH = -1; // poin tidak pernah di bawah 0
const PK = 'arena_poin';
async function catatPoin(u, hr, delta, id) {
  const r = (await getJSON(PK, u)) || { ev: [] };
  if (id && r.ev.some((e) => e[2] === id)) return r;
  r.ev.push([hr, delta, id || null]);
  const batas = new Date(Date.parse(hr + 'T00:00:00Z') - 60 * 864e5).toISOString().slice(0, 10);
  r.ev = r.ev.filter((e) => e[0] >= batas);
  await setJSON(PK, u, r); return r;
}
const MUSIM1 = { id: 'M1', nama: 'Musim 1', mulai: '2026-10-31', akhir: '2026-11-08' };
const tambahHari = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
/** Musim yang sedang berjalan (atau yang memuat tanggal `hr`). */
export function musimDari(t = Date.now()) {
  const hr = hari(t);
  if (hr <= MUSIM1.akhir) return { ...MUSIM1 };
  const senin = mingguKe(t); const n = Math.round((Date.parse(senin) - Date.parse(tambahHari(MUSIM1.akhir, 1))) / (7 * 864e5)) + 2;
  return { id: 'M' + n, nama: 'Musim ' + n, mulai: senin, akhir: tambahHari(senin, 6) };
}
const selesaiMusim = (m) => Date.parse(tambahHari(m.akhir, 1) + 'T09:00:00+07:00'); // Senin 09.00 WIB
/** Sekali saja: susun poin dari riwayat duel yang sudah ada (aturan 1 Nov). */
export async function siapkanPoin() {
  if ((await redis('GET', 'arena_poin_v')) === '2') return false; // v2: kalah -1 (1 Nov) → susun ulang dari riwayat duel
  if ((await redis('SET', 'arena_poin_lock2', '1', 'NX', 'EX', '60')) !== 'OK') return false;
  await redis('DEL', PK);
  const ds = (await duelTerbaru(200)).sort((x, y) => Date.parse(x.t) - Date.parse(y.t));
  for (const d of ds) {
    const hr = hari(Date.parse(d.tHitung || d.t));
    if (d.wo) continue; // 4 Nov: W.O. tidak lagi mengurangi poin
    await catatPoin(d.menang, hr, POIN_MENANG, d.id); await catatPoin(d.menang === d.a ? d.b : d.a, hr, POIN_KALAH, d.id);
  }
  await redis('SET', 'arena_poin_v', '2');
  return true;
}
async function semuaPoin() { let h = (await redis('HGETALL', PK)) || []; if (!Array.isArray(h)) h = Object.entries(h).flat(); const out = {}; for (let i = 0; i < h.length; i += 2) { try { out[h[i]] = JSON.parse(h[i + 1]); } catch { /* ignore */ } } return out; }
const waktuEv = (e) => Number(String(e[2] || '').replace(/^wo/, '').slice(0, 13)) || 0;
/** Poin satu musim: dijumlah berurutan waktu tantangan, tidak pernah di bawah 0. */
export function poinMusim(ev, m) {
  let p = 0;
  for (const e of (ev || []).filter((x) => x[0] >= m.mulai && x[0] <= m.akhir).sort((a, b) => a[0].localeCompare(b[0]) || waktuEv(a) - waktuEv(b))) p = Math.max(0, p + e[1]);
  return p;
}
const ikutMusim = (r, m) => !!r && (r.ev || []).some((e) => e[0] >= m.mulai && e[0] <= m.akhir);
/** Klasemen satu musim. */
export async function klasemenLiga(m = musimDari(), n = 30) {
  await siapkanPoin();
  const rows = [];
  for (const [u, r] of Object.entries(await semuaPoin())) {
    const ev = (r.ev || []).filter((e) => e[0] >= m.mulai && e[0] <= m.akhir); if (!ev.length) continue;
    const x = { u, poin: 0, menang: 0, kalah: 0, wo: 0, awal: ev.map((e) => e[0]).sort()[0] };
    for (const [, d, id] of ev) { if (d > 0) x.menang++; else if (String(id || '').startsWith('wo')) x.wo++; else x.kalah++; }
    x.poin = poinMusim(ev, m);
    x.main = x.menang + x.kalah; rows.push(x);
  }
  // head to head: duel langsung antara dua hewan yang poinnya sama (musim ini)
  const pair = {}; // pair['a|b'] = berapa kali a mengalahkan b
  const tie = new Set(); const cnt = {}; for (const x of rows) cnt[x.poin] = (cnt[x.poin] || 0) + 1;
  for (const x of rows) if (cnt[x.poin] > 1) tie.add(x.u);
  if (tie.size) {
    for (const d of await duelTerbaru(200)) {
      if (d.wo || !d.menang || !tie.has(d.a) || !tie.has(d.b)) continue;
      const h = hari(Date.parse(d.tHitung || d.t)); if (h < m.mulai || h > m.akhir) continue;
      const k = d.menang + '|' + (d.menang === d.a ? d.b : d.a); pair[k] = (pair[k] || 0) + 1;
    }
  }
  const h2h = (a, b) => (pair[b.u + '|' + a.u] || 0) - (pair[a.u + '|' + b.u] || 0); // < 0: a di atas
  rows.sort((a, b) => b.poin - a.poin || h2h(a, b) || b.menang - a.menang || (a.kalah + a.wo) - (b.kalah + b.wo) || String(a.awal).localeCompare(String(b.awal)));
  return rows.slice(0, n);
}
/** Setelah musim selesai (Senin 09.00 WIB): peringkat 1 (poin > 0) dapat 1 Batu Evolusi. Idempoten. Juga menyapu tantangan kedaluwarsa. */
export async function cekJuara({ now = Date.now(), umumkan } = {}) {
  await siapkanPoin();
  await sapuTantangan({ now, umumkan }).catch(() => {});
  await sapuSesi({ now, umumkan }).catch(() => {});
  const out = [];
  const m = musimDari(now - 3 * 864e5); // musim yang baru saja berakhir (Senin pagi → musim minggu lalu)
  for (const mm of [m, musimDari(now)]) {
    if (now < selesaiMusim(mm)) continue;
    if ((await redis('SET', 'arena_liga_juara:' + mm.id, '1', 'NX')) !== 'OK') continue;
    const top = (await klasemenLiga(mm, 1))[0];
    if (!top || top.poin <= 0) continue;
    const w = await getJSON('warga', top.u); if (!w || w.mati) continue;
    w.batu = (w.batu || 0) + 1;
    w.batuLog = [...(w.batuLog || []), { n: 1, bukti: 'Juara Liga Arena ' + mm.nama, t: new Date(now).toISOString() }].slice(-30);
    w.juaraArena = (w.juaraArena || 0) + 1;
    await setJSON('warga', top.u, w);
    if (umumkan) { try { await umumkan(`🏆 JUARA LIGA ARENA ${mm.nama.toUpperCase()}: ${w.nama} dengan ${top.poin} poin (${top.menang} menang, ${top.kalah + top.wo} kalah)! Hadiah: 1 Batu Evolusi.`, top.u); } catch { /* ignore */ } }
    out.push({ musim: mm.id, u: top.u, poin: top.poin });
  }
  return out;
}
