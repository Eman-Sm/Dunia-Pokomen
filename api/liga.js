// Liga Wilayah: GET = papan skor publik (+ status pribadi dengan ?k=token), POST = hadir / atur jagoan & taktik (Ketua)
import { json } from '../lib/http.js';
import { userFromToken, daftarKetua } from '../lib/obrolan.js';
import * as LW from '../lib/ligawil.js';

export async function GET(request) {
  try {
    const k = new URL(request.url).searchParams.get('k');
    const u = k ? await userFromToken(k) : null;
    return json(await LW.publik({ u }), 200, { 'Cache-Control': u ? 'no-store' : 'public, max-age=20' });
  } catch (e) { return json({ error: e.message }, 200); }
}

export async function POST(request) {
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'data tidak terbaca' }, 400); }
  try {
    const u = await userFromToken(b.token);
    if (!u) return json({ error: 'Link pribadimu tidak berlaku. Kirim DM "TOKO" ke @duniapokomen untuk link baru.' });
    if (b.aksi === 'hadir') return json(await LW.hadir(u));
    if (b.aksi === 'ketua') {
      const k = (await daftarKetua()).find((x) => x.u === u);
      if (!k) return json({ error: 'Hanya Ketua Koloni yang bisa memilih jagoan & taktik.' });
      return json(await LW.aturKetua({ u, wil: k.wil, jagoan: b.jagoan, taktik: b.taktik }));
    }
    return json({ error: 'aksi tidak dikenal' });
  } catch (e) { return json({ error: e.message }, 200); }
}
