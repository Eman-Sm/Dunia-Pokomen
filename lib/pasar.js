// ============================================================
//  PASAR POKOMEN (11 Nov 2026, usulan @diqamal): warga menjual kembali barangnya
//  dengan harga SAMA seperti di Toko Pokomen. Biji Kopi kembali ke dompet.
//  Bisa dijual: outfit di lemari (harga katalog) dan Batu Evolusi yang DIBELI di Toko (15 Biji).
//  Batu hadiah (Ketua, Juara Liga, dll.) tidak bisa dijual.
// ============================================================
import { redis, getJSON, setJSON } from './db.js';
import { HARGA, aktif } from './ekonomi.js';
import { KATALOG, barang, dipakai } from './pakaian.js';
import { terbuka } from './fasilitas.js';

const key = (u) => String(u || '').toLowerCase().replace(/^@/, '').trim();
export const buka = (now = Date.now()) => terbuka(now).some((f) => f.id === 'pasar');

/** jumlah batu yang dibeli di Toko dan masih bisa dijual */
export function batuTokoSisa(w) {
  const dibeli = (w.batuLog || []).filter((b) => b && b.bukti === 'Toko').reduce((a, b) => a + (Number(b.n) || 1), 0);
  return Math.max(0, Math.min(w.batu || 0, dibeli - (w.batuJual || 0)));
}

/** daftar barang milik warga yang bisa dijual */
export function daganganDari(w) {
  if (!w) return [];
  const out = (w.lemari || []).map(barang).filter(Boolean).map((x) => ({ jenis: 'outfit', id: x.id, label: x.label, biji: x.biji, dipakai: Object.values(dipakai(w) || {}).includes(x.id) }));
  const nb = batuTokoSisa(w);
  if (nb > 0) out.push({ jenis: 'batu', id: 'batu', label: HARGA.batu.label, biji: HARGA.batu.biji, jumlah: nb });
  return out;
}

export async function jual(u, { jenis, id } = {}, now = Date.now()) {
  if (!buka(now)) throw new Error('Pasar Pokomen belum buka.');
  if (!(await aktif())) throw new Error('Toko Pokomen belum buka.');
  u = key(u);
  if ((await redis('SET', 'beli_lock:' + u, '1', 'NX', 'EX', '8')) !== 'OK') throw new Error('Tunggu sebentar, transaksi sebelumnya masih diproses.');
  try {
    const w = await getJSON('warga', u);
    if (!w || w.mati) throw new Error('Hewanmu tidak ditemukan.');
    let biji, label, pesan;
    if (jenis === 'outfit') {
      const x = barang(id); if (!x) throw new Error('Barang tidak dikenal.');
      if (!(w.lemari || []).includes(x.id)) throw new Error(`${w.nama} tidak punya ${x.label}.`);
      w.lemari = w.lemari.filter((y) => y !== x.id);
      if (w.pakaian && w.pakaian[x.bagian] === x.id) { const p = { ...w.pakaian }; delete p[x.bagian]; w.pakaian = p; }
      biji = x.biji; label = x.label;
      pesan = `🧺 ${x.label} terjual di Pasar! +${biji} Biji Kopi.`;
    } else if (jenis === 'batu') {
      if (batuTokoSisa(w) < 1) throw new Error('Tidak ada Batu Evolusi hasil belanja Toko yang bisa dijual. Batu hadiah tidak bisa dijual.');
      w.batu = (w.batu || 0) - 1;
      w.batuJual = (w.batuJual || 0) + 1;
      w.batuLog = [...(w.batuLog || []), { n: -1, bukti: 'Dijual di Pasar', t: new Date(now).toISOString() }].slice(-30);
      biji = HARGA.batu.biji; label = HARGA.batu.label;
      pesan = `💎 1 Batu Evolusi terjual di Pasar! +${biji} Biji Kopi. Sisa batu ${w.nama}: ${w.batu}.`;
    } else throw new Error('Barang tidak dikenal.');
    await setJSON('warga', u, w);
    await redis('HINCRBY', 'biji_pakai', u, String(-biji)); // Biji Kopi kembali ke dompet
    await redis('LPUSH', 'belanja', JSON.stringify({ u, item: 'jual_' + jenis, biji: -biji, t: new Date(now).toISOString(), ket: label }));
    await redis('LTRIM', 'belanja', 0, 499);
    return { ok: true, pesan, biji };
  } finally { await redis('DEL', 'beli_lock:' + u); }
}
export { KATALOG };
