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

  // ---------- voxelizer (resolusi tinggi, permukaan membulat) ----------
  const K = 2.6; // voxel per piksel peta
  const cache = new Map();
  function model(w, tier) {
    const key = w.u + '|' + tier + '|' + (w.pakaian ? JSON.stringify(w.pakaian) : '');
    if (cache.has(key)) return cache.get(key);
    const src = window.Creature.make({ ...w, tier, art: null }, { hd: true, res: 5 });
    const grow = src.grow || 1, n = Math.min(132, Math.round(36 * grow * K));
    const c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, n, n);
    const d = g.getImageData(0, 0, n, n).data;
    const on = new Uint8Array(n * n), col = new Array(n * n);
    for (let i = 0; i < n * n; i++) if (d[i * 4 + 3] >= 120) { on[i] = 1; col[i] = [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]; }
    const dark = (p) => p[0] + p[1] + p[2] < 170;
    // garis tepi bawaan sprite dibuang dari volume (digambar ulang mengikuti sudut pandang)
    for (let pass = 0; pass < 2; pass++) {
      const drop = [];
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x; if (!on[i] || !dark(col[i])) continue; if (x === 0 || y === 0 || x === n - 1 || y === n - 1 || !on[i - 1] || !on[i + 1] || !on[i - n] || !on[i + n]) drop.push(i); }
      for (const i of drop) on[i] = 0;
    }
    // jarak ke tepi -> ketebalan membulat (penampang seperti elips)
    const dist = new Float32Array(n * n); for (let i = 0; i < n * n; i++) dist[i] = on[i] ? 1e9 : 0;
    const R = [...Array(n).keys()], RR = [...R].reverse();
    const pass = (ys, xs, nb) => { for (const y of ys) for (const x of xs) { const i = y * n + x; if (!on[i]) continue; for (const [dx, dy, wg] of nb) { const X = x + dx, Y = y + dy; const v = X < 0 || Y < 0 || X >= n || Y >= n ? 0 : dist[Y * n + X]; if (v + wg < dist[i]) dist[i] = v + wg; } } };
    pass(R, R, [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.41], [1, -1, 1.41]]);
    pass(RR, RR, [[1, 0, 1], [0, 1, 1], [1, 1, 1.41], [-1, 1, 1.41]]);
    const maxH = n * .2;
    const hf = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) if (on[i]) { const r = Math.min(dist[i], maxH * 1.25); hf[i] = Math.min(maxH, Math.sqrt(Math.max(0, 2 * maxH * 1.25 * r - r * r)) * .8) + .6; }
    // sayap, ekor & jubah yang menjulur ke samping dibuat tipis (bukan bantal)
    {
      const cnt2 = new Map(), rep2 = new Map();
      for (let y = Math.round(n * .45); y < Math.round(n * .8); y++) for (let x = Math.round(n * .38); x < Math.round(n * .62); x++) { const i = y * n + x; if (!on[i] || dark(col[i])) continue; const k = col[i][0] >> 5 << 6 | col[i][1] >> 5 << 3 | col[i][2] >> 5; cnt2.set(k, (cnt2.get(k) || 0) + 1); if (!rep2.has(k)) rep2.set(k, col[i]); }
      let bk = null, bv = -1; for (const [k, v] of cnt2) if (v > bv) { bv = v; bk = k; }
      const bc = bk != null ? rep2.get(bk) : null;
      if (bc) {
        const isB = (c) => Math.abs(c[0] - bc[0]) + Math.abs(c[1] - bc[1]) + Math.abs(c[2] - bc[2]) < 95;
        const MN = new Int16Array(n).fill(n), MX = new Int16Array(n).fill(-1);
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x; if (on[i] && isB(col[i])) { MN[y] = Math.min(MN[y], x); MX[y] = Math.max(MX[y], x); } }
        const win = Math.max(2, Math.round(n * .08)), pad = Math.round(n * .03);
        for (let y = 0; y < n; y++) {
          let mn = n, mx = -1;
          for (let yy = Math.max(0, y - win); yy <= Math.min(n - 1, y + win); yy++) if (MX[yy] >= 0) { mn = Math.min(mn, MN[yy]); mx = Math.max(mx, MX[yy]); }
          if (mx < 0) continue;
          for (let x = 0; x < n; x++) {
            const i = y * n + x; if (!on[i]) continue;
            if ((x < mn - pad || x > mx + pad) && !isB(col[i])) hf[i] = Math.min(hf[i], Math.max(1.2, n * .022));
          }
        }
      }
    }
    // haluskan medan ketebalan
    const hs = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x; if (!on[i]) continue; let s_ = 0, k_ = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= n || Y >= n) continue; const j = Y * n + X; s_ += on[j] ? hf[j] : 0; k_++; } hs[i] = Math.max(.6, s_ / k_); }
    const h = new Int16Array(n * n); for (let i = 0; i < n * n; i++) if (on[i]) h[i] = Math.max(1, Math.round(hs[i]));
    // warna punggung: warna dominan di sekitar (mata, mulut, perisai di dada tidak ikut ke belakang)
    const ck = (p) => p[0] >> 5 << 6 | p[1] >> 5 << 3 | p[2] >> 5;
    const cnt = new Map(), rep = new Map(); let tot = 0;
    for (let i = 0; i < n * n; i++) if (on[i] && !dark(col[i])) { const k = ck(col[i]); cnt.set(k, (cnt.get(k) || 0) + 1); if (!rep.has(k)) rep.set(k, col[i]); tot++; }
    let dom = null, dv = -1; for (const [k, v] of cnt) if (v > dv) { dv = v; dom = rep.get(k); }
    const rad = Math.max(3, Math.round(n / 14)), back = new Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x; if (!on[i]) continue;
      const loc = new Map(); let best = null, bv = -1;
      for (let dy = -rad; dy <= rad; dy += 2) for (let dx = -rad; dx <= rad; dx += 2) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= n || Y >= n) continue; const j = Y * n + X; if (!on[j] || dark(col[j])) continue; const k = ck(col[j]); if ((cnt.get(k) || 0) / tot < .05) continue; const v = (loc.get(k) || 0) + 1; loc.set(k, v); if (v > bv) { bv = v; best = k; } }
      const base = best != null ? rep.get(best) : dom || col[i];
      back[i] = [(base[0] * 7 + col[i][0]) / 8 * .92, (base[1] * 7 + col[i][1]) / 8 * .92, (base[2] * 7 + col[i][2]) / 8 * .92];
      if (dark(col[i])) back[i] = base.map((v) => v * .9);
    }
    // dinding samping garis gelap di dalam tubuh memakai warna tetangganya (tidak jadi belang hitam saat diputar)
    const sideC = new Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x; if (!on[i]) continue; if (!dark(col[i])) { sideC[i] = col[i]; continue; }
      let f = null; for (let r = 1; r <= 4 && !f; r++) for (let dy = -r; dy <= r && !f; dy++) for (let dx = -r; dx <= r && !f; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= n || Y >= n) continue; const j = Y * n + X; if (on[j] && !dark(col[j])) f = col[j]; }
      sideC[i] = f || col[i];
    }
    // normal permukaan dari kemiringan ketebalan -> bayangan membulat
    const vox = [], cx = n / 2;
    const nh = (X, Y) => (X < 0 || Y < 0 || X >= n || Y >= n ? 0 : h[Y * n + X]);
    const hv = (X, Y) => (X < 0 || Y < 0 || X >= n || Y >= n ? 0 : hs[Y * n + X]);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x; if (!on[i]) continue; const H = h[i];
      const gx = (hv(x + 1, y) - hv(x - 1, y)) / 2, gy = (hv(x, y + 1) - hv(x, y - 1)) / 2;
      const ln = Math.hypot(gx, gy, 1);
      for (let z = -H; z <= H; z++) {
        const az = Math.abs(z), cap = az === H;
        if (!cap && nh(x - 1, y) > az && nh(x + 1, y) > az && nh(x, y - 1) > az && nh(x, y + 1) > az) continue;
        const front = z > 0;
        let N;
        const rimP = !on[i - 1] || !on[i + 1] || !on[i - n] || !on[i + n] || x === 0 || x === n - 1;
        if (cap || !rimP) N = [-gx / ln, -gy / ln, (front ? 1 : -1) / ln];
        else { const sx = (nh(x + 1, y) <= az ? 1 : 0) - (nh(x - 1, y) <= az ? 1 : 0), sy = (nh(x, y + 1) <= az ? 1 : 0) - (nh(x, y - 1) <= az ? 1 : 0), l2 = Math.hypot(sx, sy, .3) || 1; N = [sx / l2, sy / l2, (front ? .3 : -.3) / l2]; }
        vox.push({ x: x - cx + .5, y, z: z, c: (front || (z === 0 && cap)) ? (cap ? col[i] : sideC[i]) : back[i], N });
      }
    }
    const m = { n, vox, grow };
    cache.set(key, m); return m;
  }

  function render(cv, m, ang, opt = {}) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    const n = m.n, Wd = Math.ceil(n * 1.6) + 8, Hd = n + 8, c0 = Wd / 2;
    const zb = new Float32Array(Wd * Hd).fill(-1e9), buf = new Uint8ClampedArray(Wd * Hd * 4);
    const c = Math.cos(ang), sn = Math.sin(ang);
    const L = [-.45, -.55, .7], ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
    for (const v of m.vox) {
      const X = v.x * c + v.z * sn, D = -v.x * sn + v.z * c;
      const N = v.N, nx = N[0] * c + N[2] * sn, nz = -N[0] * sn + N[2] * c, ny = N[1];
      const dif = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      const rim = Math.pow(Math.max(0, 1 - Math.abs(nz)), 3) * .25;
      const spec = Math.pow(Math.max(0, nz * .85 + dif * .15), 24) * .18;
      const k = .5 + .62 * dif;
      const col = opt.siluet ? [42 + k * 22, 32 + k * 16, 56 + k * 24] : [v.c[0] * k + 255 * (spec + rim * .35), v.c[1] * k + 255 * (spec + rim * .35), v.c[2] * k + 255 * (spec + rim * .3)];
      const fx = c0 + X - .5, p0 = Math.floor(fx), py = v.y + 4;
      for (const px of (fx - p0 < .25 ? [p0] : fx - p0 > .75 ? [p0 + 1] : [p0, p0 + 1])) {
        if (px < 0 || px >= Wd) continue;
        const j = py * Wd + px; if (D <= zb[j]) continue; zb[j] = D;
        buf[j * 4] = col[0]; buf[j * 4 + 1] = col[1]; buf[j * 4 + 2] = col[2]; buf[j * 4 + 3] = 255;
      }
    }
    for (let y = 1; y < Hd - 1; y++) for (let x = 1; x < Wd - 1; x++) {
      const j = y * Wd + x; if (buf[j * 4 + 3]) continue;
      const a = buf[(j - 1) * 4 + 3] && buf[(j + 1) * 4 + 3] ? [j - 1, j + 1] : buf[(j - Wd) * 4 + 3] && buf[(j + Wd) * 4 + 3] ? [j - Wd, j + Wd] : null;
      if (a) { for (let q = 0; q < 3; q++) buf[j * 4 + q] = (buf[a[0] * 4 + q] + buf[a[1] * 4 + q]) / 2; buf[j * 4 + 3] = 255; }
    }
    // haluskan warna permukaan (tanpa mengaburkan siluet)
    if (!opt.kasar) {
      const sm = new Uint8ClampedArray(buf);
      for (let y = 1; y < Hd - 1; y++) for (let x = 1; x < Wd - 1; x++) {
        const j = y * Wd + x; if (!buf[j * 4 + 3]) continue;
        let r = 0, gg = 0, b = 0, wsum = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const q = (j + dy * Wd + dx) * 4; if (!buf[q + 3]) continue; const wt = dx === 0 && dy === 0 ? 4 : dx === 0 || dy === 0 ? 2 : 1; r += buf[q] * wt; gg += buf[q + 1] * wt; b += buf[q + 2] * wt; wsum += wt; }
        sm[j * 4] = r / wsum; sm[j * 4 + 1] = gg / wsum; sm[j * 4 + 2] = b / wsum;
      }
      buf.set(sm);
    }
    // garis tepi lembut 2 piksel mengikuti siluet
    const out = new Uint8ClampedArray(buf);
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
      const j = y * Wd + x; if (buf[j * 4 + 3]) continue;
      let near = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (dx * dx + dy * dy > 5) continue; const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < Wd && Y < Hd && buf[(Y * Wd + X) * 4 + 3]) { near = Math.max(near, dx * dx + dy * dy <= 1 ? 255 : 170); } }
      if (near) { out[j * 4] = OL[0]; out[j * 4 + 1] = OL[1]; out[j * 4 + 2] = OL[2]; out[j * 4 + 3] = near; }
    }
    const off = document.createElement('canvas'); off.width = Wd; off.height = Hd; off.getContext('2d').putImageData(new ImageData(out, Wd, Hd), 0, 0);
    const s = opt.fit ? Math.min(W / Wd * 1.3, H / Hd) * .97 : Math.min(W, H) * .9 / (58 * K) * (opt.zoom || 1);
    const ox = W / 2, oy = (opt.fit ? H * .99 : H * .86) - (n * .87 + 4) * s;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(ox, oy + (n * .87 + 4) * s, n * s * .3, n * s * .07, 0, 0, Math.PI * 2); g.fill();
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(off, ox - Wd * s / 2, oy, Wd * s, Hd * s);
  }

  // ---------- modal ----------
  let el = null, st = null;
  function ensure() {
    if (el) return el;
    el = document.createElement('div'); el.className = 'p3d-modal'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Profil Evolusi 360°');
    el.innerHTML = `<div class="p3d-box">
      <button class="btn ghost sq p3d-x" type="button" aria-label="Tutup">×</button>
      <div class="p3d-head"><h3 class="p3d-nama"></h3><span class="p3d-sub muted"></span></div>
      <div class="p3d-stage"><canvas width="720" height="720" class="p3d-cv" aria-label="Model 360°, geser untuk memutar"></canvas>
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
  function loop() { if (!st || !st.auto || el.hidden) return; st.ang += .018; draw(); requestAnimationFrame(loop); }
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
      const cv = document.createElement('canvas'); cv.width = cv.height = 112; render(cv, model(w, i), -.5, { siluet: i > w.tier, fit: true });
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
