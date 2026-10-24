import crypto from 'node:crypto';

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

export function safeEqual(a, b) {
  const A = Buffer.from(String(a || '')), B = Buffer.from(String(b || ''));
  return A.length === B.length && A.length > 0 && crypto.timingSafeEqual(A, B);
}

export function bearer(request) {
  const h = request.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}

export function hariKe(startIso) {
  const start = startIso || process.env.POKOMEN_HARI_PERTAMA;
  if (!start) return 1;
  // count days in Asia/Jakarta (UTC+7)
  const d = (x) => Math.floor((x + 7 * 3600e3) / 864e5);
  return Math.max(1, d(Date.now()) - d(Date.parse(start + 'T00:00:00+07:00')) + 1);
}
