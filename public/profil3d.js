// ============================================================
//  PROFIL EVOLUSI 360° (11 Nov 2026)
//  Tubuh hewan diubah jadi model voxel (dari sprite Creature) yang bisa diputar 360°.
//  Setiap tingkat evolusi bisa dilihat: tingkat yang sudah dicapai tampil penuh,
//  tingkat berikutnya tampil sebagai siluet terkunci + syaratnya.
//  window.Profil3D.open(w, { tiers, benefits, batuSyarat })
// ============================================================
(function () {
  'use strict';
  const OL = [43, 27, 23];
  const ESC = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const UBAH = [
    'Bentuk dasar sesuai hewan pilihan pemiliknya.',
    'Tubuh tumbuh 1,3× lebih besar dan matanya mulai berkilau.',
    'Tubuh tergambar lebih detail; warna elemen menyala di matanya.',
    'Tubuh 1,5× lebih besar, armor di dada, tanduk mahkota, dan skill pertama.',
    'Sayap & jubah megah, nama berwarna emas, dan boleh punya 1 outfit custom.',
    'Lingkar emas di atas kepala, wujud baru, terbang bebas dan punya patung.',
  ];

  // ---------- voxelizer ----------
  const cache = new Map();
  function model(w, tier) {
    const key = w.u + '|' + tier + '|' + (w.pakaian ? JSON.stringify(w.pakaian) : '');
    if (cache.has(key)) return cache.get(key);
    const src = window.Creature.make({ ...w, tier, art: null });
    const grow = src.grow || 1, n = Math.min(64, Math.round(36 * grow));
    const c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = !!src.hd; g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, n, n);
    const d = g.getImageData(0, 0, n, n).data;
    const on = new Uint8Array(n * n), col = new Array(n * n);
    for (let i = 0; i < n * n; i++) if (d[i * 4 + 3] >= 110) { on[i] = 1; col[i] = [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]; }
    { const drop = []; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x; if (!on[i]) continue; const c = col[i]; if (c[0] + c[1] + c[2] >= 170) continue; const tepi = x === 0 || y === 0 || x === n - 1 || y === n - 1 || !on[i - 1] || !on[i + 1] || !on[i - n] || !on[i + n]; if (tepi) drop.push(i); } for (const i of drop) on[i] = 0; }
    // jarak ke tepi (chamfer) -> ketebalan tubuh
    const dist = new Float32Array(n * n); for (let i = 0; i < n * n; i++) dist[i] = on[i] ? 1e9 : 0;
    const pass = (xs, ys, nb) => { for (const y of ys) for (const x of xs) { const i = y * n + x; if (!on[i]) continue; for (const [dx, dy, wgt] of nb) { const X = x + dx, Y = y + dy; const v = X < 0 || Y < 0 || X >= n || Y >= n ? 0 : dist[Y * n + X]; if (v + wgt < dist[i]) dist[i] = v + wgt; } } };
    const R = [...Array(n).keys()], RR = [...R].reverse();
    pass(R, R, [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.4], [1, -1, 1.4]]);
    pass(RR, RR, [[1, 0, 1], [0, 1, 1], [1, 1, 1.4], [-1, 1, 1.4]]);
    const maxH = Math.max(3, Math.round(n * .24));
    const h = new Int8Array(n * n); for (let i = 0; i < n * n; i++) if (on[i]) h[i] = Math.max(1, Math.min(maxH, Math.round(dist[i] * .8)));
    // warna punggung: warna dominan di sekitar (fitur kecil seperti mata & mulut hilang)
    const cnt = new Map(); const ck = (p) => p[0] >> 5 << 6 | p[1] >> 5 << 3 | p[2] >> 5;
    const dark = (p) => p[0] + p[1] + p[2] < 170;
    for (let i = 0; i < n * n; i++) if (on[i] && !dark(col[i])) cnt.set(ck(col[i]), (cnt.get(ck(col[i])) || 0) + 1);
    const tot = [...cnt.values()].reduce((a, b) => a + b, 0) || 1;
    let dom = null, dv = -1; const rep = new Map();
    for (let i = 0; i < n * n; i++) if (on[i] && !dark(col[i])) { const k = ck(col[i]); if (!rep.has(k)) rep.set(k, col[i]); if (cnt.get(k) > dv) { dv = cnt.get(k); dom = col[i]; } }
    const back = new Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x; if (!on[i]) continue;
      const tepi = x === 0 || y === 0 || x === n - 1 || y === n - 1 || !on[i - 1] || !on[i + 1] || !on[i - n] || !on[i + n];
      if (dark(col[i]) && tepi) { back[i] = col[i]; continue; }
      const loc = new Map(); let best = null, bv = -1;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= n || Y >= n) continue; const j = Y * n + X; if (!on[j] || dark(col[j])) continue; const k = ck(col[j]); if ((cnt.get(k) || 0) / tot < .04) continue; const v = (loc.get(k) || 0) + 1; loc.set(k, v); if (v > bv) { bv = v; best = rep.get(k); } }
      back[i] = (best || dom || col[i]).map((v) => v * .9);
    }
    const vox = [];
    const cx = n / 2;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x; if (!on[i]) continue; const H = h[i];
      const nh = (X, Y) => (X < 0 || Y < 0 || X >= n || Y >= n ? 0 : h[Y * n + X]);
      for (let z = -H; z <= H; z++) {
        const az = Math.abs(z);
        const sideL = nh(x - 1, y) < az + 1 && az < H, sideR = nh(x + 1, y) < az + 1 && az < H, sideU = nh(x, y - 1) < az + 1 && az < H, sideD = nh(x, y + 1) < az + 1 && az < H;
        if (az !== H && !sideL && !sideR && !sideU && !sideD) continue;
        let c = z === H ? col[i] : z === -H ? back[i] : (z > 0 ? col[i] : back[i]).map((v) => v * .82);
        const nx = sideL ? -1 : sideR ? 1 : 0, nz = z === H ? 1 : z === -H ? -1 : 0;
        vox.push({ x: x - cx + .5, y, z: z * .9, c, nx, nz, ny: sideU ? -1 : sideD ? 1 : 0 });
      }
    }
    const m = { n, vox, grow };
    cache.set(key, m); return m;
  }

  function render(cv, m, ang, opt = {}) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    const n = m.n, Wd = Math.ceil(n * 1.7) + 4, Hd = n + 4, c0 = Wd / 2;
    const zb = new Float32Array(Wd * Hd).fill(-1e9), buf = new Uint8ClampedArray(Wd * Hd * 4);
    const c = Math.cos(ang), sn = Math.sin(ang), L = [-.55, -.35, .76];
    for (const v of m.vox) {
      const X = v.x * c + v.z * sn, D = -v.x * sn + v.z * c;
      const fx = c0 + X - .5, p0 = Math.floor(fx), py = v.y + 2;
      const nxr = v.nx * c + v.nz * sn, nzr = -v.nx * sn + v.nz * c;
      const k = .62 + .45 * Math.max(0, nxr * L[0] + v.ny * L[1] + nzr * L[2]);
      const col = opt.siluet ? [40 + k * 18, 30 + k * 14, 52 + k * 20] : [v.c[0] * k, v.c[1] * k, v.c[2] * k];
      for (const px of (fx - p0 < .25 ? [p0] : fx - p0 > .75 ? [p0 + 1] : [p0, p0 + 1])) {
        if (px < 0 || px >= Wd) continue;
        const j = py * Wd + px; if (D <= zb[j]) continue; zb[j] = D;
        buf[j * 4] = col[0]; buf[j * 4 + 1] = col[1]; buf[j * 4 + 2] = col[2]; buf[j * 4 + 3] = 255;
      }
    }
    // tambal lubang kecil akibat pembulatan rotasi
    for (let y = 1; y < Hd - 1; y++) for (let x = 1; x < Wd - 1; x++) {
      const j = y * Wd + x; if (buf[j * 4 + 3]) continue;
      const a = buf[(j - 1) * 4 + 3] && buf[(j + 1) * 4 + 3] ? [j - 1, j + 1] : buf[(j - Wd) * 4 + 3] && buf[(j + Wd) * 4 + 3] ? [j - Wd, j + Wd] : null;
      if (a) { for (let q = 0; q < 3; q++) buf[j * 4 + q] = (buf[a[0] * 4 + q] + buf[a[1] * 4 + q]) / 2; buf[j * 4 + 3] = 255; }
    }
    // garis tepi 1 piksel mengikuti siluet dari sudut pandang saat ini
    const out = new Uint8ClampedArray(buf);
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
      const j = y * Wd + x; if (buf[j * 4 + 3]) continue;
      if ((x > 0 && buf[(j - 1) * 4 + 3]) || (x < Wd - 1 && buf[(j + 1) * 4 + 3]) || (y > 0 && buf[(j - Wd) * 4 + 3]) || (y < Hd - 1 && buf[(j + Wd) * 4 + 3])) { out[j * 4] = OL[0]; out[j * 4 + 1] = OL[1]; out[j * 4 + 2] = OL[2]; out[j * 4 + 3] = 255; }
    }
    const off = document.createElement('canvas'); off.width = Wd; off.height = Hd; off.getContext('2d').putImageData(new ImageData(out, Wd, Hd), 0, 0);
    const s = opt.fit ? Math.max(1, Math.floor(Math.min(W / Wd * 1.25, H / Hd) * .95)) : Math.max(1, Math.floor(Math.min(W, H) * .9 / 58 * (opt.zoom || 1)));
    const ox = W / 2, oy = (opt.fit ? H * .99 : H * .84) - (n * .87 + 2) * s;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(ox, oy + (n * .87 + 2) * s, n * s * .3, n * s * .07, 0, 0, Math.PI * 2); g.fill();
    g.imageSmoothingEnabled = false; g.drawImage(off, Math.round(ox - Wd * s / 2), Math.round(oy), Wd * s, Hd * s);
  }

  // ---------- modal ----------
  let el = null, st = null;
  function ensure() {
    if (el) return el;
    el = document.createElement('div'); el.className = 'p3d-modal'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Profil Evolusi 360°');
    el.innerHTML = `<div class="p3d-box">
      <button class="btn ghost sq p3d-x" type="button" aria-label="Tutup">×</button>
      <div class="p3d-head"><h3 class="p3d-nama"></h3><span class="p3d-sub muted"></span></div>
      <div class="p3d-stage"><canvas width="360" height="360" class="p3d-cv" aria-label="Model 360°, geser untuk memutar"></canvas>
        <div class="p3d-hint">↔ geser untuk memutar 360°</div>
        <div class="p3d-ctl"><button class="btn ghost sq" type="button" data-r="-1" aria-label="Putar kiri">⟲</button><button class="btn ghost" type="button" data-auto>⏸ Putar</button><button class="btn ghost sq" type="button" data-r="1" aria-label="Putar kanan">⟳</button></div></div>
      <div class="p3d-tabs" role="tablist"></div>
      <div class="p3d-info"></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    el.querySelector('.p3d-x').onclick = close;
    document.addEventListener('keydown', (e) => { if (!el.hidden && e.key === 'Escape') close(); });
    const cv = el.querySelector('.p3d-cv');
    let drag = null;
    cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, a: st.ang }; st.auto = false; syncAuto(); cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (!drag) return; st.ang = drag.a + (e.clientX - drag.x) * .018; draw(); });
    const up = () => { drag = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    for (const b of el.querySelectorAll('[data-r]')) b.onclick = () => { st.auto = false; syncAuto(); spinTo(st.ang + Number(b.dataset.r) * Math.PI / 2); };
    el.querySelector('[data-auto]').onclick = () => { st.auto = !st.auto; syncAuto(); if (st.auto) loop(); };
    return el;
  }
  function syncAuto() { el.querySelector('[data-auto]').textContent = st.auto ? '⏸ Berhenti' : '▶ Putar'; }
  function spinTo(a) { const a0 = st.ang, t0 = performance.now(); const f = (t) => { const k = Math.min(1, (t - t0) / 350); st.ang = a0 + (a - a0) * (1 - (1 - k) ** 3); draw(); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
  function draw() { if (!st) return; const terkunci = st.tier > st.w.tier; render(el.querySelector('.p3d-cv'), model(st.w, st.tier), st.ang, { siluet: terkunci }); }
  function loop() { if (!st || !st.auto || el.hidden) return; st.ang += .014; draw(); requestAnimationFrame(loop); }
  function close() { if (el) el.hidden = true; st = null; }

  function info() {
    const { w, tier, o } = st, T = o.tiers, B = o.benefits || [];
    const cap = tier <= w.tier, cer = (w.cerita || [])[tier - 1];
    let syarat = '';
    if (!cap) {
      if (tier <= 3) syarat = 'Ceritakan kebiasaan unik hewanmu di komentar postingan baru. Setiap cerita = naik 1 tingkat.';
      else if (o.batuSyarat && o.batuSyarat[tier - 1]) syarat = `Butuh ${o.batuSyarat[tier - 1]} Batu Evolusi + 1 cerita baru (dari ${T[tier - 1]}).`;
      else syarat = 'Diberikan Admin kepada hewan yang sangat istimewa.';
    }
    el.querySelector('.p3d-info').innerHTML = `
      <div class="p3d-tname t${tier}">${cap ? '' : '🔒 '}${ESC(T[tier])}${tier === w.tier ? ' <span class="p3d-now">sekarang</span>' : ''}</div>
      <p><b>Perubahan tubuh:</b> ${ESC(UBAH[tier])}</p>
      ${B[tier] && B[tier] !== '-' ? `<p><b>Benefit:</b> ${ESC(B[tier])}</p>` : ''}
      ${tier >= 2 && w.elemen && cap ? `<p><b>Elemen:</b> ${ESC(w.elemen)}</p>` : ''}
      ${tier >= 3 && w.skill && cap ? `<p><b>Skill:</b> ${ESC(w.skill)}</p>` : ''}
      ${cap && cer ? `<p class="p3d-cer">“${ESC(cer)}”<br><span class="muted">cerita yang membuatnya berevolusi ke tingkat ini</span></p>` : ''}
      ${!cap ? `<p class="p3d-syarat">${ESC(syarat)}</p>` : ''}`;
  }
  function tabs() {
    const { w, o } = st; const box = el.querySelector('.p3d-tabs'); box.innerHTML = '';
    const max = Math.min(5, Math.max(w.tier + 1, 3));
    for (let i = 0; i <= max; i++) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'p3d-tab' + (i === st.tier ? ' on' : '') + (i > w.tier ? ' kunci' : ''); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(i === st.tier));
      const cv = document.createElement('canvas'); cv.width = cv.height = 72; render(cv, model(w, i), -.5, { siluet: i > w.tier, fit: true });
      const sm = document.createElement('small'); sm.textContent = (i > w.tier ? '🔒 ' : '') + o.tiers[i].replace(' Evolution', '');
      b.append(cv, sm); b.onclick = () => { st.tier = i; tabs(); info(); draw(); };
      box.appendChild(b);
    }
  }
  function open(w, o = {}) {
    ensure();
    o.tiers = o.tiers || ['Regular', 'Pseudo-evo', 'Mega Evolution', 'Mythical Evolution', 'Legendary Evolution', 'God Mode'];
    st = { w, o, tier: Math.max(0, Math.min(5, w.tier || 0)), ang: -.45, auto: true };
    el.querySelector('.p3d-nama').textContent = w.nama;
    el.querySelector('.p3d-sub').textContent = '@' + w.u + ' · ' + (w.hewan || []).join(' + ');
    el.hidden = false; syncAuto(); tabs(); info(); draw(); loop();
  }
  window.Profil3D = { open, model, render };
})();
