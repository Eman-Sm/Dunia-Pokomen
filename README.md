# Dunia Pokomen — Website & Server

Website peta pixel-art yang warganya lahir otomatis dari komentar Instagram.

- **Peta interaktif**: geser, zoom, klik hewan untuk melihat kartu warganya.
- **Buku Warga, Usulan Fasilitas, Kabar Desa**.
- **Server**: menerima komentar Instagram (webhook), mengubahnya jadi warga, menjalankan aturan evolusi.
- **Ruang Admin** (`/admin.html`): sinkron komentar, antrean komentar yang tidak terbaca, ubah tingkat (termasuk Legenda), sembunyikan/hapus warga, tambah warga manual (misalnya dari TikTok), atur status usulan fasilitas.

Tanpa dependensi npm. Database: **Upstash Redis** (gratis, langsung dari Vercel Marketplace).

---

## Struktur

```
api/        fungsi server Vercel
  dunia.js     data publik untuk website
  webhook.js   penerima komentar dari Instagram
  admin.js     aksi admin (butuh password)
  cron.js      tugas harian: perbarui token + sinkron komentar
lib/
  rules.js     ATURAN DUNIA (tingkat & evolusi) ← ubah di sini
  parse.js     pembaca isi komentar
  ig.js        pemanggil Instagram API
  db.js        klien Upstash Redis
public/     website (index.html, admin.html, privasi.html, aset)
test/       uji otomatis (npm test)
dev-server.mjs  pratinjau lokal dengan data contoh
```

---

## Langkah setup

### 1. Taruh kode di Vercel
1. Buat repository baru di GitHub dan unggah isi folder ini.
2. Di [vercel.com](https://vercel.com) → **Add New → Project** → pilih repository tadi → **Deploy**.
   Framework: biarkan *Other*. Tidak perlu build command.

### 2. Sambungkan database
1. Di project Vercel → tab **Storage** (atau **Marketplace**) → pilih **Upstash** → **Redis** → buat database (paket gratis cukup).
2. Hubungkan ke project ini. Variabel `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN` (atau `KV_REST_API_URL` / `KV_REST_API_TOKEN`) akan terisi otomatis.

### 3. Buat aplikasi Meta untuk Instagram
1. Buka [developers.facebook.com](https://developers.facebook.com/) → **My Apps → Create App**.
2. Pilih use case untuk **Instagram API** (mengelola konten/pesan Instagram), lalu pilih jalur **API setup with Instagram login** (Instagram API with Instagram Login).
3. Di bagian **Generate access tokens**, tambahkan akun Instagram profesional @duniapokomen dan login. Pastikan izin `instagram_business_basic` dan `instagram_business_manage_comments` aktif.
4. Salin **access token** (token jangka panjang, berlaku ±60 hari; server memperbaruinya otomatis).
5. Salin **Instagram app secret** dari halaman pengaturan API tadi.

### 4. Isi Environment Variables di Vercel
Project → **Settings → Environment Variables**:

| Nama | Isi |
|---|---|
| `ADMIN_PASSWORD` | password untuk Ruang Admin (buat yang panjang) |
| `IG_ACCESS_TOKEN` | token dari langkah 3 |
| `IG_APP_SECRET` | Instagram app secret dari langkah 3 |
| `IG_WEBHOOK_VERIFY_TOKEN` | kata bebas buatanmu, misalnya `pokomen-rahasia-123` |
| `CRON_SECRET` | string acak panjang (dipakai Vercel untuk menjalankan tugas harian) |
| `POKOMEN_HARI_PERTAMA` | opsional, tanggal Hari ke-1, contoh `2026-10-24` |
| `IG_USERNAME` | opsional, `duniapokomen` (agar komentar balasanmu sendiri diabaikan) |

Lalu **Deployments → Redeploy** supaya variabel terbaca.

### 5. Aktifkan webhook (komentar masuk real-time)
1. Di aplikasi Meta → bagian **Configure webhooks**:
   - Callback URL: `https://DOMAIN-KAMU.vercel.app/api/webhook`
   - Verify token: sama persis dengan `IG_WEBHOOK_VERIFY_TOKEN`
   - Klik **Verify and save**, lalu langganan (subscribe) field **comments**.
2. Buka `https://DOMAIN-KAMU.vercel.app/admin.html`, masuk, klik **Aktifkan webhook**.
3. Jika Meta meminta aplikasi dalam mode **Live** agar webhook terkirim, isi URL kebijakan privasi dengan `https://DOMAIN-KAMU.vercel.app/privasi.html` lalu ubah ke Live.

Selama webhook belum jalan, tombol **Sinkron komentar sekarang** di Ruang Admin dan tugas harian otomatis (setiap 05.00 WIB) tetap menarik komentar dari 5 postingan terbaru.

### 6. Uji
Tulis komentar di postingan terbaru:
```
Nama: Bolu | Hewan: Kucing + Naga | Cerita: suka menghangatkan air mandi warga
```
Dalam beberapa detik (webhook) atau setelah klik Sinkron, Bolu muncul di peta.

---

## Format komentar yang diumumkan di video

| Tujuan | Contoh komentar |
|---|---|
| Daftar jadi warga | `Nama: Bolu \| Hewan: Kucing + Naga \| Cerita: suka menghangatkan air mandi warga` |
| Evolusi | `Cerita: hari ini Bolu belajar berenang di danau barat` |
| Usul fasilitas | `Usul: Kolam Minum` |

Komentar bebas seperti *"Namaku Bolu, kucing + naga, dia suka tidur di atap Balai Warga"* juga dicoba dibaca. Yang gagal terbaca masuk **Antrean komentar** di Ruang Admin untuk kamu lengkapi.

## Aturan evolusi (bisa diubah di `lib/rules.js`)

| Tier | Nama | Benefit | Cara naik |
|---|---|---|---|
| 1 | Regular | - | lahir |
| 2 | Pseudo-evo | tumbuh besar | cerita di postingan baru |
| 3 | Mega Evolution | elemen bangkit (aura, warna elemen) | cerita di postingan baru |
| 4 | Mythical Evolution | armor dasar | cerita di postingan baru |
| 5 | Legendary Evolution | outfit custom | Admin |
| 6 | God Mode | ganti wujud dasar (Mecha, Mecha Beast, Cyborg, Kristal, Roh Cahaya, Kaiju) | Admin |

- Satu postingan hanya memberi satu kenaikan tier per warga (anti spam).
- Saat mencapai Mega/Legendary/God Mode tanpa data elemen/outfit/wujud, server **membalas komentar pemiliknya**
  untuk bertanya. Pemilik menjawab dengan `Elemen: ...`, `Outfit: ...`, atau `Wujud Dewa: ...` (boleh ditulis lebih awal).
- Elemen, outfit, dan wujud bisa juga diisi/diubah Admin di tabel Warga.
- Usulan fasilitas diurutkan dari like terbanyak. Tandai **Dibangun** + nomor episode di Ruang Admin.
- Data lama (skema 4 tingkat) otomatis dipindahkan: Legenda lama menjadi Legendary Evolution.

## Dukungan Trakteer (opsional)
Tombol **Traktir Admin** dan **Papan Terima Kasih** di website. Traktiran **tidak memberi keuntungan apa pun di dalam game**: tidak ada evolusi atau status khusus.

1. Tambahkan Environment Variables di Vercel:
   - `TRAKTEER_URL` = alamat halaman Trakteer-mu, misalnya `https://trakteer.id/duniapokomen`
   - `TRAKTEER_WEBHOOK_TOKEN` = string acak panjang buatanmu
   Lalu Redeploy.
2. Di Trakteer: **Integrasi → Webhook**, isi URL:
   `https://DOMAIN-KAMU.vercel.app/api/trakteer?token=ISI_TRAKTEER_WEBHOOK_TOKEN`
   Klik **Send Webhook Test**, lalu nyalakan webhook.
   (Opsional: `TRAKTEER_UNIT_NAME` = nama satuan yang tampil di website. Bawaannya `Kopi Admin`.)
   (Opsional: kalau Trakteer menampilkan token webhook miliknya sendiri, simpan juga sebagai `TRAKTEER_HEADER_TOKEN`.)
3. Cek **Ruang Admin → Dukungan Trakteer**. Data mentah dari tes muncul di sana. Pesan pendukung yang tidak pantas bisa disembunyikan dengan menghapus centang **Tampil**.

## Wajib follow (opsional)
Instagram API tidak bisa mengecek follow dari komentar. Status follow baru bisa dicek setelah orangnya mengirim DM.
Alur saat aktif: komentar pendaftaran → server mengirim DM pribadi otomatis → penonton membalas (misal "LAHIR")
→ server mengecek `is_user_follow_business` → lahir, atau diminta follow dulu.

1. Instagram (aplikasi HP): **Pengaturan → Pesan dan balasan cerita → Kontrol pesan / Alat yang terhubung → Izinkan akses ke pesan** = AKTIF.
2. Meta App → Kasus penggunaan Instagram → Izin: tambahkan `instagram_business_manage_messages`.
3. Buat ulang access token (Generate token) agar izin baru ikut, lalu perbarui `IG_ACCESS_TOKEN` di Vercel (atau tempel di Ruang Admin → Token baru).
4. Meta App → Webhook: langganan field **messages** (selain comments).
5. Vercel: `REQUIRE_FOLLOW=1` (opsional `SITE_URL=dunia-pokomen.vercel.app`), lalu Redeploy.
6. Ruang Admin → **Aktifkan webhook** (sekarang berlangganan comments + messages).
Pendaftar yang belum membalas DM muncul di **Ruang Admin → Menunggu konfirmasi follow** dan bisa dilahirkan manual.
Batas Instagram: DM otomatis hanya bisa dikirim sekali per komentar, maksimal 7 hari setelah komentar dibuat.

## Gambar anime Kartu Warga (Gemini)
1. Ruang Admin → tabel **Warga** → **Salin prompt Gemini** (prompt otomatis dari nama, gabungan hewan, cerita, elemen, dan efek sesuai tingkat).
2. Tempel di gemini.google.com, unduh gambar hasilnya.
3. Klik **Unggah gambar** di baris warga yang sama. Gambar dipotong 3:2, dikompres, disimpan di database, dan langsung dipakai di Kartu Warga.
Kalau warga naik tingkat, salin prompt lagi agar efek visualnya ikut naik, lalu unggah ulang.

## Gambar hewan sendiri
Setiap warga otomatis mendapat sprite pixel yang dibentuk dari nama hewannya. Untuk warga istimewa (misalnya Legenda), unggah PNG buatanmu ke mana saja (misalnya folder `public/sprites/` lalu redeploy) dan isi kolom **Sprite URL** di Ruang Admin.

## Batasan yang perlu diketahui
- Paket Vercel gratis menjalankan cron **sekali sehari**. Webhook menangani komentar real-time.
- Peta punya ±940 titik tempat tinggal. Setelah penuh, warga baru berbagi titik. Titik bisa ditambah dengan mengekspor ulang `public/assets/world.json` dari generator dunia.
- Komentar TikTok tidak bisa dibaca otomatis. Masukkan lewat **Tambah warga manual**.
- Jumlah like per komentar diambil saat sinkron (`like_count`). Jika Instagram tidak mengirimkannya, isi manual di tabel usulan.

## Menjalankan di komputer sendiri
```
node dev-server.mjs      # buka http://localhost:3000 (data contoh, password admin: admin)
npm test                 # jalankan uji otomatis
```
Tambahkan `?demo=1` di alamat website untuk melihat mode contoh dengan 40 warga.
