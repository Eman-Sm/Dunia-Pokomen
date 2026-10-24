// Public data for the website: citizens, facility suggestions, news log.
import { redis, hgetallJSON } from '../lib/db.js';
import { publicWarga, CONFIG, ensureTierSchema } from '../lib/rules.js';
import { json, hariKe } from '../lib/http.js';

export async function GET() {
  try {
    await ensureTierSchema();
    const [warga, usulan, logRaw, start, dukRaw] = await Promise.all([
      hgetallJSON('warga'), hgetallJSON('usulan'), redis('LRANGE', 'log', 0, 29), redis('GET', 'hari_pertama'), redis('LRANGE', 'dukungan', 0, 39),
    ]);
    const dukungan = (dukRaw || []).map((s) => { try { return JSON.parse(s); } catch { return null; } })
      .filter((x) => x && !x.hidden).slice(0, 12)
      .map(({ nama, pesan, unit, jumlah, t }) => ({ nama, pesan, unit: process.env.TRAKTEER_UNIT_NAME || 'Kopi Admin', jumlah, t }));
    const visible = warga.filter((w) => !w.hidden).sort((a, b) => a.spot - b.spot);
    const us = usulan.filter((x) => x.status !== 'ditolak')
      .sort((a, b) => (b.status === 'dibangun') - (a.status === 'dibangun') || b.likes - a.likes)
      .slice(0, 50)
      .map((x) => ({ id: x.id, u: x.username, text: x.text, likes: x.likes, status: x.status, episode: x.episode }));
    return json({
      hari: hariKe(start),
      tiers: CONFIG.tiers,
      benefits: CONFIG.benefits,
      jumlahWarga: visible.length,
      warga: visible.map(publicWarga),
      usulan: us,
      wajibFollow: process.env.REQUIRE_FOLLOW === '1',
      trakteer: process.env.TRAKTEER_URL || null,
      dukungan,
      log: (logRaw || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean),
    }, 200, { 'Cache-Control': 's-maxage=20, stale-while-revalidate=60' });
  } catch (e) {
    // 200 so the message is readable; the website falls back to example data
    return json({ error: e.message }, 200, { 'Cache-Control': 'no-store' });
  }
}
