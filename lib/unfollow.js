// Unfollow detection.
// Instagram has no unfollow webhook and no follower list in the API, so there are two ways:
//  1. Automatic (limited): for citizens whose Instagram-scoped id we know, the User Profile API
//     returns is_user_follow_business. Instagram only answers this for people who have messaged
//     the account (for example through the follow-confirmation DM). Errors never kill anyone.
//  2. Follower list: the account owner downloads "Followers" from Instagram (Accounts Center ->
//     Your information -> Download) and uploads it in Ruang Admin. We compare it with the citizens.
import { redis, getJSON, setJSON, hgetallJSON } from './db.js';
import { userProfile } from './ig.js';
import { matikan } from './rules.js';

const key = (u) => String(u || '').toLowerCase().replace(/^@/, '').trim();

export async function cekUnfollowOtomatis({ limit = 30, dryRun = false } = {}) {
  const warga = (await hgetallJSON('warga')).filter((w) => !w.mati && !w.hidden && w.igsid);
  warga.sort((a, b) => String(a.followCek?.t || '').localeCompare(String(b.followCek?.t || '')));
  const out = { dicek: 0, masihFollow: 0, unfollow: [], tidakBisaDicek: 0, tanpaId: 0 };
  out.tanpaId = (await hgetallJSON('warga')).filter((w) => !w.mati && !w.igsid).length;
  for (const w of warga.slice(0, limit)) {
    out.dicek++;
    let prof = null, err = null;
    try { prof = await userProfile(w.igsid); } catch (e) { err = e.message; }
    w.followCek = { t: new Date().toISOString(), ok: prof ? prof.is_user_follow_business : null, err };
    await setJSON('warga', w.username, w);
    if (!prof || typeof prof.is_user_follow_business !== 'boolean') { out.tidakBisaDicek++; continue; }
    if (prof.is_user_follow_business) { out.masihFollow++; continue; }
    out.unfollow.push(w.username);
    if (!dryRun) await matikan(w.username, { sebab: 'unfollow', oleh: 'otomatis' });
  }
  await redis('SET', 'unfollow_last', JSON.stringify({ t: new Date().toISOString(), ...out }));
  return out;
}

/** Parse followers export (JSON or HTML from Instagram's "Download your information") or plain text. */
export function parseFollowers(text) {
  const set = new Set();
  const s = String(text || '');
  try {
    const j = JSON.parse(s);
    const walk = (x) => {
      if (Array.isArray(x)) return x.forEach(walk);
      if (x && typeof x === 'object') {
        if (Array.isArray(x.string_list_data)) x.string_list_data.forEach((d) => d.value && set.add(key(d.value)));
        if (typeof x.title === 'string' && x.title && !x.string_list_data) set.add(key(x.title));
        Object.values(x).forEach(walk);
      }
    };
    walk(j);
    if (set.size) return [...set];
  } catch { /* not JSON */ }
  for (const m of s.matchAll(/instagram\.com\/(?:_u\/)?([A-Za-z0-9._]{1,30})/g)) set.add(key(m[1]));
  if (!set.size) for (const t of s.split(/[\s,;]+/)) if (/^@?[A-Za-z0-9._]{1,30}$/.test(t)) set.add(key(t));
  return [...set];
}

/** Citizens that are alive but not in the follower list. Never kills anyone by itself. */
export async function bandingkanFollowers(list) {
  const followers = new Set((list || []).map(key));
  if (followers.size < 5) throw new Error('Daftar follower terlalu sedikit. Pastikan file yang diunggah adalah daftar followers.');
  const warga = (await hgetallJSON('warga')).filter((w) => !w.mati && !w.hidden);
  const bukan = warga.filter((w) => !followers.has(w.username)).map((w) => ({ username: w.username, nama: w.nama, hewan: w.hewan, tier: w.tier }));
  return { jumlahFollower: followers.size, jumlahWarga: warga.length, bukanFollower: bukan };
}
