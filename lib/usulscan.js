// 3 Nov: kumpulkan usulan fasilitas/fitur dari komentar bebas di semua video (bukan hanya format "Usul: ...").
import { redis } from './db.js';
import { listMedia, listComments } from './ig.js';

const KATA = /\b(usul|usulan|saran|request|req|tambah(?:in|kan)?|bikin(?:in|kan)?|buat(?:in|kan)|fasilitas|kolam|taman|rumah|sekolah|pasar|toko|restoran|warung|kafe|cafe|stadion|perpustakaan|rumah\s+sakit|klinik|pantai|danau|gunung|hutan|jembatan|bioskop|kebun|lapangan|menara|istana|kastil|museum|pemandian|sungai|air\s+terjun|playground|wahana|festival|event|fitur|mode|minigame|mini\s+game|turnamen|lomba|kompetisi|pernikahan|nikah|pacar|anak|telur|bertelur|kawin|makanan|makan|pekerjaan|kerja|uang|bank|polisi|penjara|rumah\s+hewan|kandang|gua|goa|pulau|kapal|pesawat|kendaraan|mobil|cuaca|musim|hujan|salju|malam|siang|ulang\s+tahun)\b/i;
const BUKAN = /\b(nama|hewan|cerita|tantang|terima|pilih|calon|elemen|outfit|skill|wujud|cuaca|wilayah)\s*\d*\s*:/i;

export async function scanUsulan({ maks = 100 } = {}) {
  const media = await listMedia(maks);
  const out = [];
  for (const m of media) {
    for (const c of await listComments(m.id)) {
      const t = String(c.text || '').replace(/@[\w.]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (t.length < 8 || BUKAN.test(t) || !KATA.test(t)) continue;
      if (/^usul\s*:/i.test(t) === false && !/\b(usul|saran|request|req|tambah|bikin|buat|fasilitas|fitur|mode|kalau|gimana|bisa|pengen|ingin|mau|coba|semoga|harusnya|seharusnya|tolong|dong|min)\b/i.test(t)) continue;
      out.push({ u: c.username, t: t.slice(0, 220), likes: c.likeCount || 0, media: String(m.timestamp || '').slice(0, 10), balasan: !!c.parentId });
    }
  }
  out.sort((a, b) => b.likes - a.likes || String(b.media).localeCompare(String(a.media)));
  const hasil = { t: new Date().toISOString(), video: media.length, jumlah: out.length, daftar: out };
  await redis('SET', 'usul_scan_v1', JSON.stringify(hasil), 'EX', '86400');
  return hasil;
}
