// ============================================================
//  POKOBOLL: rumah kapsul eksklusif, HANYA ADA 1 di Dunia Pokomen (1 Nov)
//  - Berdiri di Pulau Pokoboll (pulau di danau barat), wilayahnya sendiri.
//  - Desainnya mengikuti pemiliknya (warna tubuh & aksen hewan, permata elemen di puncak).
//  - Pemiliknya tidur di dalam Pokoboll setiap malam (22.00–05.00 WIB).
//  - Pemilik pertama lewat LELANG Biji Kopi (link pribadi, Toko). Biji hanya dipotong dari pemenang.
//  Disembunyikan sampai Admin menyalakan `tampil` (setelah diumumkan di video).
// ============================================================
import { redis, getJSON } from './db.js';

const K = 'pokoboll';
const key = (u) => String(u || '').toLowerCase().replace(/^@/, '').trim();
export const DEFAULT = { tampil: false, pemilik: null, sejak: null, lelang: null, riwayat: [] };
export async function getPB() { const v = await redis('GET', K); try { return { ...DEFAULT, ...(v ? JSON.parse(v) : {}) }; } catch { return { ...DEFAULT }; } }
async function setPB(x) { await redis('SET', K, JSON.stringify(x)); return x; }
const PERPANJANG_MS = 5 * 6e4; // tawaran di 5 menit terakhir memperpanjang lelang 5 menit (anti tawaran detik terakhir)

/** Admin: tampilkan / sembunyikan Pokoboll di peta & Toko. */
export async function tampil(on) { const x = await getPB(); x.tampil = !!on; return setPB(x); }
/** Admin: tetapkan pemilik langsung (mis. hadiah). */
export async function setPemilik(u, bukti = 'Admin', now = Date.now()) {
  const x = await getPB(); u = u ? key(u) : null;
  if (u) { const w = await getJSON('warga', u); if (!w || w.mati) throw new Error('Hewan tidak ditemukan.'); }
  x.pemilik = u; x.sejak = u ? new Date(now).toISOString() : null;
  if (u) x.riwayat = [...(x.riwayat || []), { u, t: x.sejak, bukti }].slice(-20);
  return setPB(x);
}
/** Admin: buka lelang. */
export async function bukaLelang({ mulai, selesai, hargaAwal = 50, kelipatan = 5 } = {}, now = Date.now()) {
  const x = await getPB();
  if (x.pemilik) throw new Error('Pokoboll sudah punya pemilik.');
  const m = mulai ? Date.parse(mulai) : now, s = Date.parse(selesai);
  if (!(s > m)) throw new Error('Waktu selesai harus setelah waktu mulai.');
  x.lelang = { mulai: new Date(m).toISOString(), selesai: new Date(s).toISOString(), hargaAwal: Math.max(1, Math.trunc(hargaAwal)), kelipatan: Math.max(1, Math.trunc(kelipatan)), tawaran: [], status: 'buka' };
  return setPB(x);
}
const tertinggi = (L) => (L.tawaran || []).reduce((a, b) => (!a || b.jumlah > a.jumlah ? b : a), null);
export function minimal(L) { const t = tertinggi(L); return t ? t.jumlah + L.kelipatan : L.hargaAwal; }

/** Warga menawar (dari link pribadi). Biji belum dipotong; harus cukup saat ini. */
export async function tawar(u, jumlah, { now = Date.now() } = {}) {
  u = key(u); jumlah = Math.trunc(Number(jumlah));
  if ((await redis('SET', 'pb_lock', '1', 'NX', 'EX', '8')) !== 'OK') throw new Error('Sedang ramai, coba lagi sebentar.');
  try {
    const x = await getPB(); const L = x.lelang;
    if (!x.tampil || !L || L.status !== 'buka') throw new Error('Lelang Pokoboll belum dibuka.');
    if (now < Date.parse(L.mulai)) throw new Error('Lelang Pokoboll belum dimulai.');
    if (now > Date.parse(L.selesai)) throw new Error('Lelang Pokoboll sudah selesai.');
    const w = await getJSON('warga', u); if (!w || w.mati) throw new Error('Hewanmu tidak ditemukan.');
    const min = minimal(L);
    if (!(jumlah >= min)) throw new Error(`Tawaran minimal ${min} Biji Kopi.`);
    const { saldo } = await import('./ekonomi.js');
    const s = await saldo(u);
    if (s.biji < jumlah) throw new Error(`Biji Kopi-mu ${s.biji}. Tawaranmu tidak boleh lebih dari saldo.`);
    L.tawaran.push({ u, nama: w.nama, jumlah, t: new Date(now).toISOString() });
    if (Date.parse(L.selesai) - now < PERPANJANG_MS) L.selesai = new Date(now + PERPANJANG_MS).toISOString();
    await setPB(x);
    return publik(x, now);
  } finally { await redis('DEL', 'pb_lock'); }
}

/** Setelah lelang selesai: penawar tertinggi yang Biji-nya cukup menjadi pemilik (Biji dipotong). Idempoten. */
export async function tutupLelang({ now = Date.now(), umumkan } = {}) {
  const x = await getPB(); const L = x.lelang;
  if (!L || L.status !== 'buka' || now <= Date.parse(L.selesai)) return null;
  if ((await redis('SET', 'pb_tutup_lock', '1', 'NX', 'EX', '60')) !== 'OK') return null;
  const { bayarBiji } = await import('./ekonomi.js');
  const urut = [...L.tawaran].sort((a, b) => b.jumlah - a.jumlah || String(a.t).localeCompare(String(b.t)));
  const sudah = new Set(); let menang = null;
  for (const b of urut) {
    if (sudah.has(b.u)) continue; sudah.add(b.u);
    const w = await getJSON('warga', b.u); if (!w || w.mati) continue;
    try { await bayarBiji(b.u, b.jumlah, 'pokoboll', 'Lelang Pokoboll'); menang = b; break; } catch { /* saldo kurang → penawar berikutnya */ }
  }
  L.status = 'selesai'; L.pemenang = menang;
  if (menang) { x.pemilik = menang.u; x.sejak = new Date(now).toISOString(); x.riwayat = [...(x.riwayat || []), { u: menang.u, t: x.sejak, bukti: `Lelang ${menang.jumlah} Biji` }].slice(-20); }
  await setPB(x);
  if (umumkan) {
    try { await umumkan(menang ? `🏠 POKOBOLL PUNYA PEMILIK! ${menang.nama} memenangkan lelang dengan ${menang.jumlah} Biji Kopi. Satu-satunya rumah kapsul di Dunia Pokomen kini berdiri di Pulau Pokoboll!` : '🏠 Lelang Pokoboll selesai tanpa pemenang. Nantikan kesempatan berikutnya!', menang?.u); } catch { /* ignore */ }
  }
  return menang;
}

/** Data publik (peta, Toko). */
export function publik(x, now = Date.now()) {
  if (!x || !x.tampil) return { tampil: false };
  const L = x.lelang; const t = L ? tertinggi(L) : null;
  return {
    tampil: true, pemilik: x.pemilik, sejak: x.sejak,
    lelang: L ? { status: L.status, mulai: L.mulai, selesai: L.selesai, hargaAwal: L.hargaAwal, kelipatan: L.kelipatan, minimal: minimal(L), tertinggi: t ? { nama: t.nama, u: t.u, jumlah: t.jumlah } : null, jumlahTawaran: L.tawaran.length, buka: L.status === 'buka' && now >= Date.parse(L.mulai) && now <= Date.parse(L.selesai) } : null,
  };
}
