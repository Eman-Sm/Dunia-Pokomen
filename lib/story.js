// Story replies & mentions.
// Instagram delivers a reply to a story as a DM (webhook "messages") carrying message.reply_to.story,
// and a mention of the account in someone's story as an attachment of type "story_mention".
// New ones are saved from the webhook; older ones can be pulled once via the Conversations API
// (Instagram only returns the latest ~20 messages per conversation).
// Answers to question/poll/quiz stickers are NOT available through the API.
import { redis, getJSON, setJSON, hgetallJSON } from './db.js';
import { userProfile, conversations, conversationMessages } from './ig.js';

const KEY = 'story_balasan';

export function storyInfo(message) {
  if (!message) return null;
  const st = message.reply_to?.story;
  if (st) return { jenis: 'balasan', storyId: st.id || null, storyUrl: st.url || st.link || null };
  const att = (message.attachments || []).find((a) => a.type === 'story_mention');
  if (att) return { jenis: 'mention', storyId: att.payload?.id || null, storyUrl: att.payload?.url || null };
  return null;
}

async function usernameOf(igsid) {
  const cached = await redis('HGET', 'igsid_user', igsid).catch(() => null);
  if (cached) return cached;
  try {
    const p = await userProfile(igsid);
    if (p?.username) { await redis('HSET', 'igsid_user', igsid, p.username.toLowerCase()); return p.username.toLowerCase(); }
  } catch { /* profile not available */ }
  return null;
}

export async function saveStoryReply({ mid, igsid, username, text, info, t }) {
  if (!mid || !info) return null;
  if (await getJSON(KEY, mid)) return 'sudah-ada';
  const u = (username || (igsid ? await usernameOf(igsid) : null) || '').toLowerCase() || null;
  const warga = u ? await getJSON('warga', u) : null;
  await setJSON(KEY, mid, {
    mid, igsid: igsid || null, username: u, teks: text || '', jenis: info.jenis,
    storyId: info.storyId, storyUrl: info.storyUrl, t: t || new Date().toISOString(),
    warga: warga ? { nama: warga.nama, hewan: warga.hewan } : null,
  });
  return 'disimpan';
}

/** From a webhook messaging event. Returns null when it is not about a story. */
export async function fromWebhook(m) {
  const info = storyInfo(m.message);
  if (!info) return null;
  const t = m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString();
  return saveStoryReply({ mid: m.message.mid, igsid: m.sender.id, text: m.message.text, info, t });
}

/** Pull story replies already sitting in the inbox. */
export async function syncStoryReplies({ maxConv = 100, ownId = null } = {}) {
  let convs = 0, baru = 0, dilihat = 0;
  for await (const conv of conversations(maxConv)) {
    convs++;
    for (const msg of await conversationMessages(conv.id)) {
      const info = msg.story?.reply_to ? { jenis: 'balasan', storyId: msg.story.reply_to.id || null, storyUrl: msg.story.reply_to.link || null }
        : msg.story?.mention ? { jenis: 'mention', storyId: msg.story.mention.id || null, storyUrl: msg.story.mention.link || null } : null;
      if (!info) continue;
      if (ownId && msg.from?.id === ownId) continue;
      dilihat++;
      const r = await saveStoryReply({ mid: msg.id, igsid: msg.from?.id, username: msg.from?.username, text: msg.message, info, t: msg.created_time });
      if (r === 'disimpan') baru++;
    }
  }
  return { percakapan: convs, balasanDitemukan: dilihat, baru };
}

export async function listStoryReplies() {
  const all = (await hgetallJSON(KEY)).sort((a, b) => String(b.t).localeCompare(String(a.t)));
  const perStory = {};
  for (const r of all) {
    const k = r.storyId || '?';
    perStory[k] = perStory[k] || { storyId: r.storyId, storyUrl: r.storyUrl, jumlah: 0, pertama: r.t };
    perStory[k].jumlah++; if (r.t < perStory[k].pertama) perStory[k].pertama = r.t;
  }
  return { total: all.length, balasan: all, perStory: Object.values(perStory).sort((a, b) => String(b.pertama).localeCompare(String(a.pertama))) };
}
