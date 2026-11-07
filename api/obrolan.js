// Obrolan Warga: public read, write with the personal link token.
import { json } from '../lib/http.js';
import { baca, tulis, lapor, status, userFromToken, ruangValid, isKetua, bacaKetua } from '../lib/obrolan.js';
import * as KD from '../lib/kendali.js';
import { getJSON } from '../lib/db.js';
import { wilayahOf } from '../lib/wilayah.js';

export async function GET(request) {
  { const q = new URL(request.url).searchParams; if (q.get('kendali')) { try { return json({ kendali: await KD.posisi() }, 200, { 'Cache-Control': 'no-store' }); } catch (e) { return json({ kendali: {}, error: e.message }, 200, { 'Cache-Control': 'no-store' }); } } }
  try {
    const p = new URL(request.url).searchParams;
    const ruang = p.get('ruang') || 'semua';
    if (!ruangValid(ruang)) return json({ error: 'ruang tidak dikenal' }, 400);
    if (ruang === 'ketua') return json({ error: 'Ruang Ketua hanya untuk para Ketua Koloni.' }, 403);
    const [pesan, st] = await Promise.all([baca(ruang, Number(p.get('sejak') || 0)), status()]);
    return json({ ruang, pesan, ...st }, 200, { 'Cache-Control': 'no-store' });
  } catch (e) { return json({ error: e.message }, 200); }
}

export async function POST(request) {
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'data tidak terbaca' }, 400); }
  try {
    if (b.aksi === 'cek') {
      const u = await userFromToken(b.token);
      if (!u) return json({ ok: false });
      const w = await getJSON('warga', u);
      if (!w || w.mati) return json({ ok: false, u });
      return json({ ok: true, u, nama: w.nama, wil: wilayahOf(w), ketua: await isKetua(u) });
    }
    if (b.aksi === 'lapor') return json(await lapor(b));
    if (b.aksi === 'gerak') { try { return json(await KD.gerak(b), 200, { 'Cache-Control': 'no-store' }); } catch (e) { return json({ error: e.message }, 200); } }
    if (b.aksi === 'gerak_lepas') { try { return json(await KD.lepas(b)); } catch (e) { return json({ error: e.message }, 200); } }
    if (b.aksi === 'baca' && b.ruang === 'ketua') return json(await bacaKetua({ token: b.token, sejak: b.sejak }), 200, { 'Cache-Control': 'no-store' });
    return json(await tulis({ token: b.token, ruang: b.ruang || 'semua', text: b.text }));
  } catch (e) { return json({ error: e.message }, 200); }
}
