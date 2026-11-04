// 3 Nov: fasilitas usulan warga dibangun SATU per episode. Setiap episode memberi petunjuk fasilitas berikutnya;
// warga menebak lewat komentar "Tebak: ...". Tebakan benar (sebelum fasilitas dibuka) dapat hadiah Biji Kopi.
import { redis, getJSON, setJSON } from './db.js';

export const HADIAH_TEBAK = 2; // Biji Kopi per tebakan benar
const T = (s) => Date.parse(s);
/** siap: asetnya sudah digambar & dipasang di peta (diubah saat fasilitas dibangun). */
export const JADWAL = [
  { id: 'tereuma', nama: 'Tereuma', sub: 'Tempat Reuni Bersama', pengusul: ['vanzoka.7'], buka: T('2026-11-03T14:30:00+07:00'), siap: true,
    x: 620, y: 752, ax: 84, ay: 72, img: 'tereuma', kunci: /tereuma|reuni|kumpul|alun|plaza|gazebo/i,
    ket: 'Tempat berkumpul warga. Hewan yang sedang ngobrol di Obrolan Warga datang dan berkumpul di sini.' },
  { id: 'oase', nama: 'Oase Pokomen', sub: 'Kolam minum & tempat makan', pengusul: ['itsme_amm012', 'cireng_michi', 'hana_hass11'], buka: T('2026-11-04T12:00:00+07:00'), siap: true,
    x: 868, y: 592, ax: 76, ay: 54, img: 'oase', ket: 'Kolam minum, palung air & tempat makan. Siang hari hewan yang haus dan lapar datang bergantian.',
    petunjuk: 'Tempatnya basah dan segar. Hewan datang ke sana saat haus dan lapar.', kunci: /oase|kolam|danau|telaga|air|minum|makan|mandi|sumur|mata air/i },
  { id: 'taman', nama: 'Taman Milzura', sub: 'Taman bunga Wilayah 4', pengusul: ['diqamal', 'doey_ramadhann'], buka: T('2026-11-05T12:00:00+07:00'), siap: false,
    petunjuk: 'Penuh warna dan wangi. Hadiah untuk Ketua Wilayah 4 yang baru.', kunci: /taman|bunga|kebun bunga|milzura/i },
  { id: 'klinik', nama: 'Klinik Pokomen', sub: 'Tempat hewan pulih', pengusul: ['riana_qahh'], buka: T('2026-11-06T12:00:00+07:00'), siap: false,
    petunjuk: 'Tempat hewan yang kalah duel beristirahat sampai pulih.', kunci: /klinik|rumah sakit|\brs\b|dokter|puskesmas|obat|perawat|apotek/i },
  { id: 'lapangan', nama: 'Lapangan Pokomen', sub: 'Lapangan bola & lomba', pengusul: ['017sikram', 'qey_farrozz', 'catur_1415', '26april2003.exe', 'liamners'], buka: T('2026-11-07T12:00:00+07:00'), siap: false,
    petunjuk: 'Ada yang bulat, ditendang ke sana kemari, dan ada gawangnya.', kunci: /lapangan|stadion|bola|sepak|futsal|olahraga|gawang/i },
  { id: 'ladang', nama: 'Ladang Pokomen', sub: 'Ladang & peternakan', pengusul: ['maul.ak_the.forg14', 'qey_farrozz', 'bi.setecu'], buka: T('2026-11-08T12:00:00+07:00'), siap: false,
    petunjuk: 'Ditanam hari ini, dipanen nanti.', kunci: /ladang|sawah|kebun|tani|pertanian|peternakan|panen|tanam/i },
  { id: 'dekor', nama: 'Dekor Sarang', sub: 'Hias rumah hewanmu', pengusul: ['hammi_ciko', 'xavier09970', 'hana_hass11', 'rahardianalif'], buka: T('2026-11-09T12:00:00+07:00'), siap: false,
    petunjuk: 'Bikin rumah hewanmu bergaya sesuai seleramu.', kunci: /dekor|hias|sarang|rumah|desain|interior/i },
  { id: 'hiasan', nama: 'Hiasan Dunia', sub: 'Detail kecil di seluruh peta', pengusul: ['itsme_amm012'], buka: T('2026-11-10T12:00:00+07:00'), siap: false,
    petunjuk: 'Kecil-kecil, tersebar di mana-mana, bikin dunia tidak polos lagi.', kunci: /hiasan|dekorasi|lampion|ornamen|lampu|detail|pernak/i },
];

export const terbuka = (now = Date.now()) => JADWAL.filter((f) => f.siap && now >= f.buka);
/** fasilitas berikutnya yang bisa ditebak: belum dibuka */
export const berikut = (now = Date.now()) => JADWAL.find((f) => now < f.buka) || null;

export function publik(now = Date.now()) {
  const n = berikut(now);
  return {
    dibangun: terbuka(now).map((f) => ({ id: f.id, nama: f.nama, sub: f.sub, x: f.x, y: f.y, ax: f.ax, ay: f.ay, img: f.img, pengusul: f.pengusul, ket: f.ket })),
    tebak: n ? { petunjuk: n.petunjuk, tutup: new Date(n.buka).toISOString(), hadiah: HADIAH_TEBAK } : null,
  };
}

/** catat tebakan (tebakan terakhir sebelum fasilitas dibuka yang dihitung) */
export async function tebak(u, teks, { now = Date.now() } = {}) {
  const n = berikut(now); if (!n) return null;
  const k = 'tebak:' + n.id;
  const prev = await getJSON(k, u);
  await setJSON(k, u, { u, teks: String(teks).slice(0, 60), t: new Date(now).toISOString(), awal: prev?.awal || new Date(now).toISOString() });
  return n.id;
}

/** fasilitas yang sudah dibuka & siap → umumkan + beri hadiah penebak benar (sekali per fasilitas) */
export async function umumkanYangBaru({ now = Date.now(), umumkan, bonus } = {}) {
  const out = [];
  for (const f of terbuka(now)) {
    if ((await redis('SET', 'fasilitas_dibuka:' + f.id, new Date(now).toISOString(), 'NX')) !== 'OK') continue;
    const { hgetallJSON } = await import('./db.js');
    const semua = (await hgetallJSON('tebak:' + f.id)).filter((x) => Date.parse(x.t) < f.buka);
    const benar = semua.filter((x) => f.kunci.test(x.teks));
    const nama = [];
    for (const x of benar) {
      const w = await getJSON('warga', x.u); if (!w || w.mati) continue;
      try { if (bonus) await bonus(x.u, HADIAH_TEBAK, 'tebak ' + f.id); nama.push(w.nama); } catch { /* ignore */ }
    }
    const r = { id: f.id, nama: f.nama, tebakan: semua.length, benar: nama };
    await redis('SET', 'fasilitas_hasil:' + f.id, JSON.stringify(r));
    if (umumkan) {
      const kredit = f.pengusul.length ? ` Usulan @${f.pengusul.slice(0, 2).join(', @')}.` : '';
      await umumkan(`🏗️ FASILITAS BARU: ${f.nama}!${kredit}`.slice(0, 200));
      if (semua.length) await umumkan(`🎯 Tebakan benar: ${nama.length} dari ${semua.length}.${nama.length ? ` +${HADIAH_TEBAK} Biji Kopi untuk ${nama.slice(0, 6).join(', ')}${nama.length > 6 ? ' dll' : ''}!` : ''}`.slice(0, 200));
    }
    out.push(r);
  }
  return out;
}
