// ============================================================
//  LEGENDARY & GOD MODE (31 Okt 2026) — aktif setelah diumumkan di video (redis 'evo_batu' = '1')
//  - Batu Evolusi: Mythical→Legendary = cerita + 2 batu, Legendary→God Mode = cerita + 3 batu (lihat rules.js)
//  - Sumber batu: beli (1 batu = 3 Kopi Admin, dicatat Admin), Ketua wilayah terpilih +1, aktif 7 hari = +1,
//    juara Arena mingguan +1 (nanti, bersama Arena).
//  - God Mode: "Cuaca: hujan bintang" sekali seminggu, 1 jam, di wilayah hewannya.
// ============================================================
import { redis, getJSON, setJSON, hgetallJSON } from './db.js';
import { replyToComment } from './ig.js';

export const HARI_PER_BATU = 7;
export const CUACA_MENIT = 60;
export const CUACA = {
  bintang: { label: 'hujan bintang', emoji: '🌠', kata: ['bintang', 'meteor'] },
  salju: { label: 'salju', emoji: '❄️', kata: ['salju', 'snow', 'es'] },
  pelangi: { label: 'pelangi', emoji: '🌈', kata: ['pelangi', 'rainbow'] },
  hujan: { label: 'hujan', emoji: '🌧️', kata: ['hujan', 'gerimis', 'rain'] },
  petir: { label: 'badai petir', emoji: '⛈️', kata: ['petir', 'badai', 'kilat', 'guntur'] },
  sakura: { label: 'hujan kelopak bunga', emoji: '🌸', kata: ['sakura', 'bunga', 'kelopak'] },
};
export const aktif = async () => (await redis('GET', 'evo_batu')) === '1';
const key = (u) => String(u || '').toLowerCase().replace(/^@/, '');
const hariWIB = (t = Date.now()) => new Date(t + 7 * 36e5).toISOString().slice(0, 10);

/** "Cuaca: hujan bintang" -> 'bintang' (or null) */
export function jenisCuaca(teks) {
  const t = String(teks || '').toLowerCase();
  for (const [id, x] of Object.entries(CUACA)) if (x.kata.some((k) => new RegExp('\\b' + k + '\\b').test(t))) return id;
  return null;
}

/** Weather currently active (public). */
export async function cuacaAktif(now = Date.now()) {
  const all = (await getJSON('cuaca_aktif')) || [];
  return all.filter((x) => Date.parse(x.sampai) > now);
}

/** Handle a "Cuaca:" comment. Returns a result tag or null (not a weather comment / not active). */
export async function prosesCuaca(c, u, teks, w, { wilayahOf, log, obSistem, namaWilayah } = {}) {
  if (!(await aktif())) return null;
  const balas = async (m) => { try { await replyToComment(c.id, `@${u} ${m}`); } catch { /* ignore */ } };
  if (!w || w.mati) return null;
  if (w.tier < 5) { await balas(`Hanya hewan God Mode yang bisa mengendalikan cuaca. Terus berevolusi ya!`); return 'cuaca:bukan-dewa'; }
  const jenis = jenisCuaca(teks);
  if (!jenis) { await balas(`Cuaca yang bisa dipanggil: ${Object.values(CUACA).map((x) => x.label).join(', ')}. Contoh: "Cuaca: hujan bintang"`); return 'cuaca:tidak-dikenal'; }
  const kunci = 'cuaca_minggu:' + u;
  const bisaLagi = Number((await redis('GET', kunci)) || 0);
  if (bisaLagi > Date.now()) { await balas(`${w.nama} sudah memanggil cuaca minggu ini. Bisa lagi dalam ${Math.ceil((bisaLagi - Date.now()) / 864e5)} hari.`); return 'cuaca:tunggu'; }
  await redis('SET', kunci, String(Date.now() + 7 * 864e5), 'EX', String(7 * 86400));
  const n = wilayahOf(w);
  const now = Date.now();
  const x = { wilayah: n, jenis, u, nama: w.nama, mulai: new Date(now).toISOString(), sampai: new Date(now + CUACA_MENIT * 6e4).toISOString() };
  const list = (await cuacaAktif(now)).filter((y) => y.wilayah !== n);
  list.push(x);
  await redis('SET', 'cuaca_aktif', JSON.stringify(list));
  const nm = (namaWilayah && (await namaWilayah(n))) || `Wilayah ${n}`;
  const t = `${CUACA[jenis].emoji} Dewa ${w.nama} memanggil ${CUACA[jenis].label} di ${nm} selama 1 jam!`;
  try { await log('bangun', t, { u }); } catch { /* ignore */ }
  try { await obSistem(t); } catch { /* ignore */ }
  await balas(`${CUACA[jenis].emoji} ${CUACA[jenis].label} turun di ${nm} selama 1 jam! Lihat di peta (link di bio).`);
  return 'cuaca:' + jenis;
}

/** Count one active day (comment or chat). Every 7 active days = 1 Batu Evolusi. Never throws. */
export async function catatAktif(u, { obSistem } = {}) {
  try {
    if (!(await aktif())) return null;
    u = key(u); if (!u) return null;
    if (Number(await redis('SADD', 'aktif_hari:' + u, hariWIB())) !== 1) return null; // hari ini sudah tercatat
    const n = Number(await redis('SCARD', 'aktif_hari:' + u));
    await redis('HSET', 'aktif_n', u, String(n));
    const sudah = Number((await redis('HGET', 'aktif_batu', u)) || 0);
    if (Math.floor(n / HARI_PER_BATU) <= sudah) return { hari: n };
    const w = await getJSON('warga', u); if (!w || w.mati) return { hari: n };
    w.batu = (w.batu || 0) + 1;
    w.batuLog = [...(w.batuLog || []), { n: 1, bukti: `aktif ${n} hari`, t: new Date().toISOString() }].slice(-30);
    await setJSON('warga', u, w);
    await redis('HSET', 'aktif_batu', u, String(sudah + 1));
    try { if (obSistem) await obSistem(`💎 ${w.nama} aktif ${n} hari dan mendapat 1 Batu Evolusi!`); } catch { /* ignore */ }
    return { hari: n, batu: w.batu };
  } catch { return null; }
}

/** Once, when the rules go live: every current Ketua gets 1 Batu Evolusi (new Ketua get theirs when elected). */
export async function batuKetuaAwal() {
  if ((await redis('SET', 'batu_ketua_awal', '1', 'NX')) !== 'OK') return [];
  const out = [];
  for (const w of await hgetallJSON('warga')) {
    if (w.mati || !/^Ketua Koloni/.test(w.gelar || '')) continue;
    w.batu = (w.batu || 0) + 1;
    w.batuLog = [...(w.batuLog || []), { n: 1, bukti: 'Ketua Koloni', t: new Date().toISOString() }].slice(-30);
    await setJSON('warga', w.username, w); out.push(w.username);
  }
  return out;
}
