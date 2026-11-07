// ============================================================
//  KENDALI GOD MODE (7 Nov 2026): pemilik hewan God Mode (tier 5) bisa menggerakkan hewannya di peta
//  saat online. Posisi tujuan disimpan sebentar (45 detik sejak perintah terakhir) dan terlihat semua warga.
// ============================================================
import { redis, getJSON, setJSON } from './db.js';
import { userFromToken } from './obrolan.js';

export const TTL_MS = 45000;
export const DUNIA = { w: 1700, h: 1800 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

async function pemilikGod(token) {
  const u = await userFromToken(token);
  if (!u) throw new Error('Buka website lewat link pribadimu dulu (DM "LINK").');
  const w = await getJSON('warga', u);
  if (!w || w.mati) throw new Error('Hewanmu tidak ditemukan.');
  if ((w.tier || 0) < 5) throw new Error('Hanya hewan God Mode yang bisa dikendalikan.');
  return { u, w };
}

/** perintah gerak: tujuan (x, y) di peta */
export async function gerak({ token, x, y, now = Date.now() }) {
  const { u, w } = await pemilikGod(token);
  x = Number(x); y = Number(y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Posisi tidak valid.');
  if ((await redis('SET', 'kendali_rl:' + u, '1', 'NX', 'PX', '200')) !== 'OK') return { ok: true, lambat: true };
  const pos = { x: Math.round(clamp(x, 10, DUNIA.w - 10)), y: Math.round(clamp(y, 10, DUNIA.h - 10)), t: now, nama: w.nama };
  await setJSON('kendali', u, pos);
  return { ok: true, u, pos };
}

/** berhenti mengendalikan: hewan kembali bebas */
export async function lepas({ token }) {
  const { u } = await pemilikGod(token);
  await redis('HDEL', 'kendali', u);
  return { ok: true };
}

/** semua hewan yang sedang dikendalikan (perintah < 45 detik lalu) */
export async function posisi({ now = Date.now() } = {}) {
  const out = {};
  const raw = (await redis('HGETALL', 'kendali')) || [];
  for (let i = 0; i < raw.length; i += 2) {
    let p = null; try { p = JSON.parse(raw[i + 1]); } catch { /* ignore */ }
    if (p && now - p.t < TTL_MS) out[raw[i]] = { x: p.x, y: p.y, t: p.t };
    else await redis('HDEL', 'kendali', raw[i]);
  }
  return out;
}
