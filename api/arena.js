// Arena Pokomen: daftar duel & klasemen (publik), tantang / terima / tolak (link pribadi).
import { json } from '../lib/http.js';
import { userFromToken, sistem } from '../lib/obrolan.js';
import { log } from '../lib/rules.js';
import * as A from '../lib/arena.js';

const umumkan = async (t, u) => { await log('arena', t, { u }); await sistem(t); };

export async function GET(request) {
  try {
    const qp = new URL(request.url).searchParams;
    const k = qp.get('k');
    // satu duel untuk replay (link berbagi ?duel=<id>). Prompt Google Flow hanya di Ruang Admin.
    if (qp.get('duel')) {
      const d = await A.cariDuel(qp.get('duel'));
      if (!d) return json({ error: 'Duel tidak ditemukan (replay disimpan untuk 200 duel terakhir).' });
      const out = { duel: d, riwayat: await A.riwayatDuel(d).catch(() => null) };
      return json(out, 200, { 'Cache-Control': 's-maxage=60' });
    }
    const aktif = await A.aktif();
    if (aktif) await A.cekJuara({ umumkan }).catch(() => {});
    const u = k ? await userFromToken(k) : null;
    return json({
      aktif, buka: A.buka(), jam: [A.JAM_BUKA, A.JAM_TUTUP],
      duel: aktif ? await A.duelTerbaru(12) : [], musim: A.musimDari(), klasemen: aktif ? await A.klasemenLiga() : [], poin: { menang: A.POIN_MENANG, kalah: A.POIN_KALAH }, terbuka: aktif ? await A.tantanganTerbuka() : [],
      saya: aktif && u ? { u, tantangan: await A.tantanganUntuk(u), sesi: await A.sesiUntuk(u) } : null, sekarang: Date.now(),
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
      const t = await A.tantang(u, b.lawan, { kartu: b.kartu });
      await sistem(`⚔️ ${t.namaDari} menantang ${t.namaKe} di Arena! Berlaku 12 jam.`).catch(() => {});
      return json({ ok: true, tantangan: t });
    }
    if (b.aksi === 'terima') { const r = await A.terima(u, b.id, { umumkan, kartu: b.kartu }); return json({ ok: true, jadwal: r.setup, pukul: r.pukul, sekarang: Date.now() }); }
    if (b.aksi === 'selesai') { const r = await A.selesaiMain(u, b.id, b.taps, { umumkan }); return json(r.menunggu ? { ok: true, menunggu: true, batas: r.batas } : { ok: true, duel: r }); }
    if (b.aksi === 'hasil') { const d = await A.cariDuel(b.id); return json(d ? { ok: true, duel: d } : { ok: true, menunggu: true }); }
    if (b.aksi === 'tolak') return json(await A.tolak(u, b.id, { umumkan }));
    return json({ error: 'aksi tidak dikenal' });
  } catch (e) { return json({ error: e.message }, 200); }
}
