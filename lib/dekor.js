// ============================================================
//  DEKOR WILAYAH (8 Nov 2026): setiap wilayah dihias. Ketua wilayah memilih tema hiasannya di Ruang Ketua.
//  Hiasan digambar di sepanjang pagar wilayah di peta (public/app.js drawDekor).
// ============================================================
import { redis } from './db.js';
import { userFromToken, daftarKetua } from './obrolan.js';

export const TEMA = {
  bendera: 'Bendera Warna-warni',
  lampion: 'Lampion Merah',
  bunga: 'Rangkaian Bunga',
  lampu: 'Lampu Hias',
  balon: 'Balon & Pita',
};
export const TEMA_AWAL = 'bendera';

/** tema setiap wilayah yang sudah dibuka: { "1": "bendera", ... } */
export async function semua(nBuka = 6) {
  const raw = (await redis('HGETALL', 'dekor_wilayah')) || [];
  const m = {}; for (let i = 0; i < raw.length; i += 2) if (TEMA[raw[i + 1]]) m[raw[i]] = raw[i + 1];
  const out = {}; for (let n = 1; n <= nBuka; n++) out[n] = m[n] || TEMA_AWAL;
  return out;
}

/** Ketua mengganti hiasan wilayahnya */
export async function pilih({ token, tema }) {
  if (!TEMA[tema]) throw new Error('Tema hiasan tidak dikenal.');
  const u = await userFromToken(token);
  if (!u) throw new Error('Buka website lewat link pribadimu dulu (DM "LINK").');
  const k = (await daftarKetua()).find((x) => x.u === u);
  if (!k) throw new Error('Hanya Ketua Koloni yang bisa memilih hiasan wilayah.');
  await redis('HSET', 'dekor_wilayah', String(k.wil), tema);
  return { ok: true, wil: k.wil, tema, pesan: `🎀 Wilayah ${k.wil} kini dihias ${TEMA[tema]}!` };
}
