// Saran & Masukan warga: POST { jenis, pesan, nama?, bintang? }. Hanya Admin yang bisa membaca (lewat /api/admin).
import { json } from '../lib/http.js';
import { kirim } from '../lib/saran.js';

export async function POST(request) {
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'data tidak terbaca' }, 400); }
  if (b.web) return json({ ok: true }); // jebakan bot (kolom tersembunyi)
  try {
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    return json(await kirim(b, { ip }));
  } catch (e) { return json({ error: e.message }, 200); }
}
