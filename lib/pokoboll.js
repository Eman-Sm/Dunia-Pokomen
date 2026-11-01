// ============================================================
//  POKOBOLL: rumah kapsul eksklusif, HANYA ADA 1 di Dunia Pokomen (1 Nov)
//  - Berdiri di Pulau Pokoboll (pulau di danau barat), wilayahnya sendiri.
//  - Desainnya mengikuti pemiliknya (warna tubuh & aksen hewan, permata elemen di puncak).
//  - Pemiliknya tidur di dalam Pokoboll setiap malam (22.00–05.00 WIB).
//  - Dibeli di Toko: 3 Batu Evolusi ATAU Biji Kopi setara 3 Batu (45). Pembeli pertama jadi pemiliknya.
//  Disembunyikan sampai Admin menyalakan `tampil` (setelah diumumkan di video).
// ============================================================
import { redis, getJSON, setJSON } from './db.js';

const K = 'pokoboll';
const key = (u) => String(u || '').toLowerCase().replace(/^@/, '').trim();
export const DEFAULT = { tampil: false, pemilik: null, sejak: null, riwayat: [] };
export async function getPB() { const v = await redis('GET', K); try { return { ...DEFAULT, ...(v ? JSON.parse(v) : {}) }; } catch { return { ...DEFAULT }; } }
async function setPB(x) { await redis('SET', K, JSON.stringify(x)); return x; }

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
export const HARGA_BATU = 3;
export const hargaBiji = async () => HARGA_BATU * (await import('./ekonomi.js')).HARGA.batu.biji; // setara 3 Batu Evolusi

/** Beli Pokoboll di Toko: 3 Batu Evolusi atau Biji Kopi setara. Hanya ada 1: pembeli pertama jadi pemiliknya. */
export async function beli(u, cara, { now = Date.now(), umumkan } = {}) {
  u = key(u);
  if ((await redis('SET', 'pb_lock', '1', 'NX', 'EX', '10')) !== 'OK') throw new Error('Sedang diproses, coba lagi sebentar.');
  try {
    const x = await getPB();
    if (!x.tampil) throw new Error('Pokoboll belum dijual.');
    if (x.pemilik) throw new Error('Pokoboll sudah terjual! Hanya ada satu di Dunia Pokomen.');
    const w = await getJSON('warga', u); if (!w || w.mati) throw new Error('Hewanmu tidak ditemukan.');
    let bayar;
    if (cara === 'batu') {
      if ((w.batu || 0) < HARGA_BATU) throw new Error(`Batu Evolusi ${w.nama} ${w.batu || 0}, butuh ${HARGA_BATU}.`);
      w.batu -= HARGA_BATU; w.batuLog = [...(w.batuLog || []), { n: -HARGA_BATU, bukti: 'Beli Pokoboll', t: new Date(now).toISOString() }].slice(-30);
      await setJSON('warga', u, w); bayar = `${HARGA_BATU} Batu Evolusi`;
      await redis('LPUSH', 'belanja', JSON.stringify({ u, item: 'pokoboll', batu: HARGA_BATU, t: new Date(now).toISOString(), ket: 'Pokoboll' }));
    } else if (cara === 'biji') {
      const n = await hargaBiji(); const { bayarBiji } = await import('./ekonomi.js');
      await bayarBiji(u, n, 'pokoboll', 'Pokoboll'); bayar = `${n} Biji Kopi`;
    } else throw new Error('Pilih cara bayar: Batu Evolusi atau Biji Kopi.');
    x.pemilik = u; x.sejak = new Date(now).toISOString(); x.riwayat = [...(x.riwayat || []), { u, t: x.sejak, bukti: bayar }].slice(-20);
    await setPB(x);
    if (umumkan) { try { await umumkan(`🏠 POKOBOLL TERJUAL! ${w.nama} (@${u}) membeli satu-satunya Pokoboll di Dunia Pokomen. Rumah kapsulnya kini berdiri di Pulau Pokoboll, berbentuk sesuai ${w.nama}!`, u); } catch { /* ignore */ } }
    return { pesan: `🏠 Pokoboll kini milik ${w.nama}! Dibayar dengan ${bayar}.`, pokoboll: publik(x, await hargaBiji()) };
  } finally { await redis('DEL', 'pb_lock'); }
}

/** Data publik (peta, Toko). */
export function publik(x, biji = HARGA_BATU * 15) {
  if (!x || !x.tampil) return { tampil: false };
  return { tampil: true, pemilik: x.pemilik, sejak: x.sejak, harga: { batu: HARGA_BATU, biji } };
}
