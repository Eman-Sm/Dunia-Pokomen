// ============================================================
//  ARENA POKOMEN (aktif setelah video Hari ke-6: redis 'evo_batu' = '1')
//  Buka 07.00–21.00 WIB. Duel 1 lawan 1, diatur otomatis:
//    1. Penantang: tombol "Tantang" di website (link pribadi) atau komentar "Tantang: nama hewan"
//    2. Yang ditantang: tombol "Terima" di website atau komentar "Terima: nama penantang" (berlaku 12 jam).
//       Menolak / membiarkan sampai kedaluwarsa = dianggap kalah (-2 poin, kalau sudah bertanding di musim itu).
//       Duel yang diterima besok tetap dihitung pada waktu tantangan diberikan.
//    3. Duel langsung dihitung dari statistik (tingkat + latihan) + sedikit keberuntungan, hasilnya diumumkan.
//  Juara mingguan (menang terbanyak Senin–Minggu, ditutup Minggu 21.00 WIB) mendapat 1 Batu Evolusi.
// ============================================================
import { redis, getJSON, setJSON, hgetallJSON } from './db.js';
import { statistik } from './statistik.js';
import { cariHewan, pesanAmbigu } from './hewan.js';

export const JAM_BUKA = 7, JAM_TUTUP = 21;
export const MAKS_TANTANG_HARIAN = 5;
const BERLAKU_MS = 12 * 36e5; // 1 Nov: tantangan berlaku 12 jam (boleh diterima besok pagi)
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
export async function tantang(u, target, { now = Date.now() } = {}) {
  if (!(await aktif())) throw new Error('Arena belum dibuka.');
  if (!buka(now)) throw new Error(`Arena buka pukul ${String(JAM_BUKA).padStart(2, '0')}.00–${JAM_TUTUP}.00 WIB.`);
  u = key(u);
  const warga = await semuaHidup();
  const me = warga.find((w) => w.username === u); if (!me) throw new Error('Kamu belum punya hewan yang hidup.');
  const r = cariHewan(String(target || '').replace(/^@/, ''), warga);
  const lawan = r.w || warga.find((w) => w.username === key(target));
  if (!lawan) throw new Error(r.ambigu ? pesanAmbigu(r.ambigu[0].nama, r.ambigu) : `Hewan "${String(target).slice(0, 30)}" tidak ditemukan.`);
  if (lawan.username === u) throw new Error('Tidak bisa menantang diri sendiri.');
  const nHari = Number(await redis('INCR', `arena_n:${u}:${hari(now)}`)); await redis('EXPIRE', `arena_n:${u}:${hari(now)}`, 172800);
  if (nHari > MAKS_TANTANG_HARIAN) throw new Error(`Maksimal ${MAKS_TANTANG_HARIAN} tantangan per hari. Besok lagi ya!`);
  const pasangan = [u, lawan.username].sort().join('|');
  if ((await redis('SET', `arena_pasang:${pasangan}:${hari(now)}`, '1', 'NX', 'EX', '172800')) !== 'OK') throw new Error(`${me.nama} dan ${lawan.nama} sudah bertemu hari ini. Coba lawan lain!`);
  const id = String(now) + Math.floor(Math.random() * 1000);
  const t = { id, dari: u, ke: lawan.username, namaDari: me.nama, namaKe: lawan.nama, t: new Date(now).toISOString(), sampai: new Date(now + BERLAKU_MS).toISOString(), aturan: 12 };
  await setJSON('arena_tantang', id, t);
  return t;
}

export async function tantanganUntuk(u, now = Date.now()) {
  u = key(u);
  return (await hgetallJSON('arena_tantang')).filter((t) => Date.parse(t.sampai) > now && (t.ke === u || t.dari === u)).sort((a, b) => String(b.t).localeCompare(String(a.t)));
}
export async function tantanganTerbuka(now = Date.now()) {
  return (await hgetallJSON('arena_tantang')).filter((t) => Date.parse(t.sampai) > now).sort((a, b) => String(b.t).localeCompare(String(a.t))).slice(0, 20);
}

/** Accept: runs the duel immediately. `idAtauNama` = challenge id or challenger name. */
export async function terima(u, idAtauNama, { now = Date.now(), umumkan } = {}) {
  if (!(await aktif())) throw new Error('Arena belum dibuka.');
  if (!buka(now)) throw new Error(`Arena buka pukul ${String(JAM_BUKA).padStart(2, '0')}.00–${JAM_TUTUP}.00 WIB.`);
  u = key(u);
  const list = (await tantanganUntuk(u, now)).filter((t) => t.ke === u);
  const q = String(idAtauNama || '').toLowerCase().replace(/^@/, '').trim();
  const t = list.find((x) => x.id === q) || list.find((x) => x.namaDari.toLowerCase() === q || x.dari === q) || (q ? null : list[0]);
  if (!t) throw new Error('Tidak ada tantangan yang bisa diterima (mungkin sudah lewat 12 jam).');
  if ((await redis('HDEL', 'arena_tantang', t.id)) !== 1) throw new Error('Tantangan ini sudah diproses.');
  const [a, b] = await Promise.all([getJSON('warga', t.dari), getJSON('warga', t.ke)]);
  if (!a || a.mati || !b || b.mati) throw new Error('Salah satu hewan sudah tidak ada.');
  const hasil = simulasi(a, b, t.id);
  const duel = { id: t.id, t: new Date(now).toISOString(), tHitung: t.t, a: a.username, b: b.username, namaA: a.nama, namaB: b.nama, tierA: a.tier, tierB: b.tier, ...hasil };
  await siapkanPoin(); // susun dari riwayat lama dulu, sebelum duel ini dicatat
  await redis('LPUSH', 'arena_duel', JSON.stringify(duel)); await redis('LTRIM', 'arena_duel', 0, 199);
  const mg = mingguKe(now);
  await redis('ZINCRBY', 'arena_menang:' + mg, '1', hasil.menang);
  await redis('ZINCRBY', 'arena_main:' + mg, '1', a.username); await redis('ZINCRBY', 'arena_main:' + mg, '1', b.username);
  const W = hasil.menang === a.username ? a : b, K = W === a ? b : a;
  const hrT = hari(Date.parse(t.t) || now); // dihitung pada hari tantangan diberikan
  await catatPoin(W.username, hrT, POIN_MENANG, t.id); await catatPoin(K.username, hrT, POIN_KALAH, t.id);
  if (umumkan) { try { await umumkan(`⚔️ ARENA: ${W.nama} mengalahkan ${K.nama} dalam ${hasil.ronde} ronde!`, W.username); } catch { /* ignore */ } }
  return duel;
}
export async function tolak(u, id, { now = Date.now(), umumkan } = {}) {
  u = key(u); const t = await getJSON('arena_tantang', String(id));
  if (!t || (t.ke !== u && t.dari !== u)) throw new Error('Tantangan tidak ditemukan.');
  if ((await redis('HDEL', 'arena_tantang', t.id)) !== 1) return { ok: true };
  if (t.ke === u) return { ok: true, hukuman: await hukumWO(t, 'menolak', now, umumkan) }; // penantang membatalkan: tanpa hukuman
  return { ok: true };
}
/** Yang ditantang menolak / tidak menjawab: dianggap kalah (-2 poin pada hari tantangan), bila sudah bertanding di musim itu. */
async function hukumWO(t, alasan, now, umumkan) {
  await siapkanPoin();
  const tt = Date.parse(t.t) || now, m = musimDari(tt);
  if (!ikutMusim(await getJSON(PK, t.ke), m)) return null;
  const r = await catatPoin(t.ke, hari(tt), POIN_KALAH, 'wo' + t.id);
  const poin = (r.ev || []).filter((e) => e[0] >= m.mulai && e[0] <= m.akhir).reduce((a, e) => a + e[1], 0);
  const teks = `${t.namaKe} ${alasan === 'menolak' ? 'menolak' : 'tidak menjawab'} tantangan ${t.namaDari}: dianggap kalah, ${POIN_KALAH} poin.`;
  const rec = { id: 'wo' + t.id, t: new Date(now).toISOString(), tHitung: t.t, wo: alasan, a: t.dari, b: t.ke, namaA: t.namaDari, namaB: t.namaKe, menang: null, catatan: [teks] };
  await redis('LPUSH', 'arena_duel', JSON.stringify(rec)); await redis('LTRIM', 'arena_duel', 0, 199);
  if (umumkan) { try { await umumkan('⏰ ARENA: ' + teks, t.ke); } catch { /* ignore */ } }
  return { u: t.ke, poin };
}
/** Tantangan yang sudah lewat 12 jam tanpa jawaban → hukuman WO untuk yang ditantang. */
export async function sapuTantangan({ now = Date.now(), umumkan } = {}) {
  const out = [];
  for (const t of await hgetallJSON('arena_tantang')) {
    if (Date.parse(t.sampai) > now) continue;
    if ((await redis('HDEL', 'arena_tantang', t.id)) !== 1) continue;
    if (t.aturan !== 12) continue; // tantangan lama (aturan 2 jam) kedaluwarsa tanpa hukuman
    const h = await hukumWO(t, 'tidak menjawab', now, umumkan); if (h) out.push(h);
  }
  return out;
}

/** riwayat duel kedua petarung SEBELUM duel ini (dari 200 duel terakhir), untuk kartu di replay */
export async function riwayatDuel(d) {
  const all = await duelTerbaru(200); const i = all.findIndex((x) => x.id === d.id);
  const lama = i >= 0 ? all.slice(i + 1) : all.filter((x) => Date.parse(x.t) < Date.parse(d.t));
  const rek = (u) => {
    const ds = lama.filter((x) => (x.wo ? x.b === u : x.a === u || x.b === u)); let beruntun = 0;
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
// Poin (hari = tanggal WIB saat TANTANGAN diberikan): menang +1, kalah -2,
// menolak / tidak menjawab tantangan 12 jam = kalah (-2, hanya bila sudah bertanding di musim ini).
// Musim 1: 31 Okt – Minggu 8 Nov. Setelah itu tiap minggu Senin–Minggu.
// Juara musim (poin tertinggi, > 0) ditetapkan Senin pukul 09.00 WIB (tantangan Minggu malam masih bisa dijawab
// 12 jam) dan mendapat 1 Batu Evolusi. Seri: lebih banyak menang, lalu lebih sedikit kalah, lalu yang lebih dulu bertanding.
export const POIN_MENANG = 1, POIN_KALAH = -2;
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
  if ((await redis('GET', 'arena_poin_v')) === '1') return false;
  if ((await redis('SET', 'arena_poin_lock', '1', 'NX', 'EX', '60')) !== 'OK') return false;
  const ds = (await duelTerbaru(200)).sort((x, y) => Date.parse(x.t) - Date.parse(y.t));
  for (const d of ds) {
    const hr = hari(Date.parse(d.tHitung || d.t));
    if (d.wo) { await catatPoin(d.b, hr, POIN_KALAH, d.id); continue; }
    await catatPoin(d.menang, hr, POIN_MENANG, d.id); await catatPoin(d.menang === d.a ? d.b : d.a, hr, POIN_KALAH, d.id);
  }
  await redis('SET', 'arena_poin_v', '1');
  return true;
}
async function semuaPoin() { let h = (await redis('HGETALL', PK)) || []; if (!Array.isArray(h)) h = Object.entries(h).flat(); const out = {}; for (let i = 0; i < h.length; i += 2) { try { out[h[i]] = JSON.parse(h[i + 1]); } catch { /* ignore */ } } return out; }
const ikutMusim = (r, m) => !!r && (r.ev || []).some((e) => e[0] >= m.mulai && e[0] <= m.akhir);
/** Klasemen satu musim. */
export async function klasemenLiga(m = musimDari(), n = 30) {
  await siapkanPoin();
  const rows = [];
  for (const [u, r] of Object.entries(await semuaPoin())) {
    const ev = (r.ev || []).filter((e) => e[0] >= m.mulai && e[0] <= m.akhir); if (!ev.length) continue;
    const x = { u, poin: 0, menang: 0, kalah: 0, wo: 0, awal: ev.map((e) => e[0]).sort()[0] };
    for (const [, d, id] of ev) { x.poin += d; if (d > 0) x.menang++; else if (String(id || '').startsWith('wo')) x.wo++; else x.kalah++; }
    x.main = x.menang + x.kalah; rows.push(x);
  }
  rows.sort((a, b) => b.poin - a.poin || b.menang - a.menang || a.kalah - b.kalah || String(a.awal).localeCompare(String(b.awal)));
  return rows.slice(0, n);
}
/** Setelah musim selesai (Senin 09.00 WIB): peringkat 1 (poin > 0) dapat 1 Batu Evolusi. Idempoten. Juga menyapu tantangan kedaluwarsa. */
export async function cekJuara({ now = Date.now(), umumkan } = {}) {
  await siapkanPoin();
  await sapuTantangan({ now, umumkan }).catch(() => {});
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
