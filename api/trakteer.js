// Trakteer webhook: shows supporters on the website's thank-you board.
// Set in Trakteer → Integrasi → Webhook:
//   https://<domain>/api/trakteer?token=<TRAKTEER_WEBHOOK_TOKEN>
// Support gives no power or evolution. Only cosmetic: the top supporter who owns a citizen
// becomes "Sahabat Admin" with a special crown (see lib/sahabat.js).
import { redis } from '../lib/db.js';
import { log } from '../lib/rules.js';
import { isTest } from '../lib/sahabat.js';
import { json, safeEqual } from '../lib/http.js';

const pick = (o, ...keys) => { for (const k of keys) if (o && o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; return null; };

export async function POST(request) {
  const url = new URL(request.url);
  const headerTok = request.headers.get('x-webhook-token');
  const queryTok = url.searchParams.get('token');
  // accept our own token (in the URL) or the token Trakteer shows on its webhook page (sent as header)
  const accepted = [process.env.TRAKTEER_WEBHOOK_TOKEN, process.env.TRAKTEER_HEADER_TOKEN].filter(Boolean);
  const ok = accepted.some((t) => safeEqual(queryTok, t) || safeEqual(headerTok, t));
  if (!ok) {
    await redis('SET', 'trakteer_last_rejected', JSON.stringify({
      t: new Date().toISOString(), adaTokenDiURL: !!queryTok, adaTokenDiHeader: !!headerTok,
      alasan: !accepted.length ? 'TRAKTEER_WEBHOOK_TOKEN belum diatur' : 'token tidak cocok',
    })).catch(() => {});
    return json({ error: 'token salah' }, 401);
  }

  const raw = await request.text();
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Bad JSON' }, 400); }
  await redis('SET', 'trakteer_last_raw', raw.slice(0, 4000));

  const d = body.data && typeof body.data === 'object' ? body.data : body;
  const id = String(pick(d, 'transaction_id', 'id', 'order_id') || 'tr-' + Date.now());
  if (await redis('SISMEMBER', 'dukungan_ids', id)) return json({ ok: true, duplicate: true });
  await redis('SADD', 'dukungan_ids', id);

  const item = {
    id,
    nama: String(pick(d, 'supporter_name', 'name') || 'Seseorang').slice(0, 40),
    pesan: String(pick(d, 'supporter_message', 'message') || '').slice(0, 200),
    unit: String(process.env.TRAKTEER_UNIT_NAME || 'Kopi Admin').slice(0, 30),
    jumlah: Number(pick(d, 'quantity', 'qty') || 1),
    t: pick(d, 'created_at') || new Date().toISOString(),
    hidden: false,
  };
  // Trakteer's 'Kirim Tes' button: keep it for format checks, but never count or show it
  if (body.is_test || d.is_test || isTest(item)) { item.test = true; item.hidden = true; }
  await redis('LPUSH', 'dukungan', JSON.stringify(item));
  await redis('LTRIM', 'dukungan', 0, 199);
  if (!item.test) await log('dukung', `${item.nama} mengirim ${item.jumlah} ${item.unit}. Admin melek +${item.jumlah} jam jaga ronda!`);
  return json({ ok: true });
}

export async function GET() {
  return json({ ok: true, info: 'Endpoint webhook Trakteer Dunia Pokomen. Gunakan POST.' });
}
