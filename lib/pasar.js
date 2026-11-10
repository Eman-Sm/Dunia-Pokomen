// ============================================================
//  PASAR POKOMEN (11 Nov 2026, usulan @diqamal): jual-beli OUTFIT antar warga.
//  Penjual memasang barang dari lemarinya di lapak dengan HARGA PILIHANNYA SENDIRI.
//  Warga lain membeli: Biji Kopi pindah dari pembeli ke penjual, barang pindah lemari.
//  Selama dipajang barang dititipkan di lapak (keluar dari lemari); batal = kembali.
//  Batu Evolusi TIDAK bisa dijual.
// ============================================================
import { redis, getJSON, setJSON, hgetallJSON } from './db.js';
import { aktif, saldo } from './ekonomi.js';
import { barang } from './pakaian.js';
import { terbuka } from './fasilitas.js';
import { log } from './rules.js';

export const HARGA_MIN = 1, HARGA_MAX = 100, MAKS_LAPAK = 5;
const key = (u) => String(u || '').toLowerCase().replace(/^@/, '').trim();
export const buka = (now = Date.now()) => terbuka(now).some((f) => f.id === 'pasar');

async function cekBuka(now) {
  if (!buka(now)) throw new Error('Pasar Pokomen belum buka.');
  if (!(await aktif())) throw new Error('Toko Pokomen belum buka.');
}
async function kunci(u, f) {
  if ((await redis('SET', 'beli_lock:' + u, '1', 'NX', 'EX', '8')) !== 'OK') throw new Error('Tunggu sebentar, transaksi sebelumnya masih diproses.');
  try { return await f(); } finally { await redis('DEL', 'beli_lock:' + u); }
}
async function hidup(u) { const w = await getJSON('warga', u); if (!w || w.mati) throw new Error('Hewanmu tidak ditemukan.'); return w; }

/** semua lapak, terbaru dulu */
export async function daftar() {
  const all = Object.values((await hgetallJSON('pasar_lapak')) || {}).filter(Boolean);
  return all.sort((a, b) => String(b.t).localeCompare(String(a.t)));
}
/** versi publik (untuk website) */
export async function publik() {
  return (await daftar()).map((l) => { const x = barang(l.item) || {}; return { id: l.id, u: l.u, nama: l.nama, item: l.item, label: x.label || l.item, bagian: x.bagian || null, biji: l.biji, t: l.t }; });
}

/** Pasang outfit dari lemari di lapak dengan harga pilihan sendiri. */
export async function pasang(u, { item, biji } = {}, now = Date.now()) {
  await cekBuka(now); u = key(u);
  const x = barang(item); if (!x) throw new Error('Hanya outfit yang bisa dijual di Pasar. Batu Evolusi tidak bisa dijual.');
  const harga = Math.trunc(Number(biji));
  if (!Number.isFinite(harga) || harga < HARGA_MIN || harga > HARGA_MAX) throw new Error(`Tentukan harga ${HARGA_MIN}–${HARGA_MAX} Biji Kopi.`);
  return kunci(u, async () => {
    const w = await hidup(u);
    if (!(w.lemari || []).includes(x.id)) throw new Error(`${w.nama} tidak punya ${x.label}.`);
    if ((await daftar()).filter((l) => l.u === u).length >= MAKS_LAPAK) throw new Error(`Maksimal ${MAKS_LAPAK} barang dipajang sekaligus.`);
    w.lemari = w.lemari.filter((y) => y !== x.id);
    if (w.pakaian && w.pakaian[x.bagian] === x.id) { const p = { ...w.pakaian }; delete p[x.bagian]; w.pakaian = p; }
    await setJSON('warga', u, w);
    const id = 'L' + now.toString(36) + Math.random().toString(36).slice(2, 6);
    const lapak = { id, u, nama: w.nama, item: x.id, biji: harga, t: new Date(now).toISOString() };
    await setJSON('pasar_lapak', id, lapak);
    return { ok: true, lapak, pesan: `🧺 ${x.label} dipajang di Pasar seharga ${harga} Biji Kopi.` };
  });
}

/** Penjual menarik barangnya kembali ke lemari. */
export async function batal(u, id, now = Date.now()) {
  u = key(u);
  return kunci(u, async () => {
    const l = await getJSON('pasar_lapak', id);
    if (!l || l.u !== u) throw new Error('Lapak tidak ditemukan.');
    if ((await redis('HDEL', 'pasar_lapak', id)) !== 1) throw new Error('Barang ini baru saja terjual.');
    const w = await hidup(u);
    w.lemari = [...new Set([...(w.lemari || []), l.item])];
    await setJSON('warga', u, w);
    return { ok: true, pesan: `${(barang(l.item) || {}).label || l.item} kembali ke lemari.` };
  });
}

/** Beli barang dari lapak warga lain. */
export async function beli(u, id, now = Date.now()) {
  await cekBuka(now); u = key(u);
  return kunci(u, async () => {
    const l = await getJSON('pasar_lapak', id);
    if (!l) throw new Error('Barang ini sudah terjual atau ditarik penjualnya.');
    if (l.u === u) throw new Error('Ini lapakmu sendiri. Tekan "Tarik" untuk mengambilnya kembali.');
    const x = barang(l.item) || { label: l.item };
    const w = await hidup(u);
    if ((w.lemari || []).includes(l.item)) throw new Error(`${w.nama} sudah punya ${x.label}.`);
    const s = await saldo(u);
    if (s.biji < l.biji) throw new Error(`Biji Kopi kurang: butuh ${l.biji}, punya ${s.biji}.`);
    if ((await redis('HDEL', 'pasar_lapak', id)) !== 1) throw new Error('Barang ini baru saja terjual.');
    await redis('HINCRBY', 'biji_pakai', u, String(l.biji));      // pembeli membayar
    await redis('HINCRBY', 'biji_pakai', l.u, String(-l.biji));   // penjual menerima
    w.lemari = [...new Set([...(w.lemari || []), l.item])];
    await setJSON('warga', u, w);
    const t = new Date(now).toISOString();
    await redis('LPUSH', 'belanja', JSON.stringify({ u, item: 'pasar_beli', biji: l.biji, t, ket: `${x.label} dari @${l.u}` }), JSON.stringify({ u: l.u, item: 'pasar_jual', biji: -l.biji, t, ket: `${x.label} ke @${u}` }));
    await redis('LTRIM', 'belanja', 0, 499);
    try { await log('info', `🧺 PASAR: ${w.nama} membeli ${x.label} dari ${l.nama} seharga ${l.biji} Biji Kopi.`, { u }); } catch { /* ignore */ }
    return { ok: true, pesan: `🛍️ ${x.label} dibeli dari ${l.nama}! Sudah masuk lemari, tinggal dipakai.`, saldo: s.biji - l.biji };
  });
}
