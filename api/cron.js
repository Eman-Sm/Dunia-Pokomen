// Daily job (see vercel.json): refresh the token when needed and pull recent comments
// as a safety net in case a webhook was missed.
import { syncLatest, maybeRefreshToken } from '../lib/sync.js';
import { json, bearer, safeEqual } from '../lib/http.js';
import { hitung as pemiluHitung } from '../lib/pemilu.js';
import { cekUnfollowOtomatis } from '../lib/unfollow.js';

export async function GET(request) {
  if (!safeEqual(bearer(request), process.env.CRON_SECRET)) return json({ error: 'unauthorized' }, 401);
  const out = {};
  try { out.token = await maybeRefreshToken(20); } catch (e) { out.token = { error: e.message }; }
  try { out.sync = await syncLatest(Number(process.env.SYNC_POSTS || 5)); } catch (e) { out.sync = { error: e.message }; }
  if (process.env.CEK_UNFOLLOW !== '0') { try { out.unfollow = await cekUnfollowOtomatis({ limit: 40 }); } catch (e) { out.unfollow = { error: e.message }; } }
  try { out.pemilu = (await pemiluHitung()).jumlahCalon; } catch (e) { out.pemilu = { error: e.message }; }
  return json(out);
}
