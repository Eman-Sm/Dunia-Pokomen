# Obrolan Warga di Web (dirancang 27 Okt 2026, AKTIF sejak 27 Okt malam setelah video Hari ke-4)

Diperkenalkan di video Hari ke-4. **Diaktifkan hanya SETELAH video Hari ke-4 tayang dan fiturnya sudah diperkenalkan** (keputusan 27 Okt), bersamaan dengan wilayah (lihat RENCANA_WILAYAH.md). Jangan dinyalakan sebelumnya.

## Dua ruang obrolan
| Ruang | Siapa yang bisa menulis | Siapa yang bisa membaca |
|---|---|---|
| **Obrolan Semua** (alun-alun) | semua pemilik hewan hidup | semua pengunjung web |
| **Obrolan Wilayah N** | hanya warga wilayah itu | semua pengunjung (bisa "mengintip" wilayah lain) |

- Tab di panel obrolan: `Semua` | `Wilayahku` | (pilih wilayah lain untuk mengintip, hanya baca).
- Pesan tampil sebagai **nama hewan** (+ nomor bila kembar), lencana tingkat, mahkota Ketua Koloni / Sohabat Admin, warna bendera wilayah. Klik nama → kartu warga & terbang ke hewannya di peta.

## Bikin dunia terasa hidup
- **Gelembung bicara di peta**: saat pemilik menulis, hewannya memunculkan gelembung kata di atas kepala selama ~6 detik (dipotong ±40 huruf). Pengunjung lain melihat hewan "ngobrol" di dunia.
- **Emote cepat** (tanpa mengetik): 👋 sapa, ❤️, 😂, 🔥, 🎉 → hewan melompat + ikon di atas kepala.
- **Penghitung "sedang online"** per wilayah, dan hewan yang pemiliknya online diberi kilau kecil.
- Pesan sistem otomatis: "🐣 Kinggon baru lahir di Wilayah 2, sapa yuk!", "⭐ Pega naik ke Mythical!", hasil duel (nanti).

## Siapa yang boleh menulis (identitas)
- Web tidak tahu akun Instagram pengunjung, jadi menulis butuh **link pribadi rahasia** `?u=<username>&k=<token>` (sama dengan link Dompetku di RENCANA_ARENA_EKONOMI.md).
- Link didapat dengan DM kata **OBROLAN** ke @duniapokomen → bot membalas link (DM masih dalam jendela 24 jam). Link juga disertakan di DM kelahiran hewan baru.
- Token disimpan di browser (localStorage) sehingga cukup sekali klik. Token bisa diganti (DM "OBROLAN BARU") bila link bocor; token lama mati.
- Tanpa token: bisa membaca dan melihat gelembung, tidak bisa menulis.

## Keamanan & moderasi (banyak warga kemungkinan remaja)
- **Tidak ada pesan pribadi antar-warga.** Semua obrolan terbuka di ruang umum; tidak ada fitur kirim kontak.
- Filter otomatis: kata kasar/SARA (daftar kata + variasi huruf), link/URL, nomor HP, @username luar, ajakan "pindah ke WA/DM". Pesan yang kena filter tidak terkirim (penulis diberi tahu).
- Batas (diputuskan 27 Okt): 200 huruf per pesan, jeda 3 detik antar-pesan, TANPA batas jumlah pesan harian; pesan sama berulang ditolak.
- Tombol **Laporkan** di tiap pesan; 3 laporan dari akun berbeda → pesan disembunyikan otomatis menunggu Admin.
- Ruang Admin, tab **Obrolan**: lihat semua ruang, hapus pesan, bisukan hewan (1 jam / 24 jam / permanen), daftar laporan, tambah kata terlarang, tombol darurat "kunci obrolan" (semua jadi hanya-baca).
- Riwayat disimpan 7 hari (200 pesan terakhir per ruang), lalu dihapus.

## Teknis (singkat)
- Redis list per ruang (`obrolan:semua`, `obrolan:w1`..`w5`), LTRIM 200.
- `api/obrolan.js`: GET `?ruang=&sejak=<id>` (polling tiap 4 detik selagi panel terbuka; 20 detik bila tab tidak aktif), POST tulis (cek token, wilayah, filter, batas).
- Gelembung peta diambil dari pesan 10 detik terakhir di ruang yang sedang dilihat.
- Vercel tanpa websocket → polling cukup untuk ratusan warga; bisa naik ke layanan realtime bila ramai.

## Untuk video
- Hari ke-4: umumkan "Sebentar lagi hewanmu bisa ngobrol di web — di wilayahmu dan dengan semua warga."
- Episode berikutnya: segmen **"Obrolan Terpanas Hari Ini"** (cuplikan pesan lucu, dengan nama hewan) + rekaman gelembung bicara di peta.

## Urutan
1. Bersama pembangunan wilayah (setelah Hari ke-4): Obrolan Semua + Obrolan Wilayah + gelembung peta + moderasi.
2. Menyusul: emote cepat, penghitung online, pesan sistem duel (bersama Arena).
