// Pemberitahuan pribadi untuk warga (mis. ditantang di Arena / tantangan diterima).
// 1) DM (berhasil bila orangnya pernah DM @duniapokomen dalam 24 jam terakhir), kalau gagal
// 2) balasan komentar yang menyebut @username → Instagram mengirim notifikasi "menyebut kamu".
import { getJSON, redis } from './db.js';
import { sendDM, replyToComment } from './ig.js';

export async function kabari(u, teks, { kunci } = {}) {
  u = String(u || '').toLowerCase().replace(/^@/, '');
  if (kunci && (await redis('SET', 'kabar:' + kunci + ':' + u, '1', 'NX', 'EX', '86400')) !== 'OK') return 'sudah';
  const w = await getJSON('warga', u);
  if (!w || w.mati) return 'tidak-ada';
  if (w.igsid) { try { await sendDM(w.igsid, teks); return 'dm'; } catch { /* di luar jendela 24 jam */ } }
  for (const id of [...new Set([w.commentId, w.lastCommentId].filter(Boolean))]) {
    try { await replyToComment(id, `@${u} ${teks}`); return 'komentar'; } catch { /* coba komentar lain */ }
  }
  return 'gagal';
}
