# Dunia Pokomen — Godot (pixel-art)

Proyek Godot 4.3 yang menggambar Dunia Pokomen dalam gaya **2D pixel-art** (resolusi asli 360×640,
diperbesar dengan skala bulat tanpa blur). Dipakai untuk dua hal:

## 1. Mode HD di website (`public/hd/`)
- `public/hd-bridge.js` mengambil `/api/dunia`, menggambar setiap hewan dengan `creature.js`, lalu
  memberikannya ke Godot lewat `window.POKO`. Klik hewan → kartu ringkas; cari nama; tombol ★ Hewanku.
- Ekspor ulang setelah mengubah proyek:
  `godot --headless --path godot --export-release "Web" ../public/hd/index.html`
  (butuh export template Web 4.3; preset sudah ada di `export_presets.cfg`, tanpa threads).

## 2. Video episode (Movie Maker)
1. Perbarui data: simpan `https://dunia-pokomen.vercel.app/api/dunia` sebagai `godot/data/dunia.json`,
   lalu `node godot/tools/sprites.cjs` (butuh Playwright) untuk membuat sprite.
2. Tulis skrip kamera di `godot/shots/NAMA.json` (lihat format di `scripts/Director.gd`, contoh `shots/showcase.json`).
3. Render frame pixel asli (360×640):
   `godot --path godot --fixed-fps 30 --write-movie out/f.png -- --shots=res://shots/NAMA.json`
4. Perbesar tanpa blur + gabung VO:
   `ffmpeg -framerate 30 -i out/f%08d.png -i vo.mp3 -vf scale=1080:1920:flags=neighbor -c:v libx264 -crf 18 -pix_fmt yuv420p -shortest video.mp4`

Di server tanpa layar: jalankan lewat `xvfb-run -a` dengan `--rendering-driver opengl3`.

Font: DejaVu Sans Bold (lisensi bebas, lihat `data/fonts/DejaVu-LICENSE.txt`).
