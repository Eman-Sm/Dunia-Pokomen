// Saran & Masukan warga → /api/saran (hanya dibaca Admin)
(function () {
  const f = document.getElementById('srForm'); if (!f) return;
  const $ = (id) => document.getElementById(id);
  let bintang = 0;
  const stars = [...f.querySelectorAll('.sr-stars button')];
  const gambar = () => stars.forEach((b) => { const on = Number(b.dataset.b) <= bintang; b.textContent = on ? '★' : '☆'; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  stars.forEach((b) => (b.onclick = () => { bintang = bintang === Number(b.dataset.b) ? 0 : Number(b.dataset.b); gambar(); }));
  try { const me = localStorage.getItem('pokomen_me'); if (me) $('srNama').value = '@' + me; } catch { /* ignore */ }
  const p = $('srPesan'); p.addEventListener('input', () => { $('srSisa').textContent = String(600 - p.value.length); });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = f.querySelector('.sr-kirim'); btn.disabled = true; $('srHasil').textContent = 'Mengirim…';
    try {
      const r = await fetch('api/saran', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: (f.querySelector('input[name=jenis]:checked') || {}).value, pesan: p.value, nama: $('srNama').value, bintang, web: $('srWeb').value, halaman: location.hash || '/' }) }).then((x) => x.json());
      if (r.error) { $('srHasil').textContent = '⚠️ ' + r.error; }
      else { $('srHasil').textContent = '💌 Terima kasih! Saranmu sudah sampai ke Admin. Admin membaca semua saran warga.'; p.value = ''; $('srSisa').textContent = '600'; bintang = 0; gambar(); }
    } catch { $('srHasil').textContent = '⚠️ Gagal mengirim, coba lagi sebentar ya.'; }
    btn.disabled = false;
  });
  // tombol melayang: sembunyikan saat bagian Saran sedang terlihat
  const fl = document.getElementById('srFloat'), sec = document.getElementById('saran');
  if (fl && sec && 'IntersectionObserver' in window) new IntersectionObserver(([en]) => { fl.classList.toggle('sembunyi', en.isIntersecting); }).observe(sec);
})();
