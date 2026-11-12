// LIGA WILAYAH (16 Nov 2026): papan skor, absen "Hadir", klasemen, penyumbang teratas, panel Ketua
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const sec = $('ligaW'); if (!sec) return;
  const qs = new URLSearchParams(location.search);
  const LS = { get(k) { try { return localStorage.getItem(k); } catch { return null; } } };
  const TOKEN = () => qs.get('k') || LS.get('pokomen_k') || '';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const WCOL = { 1: '#e5533d', 2: '#3d8fd8', 3: '#3fae5a', 4: '#e8b923', 5: '#8f5ad8', 6: '#f08a2c' };
  let L = null, busy = false;
  const nmW = (n, nama) => `W${n}${nama ? ' · ' + nama : ''}`;
  const toast = (t) => { const el = $('lwToast'); if (!el) return; el.textContent = t; el.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => { el.hidden = true; }, 4200); };

  async function muat() {
    try { const k = TOKEN(); const r = await fetch('api/liga' + (k ? '?k=' + encodeURIComponent(k) : ''), { cache: 'no-store' }); L = await r.json(); } catch { return; }
    if (!L || L.error || L.tahap.kode === 'belum') { sec.hidden = true; return; }
    sec.hidden = false; render(); window.LigaWilayah && (window.LigaWilayah.data = L);
  }
  async function post(body) {
    const r = await fetch('api/liga', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: TOKEN(), ...body }) }); return r.json();
  }
  function status() {
    const t = L.tahap;
    if (t.kode === 'pemanasan') return '🔥 <b>PEMANASAN</b> · Liga dimulai <b>Senin 16 Nov</b>. Tekan Hadir setiap hari untuk membangun hari beruntun!';
    if (t.kode === 'liga') return `⚔️ <b>${esc(t.label)} dari 5</b> · Babak liga (menang 3, seri 1). Skor dihitung sampai 23.59 WIB, Duel Jagoan pukul ${L.jamJagoan}.00.`;
    if (t.kode === 'semifinal') return '🔥 <b>SEMIFINAL</b> · Peringkat 1 vs 4, 2 vs 3. Pemenang lanjut ke final besok!';
    if (t.kode === 'final') return '🏆 <b>FINAL</b> · Hari penentuan juara Liga Wilayah Musim 1!';
    return '🏁 <b>Musim 1 selesai.</b> Terima kasih semua wilayah!';
  }
  function kartuLaga(l) {
    const tot = Math.max(1, l.a.skor + l.b.skor), pa = Math.round(l.a.skor / tot * 100);
    const sisi = (x) => `<div class="lw-sisi"><b style="color:${WCOL[x.wil]}">${esc(nmW(x.wil, x.nama))}</b><span class="lw-skor">${x.skor}</span>
      <small>${x.aktif} warga aktif${x.buff ? ' · ☕ Semangat Kopi +5%' : ''}${x.taktik ? ' · ' + esc((L.taktik[x.taktik] || {}).label || '') : ''}</small>
      ${x.jagoan ? `<small>${x.jagoan.menangKah ? '🏅' : '🛡️'} Jagoan ${esc(x.jagoan.menangKah ? (x.jagoan.menang === x.jagoan.a ? x.jagoan.namaA : x.jagoan.namaB) : (x.jagoan.menang === x.jagoan.a ? x.jagoan.namaB : x.jagoan.namaA))}: +${x.jagoan.bonus}</small>` : ''}</div>`;
    return `<div class="lw-laga">${sisi(l.a)}<div class="lw-vs">VS</div>${sisi(l.b)}
      <div class="lw-bar"><i style="width:${pa}%;background:${WCOL[l.a.wil]}"></i><i style="width:${100 - pa}%;background:${WCOL[l.b.wil]}"></i></div></div>`;
  }
  function saya() {
    const s = L.saya;
    if (!TOKEN()) return '<p class="muted">🔑 Kirim <b>DM: TOKO</b> ke @duniapokomen untuk link pribadi, lalu buka lagi halaman ini untuk menekan <b>Hadir</b>.</p>';
    if (!s) return '<p class="muted">Link pribadimu tidak berlaku atau hewanmu belum lahir.</p>';
    let gap = '';
    if (L.hariIni) {
      const l = L.hariIni.laga.find((x) => x.a.wil === s.wil || x.b.wil === s.wil);
      if (l) { const me = l.a.wil === s.wil ? l.a : l.b, op = me === l.a ? l.b : l.a, d = op.skor - me.skor;
        gap = d >= 0 ? `<p class="lw-gap">Wilayahmu <b>kurang ${d + 1} poin</b> untuk menyalip ${esc(nmW(op.wil, op.nama))}!</p>` : `<p class="lw-gap ok">Wilayahmu unggul <b>${-d} poin</b> dari ${esc(nmW(op.wil, op.nama))}. Pertahankan!</p>`; }
    }
    return `<div class="lw-saya"><div><b>${esc(s.nama)}</b> · <span style="color:${WCOL[s.wil]}">Wilayah ${s.wil}</span><br>
      <small>Beruntun: <b>${s.streak} hari</b>${L.hariIni ? ` · poinmu hari ini: <b>${s.poinHariIni}</b>/${L.cap.orang}${s.kopiHariIni ? ` + ☕${s.kopiHariIni}` : ''}` : ''}</small></div>
      <button class="btn" type="button" id="lwHadir" ${s.hadirHariIni ? 'disabled' : ''}>${s.hadirHariIni ? '✅ Sudah hadir' : '🙋 Hadir untuk Wilayah'}</button></div>${gap}`;
  }
  function ketua() {
    if (!L.saya || !L.saya.ketua) return '';
    return `<details class="lw-ketua"><summary>👑 Panel Ketua: Jagoan & Taktik</summary>
      <p class="muted">Berlaku untuk hari ini sampai ${L.jamJagoan}.00 WIB (setelah itu untuk besok). Jagoan bertarung otomatis di Duel Jagoan pukul ${L.jamJagoan}.00 (menang +15). Kalau tidak dipilih, hewan terkuat wilayahmu yang maju.</p>
      <form id="lwKetuaF" class="tk-tantang" autocomplete="off"><input id="lwJagoan" placeholder="Nama jagoan (warga wilayahmu)">
      <select id="lwTaktik"><option value="">Taktik…</option>${Object.entries(L.taktik).map(([k, v]) => `<option value="${k}">${esc(v.label)} (${esc(v.ket)})</option>`).join('')}</select>
      <button class="btn" type="submit">Simpan</button></form></details>`;
  }
  function render() {
    const hi = L.hariIni ? `<h4>Laga hari ini</h4>${L.hariIni.laga.map(kartuLaga).join('')}` : '';
    const kl = L.tahap.d >= 0 || L.riwayat.length ? `<h4>Klasemen</h4><table class="lw-kl"><tr><th>#</th><th>Wilayah</th><th>M</th><th>S</th><th>K</th><th>Poin</th><th>Skor</th></tr>${L.klasemen.map((x, i) => `<tr><td>${i + 1}</td><td style="color:${WCOL[x.wil]}"><b>${esc(nmW(x.wil, x.nama))}</b></td><td>${x.menang}</td><td>${x.seri}</td><td>${x.kalah}</td><td><b>${x.poin}</b></td><td>${x.skor}</td></tr>`).join('')}</table>` : '';
    const top = L.hariIni ? `<details class="lw-top"><summary>⭐ Penyumbang poin teratas hari ini</summary>${L.hariIni.laga.flatMap((l) => [l.a, l.b]).map((x) => `<div><b style="color:${WCOL[x.wil]}">${esc(nmW(x.wil, x.nama))}</b>: ${x.top.length ? x.top.map((o) => `${esc(o.nama)} ${o.poin}${o.kopi ? '+☕' + o.kopi : ''}`).join(', ') : '<span class="muted">belum ada</span>'}</div>`).join('')}</details>` : '';
    const jd = `<details class="lw-jadwal"><summary>📅 Jadwal</summary>${L.jadwal.map((j) => `<div>${j.hari.slice(8)}/${j.hari.slice(5, 7)} · Hari ${j.d + 1}: ${j.laga.map(([a, b]) => `W${a} vs W${b}`).join(' · ')}</div>`).join('')}<div>21/11 · Semifinal (1 vs 4, 2 vs 3)</div><div>22/11 · Final</div></details>`;
    const cara = `<details class="lw-cara"><summary>❓ Cara mencetak poin untuk wilayahmu</summary><ul>
      <li>🙋 <b>Hadir</b> setiap hari: +1 (beruntun 3 hari +2, 5 hari +3)</li>
      <li>🏋️ <b>Latihan</b> di Tempat Latihan: +2 per sesi (maks. 3 sesi/hari)</li>
      <li>⚔️ <b>Duel Arena melawan warga wilayah lawan hari ini</b>: menang +5, kalah tetap +1</li>
      <li>📣 <b>Sorak</b> di Obrolan (Semua / wilayahmu): +1 per pesan (maks. 3/hari)</li>
      <li>☕ <b>Kopi Admin</b>: +10 per kopi + <b>Semangat Kopi</b> (skor wilayah +5% selama 24 jam)</li>
      <li>Skor wilayah = ${L.cap.top} penyumbang teratas (maks. ${L.cap.orang} poin/orang/hari) + kopi (maks. ${L.cap.kopi}) + Duel Jagoan</li></ul></details>`;
    const jr = L.juara ? `<div class="lw-juara">🏆 Juara: <b>W${L.juara.juara1}</b> · Juara 2: W${L.juara.juara2}${L.juara.juara3 ? ` · Juara 3: W${L.juara.juara3}` : ''}${L.juara.mvp ? ` · MVP: ${esc(L.juara.mvp.nama)}` : ''}</div>` : '';
    $('lwIsi').innerHTML = `<p class="lw-status">${status()}</p>${jr}${saya()}${hi}${kl}${top}${ketua()}${cara}${jd}<p id="lwToast" class="lw-toast" hidden></p>`;
    const b = $('lwHadir'); if (b) b.onclick = async () => { if (busy) return; busy = true; b.disabled = true; const r = await post({ aksi: 'hadir' }); busy = false; toast(r.error || r.pesan); await muat(); };
    const f = $('lwKetuaF'); if (f) f.onsubmit = async (e) => { e.preventDefault(); const r = await post({ aksi: 'ketua', jagoan: $('lwJagoan').value.trim() || undefined, taktik: $('lwTaktik').value || undefined }); toast(r.error || ('✅ ' + r.pesan)); await muat(); };
  }
  window.LigaWilayah = { muat, warna: WCOL, data: null };
  muat(); setInterval(() => { if (!document.hidden && !sec.hidden) muat(); }, 30000);
})();
