# Rencana: Pembagian Wilayah & Pusat Koloni (dieksekusi SETELAH video Hari ke-4 tayang)

Disetujui pemilik akun 26 Okt 2026. Jangan dibangun sebelum video Hari ke-4 tayang.

## Wilayah warga (50 hewan per wilayah, berdasarkan nomor warga / urutan lahir)
| Wilayah | Warga | Letak (tile iso: pusat, radius) | Status |
|---|---|---|---|
| 1 | No. 1–50 | (6, 6) r10.5, padang utama + balai | sudah terbuka |
| 2 | No. 51–100 | (19, -9) r9, lahan timur diperluas | dibuka setelah Hari ke-4 |
| 3 | No. 101–150 | (-16, -18) r12, hutan utara (lahan terbesar) | dibuka setelah Hari ke-4 |
| 4 | No. 151–200 | (0, 24) r8, tepi danau | otomatis saat warga ke-151 lahir |
| 5 | No. 201–250 | (33, 8) r8.5, seberang sungai | otomatis saat warga ke-201 lahir |

- Hewan berkeliaran hanya di wilayahnya. Jalan setapak menghubungkan wilayah.
- Tiap wilayah: gapura, papan nama, warna bendera, penghitung isi ("35/50"), lompat cepat di peta penuh, nama wilayah di kartu.
- Nama sementara "Wilayah N". Nama asli dari usulan komentar `Wilayah: <nama>`; usulan otomatis masuk ke wilayah si pengusul (dari hewannya). Like terbanyak per wilayah menang, diumumkan Hari ke-5. Admin bisa menolak nama tidak pantas.

## Pusat Koloni (wilayah Admin)
- Letak (-4, -6) r~4.6, di antara Wilayah 1 dan 3, dekat persimpangan; melebar tiap ada fasilitas baru.
- Tidak dihuni hewan. Berisi fasilitas usulan warga yang dibangun Admin (pertama: Tempat Latihan; berikutnya Tempat Makan, Taman Bunga, ...).
- Hewan dari semua wilayah sesekali berkunjung lalu pulang.

## Ketua Koloni per wilayah (voting lewat komentar, dibantu web)
- Gelar: **"Ketua Koloni <nama wilayah>"** (contoh: Ketua Koloni Lembah Pelangi), lencana mahkota di peta & kartu.
- **Ketua Koloni pertama (hasil pemilu Hari ke-4) otomatis menjadi Ketua Koloni untuk wilayah tempat hewannya tinggal**; wilayah itu tidak perlu voting. Wilayah lain memilih.
- Calon mendaftar dengan komentar `Calon: <kampanye singkat>` (hanya mereka yang tampil sebagai calon).
- Voting dengan komentar `Pilih: <nama hewan>` (mis. `Pilih: Valtherion`; nama kembar + nomor warga, mis. `Pilih: Raiko 47`; @username tetap diterima) di postingan. Identitas pemilih = akun pengomentar (sudah terverifikasi Instagram).
  - Sah hanya bila calon satu wilayah dengan pemilih; memilih diri sendiri tidak dihitung; 1 akun = 1 suara (yang dihitung pilihan terakhir).
  - Suara tidak sah → bot membalas komentar: "@kamu, @calon itu warga Wilayah X, kamu di Wilayah Y. Lihat calon di wilayahmu di link bio ya!"
- Web halaman awal: kotak **"Cek wilayahmu"** (@username, atau otomatis dari Hewanku / link pribadi ?u=) → wilayahmu + peta kecil + daftar calon di wilayahmu (tanpa dirimu) dengan tombol **"Salin suara"** (menyalin `Pilih: @calon` & membuka postingan). Klasemen live per wilayah.
- Video Hari ke-4 menyorot tiap wilayah & beberapa penghuninya; story "Wilayahmu yang mana? Cek di link bio".

## Urutan
1. Hari ke-4 (video): pengumuman Ketua Koloni, rencana wilayah + migrasi, Pusat Koloni & Tempat Latihan, ajakan `Wilayah: ...`, pengumuman pemilihan Ketua Koloni per wilayah (komentar `Calon:` / `Pilih: @...`, cek wilayah di web); Ketua Koloni pertama otomatis memimpin wilayahnya; teaser Obrolan Warga (RENCANA_OBROLAN.md).
2. Setelah tayang: bangun lahan, wilayah, Pusat Koloni, sistem usulan nama, voting Ketua Koloni per wilayah, Obrolan Semua + Obrolan Wilayah.
3. Hari ke-5: nama wilayah diumumkan, voting Ketua Koloni per wilayah dibuka/berjalan.

## Jadwal pemilihan Ketua per wilayah (diputuskan 27 Okt)
- Dibuka saat video Hari ke-4 tayang (default 27 Okt 17.00 WIB, `pw_cfg.buka`), ditutup **28 Okt 12.00 WIB**.
- Wilayah 1 & 3 memilih; Wilayah 2 dipimpin otomatis oleh Ketua Koloni pertama, Hole (@vanzoka.7).
- Sudah dibangun: lib/wilayah.js (Calon:/Pilih:, balasan bot, hitung suara, gelar otomatis "Ketua Koloni Wilayah N" saat ditutup), bagian "Pemilihan Ketua Koloni per Wilayah" + "Cek wilayahmu" di halaman awal, admin `pw_status` / `pw_set` / `pw_tetapkan`.
- Belum: lahan/gapura wilayah di peta, usulan nama `Wilayah:`.

## Peta wilayah (dibangun 27 Okt malam)
- Wilayah 1, 2, 3 sama besar (radius 12 petak, seukuran Wilayah 3). Pusat: W1 (850,995), W2 (1250,640), W3 (560,520) px.
- Setiap wilayah dikelilingi pagar kayu (titik pagar disimpan di world.json `pagar` untuk dekorasi nanti), gerbang bertuliskan nama wilayah + jalan setapak ke Pusat Koloni (gerbang tambahan di tempat jalan lama memotong pagar).
- Balai Warga pindah ke tengah Pusat Koloni (alun-alun batu), di sampingnya Tempat Latihan (3 boneka latihan).
- Generator: tools/world_export_v4.py (butuh world_gen.py + assets.py dari folder video).

## Update 30 Okt 2026: wilayah baru otomatis + nama di gapura
- Peta v5 (`tools/world_export_v5.py`): Wilayah 4 (utara, warga 151–200) dan Wilayah 5 (barat daya, 201–250) sudah berpagar & bergapura. Wilayah 6 (warga 251+) butuh lahan baru di peta.
- Papan gapura kosong di gambar; website menulis nama resmi di papan (`world.json.papan`). Belum bernama: "WILAYAH N"; belum ada warga: "SEGERA".
- `bukaWilayahBaru()` (dipanggil dari `/api/dunia`, cek tiap menit): begitu wilayah punya warga tapi belum punya ketua/jadwal, otomatis membuka usulan nama + pemilihan ketua, ditutup 2 hari kemudian pukul 12.00 WIB, diumumkan di Kabar Desa & Obrolan. Like dihitung dari postingan terbaru saat dibuka.
- Saat ditutup, `tetapkanPemenang()` otomatis memberi gelar "Ketua Koloni Wilayah N" dan meresmikan usulan nama dengan like terbanyak.
- Admin: `pw_buka_baru` (buka sekarang), `pw_jadwal` (ubah tanggal tutup satu wilayah).
