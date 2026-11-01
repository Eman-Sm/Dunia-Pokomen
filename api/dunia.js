// Public data for the website: citizens, facility suggestions, news log.
import { redis, hgetallJSON } from '../lib/db.js';
import { publicWarga, publicMakam, CONFIG, ensureTierSchema } from '../lib/rules.js';
import { json, hariKe } from '../lib/http.js';
import { papanKopi, isTest, lencanaKopi, BIJI_PER_KOPI } from '../lib/sahabat.js';
import { namaKembar, normNama } from '../lib/hewan.js';
import { cuacaAktif } from '../lib/dewa.js';
import { publik as statPublik } from '../lib/statistik.js';
import { hasilWilayah, publicHasil, tetapkanPemenang, wilayahOf, daftarUsulWilayah, segarkanLike, bukaWilayahBaru, jumlahWilayahBuka } from '../lib/wilayah.js';

export async function GET() {
  try {
    await ensureTierSchema();
    const [warga, usulan, logRaw, start, dukRaw, makam] = await Promise.all([
      hgetallJSON('warga'), hgetallJSON('usulan'), redis('LRANGE', 'log', 0, 29), redis('GET', 'hari_pertama'), redis('LRANGE', 'dukungan', 0, 199), hgetallJSON('makam'),
    ]);
    const dukAll = (dukRaw || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    const papan = papanKopi(dukAll, warga);
    const sahabat = papan[0] || null;
    const kopiBy = Object.fromEntries(papan.map((x) => [x.u, x]));
    const kembar = namaKembar(warga);
    const dukungan = dukAll
      .filter((x) => x && !x.hidden && !isTest(x)).slice(0, 12)
      .map(({ nama, pesan, unit, jumlah, t }) => ({ nama, pesan, unit: process.env.TRAKTEER_UNIT_NAME || 'Kopi Admin', jumlah, t }));
    const visible = warga.filter((w) => !w.hidden).sort((a, b) => a.spot - b.spot);
    let pw = null;
    try {
      // wilayah baru (mis. Wilayah 4 saat warga ke-151 lahir) otomatis membuka usulan nama + pemilihan ketua
      if ((await redis('SET', 'pw_cek_baru', '1', 'NX', 'EX', '60')) === 'OK') {
        try { await bukaWilayahBaru(); } catch { /* ignore */ }
        // 1 Nov 19.55: umumkan aturan tantangan setingkat (sekali saja)
        try { if ((await redis('SET', 'ob_umum_tingkat_v1', '1', 'NX')) === 'OK') { const ob = await import('../lib/obrolan.js'); await ob.sistem('📢 ⚔️ Aturan baru Liga Arena: kamu hanya bisa menantang hewan yang setingkat, 1 tingkat di atas, atau 1 tingkat di bawah tingkatmu. Duel jadi lebih seimbang!'); } } catch { /* ignore */ }
        // 1 Nov: semua warga boleh memilih di wilayah baru → hitung ulang suara Wilayah 4 sekali, lalu umumkan di Obrolan
        try {
          if ((await redis('SET', 'pw_hitung_ulang_w4_v1', '1', 'NX')) === 'OK') {
            const WL = await import('../lib/wilayah.js'); const r = await WL.hitungUlangSuara(4);
            const ob = await import('../lib/obrolan.js');
            await ob.sistem('📢 🗳️ Mulai sekarang SEMUA warga, dari wilayah mana pun, boleh memilih Ketua Wilayah 4! Komen "Pilih: nama calon". Suara yang sebelumnya ditolak sudah dihitung ulang ✅');
            await redis('SET', 'pw_hitung_ulang_w4_hasil', JSON.stringify({ ...r, t: new Date().toISOString() }));
          }
        } catch { /* ignore */ }
        // Juara Arena: 7 hari tak terkalahkan → +1 Batu Evolusi (dicek tiap menit, tanpa menunggu ada yang membuka Arena)
        try { const AR = await import('../lib/arena.js'); if (await AR.aktif()) { const { log } = await import('../lib/rules.js'); const ob = await import('../lib/obrolan.js'); await AR.cekJuara({ umumkan: async (t, u) => { await log('arena', t, { u }); await ob.sistem(t); } }); } } catch { /* ignore */ }
      }
      await segarkanLike(10);
      pw = await hasilWilayah();
      const perlu = Object.values(pw.wilayah).some((x) => x.memilih && x.closed && !x.ditetapkan);
      if (perlu && (await redis('SET', 'pw_tetap_lock', '1', 'NX', 'EX', '120')) === 'OK') { await tetapkanPemenang(); pw = await hasilWilayah(); }
    } catch { pw = null; }
    const evoBatu = (await redis('GET', 'evo_batu')) === '1';
    let namaWil = {};
    try { namaWil = await daftarUsulWilayah(); } catch { /* ignore */ }
    const us = usulan.filter((x) => x.status !== 'ditolak')
      .sort((a, b) => (b.status === 'dibangun') - (a.status === 'dibangun') || b.likes - a.likes)
      .slice(0, 50)
      .map((x) => ({ id: x.id, u: x.username, text: x.text, likes: x.likes, status: x.status, episode: x.episode }));
    return json({
      hari: hariKe(start),
      tiers: CONFIG.tiers,
      benefits: evoBatu ? [...CONFIG.benefits.slice(0, 4), ...CONFIG.benefitsBaru] : CONFIG.benefits,
      evoBatu,
      batuSyarat: evoBatu ? CONFIG.batuEvolusi : null,
      cuaca: evoBatu ? await cuacaAktif().catch(() => []) : [],
      jumlahWarga: visible.filter((w) => !w.mati).length,
      jumlahMati: visible.filter((w) => w.mati).length + makam.length,
      makam: makam.filter((w) => !w.hidden).map(publicMakam),
      warga: visible.map((w) => { const p = publicWarga(w); p.wil = wilayahOf(w); const pk = kopiBy[p.u]; if (pk && !p.mati) { p.kopi = pk.total; p.biji = pk.total * BIJI_PER_KOPI; p.lencana = lencanaKopi(pk.total)?.kode; if (Date.now() - Date.parse(pk.sejak) < 864e5) p.kopiBaru = 1; } if (evoBatu && !p.mati) p.stat = statPublik(w); if (kembar.has(normNama(w.nama))) p.kembar = true; if (sahabat && sahabat.u === p.u && !p.mati) p.sahabat = sahabat.total; return p; }),
      kopiBoard: papan.slice(0, 5).map(({ u, nama, total }) => ({ u, nama, total })),
      dukunganUnit: process.env.TRAKTEER_UNIT_NAME || 'Kopi Admin',
      usulan: us,
      wajibFollow: process.env.REQUIRE_FOLLOW === '1',
      trakteer: process.env.TRAKTEER_URL || null,
      dukungan,
      pemiluWilayah: pw ? publicHasil(pw) : null,
      usulNamaWilayah: namaWil,
      wilayahBuka: await jumlahWilayahBuka().catch(() => 3),
      log: (logRaw || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter((x) => x && !(x.type === 'dukung' && /^\s*\[.*test.*\]/i.test(x.text || ''))),
    }, 200, { 'Cache-Control': 's-maxage=20, stale-while-revalidate=60' });
  } catch (e) {
    // 200 so the message is readable; the website falls back to example data
    return json({ error: e.message }, 200, { 'Cache-Control': 'no-store' });
  }
}
