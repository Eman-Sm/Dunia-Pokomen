// Serves a citizen's uploaded anime artwork: /api/art?u=<username>&v=<version>
import { redis } from '../lib/db.js';

export async function GET(request) {
  const u = String(new URL(request.url).searchParams.get('u') || '').toLowerCase().replace(/^@/, '');
  if (!u) return new Response('missing u', { status: 400 });
  const dataUrl = await redis('GET', 'art:' + u).catch(() => null);
  const m = dataUrl && /^data:(image\/(?:webp|jpeg|png));base64,(.+)$/.exec(dataUrl);
  if (!m) return new Response('not found', { status: 404 });
  return new Response(Buffer.from(m[2], 'base64'), {
    status: 200,
    headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=86400, s-maxage=31536000, immutable' },
  });
}
