// Toko Pokomen (24 jam) · Tempat Latihan · Arena (07.00–21.00 WIB)
(() => {
  const $ = (id) => document.getElementById(id);
  const sec = $('toko'); if (!sec) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = { get(k) { try { return localStorage.getItem(k); } catch { return null; } } };
  const qs = new URLSearchParams(location.search);
  const TOKEN = () => qs.get('k') || LS.get('pokomen_k') || '';
  const LABEL = { nyawa: '❤️ Nyawa', serang: '⚔️ Serang', tahan: '🛡️ Tahan', cepat: '💨 Cepat' };
  const IKON = { batu: '💎', latihan: '🏋️', nama: '🏷️', rupa: '🐾', elemen: '🔥', kekuatan: '✨' };
  let T = null, AR = null, tab = 'toko', konfirm = null;

  async function get(path) { const r = await fetch(path, { cache: 'no-store' }); return r.json(); }
  async function post(path, body) { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: TOKEN(), ...body }) }); return r.json(); }
  function toast(m) { const t = $('toast'); if (!t) return; t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 3200); }
  const jam = (iso) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  async function muat() {
    const k = TOKEN() ? '?k=' + encodeURIComponent(TOKEN()) : '';
    try { [T, AR] = await Promise.all([get('api/toko' + k), get('api/arena' + k)]); } catch { return; }
    sec.hidden = !(T && T.buka);
    const nav = document.querySelector('a[href="#toko"]'); if (nav) nav.hidden = sec.hidden;
    if (!sec.hidden) render();
  }

  function dompet() {
    const s = T.saya;
    if (!s) return `<div class="tk-login">🔑 Mau belanja, berlatih, atau bertanding? Kirim <b>DM: TOKO</b> ke <a href="https://www.instagram.com/duniapokomen/" target="_blank" rel="noopener">@duniapokomen</a> untuk link pribadimu.</div>`;
    const D = (window.Pokomen && window.Pokomen.data && window.Pokomen.data()) || {};
    const bars = Object.keys(LABEL).map((k) => { const v = s.stat[k], mx = Math.max(v, (k === 'nyawa' ? 300 : 60)); return `<div class="tk-bar"><span>${LABEL[k]}</span><i><b style="width:${Math.round(v / mx * 100)}%"></b></i><em>${v}${s.stat.maks[k] ? ' · MAKS' : ''}</em></div>`; }).join('');
    return `<div class="tk-dompet">
      <div class="tk-saldo"><small>Biji Kopi ${esc(s.nama)}</small><b>${s.saldo.biji}</b><span>☕ 1 Kopi Admin = 5 Biji</span>${D.trakteer ? `<a class="btn traktir" href="${esc(D.trakteer)}" target="_blank" rel="noopener">Tambah Biji Kopi</a>` : ''}</div>
      <div class="tk-batu"><small>Batu Evolusi</small><b>💎 ${s.batu}</b>${s.syaratBatu ? `<span>butuh ${s.syaratBatu} + cerita untuk naik tingkat</span>` : ''}</div>
      <div class="tk-stat"><small>Statistik · Kekuatan ${s.stat.kuat}</small>${bars}</div>
    </div>`;
  }

  function tokoTab() {
    return `<div class="tk-grid">${T.katalog.filter((x) => x.id !== 'latihan').map((x) => `
      <div class="tk-item"><div class="ik">${IKON[x.id] || '🎁'}</div><b>${esc(x.label)}</b><span>${esc(x.ket)}</span>
        <div class="harga">${x.biji} Biji</div>
        ${['nama', 'rupa', 'elemen', 'kekuatan'].includes(x.id) ? `<input class="tk-nilai" data-for="${x.id}" maxlength="60" placeholder="${{ nama: 'Nama baru', rupa: 'mis. Kucing + Naga', elemen: 'mis. Petir', kekuatan: 'Skill baru' }[x.id]}">` : ''}
        <button class="btn tk-beli" type="button" data-item="${x.id}" ${T.saya ? '' : 'disabled'}>${konfirm === x.id ? 'Yakin? Tekan lagi' : 'Beli'}</button></div>`).join('')}
      <div class="tk-item segera"><div class="ik">👕</div><b>Outfit</b><span>Baju & aksesori untuk hewanmu</span><div class="harga">Segera</div></div></div>`;
  }

  function latihanTab() {
    const L = T.latihan, s = T.saya;
    const ke = s ? s.stat.latihKe : 0, lagi = L.superTiap - (ke % L.superTiap);
    return `<p class="tk-info">🏋️ Satu sesi latihan = <b>${L.harga} Biji Kopi</b>. Setiap sesi ke-${L.superTiap} jadi <b>LATIHAN SUPER (2x)!</b>${s ? ` <span class="tk-super">${lagi === L.superTiap ? 'Sesi berikutnya: biasa' : `${lagi} sesi lagi menuju Latihan Super`}</span>` : ''}</p>
      <div class="tk-latih">${Object.keys(LABEL).map((k) => `<button class="btn tk-latih-btn" type="button" data-stat="${k}" ${s && !s.stat.maks[k] ? '' : 'disabled'}>${LABEL[k]}<small>+${L.naik[k]} per sesi${s && s.stat.maks[k] ? ' · maksimal' : ''}</small></button>`).join('')}</div>
      <p class="muted">Batas latihan naik setiap hewanmu berevolusi. Semua hewan dengan tingkat sama mulai dari statistik yang sama.</p>`;
  }

  function duelHTML(d) {
    const W = d.menang === d.a ? d.namaA : d.namaB;
    return `<details class="tk-duel"><summary><b>${esc(d.namaA)}</b> vs <b>${esc(d.namaB)}</b> · 🏆 ${esc(W)} <time>${jam(d.t)}</time></summary>${d.gerak ? `<button class="btn tk-replay" type="button" data-id="${esc(d.id)}">▶ Tonton replay</button>` : ''}<ol>${d.catatan.map((c) => `<li>${esc(c)}</li>`).join('')}</ol></details>`;
  }
  function arenaTab() {
    const A = AR || {}; const me = A.saya;
    const masuk = me ? me.tantangan.filter((t) => t.ke === me.u) : [], keluar = me ? me.tantangan.filter((t) => t.dari === me.u) : [];
    const D = (window.Pokomen && window.Pokomen.data && window.Pokomen.data()) || {};
    const nama = (u) => ((D.warga || []).find((w) => w.u === u) || {}).nama || u;
    return `<p class="tk-info">${A.buka ? '🟢 Arena <b>BUKA</b>' : '🔴 Arena <b>TUTUP</b>'} · setiap hari pukul ${String(A.jam?.[0] ?? 7).padStart(2, '0')}.00–${A.jam?.[1] ?? 21}.00 WIB · maks. 5 tantangan per hari · juara mingguan dapat <b>💎 1 Batu Evolusi</b></p>
      ${masuk.length ? `<div class="tk-masuk"><b>⚔️ Kamu ditantang!</b>${masuk.map((t) => `<div><span>${esc(t.namaDari)} menantang ${esc(t.namaKe)} · sampai ${jam(t.sampai)}</span><button class="btn tk-terima" type="button" data-id="${esc(t.id)}">Terima & bertarung</button><button class="btn ghost tk-tolak" type="button" data-id="${esc(t.id)}">Tolak</button></div>`).join('')}</div>` : ''}
      ${keluar.length ? `<p class="muted">Menunggu jawaban: ${keluar.map((t) => esc(t.namaKe)).join(', ')}</p>` : ''}
      ${me ? `<form class="tk-tantang" id="tkTantang" autocomplete="off"><input id="tkLawan" placeholder="Nama hewan lawan" maxlength="40" required><button class="btn" type="submit" ${A.buka ? '' : 'disabled'}>⚔️ Tantang</button></form>` : '<p class="muted">Bisa juga lewat komentar: <code>Tantang: nama hewan</code> lalu lawan membalas <code>Terima: nama penantang</code>.</p>'}
      <div class="tk-kolom"><div><h4>🏆 Klasemen minggu ini</h4><ol class="tk-klas">${(A.klasemen || []).map((k) => `<li><b>${esc(nama(k.u))}</b><span>${k.menang} menang · ${k.main} duel</span></li>`).join('') || '<li class="muted">Belum ada duel minggu ini.</li>'}</ol></div>
      <div><h4>⚔️ Duel terbaru</h4>${(A.duel || []).map(duelHTML).join('') || '<p class="muted">Belum ada duel.</p>'}</div></div>`;
  }

  function render() {
    $('tkDompet').innerHTML = dompet();
    for (const b of sec.querySelectorAll('.tk-tabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
    $('tkIsi').innerHTML = tab === 'toko' ? tokoTab() : tab === 'latihan' ? latihanTab() : arenaTab();
    for (const b of sec.querySelectorAll('.tk-beli')) b.onclick = () => beli(b.dataset.item);
    for (const b of sec.querySelectorAll('.tk-latih-btn')) b.onclick = () => latih(b.dataset.stat, b);
    for (const b of sec.querySelectorAll('.tk-terima')) b.onclick = () => arena('terima', { id: b.dataset.id }, b);
    for (const b of sec.querySelectorAll('.tk-tolak')) b.onclick = () => arena('tolak', { id: b.dataset.id }, b);
    for (const b of sec.querySelectorAll('.tk-replay')) b.onclick = () => bukaReplay(b.dataset.id);
    const f = $('tkTantang'); if (f) f.onsubmit = (e) => { e.preventDefault(); arena('tantang', { lawan: $('tkLawan').value }, f.querySelector('button')); };
  }

  async function beli(item) {
    if (konfirm !== item) { konfirm = item; render(); setTimeout(() => { if (konfirm === item) { konfirm = null; render(); } }, 4000); return; }
    konfirm = null;
    const inp = sec.querySelector(`.tk-nilai[data-for="${item}"]`);
    const r = await post('api/toko', { item, nilai: inp ? inp.value : undefined });
    if (r.error) { toast(r.error); render(); return; }
    toast(r.pesan || 'Berhasil!'); T.saya = r.saya; render();
    if (window.Pokomen && window.Pokomen.reload) window.Pokomen.reload();
  }
  async function latih(stat, btn) {
    btn.disabled = true;
    const r = await post('api/toko', { item: 'latihan', stat });
    if (r.error) toast(r.error); else { toast(r.pesan); T.saya = r.saya; }
    render();
  }
  async function arena(aksi, body, btn) {
    if (btn) btn.disabled = true;
    const r = await post('api/arena', { aksi, ...body });
    if (r.error) toast(r.error);
    else if (aksi === 'tantang') toast(`Tantangan untuk ${r.tantangan.namaKe} terkirim! Tunggu dia menerima (2 jam).`);
    else if (aksi === 'terima') { bukaReplay(r.duel.id, r.duel); }
    await muat();
  }

  // ================= REPLAY DUEL (bisa dibagikan: ?duel=<id>) =================
  let RP = null;
  function sprite(u, nama) {
    const D = (window.Pokomen && window.Pokomen.data && window.Pokomen.data()) || {};
    const w = (D.warga || []).find((x) => x.u === u);
    try { return window.Creature.make(w || { u, nama, hewan: ['Kucing'], tier: 0 }); } catch { return null; }
  }
  async function bukaReplay(id, duel) {
    let d = duel;
    if (!d) { try { const r = await get('api/arena?duel=' + encodeURIComponent(id)); if (r.error) { toast(r.error); return; } d = r.duel; } catch { return; } }
    tutupReplay();
    const el = document.createElement('div'); el.className = 'rp-modal'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Replay duel');
    el.innerHTML = `<div class="rp-box"><div class="rp-head"><b>⚔️ ${esc(d.namaA)} vs ${esc(d.namaB)}</b><button class="btn ghost sq rp-x" type="button" aria-label="Tutup">×</button></div>
      <canvas class="rp-cv" width="720" height="560"></canvas>
      <div class="rp-tools"><button class="btn rp-ulang" type="button">▶ Putar ulang</button><button class="btn ghost rp-cepat" type="button">⏩ 1x</button><button class="btn ghost rp-link" type="button">🔗 Salin link</button></div>
      <div class="rp-flow"><b>🎬 Prompt Google Flow (YouTube)</b><div><button class="btn ghost rp-p" type="button" data-r="9:16">Shorts 9:16</button><button class="btn ghost rp-p" type="button" data-r="16:9">Video 16:9</button></div><textarea class="rp-teks" rows="5" readonly placeholder="Tekan salah satu tombol di atas, prompt langsung tersalin."></textarea></div></div>`;
    document.body.appendChild(el);
    const cv = el.querySelector('.rp-cv'), ctx = cv.getContext('2d');
    RP = { el, d, cv, ctx, t0: performance.now(), cepat: 1, spA: sprite(d.a, d.namaA), spB: sprite(d.b, d.namaB), raf: 0 };
    el.querySelector('.rp-x').onclick = tutupReplay;
    el.onclick = (e) => { if (e.target === el) tutupReplay(); };
    el.querySelector('.rp-ulang').onclick = () => { RP.t0 = performance.now(); };
    el.querySelector('.rp-cepat').onclick = (e) => { RP.cepat = RP.cepat === 1 ? 2 : 1; e.target.textContent = `⏩ ${RP.cepat}x`; RP.t0 = performance.now(); };
    el.querySelector('.rp-link').onclick = async () => { const url = `${location.origin}/?duel=${encodeURIComponent(d.id)}#toko`; try { await navigator.clipboard.writeText(url); toast('Link replay tersalin! Bagikan ke temanmu.'); } catch { toast(url); } };
    for (const b of el.querySelectorAll('.rp-p')) b.onclick = async () => {
      const ta = el.querySelector('.rp-teks'); ta.value = 'Membuat prompt…';
      try { const r = await get(`api/arena?duel=${encodeURIComponent(d.id)}&prompt=${encodeURIComponent(b.dataset.r)}`); ta.value = r.prompt || r.error || ''; ta.rows = 12; try { await navigator.clipboard.writeText(ta.value); toast('Prompt Google Flow tersalin!'); } catch { /* tetap tampil di kotak */ } } catch { ta.value = 'Gagal memuat prompt.'; }
    };
    document.addEventListener('keydown', escTutup);
    loop();
  }
  function escTutup(e) { if (e.key === 'Escape') tutupReplay(); }
  function tutupReplay() { if (!RP) return; cancelAnimationFrame(RP.raf); RP.el.remove(); RP = null; document.removeEventListener('keydown', escTutup); }

  const INTRO = 1.4, LANGKAH = .95, OUTRO = 2.6;
  function loop() {
    if (!RP) return;
    RP.raf = requestAnimationFrame(loop);
    const { d, cv, ctx } = RP; const W = cv.width, H = cv.height;
    const t = (performance.now() - RP.t0) / 1000 * RP.cepat;
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    const G = d.gerak || [];
    const idx = Math.floor((t - INTRO) / LANGKAH), fase = ((t - INTRO) % LANGKAH) / LANGKAH;
    const selesai = t > INTRO + G.length * LANGKAH;
    // nyawa saat ini
    const N = [d.nyawa[d.a], d.nyawa[d.b]];
    let hp = [N[0], N[1]];
    for (let i = 0; i < G.length && i < idx + (fase > .45 ? 1 : 0); i++) hp = G[i].hp;
    if (selesai) hp = [d.sisa[d.a], d.sisa[d.b]];
    // arena
    ctx.fillStyle = '#7cc46a'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#5c9a4c'; for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % W, 70 + (i * 53) % 60, 6, 6);
    ctx.fillStyle = '#6b4a2e'; ctx.fillRect(0, 100, W, 18); ctx.fillStyle = '#8a6040'; ctx.fillRect(0, 100, W, 5);
    for (let i = 0; i < 18; i++) { const x = 20 + i * 40, bob = Math.sin(t * 6 + i) * 3; ctx.fillStyle = ['#ffcd32', '#5aaaff', '#6ec85a', '#ff8a8a', '#c9a0ff'][i % 5]; ctx.fillRect(x, 78 + bob, 16, 16); ctx.fillStyle = '#2b1b17'; ctx.fillRect(x + 4, 83 + bob, 2, 2); ctx.fillRect(x + 10, 83 + bob, 2, 2); }
    ctx.fillStyle = '#b9b2a2'; ctx.beginPath(); ctx.ellipse(W / 2, 380, 330, 120, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a8476'; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = '#a49d8d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(W / 2, 380, 120, 44, 0, 0, Math.PI * 2); ctx.stroke();
    // posisi petarung
    let xA = 200, xB = 520; const y = 400;
    let shake = 0, teks = null, dmgTeks = null, jurusTeks = null;
    if (idx >= 0 && !selesai) {
      const g = G[idx]; const penyerangA = g.p === d.a;
      const maju = fase < .45 ? Math.sin(fase / .45 * Math.PI / 2) : Math.cos((fase - .45) / .55 * Math.PI / 2);
      if (penyerangA) xA += maju * 200; else xB -= maju * 200;
      if (g.hindar && fase > .3) { if (penyerangA) xB += Math.sin((fase - .3) / .7 * Math.PI) * 70; else xA -= Math.sin((fase - .3) / .7 * Math.PI) * 70; teks = 'MENGHINDAR!'; }
      if (!g.hindar && fase > .42) { dmgTeks = { x: penyerangA ? xB : xA, v: '-' + g.dmg, k: (fase - .42) / .58 }; if (g.kritis) { teks = 'KRITIS!'; shake = (1 - fase) * 10; } }
      if (g.jurus && fase < .8) jurusTeks = { x: penyerangA ? xA : xB, v: g.jurus };
    }
    ctx.save(); ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    const gambar = (sp, x, flip, kalah, flash) => {
      if (!sp) return; const s = 150 / Math.max(sp.width, sp.height); const w = sp.width * s, h = sp.height * s;
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 52, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); if (kalah) { ctx.rotate(flip ? -1.3 : 1.3); ctx.globalAlpha = .75; }
      ctx.imageSmoothingEnabled = !!sp.hd; ctx.drawImage(sp, -w / 2, -h * .86, w, h);
      if (flash) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .6; ctx.drawImage(sp, -w / 2, -h * .86, w, h); }
      ctx.restore();
    };
    const kenaA = idx >= 0 && !selesai && G[idx] && !G[idx].hindar && G[idx].l === d.a && fase > .42 && fase < .6;
    const kenaB = idx >= 0 && !selesai && G[idx] && !G[idx].hindar && G[idx].l === d.b && fase > .42 && fase < .6;
    const lompat = selesai ? Math.abs(Math.sin(t * 6)) * 30 : 0;
    ctx.save(); if (selesai && d.menang === d.a) ctx.translate(0, -lompat); gambar(RP.spA, xA, false, selesai && d.menang !== d.a, kenaA); ctx.restore();
    ctx.save(); if (selesai && d.menang === d.b) ctx.translate(0, -lompat); gambar(RP.spB, xB, true, selesai && d.menang !== d.b, kenaB); ctx.restore();
    ctx.restore();
    // HP bar
    const bar = (x, nama, v, max, kanan) => {
      const w = 300, h = 20, x0 = kanan ? x - w : x;
      ctx.fillStyle = '#2b1b17'; ctx.fillRect(x0 - 3, 14, w + 6, h + 30);
      ctx.fillStyle = '#fffaee'; ctx.font = '700 22px "Pixelify Sans", monospace'; ctx.textAlign = kanan ? 'right' : 'left'; ctx.fillText(nama, kanan ? x : x0 + 2, 34);
      ctx.fillStyle = '#5a2a2a'; ctx.fillRect(x0, 38, w, h); const p = Math.max(0, v / max);
      ctx.fillStyle = p > .5 ? '#6ec85a' : p > .25 ? '#ffcd32' : '#e04a3a'; ctx.fillRect(kanan ? x0 + w * (1 - p) : x0, 38, w * p, h);
      ctx.fillStyle = '#fffaee'; ctx.font = '700 17px "Pixelify Sans", monospace'; ctx.fillText(`${Math.round(v)}/${max}`, kanan ? x - 4 : x0 + 4, 54);
    };
    bar(18, d.namaA, hp[0], N[0], false); bar(W - 18, d.namaB, hp[1], N[1], true);
    ctx.textAlign = 'center';
    const besar = (s, yy, warna, ukuran) => { ctx.font = `700 ${ukuran}px "Pixelify Sans", monospace`; ctx.lineWidth = 8; ctx.strokeStyle = '#2b1b17'; ctx.strokeText(s, W / 2, yy); ctx.fillStyle = warna; ctx.fillText(s, W / 2, yy); };
    if (t < INTRO) { const k = Math.min(1, t / .5); besar('VS', 200, '#ffd23f', 40 + 60 * k); besar('ARENA POKOMEN', 140, '#fffaee', 26); }
    else if (selesai) { const W_ = d.menang === d.a ? d.namaA : d.namaB; besar(`🏆 ${W_} MENANG!`, 170, '#ffd23f', 40); besar(`${d.ronde} ronde`, 210, '#fffaee', 20);
      for (let i = 0; i < 30; i++) { const ph = ((t * .5 + i * .37) % 1); ctx.fillStyle = ['#ffd23f', '#ff6b6b', '#5aaaff', '#6ec85a'][i % 4]; ctx.fillRect((i * 151) % W, ph * H, 8, 12); } }
    else { besar(`RONDE ${G[idx] ? G[idx].r : 1}`, 110, '#fffaee', 18); if (teks) besar(teks, 190, teks === 'KRITIS!' ? '#ff5a3a' : '#9fd0ff', 44); }
    if (jurusTeks) { ctx.font = '700 18px "Pixelify Sans", monospace'; const w = ctx.measureText(jurusTeks.v).width + 20; ctx.fillStyle = '#2b1b17'; ctx.fillRect(jurusTeks.x - w / 2, 440, w, 30); ctx.fillStyle = '#ffd23f'; ctx.fillText(jurusTeks.v, jurusTeks.x, 462); }
    if (dmgTeks) { ctx.globalAlpha = 1 - dmgTeks.k; ctx.font = '700 34px "Pixelify Sans", monospace'; ctx.lineWidth = 6; ctx.strokeStyle = '#2b1b17'; ctx.strokeText(dmgTeks.v, dmgTeks.x, 300 - dmgTeks.k * 60); ctx.fillStyle = '#ff5a3a'; ctx.fillText(dmgTeks.v, dmgTeks.x, 300 - dmgTeks.k * 60); ctx.globalAlpha = 1; }
    ctx.textAlign = 'start';
    if (t > INTRO + G.length * LANGKAH + OUTRO + 3) RP.t0 = performance.now() - (INTRO + G.length * LANGKAH) * 1000 / RP.cepat; // tetap di layar kemenangan
  }

  for (const b of sec.querySelectorAll('.tk-tabs button')) b.onclick = () => { tab = b.dataset.tab; render(); };
  if (qs.get('duel')) { tab = 'arena'; setTimeout(() => bukaReplay(qs.get('duel')), 900); }
  if (location.hash === '#toko') tab = 'toko';
  muat();
  setInterval(() => { if (!document.hidden && !sec.hidden && tab === 'arena') muat(); }, 30000);
})();
