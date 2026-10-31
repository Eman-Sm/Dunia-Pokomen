// Toko Pokomen (24 jam) + Tempat Latihan + dompet Biji Kopi. Belanja butuh link pribadi (token).
import { json } from '../lib/http.js';
import { userFromToken } from '../lib/obrolan.js';
import { getJSON } from '../lib/db.js';
import { saldo, beli, katalogToko, aktif } from '../lib/ekonomi.js';
import { publik, batasLatih, STAT, NAIK, SUPER_TIAP, HARGA_LATIHAN } from '../lib/statistik.js';
import { CONFIG } from '../lib/rules.js';

async function dompet(u) {
  const w = await getJSON('warga', u);
  if (!w || w.mati) return null;
  return { u, nama: w.nama, tier: w.tier, batu: w.batu || 0, saldo: await saldo(u), stat: publik(w), batas: Object.fromEntries(STAT.map((s) => [s, batasLatih(w, s)])), syaratBatu: CONFIG.batuEvolusi[w.tier] || null };
}

export async function GET(request) {
  try {
    const k = new URL(request.url).searchParams.get('k');
    const buka = await aktif();
    const u = k ? await userFromToken(k) : null;
    return json({ buka, katalog: katalogToko(), latihan: { harga: HARGA_LATIHAN, naik: NAIK, superTiap: SUPER_TIAP }, saya: buka && u ? await dompet(u) : null }, 200, { 'Cache-Control': 'no-store' });
  } catch (e) { return json({ error: e.message }, 200); }
}

export async function POST(request) {
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'data tidak terbaca' }, 400); }
  try {
    const u = await userFromToken(b.token);
    if (!u) return json({ error: 'Link pribadimu tidak berlaku. DM "TOKO" ke @duniapokomen untuk link baru.' });
    const r = await beli(u, { item: b.item, nilai: b.nilai, stat: b.stat });
    return json({ ...r, saya: await dompet(u) });
  } catch (e) { return json({ error: e.message }, 200); }
}
