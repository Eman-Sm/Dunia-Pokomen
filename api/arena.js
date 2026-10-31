// Arena Pokomen: daftar duel & klasemen (publik), tantang / terima / tolak (link pribadi).
import { json } from '../lib/http.js';
import { userFromToken, sistem } from '../lib/obrolan.js';
import { log } from '../lib/rules.js';
import * as A from '../lib/arena.js';
import { getJSON } from '../lib/db.js';
import { promptFlow } from '../lib/flowprompt.js';

const umumkan = async (t, u) => { await log('arena', t, { u }); await sistem(t); };

export async function GET(request) {
  try {
    const qp = new URL(request.url).searchParams;
    const k = qp.get('k');
    // satu duel untuk replay (link berbagi ?duel=<id>) + prompt Google Flow
    if (qp.get('duel')) {
      const d = await A.cariDuel(qp.get('duel'));
      if (!d) return json({ error: 'Duel tidak ditemukan (replay disimpan untuk 200 duel terakhir).' });
      const [wa, wb] = await Promise.all([getJSON('warga', d.a), getJSON('warga', d.b)]);
      const A_ = wa || { username: d.a, nama: d.namaA, hewan: [], tier: d.tierA }, B_ = wb || { username: d.b, nama: d.namaB, hewan: [], tier: d.tierB };
      const out = { duel: d };
      if (qp.get('prompt')) out.prompt = promptFlow(d, A_, B_, { rasio: qp.get('prompt') === '16:9' ? '16:9' : '9:16' });
      return json(out, 200, { 'Cache-Control': 's-maxage=60' });
    }
    const aktif = await A.aktif();
    if (aktif) await A.tetapkanJuaraMinggu({ umumkan }).catch(() => {});
    const u = k ? await userFromToken(k) : null;
    return json({
      aktif, buka: A.buka(), jam: [A.JAM_BUKA, A.JAM_TUTUP], minggu: A.mingguKe(), tutupMinggu: new Date(A.tutupMinggu(A.mingguKe())).toISOString(),
      duel: aktif ? await A.duelTerbaru(12) : [], klasemen: aktif ? await A.klasemen() : [], terbuka: aktif ? await A.tantanganTerbuka() : [],
      saya: aktif && u ? { u, tantangan: await A.tantanganUntuk(u) } : null,
    }, 200, { 'Cache-Control': 'no-store' });
  } catch (e) { return json({ error: e.message }, 200); }
}

export async function POST(request) {
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'data tidak terbaca' }, 400); }
  try {
    const u = await userFromToken(b.token);
    if (!u) return json({ error: 'Link pribadimu tidak berlaku. DM "ARENA" ke @duniapokomen untuk link baru.' });
    if (b.aksi === 'tantang') {
      const t = await A.tantang(u, b.lawan);
      await sistem(`⚔️ ${t.namaDari} menantang ${t.namaKe} di Arena! Berlaku 2 jam.`).catch(() => {});
      return json({ ok: true, tantangan: t });
    }
    if (b.aksi === 'terima') return json({ ok: true, duel: await A.terima(u, b.id, { umumkan }) });
    if (b.aksi === 'tolak') return json(await A.tolak(u, b.id));
    return json({ error: 'aksi tidak dikenal' });
  } catch (e) { return json({ error: e.message }, 200); }
}
