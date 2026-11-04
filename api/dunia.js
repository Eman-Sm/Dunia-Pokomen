// Public data for the website: citizens, facility suggestions, news log.
import { redis, hgetallJSON } from '../lib/db.js';
import { publicWarga, publicMakam, CONFIG, ensureTierSchema } from '../lib/rules.js';
import { json, hariKe } from '../lib/http.js';
import { papanKopi, isTest, lencanaKopi, BIJI_PER_KOPI } from '../lib/sahabat.js';
import { namaKembar, normNama } from '../lib/hewan.js';
import { cuacaAktif } from '../lib/dewa.js';
import { publik as statPublik } from '../lib/statistik.js';
import { hasilWilayah, publicHasil, tetapkanPemenang, wilayahOf, daftarUsulWilayah, segarkanLike, bukaWilayahBaru, jumlahWilayahBuka } from '../lib/wilayah.js';

export async function GET(request) {
  try {
    // 3 Nov: ?usulscan=1 → daftar usulan fasilitas dari komentar bebas (disimpan 24 jam; ?usulscan=baru untuk scan ulang)
    const qs = request ? new URL(request.url).searchParams : null;
    if (qs && qs.get('usulscan')) {
      const lama = qs.get('usulscan') !== 'baru' && (await redis('GET', 'usul_scan_v1'));
      if (lama) return json(JSON.parse(lama), 200, { 'Cache-Control': 'no-store' });
      if ((await redis('SET', 'usul_scan_lock', '1', 'NX', 'EX', '90')) !== 'OK') return json({ sedang: true }, 200, { 'Cache-Control': 'no-store' });
      const { scanUsulan } = await import('../lib/usulscan.js');
      return json(await scanUsulan(), 200, { 'Cache-Control': 'no-store' });
    }
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
        // 2 Nov 13.30: info pendukung Hari 8 (sekali saja)
        try { if ((await redis('SET', 'ob_umum_hari8_v1', '1', 'NX')) === 'OK') { const ob = await import('../lib/obrolan.js'); for (const t of ['🎮 Tips Arena: terima tantangan lewat WEBSITE untuk bertarung sendiri (pilih kartu + TAP). Terima lewat komentar "Terima: nama" = duel otomatis dengan kartu acak.', '🗳️ Pemilihan Ketua Wilayah 4 ditutup BESOK pukul 12.00 WIB! Semua warga boleh memilih: komen "Pilih: nama calon". Like di komentar calon ikut dihitung.']) await ob.sistem('📢 ' + t); } } catch { /* ignore */ }
        // 2 Nov 09.25: umumkan Arena main langsung (sekali saja)
        try { if ((await redis('SET', 'ob_umum_arena_game_v1', '1', 'NX')) === 'OK') { const { log } = await import('../lib/rules.js'); const ob = await import('../lib/obrolan.js'); const t = '🎮 ARENA SEKARANG BISA DIMAINKAN! Pilih 3 kartu jurus, lalu terima tantangan lewat website dan bertarung sendiri: TAP tepat waktu untuk serangan SEMPURNA & tangkisan. DM "ARENA" untuk link!'; await log('arena', t); await ob.sistem('📢 ' + t); } } catch { /* ignore */ }
        // 2 Nov 06.00: Pokoboll mulai dijual → umumkan sekali di Kabar Desa & Obrolan
        try { const PB = await import('../lib/pokoboll.js'); if (Date.now() >= PB.MULAI_JUAL && Date.now() - PB.MULAI_JUAL < 2 * 864e5 && (await redis('SET', 'ob_umum_pokoboll_v1', '1', 'NX')) === 'OK') { const { log } = await import('../lib/rules.js'); const ob = await import('../lib/obrolan.js'); const t = '🏠 POKOBOLL DIJUAL! Item EKSKLUSIF, cuma ada 1 di Dunia Pokomen: rumah bola yang bentuknya mengikuti hewanmu. Harga 100 Biji Kopi atau 6 Batu Evolusi di Toko. Siapa cepat, dia dapat!'; await log('bangun', t); await ob.sistem('📢 ' + t); } } catch { /* ignore */ }
        // 1 Nov 20.05: harga latihan turun lagi jadi 3 (sekali saja)
        try { if ((await redis('SET', 'ob_umum_latihan3_v1', '1', 'NX')) === 'OK') { const ob = await import('../lib/obrolan.js'); await ob.sistem('📢 🏋️ Harga turun LAGI! Sesi di Tempat Latihan sekarang cuma 3 Biji Kopi per sesi. Setiap sesi ke-5 tetap LATIHAN SUPER 2x. Ayo latihan sebanyak-banyaknya untuk Liga Arena!'); } } catch { /* ignore */ }
        // 1 Nov 20.00: umumkan harga latihan baru (sekali saja)
        try { if ((await redis('SET', 'ob_umum_latihan5_v1', '1', 'NX')) === 'OK') { const ob = await import('../lib/obrolan.js'); await ob.sistem('📢 🏋️ Harga turun! Sesi di Tempat Latihan sekarang hanya 5 Biji Kopi per sesi (sebelumnya 10). Setiap sesi ke-5 tetap LATIHAN SUPER 2x. Ayo latih hewanmu untuk Liga Arena!'); } } catch { /* ignore */ }
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
      // 2 Nov: scan komentar di SEMUA video → yang ingin ikut tapi hewannya belum lahir langsung dibuatkan (dicicil 4 video/menit)
      try {
        const st = JSON.parse((await redis('GET', 'scan_daftar_v2')) || '{"dari":0}');
        if (!st.selesai && (await redis('SET', 'scan_daftar_lock', '1', 'NX', 'EX', '90')) === 'OK') {
          const S = await import('../lib/sync.js');
          if (!st.media) { const { listMedia } = await import('../lib/ig.js'); st.media = (await listMedia(100)).map((m) => ({ id: m.id })); }
          const r = await S.scanDaftar({ dari: st.dari, sampai: st.dari + 4, media: st.media });
          st.dari += 4; st.komentar = (st.komentar || 0) + r.komentar;
          st.lahir = [...(st.lahir || []), ...r.lahir.map((x) => x.u)]; st.menunggu = [...(st.menunggu || []), ...r.menunggu.map((x) => x.u)];
          st.selesai = st.dari >= st.media.length; st.t = new Date().toISOString();
          await redis('SET', 'scan_daftar_v2', JSON.stringify(st));
        }
      } catch (e) { await redis('SET', 'scan_daftar_err', String(e.message || e)).catch(() => {}); }
      // 4 Nov 21.40: skill yang ditulis dengan salah ketik di cerita (mis. "Skili: amukan ular putih") → pasang sekali
      try { if ((await redis('SET', 'skill_dari_cerita_v1', '1', 'NX')) === 'OK') { const { hgetallJSON, setJSON } = await import('../lib/db.js'); const { log } = await import('../lib/rules.js'); const hasil = [];
        for (const w of await hgetallJSON('warga')) { if (w.mati || w.skill) continue;
          for (const c of [...(w.cerita || [])].reverse()) { const m = /\b(?:skillnya|skilnya|skills|skill|skili|skiil|skil|sekil)\s*:\s*([^\n.!|()]+)/i.exec(String(c.text || '')); if (!m) continue;
            const sk = m[1].replace(/[\p{Extended_Pictographic}\uFE0F]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60); if (sk.length < 3) continue;
            w.skill = sk; await setJSON('warga', w.username, w); hasil.push(w.username + ': ' + sk); if (w.tier >= 3) await log('evolusi', `${w.nama} milik @${w.username} kini punya skill: ${sk}!`, { u: w.username }); break; } }
        await redis('SET', 'skill_dari_cerita_hasil', JSON.stringify(hasil)); } } catch { /* ignore */ }
      // 4 Nov 16.00: pemilihan Ketua Wilayah 5 (belum ada calon) diperpanjang sampai Jumat 6 Nov 12.00 WIB + calon luar gratis
      try { if ((await redis('SET', 'pw_w5_perpanjang_v1', '1', 'NX')) === 'OK') { const WL = await import('../lib/wilayah.js'); const cfg = await WL.getCfg(); const J = { ...(cfg.jadwal || {}) };
        if (J[5] && !(await (await import('../lib/db.js')).hgetallJSON('warga')).some((w) => w.ketuaWilayah === 5)) { J[5] = { ...J[5], tutup: '2026-11-06T05:00:00.000Z', ditetapkan: false }; await WL.setCfg({ jadwal: J, ditetapkan: false });
          const { log } = await import('../lib/rules.js'); const ob = await import('../lib/obrolan.js');
          for (const t of ['🗳️ Kursi Ketua Wilayah 5 (WATEA) masih kosong! Pemilihan DIPERPANJANG sampai Jumat 6 Nov pukul 12.00 WIB. Calonkan dirimu: komen "Calon 5: janjimu".', '🎉 Mulai sekarang warga dari wilayah mana pun bisa mencalonkan diri jadi ketua wilayah baru secara GRATIS (tidak perlu 7 Biji Kopi lagi). Semua warga boleh memilih: "Pilih: nama calon".']) { await log('bangun', t); await ob.sistem(t); } } } } catch { /* ignore */ }
      // 4 Nov: aturan W.O. diganti duel otomatis → kembalikan semua -1 W.O. & umumkan (sekali)
      try { const AR = await import('../lib/arena.js'); const h = await AR.kembalikanPoinWO(); if (h) { const { log } = await import('../lib/rules.js'); const ob = await import('../lib/obrolan.js');
        for (const t of ['⚔️ ATURAN ARENA BARU: tantangan yang tidak dijawab kini jadi DUEL OTOMATIS, bukan kalah. Boleh "Lewati" 2x per hari tanpa akibat. Tiap hewan maks. 3 tantangan masuk per hari.', `⏰ Batas 12 jam kini hanya dihitung saat Arena buka (07.00–21.00). Semua poin yang hilang karena W.O. sudah DIKEMBALIKAN (${h.length} warga). Klasemen sudah dihitung ulang!`]) { await log('arena', t); await ob.sistem(t); } } } catch { /* ignore */ }
      // 3 Nov: fasilitas baru dibuka → umumkan + hadiah tebakan benar
      try { const F = await import('../lib/fasilitas.js'); const { log } = await import('../lib/rules.js'); const ob = await import('../lib/obrolan.js'); const E = await import('../lib/ekonomi.js');
        await F.umumkanYangBaru({ umumkan: async (t) => { await log('bangun', t); await ob.sistem(t); }, bonus: (u, n, ket) => E.bonusBiji(u, n, ket) }); } catch { /* ignore */ }
      // 2 Nov 16.15: cerita lama warga hasil scan (komentar sebelum lahir) dihitung untuk evolusi — sekali saja
      try {
        const st = JSON.parse((await redis('GET', 'scan_daftar_v2')) || '{}');
        if (st.selesai && (await redis('SET', 'cerita_lama_v1', 'jalan', 'NX')) === 'OK') {
          const { hgetallJSON } = await import('../lib/db.js'); const { listComments } = await import('../lib/ig.js'); const R = await import('../lib/rules.js');
          const baru = new Set((await hgetallJSON('warga')).filter((w) => w.spot >= 180 && !w.mati).map((w) => w.username));
          const per = {};
          for (const m of st.media) for (const c of await listComments(m.id)) { const u = String(c.username || '').toLowerCase(); if (baru.has(u)) (per[u] = per[u] || []).push(c); }
          const h = await R.evolusiCeritaLama(per, { sebelum: '2026-11-02T08:50:00Z' });
          await redis('SET', 'cerita_lama_v1', JSON.stringify({ t: new Date().toISOString(), warga: baru.size, hasil: h }));
        }
      } catch (e) { await redis('SET', 'cerita_lama_err', String(e.message || e)).catch(() => {}); }
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
      fasilitas: (await import('../lib/fasilitas.js')).publik(),
      ceritaLama: await (async () => { try { const v = await redis('GET', 'cerita_lama_v1'); return v && v !== 'jalan' ? JSON.parse(v) : v || (await redis('GET', 'cerita_lama_err')); } catch { return null; } })(),
      scanDaftar: await (async () => { try { const st = JSON.parse((await redis('GET', 'scan_daftar_v2')) || 'null'); return st && { video: st.media?.length || 0, sudah: Math.min(st.dari, st.media?.length || 0), komentar: st.komentar || 0, lahir: (st.lahir || []).length, menunggu: (st.menunggu || []).length, selesai: !!st.selesai, err: await redis('GET', 'scan_daftar_err') }; } catch { return null; } })(),
      trakteer: process.env.TRAKTEER_URL || null,
      dukungan,
      pemiluWilayah: pw ? publicHasil(pw) : null,
      usulNamaWilayah: namaWil,
      wilayahBuka: await jumlahWilayahBuka().catch(() => 3),
      pokoboll: await import('../lib/pokoboll.js').then(async (PB) => PB.publik(await PB.getPB(), await PB.hargaBiji())).catch(() => ({ tampil: false })),
      log: (logRaw || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter((x) => x && !(x.type === 'dukung' && /^\s*\[.*test.*\]/i.test(x.text || ''))),
    }, 200, { 'Cache-Control': 's-maxage=20, stale-while-revalidate=60' });
  } catch (e) {
    // 200 so the message is readable; the website falls back to example data
    return json({ error: e.message }, 200, { 'Cache-Control': 'no-store' });
  }
}
