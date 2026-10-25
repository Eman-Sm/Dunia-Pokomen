// Anime card art through the Gemini API (Nano Banana image models).
// Needs GEMINI_API_KEY in Vercel. Optional: GEMINI_IMAGE_MODEL, GEMINI_DAILY_LIMIT.
import { redis } from './db.js';

export const MODEL = () => process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
export const LIMIT = () => Number(process.env.GEMINI_DAILY_LIMIT || 30);
const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); // WIB

export async function quota() {
  const used = Number((await redis('GET', 'gemini_count:' + today())) || 0);
  return { used, limit: LIMIT(), left: Math.max(0, LIMIT() - used), model: MODEL(), ready: !!process.env.GEMINI_API_KEY };
}

/** Find the first base64 image anywhere in a Gemini response (works for generateContent and Interactions). */
export function findImage(x) {
  if (!x || typeof x !== 'object') return null;
  const inl = x.inlineData || x.inline_data;
  if (inl && inl.data && /^image\//.test(inl.mimeType || inl.mime_type || 'image/png')) return { data: inl.data, mime: inl.mimeType || inl.mime_type || 'image/png' };
  if (x.type === 'image' && typeof x.data === 'string' && x.data.length > 100) return { data: x.data, mime: x.mime_type || x.mimeType || 'image/png' };
  for (const v of Array.isArray(x) ? x : Object.values(x)) { const r = findImage(v); if (r) return r; }
  return null;
}
function findText(x) {
  if (!x || typeof x !== 'object') return '';
  if (typeof x.text === 'string') return x.text;
  for (const v of Array.isArray(x) ? x : Object.values(x)) { const r = findText(v); if (r) return r; }
  return '';
}

async function post(url, body, key) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body), signal: AbortSignal.timeout(110000) });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok && !j.error, status: r.status, j };
}

/**
 * prompt: text, ref: optional base64 PNG (the pixel sprite, used as a likeness reference)
 * returns { dataUrl, model }
 */
export async function generateArt({ prompt, ref }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY belum diisi di Vercel (Settings → Environment Variables), lalu redeploy.');
  const q = await quota();
  if (q.left <= 0) throw new Error(`Batas harian ${q.limit} gambar sudah tercapai. Coba lagi besok atau naikkan GEMINI_DAILY_LIMIT.`);
  const model = MODEL();
  const refText = ref ? ' The attached tiny pixel-art sprite is only a reference for the creature\'s colors and body features; redraw it as a detailed anime illustration, not pixel art.' : '';
  // 1) classic generateContent
  const parts = [{ text: prompt + refText }];
  if (ref) parts.push({ inline_data: { mime_type: 'image/png', data: ref } });
  let res = await post(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    contents: [{ role: 'user', parts }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '3:2' } },
  }, key);
  let img = res.ok ? findImage(res.j) : null;
  // 2) newer Interactions API
  if (!img) {
    const input = [{ type: 'text', text: prompt + refText }];
    if (ref) input.push({ type: 'image', mime_type: 'image/png', data: ref });
    const r2 = await post(`${BASE}/interactions`, { model, input, response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '3:2', image_size: '1K' } }, key);
    if (r2.ok) img = findImage(r2.j);
    if (!img) {
      const err = (res.j.error && res.j.error.message) || (r2.j.error && r2.j.error.message) || findText(r2.j) || findText(res.j) || ('HTTP ' + res.status);
      throw new Error('Gemini gagal membuat gambar: ' + err);
    }
  }
  await redis('INCR', 'gemini_count:' + today());
  await redis('EXPIRE', 'gemini_count:' + today(), String(3 * 86400));
  return { dataUrl: `data:${img.mime};base64,${img.data}`, model };
}
