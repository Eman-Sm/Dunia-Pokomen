// ============================================================
//  DOMPET BIJI KOPI & TOKO POKOMEN (buka 24 jam, aktif setelah video Hari ke-6: redis 'evo_batu' = '1')
//  Saldo = Kopi Admin (Trakteer) x 5 + bonus dari Admin - yang sudah dibelanjakan.
//  Belanja lewat website dengan link pribadi (DM "TOKO" / "OBROLAN" ke @duniapokomen).
// ============================================================
import { redis, getJSON, setJSON, hgetallJSON } from './db.js';
import { papanKopi, BIJI_PER_KOPI } from './sahabat.js';
import { ITEM, nilaiBaru, pakaiItem } from './item.js';
import { latihSekali, HARGA_LATIHAN, LABEL } from './statistik.js';

export const HARGA = {
  batu: { label: 'Batu Evolusi', biji: 15, ket: 'Kunci naik ke Legendary (2 batu) & God Mode (3 batu)' },
  latihan: { label: 'Sesi Latihan', biji: HARGA_LATIHAN, ket: 'Naikkan statistik di Tempat Latihan' },
  nama: { label: ITEM.nama.label, biji: ITEM.nama.kopi * BIJI_PER_KOPI, ket: 'Ganti nama hewan (tingkat & nomor tetap)' },
  rupa: { label: ITEM.rupa.label, biji: ITEM.rupa.kopi * BIJI_PER_KOPI, ket: 'Ganti gabungan hewan' },
  elemen: { label: ITEM.elemen.label, biji: ITEM.elemen.kopi * BIJI_PER_KOPI, ket: 'Ganti elemen (aktif mulai Mega)' },
  kekuatan: { label: ITEM.kekuatan.label, biji: ITEM.kekuatan.kopi * BIJI_PER_KOPI, ket: 'Ganti skill (aktif mulai Mythical)' },
};
export const katalogToko = () => Object.entries(HARGA).map(([id, x]) => ({ id, ...x }));
export const aktif = async () => (await redis('GET', 'evo_batu')) === '1';
const key = (u) => String(u || '').toLowerCase().replace(/^@/, '').trim();

export async function kopiDari(u) {
  const [dukRaw, warga] = await Promise.all([redis('LRANGE', 'dukungan', 0, 499), hgetallJSON('warga')]);
  const items = (dukRaw || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
  return (papanKopi(items, warga).find((x) => x.u === key(u)) || {}).total || 0;
}
export async function saldo(u) {
  u = key(u);
  const [kopi, bonus, pakai] = await Promise.all([kopiDari(u), redis('HGET', 'biji_bonus', u), redis('HGET', 'biji_pakai', u)]);
  const masuk = kopi * BIJI_PER_KOPI + (Number(bonus) || 0);
  return { kopi, masuk, pakai: Number(pakai) || 0, biji: masuk - (Number(pakai) || 0) };
}

/** Buy one item for the caller's own creature. { item, nilai, stat } */
export async function beli(u, { item, nilai, stat } = {}) {
  if (!(await aktif())) throw new Error('Toko Pokomen belum buka.');
  u = key(u);
  const h = HARGA[item]; if (!h) throw new Error('Barang tidak dikenal');
  if ((await redis('SET', 'beli_lock:' + u, '1', 'NX', 'EX', '8')) !== 'OK') throw new Error('Tunggu sebentar, belanjaan sebelumnya masih diproses.');
  try {
    const w = await getJSON('warga', u);
    if (!w || w.mati) throw new Error('Hewanmu tidak ditemukan.');
    const s = await saldo(u);
    if (s.biji < h.biji) throw new Error(`Biji Kopi kurang: butuh ${h.biji}, punya ${s.biji}. Kirim Kopi Admin dulu (1 kopi = ${BIJI_PER_KOPI} Biji).`);
    let hasil;
    if (item === 'batu') {
      w.batu = (w.batu || 0) + 1;
      w.batuLog = [...(w.batuLog || []), { n: 1, bukti: 'Toko', t: new Date().toISOString() }].slice(-30);
      await setJSON('warga', u, w);
      hasil = { pesan: `💎 1 Batu Evolusi masuk! ${w.nama} sekarang punya ${w.batu} batu.`, batu: w.batu };
    } else if (item === 'latihan') {
      const r = latihSekali(w, String(stat || '').toLowerCase());
      await setJSON('warga', u, w);
      hasil = { ...r, pesan: `🏋️ ${w.nama} berlatih ${LABEL[r.stat]}: +${r.naik}${r.superSesi ? ' (LATIHAN SUPER 2x!)' : ''}` };
    } else {
      nilaiBaru(item, nilai); // validate before charging
      const r = await pakaiItem({ username: u, item, nilai, bukti: 'Toko Pokomen', oleh: 'toko' });
      hasil = { ...r, pesan: `✅ ${h.label} dipakai untuk ${w.nama}!` };
    }
    await redis('HINCRBY', 'biji_pakai', u, String(h.biji));
    const rec = { u, item, biji: h.biji, t: new Date().toISOString(), ket: stat || (nilai ? String(nilai).slice(0, 40) : '') };
    await redis('LPUSH', 'belanja', JSON.stringify(rec)); await redis('LTRIM', 'belanja', 0, 499);
    return { ok: true, ...hasil, saldo: s.biji - h.biji };
  } finally { await redis('DEL', 'beli_lock:' + u); }
}

/** Admin: give/take Biji Kopi (e.g. compensation). */
export async function bonusBiji(u, n) { u = key(u); await redis('HINCRBY', 'biji_bonus', u, String(Math.trunc(Number(n) || 0))); return saldo(u); }
export async function riwayatBelanja(n = 50) { return ((await redis('LRANGE', 'belanja', 0, n - 1)) || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean); }
