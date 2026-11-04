// 4 Nov: Saran & Masukan dari warga (hanya bisa dibaca Admin di Ruang Admin).
import crypto from 'node:crypto';
import { redis } from './db.js';

export const JENIS = { kesan: '💛 Kesan', fitur: '💡 Ide / fitur baru', perbaikan: '🔧 Perbaikan / ada yang error', lain: '💬 Lainnya' };
const bersih = (s, n) => String(s || '').replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

export async function kirim({ jenis, pesan, nama, bintang, halaman }, { ip = '' } = {}) {
  const teks = bersih(pesan, 600);
  if (teks.length < 5) throw new Error('Tulis saranmu minimal 5 huruf ya.');
  const j = JENIS[jenis] ? jenis : 'lain';
  const kunci = crypto.createHash('sha256').update('saran|' + ip).digest('hex').slice(0, 16); // IP tidak disimpan
  if ((await redis('SET', 'saran_rl:' + kunci, '1', 'NX', 'EX', '60')) !== 'OK') throw new Error('Terima kasih! Tunggu 1 menit sebelum mengirim saran berikutnya.');
  const hari = 'saran_hari:' + kunci + ':' + new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  const n = Number(await redis('INCR', hari)); await redis('EXPIRE', hari, 172800);
  if (n > 10) throw new Error('Kamu sudah mengirim 10 saran hari ini. Terima kasih banyak, besok lagi ya!');
  const rec = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: new Date().toISOString(), jenis: j, pesan: teks,
    nama: bersih(nama, 40).replace(/^@?/, nama ? '@' : '') || null, bintang: Math.max(0, Math.min(5, Math.trunc(Number(bintang) || 0))) || null, halaman: bersih(halaman, 30) || null, dibaca: false };
  await redis('LPUSH', 'saran', JSON.stringify(rec)); await redis('LTRIM', 'saran', 0, 999);
  await redis('INCR', 'saran_baru');
  return { ok: true };
}

export async function daftar(n = 200) {
  const l = ((await redis('LRANGE', 'saran', 0, n - 1)) || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
  const baru = Number((await redis('GET', 'saran_baru')) || 0);
  return { baru, total: l.length, saran: l };
}
export async function tandaiDibaca() { await redis('SET', 'saran_baru', '0'); return { ok: true }; }
