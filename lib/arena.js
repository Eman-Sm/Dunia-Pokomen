// ============================================================
//  ARENA POKOMEN (aktif setelah video Hari ke-6: redis 'evo_batu' = '1')
//  Buka 07.00–21.00 WIB. Duel 1 lawan 1, diatur otomatis:
//    1. Penantang: tombol "Tantang" di website (link pribadi) atau komentar "Tantang: nama hewan"
//    2. Yang ditantang: tombol "Terima" di website atau komentar "Terima: nama penantang" (berlaku 2 jam / sampai 21.00)
//    3. Duel langsung dihitung dari statistik (tingkat + latihan) + sedikit keberuntungan, hasilnya diumumkan.
//  Juara mingguan (menang terbanyak Senin–Minggu, ditutup Minggu 21.00 WIB) mendapat 1 Batu Evolusi.
// ============================================================
import { redis, getJSON, setJSON, hgetallJSON } from './db.js';
import { statistik } from './statistik.js';
import { cariHewan, pesanAmbigu } from './hewan.js';

export const JAM_BUKA = 7, JAM_TUTUP = 21;
export const MAKS_TANTANG_HARIAN = 5;
const BERLAKU_MS = 2 * 36e5;
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
  const catatan = [];
  const jurus = (w) => (w.skill ? String(w.skill).split(/[,+]/)[0].trim().slice(0, 30) : null);
  let ronde = 0;
  while (ronde < 20 && hp[a.username] > 0 && hp[b.username] > 0) {
    ronde++;
    const urut = S[a.username].cepat + R() * 6 >= S[b.username].cepat + R() * 6 ? [a, b] : [b, a];
    for (const [p, l] of [urut, [urut[1], urut[0]]]) {
      if (hp[p.username] <= 0 || hp[l.username] <= 0) continue;
      const sp = S[p.username], sl = S[l.username];
      const hindar = .05 + Math.max(0, Math.min(.15, (sl.cepat - sp.cepat) * .004));
      if (R() < hindar) { if (catatan.length < 9) catatan.push(`${l.nama} menghindar dengan lincah!`); continue; }
      let dmg = Math.max(2, Math.round(sp.serang * (.85 + R() * .3) - sl.tahan * .4));
      const kritis = R() < .08 + (sp.cepat > sl.cepat ? .04 : 0);
      if (kritis) dmg = Math.round(dmg * 1.6);
      hp[l.username] = Math.max(0, hp[l.username] - dmg);
      const j = jurus(p);
      if (catatan.length < 9 && (kritis || R() < .35)) catatan.push(`${p.nama}${j && R() < .6 ? ` memakai ${j}` : ' menyerang'}${kritis ? ' — KRITIS!' : ''} (-${dmg})`);
    }
  }
  let menang;
  if (hp[a.username] <= 0) menang = b; else if (hp[b.username] <= 0) menang = a;
  else menang = hp[a.username] / S[a.username].nyawa >= hp[b.username] / S[b.username].nyawa ? a : b;
  const kalah = menang === a ? b : a;
  catatan.push(`🏆 ${menang.nama} MENANG!`);
  return { menang: menang.username, kalah: kalah.username, ronde, sisa: { [a.username]: hp[a.username], [b.username]: hp[b.username] }, nyawa: { [a.username]: S[a.username].nyawa, [b.username]: S[b.username].nyawa }, catatan };
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
  const tutupHari = Date.parse(hari(now) + `T${JAM_TUTUP}:00:00+07:00`);
  const t = { id, dari: u, ke: lawan.username, namaDari: me.nama, namaKe: lawan.nama, t: new Date(now).toISOString(), sampai: new Date(Math.min(now + BERLAKU_MS, tutupHari)).toISOString() };
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
  if (!t) throw new Error('Tidak ada tantangan yang bisa diterima (mungkin sudah lewat 2 jam).');
  if ((await redis('HDEL', 'arena_tantang', t.id)) !== 1) throw new Error('Tantangan ini sudah diproses.');
  const [a, b] = await Promise.all([getJSON('warga', t.dari), getJSON('warga', t.ke)]);
  if (!a || a.mati || !b || b.mati) throw new Error('Salah satu hewan sudah tidak ada.');
  const hasil = simulasi(a, b, t.id);
  const duel = { id: t.id, t: new Date(now).toISOString(), a: a.username, b: b.username, namaA: a.nama, namaB: b.nama, tierA: a.tier, tierB: b.tier, ...hasil };
  await redis('LPUSH', 'arena_duel', JSON.stringify(duel)); await redis('LTRIM', 'arena_duel', 0, 199);
  const mg = mingguKe(now);
  await redis('ZINCRBY', 'arena_menang:' + mg, '1', hasil.menang);
  await redis('ZINCRBY', 'arena_main:' + mg, '1', a.username); await redis('ZINCRBY', 'arena_main:' + mg, '1', b.username);
  const W = hasil.menang === a.username ? a : b, K = W === a ? b : a;
  if (umumkan) { try { await umumkan(`⚔️ ARENA: ${W.nama} mengalahkan ${K.nama} dalam ${hasil.ronde} ronde!`, W.username); } catch { /* ignore */ } }
  return duel;
}
export async function tolak(u, id) {
  u = key(u); const t = await getJSON('arena_tantang', String(id));
  if (!t || (t.ke !== u && t.dari !== u)) throw new Error('Tantangan tidak ditemukan.');
  await redis('HDEL', 'arena_tantang', t.id); return { ok: true };
}

export async function duelTerbaru(n = 15) { return ((await redis('LRANGE', 'arena_duel', 0, n - 1)) || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean); }
export async function klasemen(minggu = mingguKe(), n = 10) {
  const z = (await redis('ZREVRANGE', 'arena_menang:' + minggu, 0, n - 1, 'WITHSCORES')) || [];
  const out = []; for (let i = 0; i < z.length; i += 2) out.push({ u: z[i], menang: Number(z[i + 1]) });
  for (const x of out) x.main = Number((await redis('ZSCORE', 'arena_main:' + minggu, x.u)) || 0);
  return out;
}

/** After Sunday 21:00 WIB: the week's top winner gets 1 Batu Evolusi (once per week). */
export async function tetapkanJuaraMinggu({ now = Date.now(), umumkan } = {}) {
  const mgLalu = mingguKe(now - 7 * 864e5), mgIni = mingguKe(now);
  const out = [];
  for (const mg of [mgLalu, mgIni]) {
    if (now < tutupMinggu(mg)) continue;
    if ((await redis('SET', 'arena_juara:' + mg, '1', 'NX')) !== 'OK') continue;
    const top = (await klasemen(mg, 1))[0];
    if (!top || !top.menang) continue;
    const w = await getJSON('warga', top.u); if (!w || w.mati) continue;
    w.batu = (w.batu || 0) + 1;
    w.batuLog = [...(w.batuLog || []), { n: 1, bukti: 'Juara Arena ' + mg, t: new Date(now).toISOString() }].slice(-30);
    w.juaraArena = (w.juaraArena || 0) + 1;
    await setJSON('warga', top.u, w);
    if (umumkan) { try { await umumkan(`🏆 JUARA ARENA MINGGU INI: ${w.nama} dengan ${top.menang} kemenangan! Hadiah: 1 Batu Evolusi.`, top.u); } catch { /* ignore */ } }
    out.push({ minggu: mg, u: top.u, menang: top.menang });
  }
  return out;
}
