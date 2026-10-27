// Instagram webhook: receives new comments in real time.
// Callback URL to register in the Meta App Dashboard:  https://<domain>/api/webhook
import crypto from 'node:crypto';
import { processComment, handleDM } from '../lib/rules.js';
import { ownUsername } from '../lib/sync.js';
import { safeEqual } from '../lib/http.js';
import { fromWebhook } from '../lib/story.js';

export async function GET(request) {
  const p = new URL(request.url).searchParams;
  if (p.get('hub.mode') === 'subscribe' && safeEqual(p.get('hub.verify_token'), process.env.IG_WEBHOOK_VERIFY_TOKEN)) {
    return new Response(p.get('hub.challenge') || '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

function validSignature(raw, header) {
  const secret = process.env.IG_APP_SECRET;
  if (!secret) return process.env.ALLOW_UNSIGNED_WEBHOOK === '1';
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
  return safeEqual(expected, header || '');
}

export async function POST(request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get('x-hub-signature-256'))) {
    return new Response('Bad signature', { status: 401 });
  }
  let body;
  try { body = JSON.parse(raw); } catch { return new Response('Bad JSON', { status: 400 }); }
  const own = await ownUsername().catch(() => null);
  const results = [];
  for (const entry of body.entry || []) {
    for (const m of entry.messaging || []) {
      // DM from a viewer (ignore our own echoes)
      if (!m.sender?.id || m.message?.is_echo || m.sender.id === entry.id) continue;
      if (!m.message && !m.postback) continue;
      let story = null;
      try { story = await fromWebhook(m); if (story) results.push('story:' + story); } catch (e) { results.push('story-error:' + e.message); }
      // a story reply only continues a pending registration; it never triggers the "already born" auto-reply
      try { results.push(await handleDM(m.sender.id, { quiet: !!story, text: m.message?.text || '' })); } catch (e) { results.push('error:' + e.message); }
    }
    for (const ch of entry.changes || []) {
      if (ch.field !== 'comments' && ch.field !== 'live_comments') continue;
      const v = ch.value || {};
      const c = {
        id: v.id, text: v.text || '', username: v.from?.username, userId: v.from?.id || null, mediaId: v.media?.id || null,
        parentId: v.parent_id || null,
        timestamp: entry.time ? new Date(entry.time * (entry.time < 1e12 ? 1000 : 1)).toISOString() : new Date().toISOString(),
      };
      try { results.push(await processComment(c, { ownUsername: own })); }
      catch (e) { results.push('error:' + e.message); }
    }
  }
  return new Response(JSON.stringify({ ok: true, results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
