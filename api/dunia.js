// Public data for the website: citizens, facility suggestions, news log.
import { redis, hgetallJSON } from '../lib/db.js';
import { publicWarga, publicMakam, CONFIG, ensureTierSchema } from '../lib/rules.js';
import { json, hariKe } from '../lib/http.js';
import { hitungJikaBasi, getConfig, publicPemilu } from '../lib/pemilu.js';
import { papanKopi, isTest } from '../lib/sahabat.js';
import { namaKembar, normNama } from '../lib/hewan.js';
import { hasilWilayah, publicHasil, tetapkanPemenang, wilayahOf, daftarUsulWilayah } from '../lib/wilayah.js';

export async function GET() {
  try {
    await ensureTierSchema();
    const [warga, usulan, logRaw, start, dukRaw, makam] = await Promise.all([
      hgetallJSON('warga'), hgetallJSON('usulan'), redis('LRANGE', 'log', 0, 29), redis('GET', 'hari_pertama'), redis('LRANGE', 'dukungan', 0, 199), hgetallJSON('makam'),
    ]);
    const dukAll = (dukRaw || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    const papan = papanKopi(dukAll, warga);
    const sahabat = papan[0] || null;
    const kembar = namaKembar(warga);
    const dukungan = dukAll
      .filter((x) => x && !x.hidden && !isTest(x)).slice(0, 12)
      .map(({ nama, pesan, unit, jumlah, t }) => ({ nama, pesan, unit: process.env.TRAKTEER_UNIT_NAME || 'Kopi Admin', jumlah, t }));
    const visible = warga.filter((w) => !w.hidden).sort((a, b) => a.spot - b.spot);
    const [pemiluHasil, pemiluCfg] = await Promise.all([hitungJikaBasi(20), getConfig()]);
    let pw = null;
    try {
      pw = await hasilWilayah();
      if (pw.closed && !pw.ditetapkan && (await redis('SET', 'pw_tetap_lock', '1', 'NX', 'EX', '120')) === 'OK') { await tetapkanPemenang(); pw = await hasilWilayah(); }
    } catch { pw = null; }
    let namaWil = {};
    try { namaWil = await daftarUsulWilayah(); } catch { /* ignore */ }
    const us = usulan.filter((x) => x.status !== 'ditolak')
      .sort((a, b) => (b.status === 'dibangun') - (a.status === 'dibangun') || b.likes - a.likes)
      .slice(0, 50)
      .map((x) => ({ id: x.id, u: x.username, text: x.text, likes: x.likes, status: x.status, episode: x.episode }));
    return json({
      hari: hariKe(start),
      tiers: CONFIG.tiers,
      benefits: CONFIG.benefits,
      jumlahWarga: visible.filter((w) => !w.mati).length,
      jumlahMati: visible.filter((w) => w.mati).length + makam.length,
      makam: makam.filter((w) => !w.hidden).map(publicMakam),
      warga: visible.map((w) => { const p = publicWarga(w); p.wil = wilayahOf(w); if (kembar.has(normNama(w.nama))) p.kembar = true; if (sahabat && sahabat.u === p.u && !p.mati) p.sahabat = sahabat.total; return p; }),
      kopiBoard: papan.slice(0, 5).map(({ u, nama, total }) => ({ u, nama, total })),
      dukunganUnit: process.env.TRAKTEER_UNIT_NAME || 'Kopi Admin',
      usulan: us,
      wajibFollow: process.env.REQUIRE_FOLLOW === '1',
      trakteer: process.env.TRAKTEER_URL || null,
      dukungan,
      pemilu: publicPemilu(pemiluHasil, pemiluCfg),
      pemiluWilayah: pw ? publicHasil(pw) : null,
      usulNamaWilayah: namaWil,
      log: (logRaw || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter((x) => x && !(x.type === 'dukung' && /^\s*\[.*test.*\]/i.test(x.text || ''))),
    }, 200, { 'Cache-Control': 's-maxage=20, stale-while-revalidate=60' });
  } catch (e) {
    // 200 so the message is readable; the website falls back to example data
    return json({ error: e.message }, 200, { 'Cache-Control': 'no-store' });
  }
}
