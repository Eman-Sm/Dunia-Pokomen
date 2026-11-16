// Dunia Pokomen — Bangunan 3D 360° (16 Nov)
// Model voksel prosedural untuk Balai Admin & Paviliun Sahabat, diputar 360° dengan kamera sedikit dari atas.
// Klik bagian (Menara Jam, Kubah, ...) untuk menyorotnya dan membaca detailnya.
//  window.Bangunan3D.open('balai' | 'paviliun', { data, aksi: [[label, fn], ...] })
(function () {
  const OL = [43, 27, 23];
  const ESC = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const WCOL = [[229, 83, 61], [61, 143, 216], [63, 174, 90], [232, 185, 35], [143, 90, 216], [240, 138, 44]];
  const GOLD = [255, 210, 63], GOLD2 = [214, 160, 30];

  // ---------- pembangun voksel ----------
  function Builder() {
    const vox = [];
    const add = (x, y, z, c, N, p) => vox.push({ x, y, z, c, N, p });
    const nrm = (a, b, c) => { const l = Math.hypot(a, b, c) || 1; return [a / l, b / l, c / l]; };
    const B = {
      vox,
      // kotak padat (hanya kulit). col bisa fungsi (sisi, u, v) -> warna
      box(x0, x1, y0, y1, z0, z1, col, p, skip = '') {
        const C = typeof col === 'function' ? col : () => col;
        if (!skip.includes('t')) for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) add(x, y0, z, C('t', x, z), [0, -1, 0], p);
        for (let y = y0; y <= y1; y++) {
          if (!skip.includes('f')) for (let x = x0; x <= x1; x++) add(x, y, z1, C('f', x, y), [0, 0, 1], p);
          if (!skip.includes('b')) for (let x = x0; x <= x1; x++) add(x, y, z0, C('b', x, y), [0, 0, -1], p);
          if (!skip.includes('l')) for (let z = z0; z <= z1; z++) add(x0, y, z, C('l', z, y), [-1, 0, 0], p);
          if (!skip.includes('r')) for (let z = z0; z <= z1; z++) add(x1, y, z, C('r', z, y), [1, 0, 0], p);
        }
      },
      // silinder tegak (kulit + tutup atas)
      cyl(cx, cz, r, y0, y1, col, p, cap = true) {
        const st = .7 / Math.max(1, r);
        for (let y = y0; y <= y1; y++) for (let a = 0; a < Math.PI * 2; a += st) add(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r, typeof col === 'function' ? col(a, y) : col, [Math.cos(a), 0, Math.sin(a)], p);
        if (cap) for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) if (x * x + z * z <= r * r) add(cx + x, y0, cz + z, typeof col === 'function' ? col(0, y0) : col, [0, -1, 0], p);
      },
      // kerucut: puncak di yTop, alas radius r di yBot
      cone(cx, cz, r, yTop, yBot, col, p) {
        const H = yBot - yTop, sl = r / H;
        for (let y = yTop; y <= yBot; y += .6) {
          const rr = r * (y - yTop) / H, st = .7 / Math.max(1, rr);
          for (let a = 0; a < Math.PI * 2; a += st) add(cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr, typeof col === 'function' ? col(a, y) : col, nrm(Math.cos(a), -sl, Math.sin(a)), p);
        }
      },
      // atap limas (frustum persegi): setengah-lebar s0 di yTop → s1 di yBot
      hip(cx, cz, s0, s1, yTop, yBot, col, p) {
        const H = yBot - yTop, sl = (s1 - s0) / H;
        for (let y = yTop; y <= yBot; y += .6) {
          const s = s0 + (s1 - s0) * (y - yTop) / H;
          for (let u = -s; u <= s; u += .8) {
            add(cx + u, y, cz + s, col('f', u, y), nrm(0, -sl, 1), p); add(cx + u, y, cz - s, col('b', u, y), nrm(0, -sl, -1), p);
            add(cx + s, y, cz + u, col('r', u, y), nrm(1, -sl, 0), p); add(cx - s, y, cz + u, col('l', u, y), nrm(-1, -sl, 0), p);
          }
        }
        for (let x = -s0; x <= s0; x++) for (let z = -s0; z <= s0; z++) add(cx + x, yTop, cz + z, col('t', x, z), [0, -1, 0], p);
      },
      // kubah setengah bola, pusat alas (cx, yc, cz)
      dome(cx, yc, cz, r, col, p) {
        const st = .6 / r;
        for (let t = 0; t <= Math.PI / 2 + .01; t += st) for (let a = 0; a < Math.PI * 2; a += st / Math.max(.15, Math.sin(t) || .15)) {
          const nx = Math.sin(t) * Math.cos(a), ny = -Math.cos(t), nz = Math.sin(t) * Math.sin(a);
          add(cx + nx * r, yc + ny * r, cz + nz * r, typeof col === 'function' ? col(a, t) : col, [nx, ny, nz], p);
        }
      },
      // bidang tipis dua sisi (bendera, spanduk): di bidang x-y pada z, atau di bidang z-y pada x (axis 'x')
      plane(pts, col, p, axis = 'z') {
        for (const [a, y, b] of pts) {
          if (axis === 'z') { add(a, y, b + .05, col, [0, 0, 1], p); add(a, y, b - .05, col, [0, 0, -1], p); } else { add(b + .05, y, a, col, [1, 0, 0], p); add(b - .05, y, a, col, [-1, 0, 0], p); }
        }
      },
      flag(x, z, yBase, h, c, p, dir = 1, axis = 'z') {
        B.cyl(x, z, .6, yBase - h, yBase, [70, 50, 40], p, false);
        const pts = [];
        for (let u = 0; u <= 9; u++) for (let v = 0; v <= 6 - u * .5; v++) pts.push([x + dir * u, yBase - h + 1 + v + u * .25, z]);
        if (axis === 'x') B.plane(pts.map(([a, y]) => [z + dir * (a - x), y, x]), c, p, 'x'); else B.plane(pts, c, p, 'z');
      },
    };
    return B;
  }
  const shade = (c, k) => c.map((v) => Math.max(0, Math.min(255, v * k)));

  // ---------- Balai Admin ----------
  function modelBalai() {
    const B = Builder(), CREAM = [248, 238, 214], STONE = [222, 216, 202], STONE2 = [196, 190, 176], RED = [206, 72, 58], BLUE = [80, 160, 210];
    const G = 150; // lantai tanah (y)
    // alas 2 undakan
    B.box(-64, 64, G - 6, G, -64, 64, (s, u, v) => ((u + v) % 8 === 0 ? STONE2 : STONE), 'alas');
    B.box(-56, 56, G - 12, G - 6, -56, 56, STONE, 'alas');
    // tangga depan
    for (let k = 0; k < 4; k++) B.box(-12, 12, G - 12 + k * 3, G - 9 + k * 3, 56 + k * 2, 58 + k * 2, [240, 236, 226], 'alas', 'b');
    // badan aula
    const y0 = G - 48, y1 = G - 12;
    B.box(-44, 44, y0, y1, -44, 44, CREAM, 'aula', 't');
    // jendela lengkung (keempat sisi), menonjol 1 voksel
    const win = [120, 196, 236];
    for (const s of [-1, 1]) for (const u of [-28, -14, 14, 28]) {
      for (let y = y0 + 10; y <= y0 + 26; y++) for (let w = -3; w <= 3; w++) {
        if (y < y0 + 13 && Math.abs(w) > 2 - (y0 + 13 - y)) continue;
        B.vox.push({ x: u + w, y, z: s * 45, c: win, N: [0, 0, s], p: 'aula' }); B.vox.push({ x: s * 45, y, z: u + w, c: win, N: [s, 0, 0], p: 'aula' });
      }
    }
    // tiang putih di depan keempat sisi
    for (const s of [-1, 1]) for (const u of [-38, -22, 22, 38]) { B.cyl(u, s * 48, 2.5, y0 + 2, y1, [255, 252, 244], 'tiang', false); B.cyl(s * 48, u, 2.5, y0 + 2, y1, [255, 252, 244], 'tiang', false); }
    for (const s of [-1, 1]) { B.box(-48, 48, y0, y0 + 2, s * 48 - 2, s * 48 + 2, [236, 226, 206], 'tiang'); B.box(s * 48 - 2, s * 48 + 2, y0, y0 + 2, -48, 48, [236, 226, 206], 'tiang'); }
    // pintu ganda + papan nama emas (depan)
    B.box(-10, 10, y1 - 26, y1, 44, 46, (s, u, v) => (u === 0 ? [90, 56, 34] : v < y1 - 22 && Math.abs(u) > 8 - (y1 - 22 - v) * 3 ? CREAM : [140, 86, 50]), 'pintu', 'b');
    B.box(-14, 14, y1 - 33, y1 - 28, 45, 47, GOLD, 'pintu', 'b');
    // lis atap emas + atap limas merah
    B.box(-52, 52, y0 - 3, y0, -52, 52, (s) => (s === 't' ? RED : GOLD), 'atap');
    B.hip(0, 0, 16, 50, y0 - 30, y0 - 3, (s, u, y) => ((Math.round(y) % 5 === 0) ? shade(RED, 1.12) : RED), 'atap');
    // menara jam
    const t0 = y0 - 52, t1 = y0 - 26;
    B.box(-14, 14, t0, t1, -14, 14, CREAM, 'menara');
    for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      for (let a = 0; a < Math.PI * 2; a += .05) for (let r = 0; r <= 8; r += .7) {
        const px = Math.cos(a) * r, py = Math.sin(a) * r, c = r > 7 ? GOLD : (Math.abs(px) < .8 && py < 0 && py > -6) || (Math.abs(py) < .8 && px > 0 && px < 4.5) ? [40, 30, 30] : [255, 250, 236];
        if (nz) B.vox.push({ x: px, y: t0 + 13 + py, z: nz * 15, c, N: [0, 0, nz], p: 'menara' }); else B.vox.push({ x: nx * 15, y: t0 + 13 + py, z: px, c, N: [nx, 0, 0], p: 'menara' });
      }
    }
    B.box(-16, 16, t0 - 2, t0, -16, 16, GOLD, 'menara');
    // kubah biru + puncak emas + bendera admin
    B.dome(0, t0 - 2, 0, 14, (a, t) => (Math.round(a * 4) % 2 ? BLUE : shade(BLUE, 1.15)), 'kubah');
    B.cyl(0, 0, 1.2, t0 - 22, t0 - 15, GOLD, 'kubah'); B.dome(0, t0 - 22, 0, 2.2, GOLD, 'kubah');
    B.flag(0, 0, t0 - 23, 12, [232, 70, 80], 'kubah');
    // 6 bendera wilayah di tepi alas
    const pos = [[-50, 54], [-20, 58], [20, 58], [50, 54], [58, 20], [58, -20]];
    pos.forEach(([x, z], k) => B.flag(x, z, G - 12, 20, WCOL[k], 'bendera', 1));
    // lentera
    for (const x of [-18, 18]) { B.cyl(x, 62, .8, G - 22, G - 6, [60, 44, 36], 'alas', false); B.box(x - 2, x + 2, G - 26, G - 22, 60, 64, [255, 229, 138], 'alas'); }
    return { vox: B.vox, H: G + 4, R: 92 };
  }

  // ---------- Paviliun Sahabat ----------
  function modelPaviliun(malam) {
    const B = Builder(), WL = [246, 238, 222], PUR = [128, 82, 196], PUR2 = [100, 62, 168], LAV = [214, 206, 236];
    const win = malam ? [255, 222, 140] : [140, 200, 236];
    const G = 170;
    B.cyl(0, 0, 40, G - 6, G, LAV, 'alas');
    // lantai 1
    const a0 = G - 40, a1 = G - 6;
    B.box(-28, 28, a0, a1, -28, 28, WL, 'lantai1', 't');
    B.box(-7, 7, a1 - 20, a1, 28, 30, (s, u, v) => (Math.abs(u) <= 5 ? [120, 78, 50] : GOLD), 'lantai1', 'b');
    for (const s of [-1, 1]) for (const u of [-16, 16]) for (let y = a0 + 8; y <= a0 + 20; y++) for (let w = -3; w <= 3; w++) { B.vox.push({ x: s * 29, y, z: u + w, c: win, N: [s, 0, 0], p: 'lantai1' }); if (s > 0 || true) B.vox.push({ x: u + w, y, z: -29, c: win, N: [0, 0, -1], p: 'lantai1' }); }
    for (const u of [-18, 18]) for (let y = a0 + 8; y <= a0 + 20; y++) for (let w = -3; w <= 3; w++) B.vox.push({ x: u + w, y, z: 29, c: win, N: [0, 0, 1], p: 'lantai1' });
    // balkon + pagar putih
    B.box(-36, 36, a0 - 2, a0, -36, 36, [150, 104, 66], 'balkon');
    for (let u = -36; u <= 36; u += 4) for (const s of [-1, 1]) { B.cyl(u, s * 36, .7, a0 - 8, a0 - 2, [250, 246, 236], 'balkon', false); B.cyl(s * 36, u, .7, a0 - 8, a0 - 2, [250, 246, 236], 'balkon', false); }
    for (const s of [-1, 1]) { B.box(-36, 36, a0 - 9, a0 - 8, s * 36, s * 36, [250, 246, 236], 'balkon'); B.box(s * 36, s * 36, a0 - 9, a0 - 8, -36, 36, [250, 246, 236], 'balkon'); }
    // lantai 2 + spanduk
    const b0 = a0 - 30, b1 = a0 - 2;
    B.box(-22, 22, b0, b1, -22, 22, WL, 'lantai2', 't');
    for (const s of [-1, 1]) for (const u of [-10, 10]) for (let y = b0 + 8; y <= b0 + 20; y++) for (let w = -3; w <= 3; w++) { B.vox.push({ x: u + w, y, z: s * 23, c: win, N: [0, 0, s], p: 'lantai2' }); B.vox.push({ x: s * 23, y, z: u + w, c: win, N: [s, 0, 0], p: 'lantai2' }); }
    const ban = []; for (let x = -4; x <= 4; x++) for (let y = b0 + 2; y <= b0 + 34 - (Math.abs(x) < 2 ? 3 : 0); y++) ban.push([x, y, 24]);
    B.plane(ban, PUR, 'spanduk'); B.plane([[-1, b0 + 8, 24.3], [0, b0 + 7, 24.3], [1, b0 + 8, 24.3], [0, b0 + 9, 24.3]], GOLD, 'spanduk');
    // lis ungu + lantai 3 (menara pengamat)
    B.box(-28, 28, b0 - 3, b0, -28, 28, PUR2, 'lantai2');
    const c0 = b0 - 26, c1 = b0 - 3;
    B.box(-15, 15, c0, c1, -15, 15, WL, 'menara', 't');
    for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) for (let y = c0 + 8; y <= c0 + 17; y++) for (let w = -3; w <= 3; w++) B.vox.push({ x: nz ? w : nx * 16, y, z: nz ? nz * 16 : w, c: win, N: [nx, 0, nz], p: 'menara' });
    // teropong
    for (let k = 0; k <= 12; k++) B.cyl(10 + k * .6, -8 - k * .3, 1.6, c0 - 2 - k * .7, c0 - 1 - k * .7, [96, 96, 120], 'menara', false);
    // atap kerucut ungu + lis emas
    B.cyl(0, 0, 22, c0 - 2, c0, GOLD, 'atap');
    B.cone(0, 0, 22, c0 - 46, c0 - 2, (a, y) => (Math.round(y) % 6 === 0 ? shade(PUR, 1.2) : PUR), 'atap');
    // mahkota emas
    const m0 = c0 - 46;
    B.cyl(0, 0, 6, m0 - 5, m0, GOLD, 'mahkota');
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; B.cone(Math.cos(a) * 6, Math.sin(a) * 6, 1.6, m0 - 11, m0 - 5, GOLD, 'mahkota'); }
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + .5; B.box(Math.cos(a) * 6.5 - .5, Math.cos(a) * 6.5 + .5, m0 - 3, m0 - 2, Math.sin(a) * 6.5 - .5, Math.sin(a) * 6.5 + .5, k % 2 ? [232, 70, 80] : [120, 196, 236], 'mahkota'); }
    // menara kembar
    for (const s of [-1, 1]) {
      const tx = s * 40;
      B.cyl(tx, 0, 8, G - 46, G - 6, WL, 'kembar');
      for (let y = G - 34; y <= G - 26; y++) for (let w = -2; w <= 2; w++) B.vox.push({ x: tx + w * .8, y, z: 8.5, c: win, N: [0, 0, 1], p: 'kembar' });
      B.cone(tx, 0, 10, G - 66, G - 46, PUR, 'kembar');
      B.flag(tx, 0, G - 66, 9, PUR, 'kembar', s);
    }
    // pojok kopi & lentera
    B.box(16, 26, a1 - 6, a1 - 5, 32, 38, [120, 78, 50], 'kopi'); B.cyl(18, 34, .6, a1 - 5, a1, [60, 44, 36], 'kopi', false); B.cyl(24, 36, .6, a1 - 5, a1, [60, 44, 36], 'kopi', false);
    B.cyl(21, 35, 1.6, a1 - 9, a1 - 6, [255, 255, 255], 'kopi');
    for (const x of [-14, 14]) { B.cyl(x, 36, .7, a1 - 16, a1, [60, 44, 36], 'alas', false); B.box(x - 2, x + 2, a1 - 20, a1 - 16, 34, 38, malam ? [255, 229, 138] : [230, 210, 160], 'alas'); }
    return { vox: B.vox, H: G + 4, R: 60 };
  }

  const cache = new Map();
  function model(id, malam) { const k = id + (malam ? ':m' : ''); if (!cache.has(k)) cache.set(k, id === 'balai' ? modelBalai() : modelPaviliun(malam)); return cache.get(k); }

  // ---------- render (diputar pada sumbu Y, kamera agak dari atas) ----------
  function render(cv, m, ang, opt = {}) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    const e = opt.elev ?? .38, ce = Math.cos(e), se = Math.sin(e);
    const R = m.R * 1.0, Wd = Math.ceil(R * 2.1) + 10, Hd = Math.ceil(m.H * ce + R * se * 2) + 12, c0 = Wd / 2, yOff = R * se + 6;
    const zb = new Float32Array(Wd * Hd).fill(-1e9), buf = new Uint8ClampedArray(Wd * Hd * 4);
    const c = Math.cos(ang), sn = Math.sin(ang);
    const L = [-.5, -.7, .55], ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
    for (const v of m.vox) {
      const X = v.x * c + v.z * sn, D0 = -v.x * sn + v.z * c;
      const Ys = v.y * ce + D0 * se + yOff, D = D0 * ce - v.y * se;
      const N = v.N, nx = N[0] * c + N[2] * sn, nz0 = -N[0] * sn + N[2] * c, ny = N[1] * ce + nz0 * se, nz = nz0 * ce - N[1] * se;
      if (nz < -.2) continue; // muka membelakangi kamera
      const dif = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      let k = .48 + .64 * dif;
      let col = v.c;
      if (opt.part && v.p !== opt.part) { const gr = (col[0] + col[1] + col[2]) / 3; col = [gr * .55 + col[0] * .2, gr * .55 + col[1] * .2, gr * .55 + col[2] * .25]; k *= .8; }
      const r = col[0] * k, gg = col[1] * k, b = col[2] * k;
      const px = Math.round(c0 + X), py = Math.round(Ys);
      if (px < 0 || px >= Wd || py < 0 || py >= Hd) continue;
      const j = py * Wd + px; if (D <= zb[j]) continue; zb[j] = D;
      buf[j * 4] = r; buf[j * 4 + 1] = gg; buf[j * 4 + 2] = b; buf[j * 4 + 3] = 255;
    }
    // tambal lubang kecil
    for (let pass = 0; pass < 2; pass++) for (let y = 1; y < Hd - 1; y++) for (let x = 1; x < Wd - 1; x++) {
      const j = y * Wd + x; if (buf[j * 4 + 3]) continue;
      const a = buf[(j - 1) * 4 + 3] && buf[(j + 1) * 4 + 3] ? [j - 1, j + 1] : buf[(j - Wd) * 4 + 3] && buf[(j + Wd) * 4 + 3] ? [j - Wd, j + Wd] : null;
      if (a) { for (let q = 0; q < 3; q++) buf[j * 4 + q] = (buf[a[0] * 4 + q] + buf[a[1] * 4 + q]) / 2; buf[j * 4 + 3] = 255; }
    }
    // garis tepi
    const out = new Uint8ClampedArray(buf);
    for (let y = 1; y < Hd - 1; y++) for (let x = 1; x < Wd - 1; x++) {
      const j = y * Wd + x; if (buf[j * 4 + 3]) continue;
      if (buf[(j - 1) * 4 + 3] || buf[(j + 1) * 4 + 3] || buf[(j - Wd) * 4 + 3] || buf[(j + Wd) * 4 + 3]) { out[j * 4] = OL[0]; out[j * 4 + 1] = OL[1]; out[j * 4 + 2] = OL[2]; out[j * 4 + 3] = 255; }
    }
    const off = document.createElement('canvas'); off.width = Wd; off.height = Hd; off.getContext('2d').putImageData(new ImageData(out, Wd, Hd), 0, 0);
    const s = Math.min(W / Wd, H / Hd) * .96, ox = (W - Wd * s) / 2, oy = (H - Hd * s) / 2;
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(W / 2, oy + (m.H * ce + yOff) * s, R * s * .95, R * s * .95 * se, 0, 0, Math.PI * 2); g.fill();
    g.imageSmoothingEnabled = false;
    g.drawImage(off, ox, oy, Wd * s, Hd * s);
  }

  // ---------- info ----------
  const BAGIAN = {
    balai: [
      ['aula', '🏛️ Aula Utama', 'Ruang besar berdinding krem tempat Admin bekerja: mencatat kelahiran, evolusi, dan semua kabar dunia.'],
      ['tiang', '⬜ Tiang Putih', 'Enam belas tiang penyangga di keempat sisi. Lambang dunia yang kokoh dan adil untuk semua wilayah.'],
      ['pintu', '🚪 Pintu Emas', 'Pintu ganda berbingkai emas. Di atasnya papan nama emas Balai Admin.'],
      ['atap', '🟥 Atap Limas Merah', 'Atap merah berlis emas, bisa dilihat dari seluruh penjuru dunia.'],
      ['menara', '🕰️ Menara Jam', 'Jam dunia di empat sisi. Menandai pergantian hari, jadwal Arena, dan Duel Jagoan pukul 20.00.'],
      ['kubah', '🔵 Kubah & Bendera Admin', 'Kubah biru berpuncak emas dengan bendera merah Admin di puncaknya.'],
      ['bendera', '🚩 Enam Bendera Wilayah', 'Satu bendera untuk tiap wilayah: Raiko, Tera, Azura, Milzura, Watea, dan Wilayah 6. Semua wilayah sama di mata Admin.'],
      ['alas', '🪜 Alas Batu & Lentera', 'Alas batu dua undakan dengan tangga depan dan dua lentera penyambut warga.'],
    ],
    paviliun: [
      ['lantai1', '🏠 Lantai 1 · Ruang Tamu', 'Tempat Sahabat Admin menyambut warga. Pintu kayu berbingkai emas.'],
      ['balkon', '🌉 Balkon Pagar Putih', 'Balkon kayu mengelilingi lantai 2, tempat Sahabat memandang dunia.'],
      ['spanduk', '🎗️ Spanduk Bermahkota', 'Spanduk ungu dengan lambang mahkota emas, tanda rumah Sahabat Admin.'],
      ['lantai2', '🛏️ Lantai 2 · Kamar', 'Tempat Sahabat beristirahat. Saat malam jendelanya menyala kuning.'],
      ['menara', '🔭 Menara Pengamat', 'Lantai teratas dengan teropong untuk mengintip duel di Arena.'],
      ['atap', '🟪 Atap Kerucut Ungu', 'Atap tinggi ungu berlis emas, paling tinggi kedua setelah kubah Balai Admin.'],
      ['mahkota', '👑 Mahkota Emas', 'Mahkota di puncak paviliun, lambang gelar Sahabat Admin.'],
      ['kembar', '🏰 Menara Kembar', 'Dua menara jaga di kiri dan kanan, masing-masing dengan bendera ungu.'],
      ['kopi', '☕ Pojok Kopi', 'Meja kecil dengan secangkir kopi. Terima kasih untuk para pengirim Kopi Admin!'],
    ],
  };

  let el = null, st = null;
  function ensure() {
    if (el) return el;
    el = document.createElement('div'); el.className = 'p3d-modal b3d-modal'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Bangunan 3D 360°');
    el.innerHTML = `<div class="p3d-box">
      <button class="btn ghost sq p3d-x" type="button" aria-label="Tutup">×</button>
      <div class="p3d-head"><h3 class="p3d-nama"></h3><span class="p3d-sub muted"></span></div>
      <div class="p3d-stage"><canvas width="720" height="720" class="p3d-cv" aria-label="Model bangunan 360°, geser untuk memutar"></canvas>
        <div class="p3d-hint">↔ geser untuk memutar 360°</div>
        <div class="p3d-ctl"><button class="btn ghost sq" type="button" data-r="-1" aria-label="Putar kiri">⟲</button><button class="btn ghost" type="button" data-auto>⏸ Putar</button><button class="btn ghost sq" type="button" data-r="1" aria-label="Putar kanan">⟳</button></div></div>
      <div class="b3d-parts" role="tablist"></div>
      <div class="p3d-info"></div>
      <div class="b3d-aksi"></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    el.querySelector('.p3d-x').onclick = close;
    document.addEventListener('keydown', (e) => { if (!el.hidden && e.key === 'Escape') close(); });
    const cv = el.querySelector('.p3d-cv');
    let drag = null;
    cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, a: st.ang }; st.auto = false; syncAuto(); cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (!drag) return; st.ang = drag.a + (e.clientX - drag.x) * .014; draw(); });
    const up = () => { drag = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    for (const b of el.querySelectorAll('[data-r]')) b.onclick = () => { st.auto = false; syncAuto(); spinTo(st.ang + Number(b.dataset.r) * Math.PI / 2); };
    el.querySelector('[data-auto]').onclick = () => { st.auto = !st.auto; syncAuto(); if (st.auto) loop(); };
    return el;
  }
  function syncAuto() { el.querySelector('[data-auto]').textContent = st.auto ? '⏸ Berhenti' : '▶ Putar'; }
  function spinTo(a) { const a0 = st.ang, t0 = performance.now(); const f = (t) => { if (!st) return; const k = Math.min(1, (t - t0) / 400); st.ang = a0 + (a - a0) * (1 - (1 - k) ** 3); draw(); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
  function draw() { if (!st) return; render(el.querySelector('.p3d-cv'), model(st.id, st.malam), st.ang, { part: st.part }); }
  function loop() { if (!st || !st.auto || el.hidden) return; st.ang += .012; draw(); requestAnimationFrame(loop); }
  function close() { if (el) el.hidden = true; st = null; }
  function parts() {
    const box = el.querySelector('.b3d-parts');
    box.innerHTML = `<button class="b3d-part${st.part ? '' : ' on'}" type="button" data-p="">✨ Semua</button>` + BAGIAN[st.id].map(([p, lab]) => `<button class="b3d-part${st.part === p ? ' on' : ''}" type="button" data-p="${p}">${ESC(lab)}</button>`).join('');
    for (const b of box.querySelectorAll('[data-p]')) b.onclick = () => { st.part = b.dataset.p || null; parts(); info(); draw(); };
  }
  function info() {
    const d = st.o.data || {};
    const sel = st.part && BAGIAN[st.id].find((x) => x[0] === st.part);
    let h = '';
    if (sel) h += `<p class="p3d-tname">${ESC(sel[1])}</p><p>${ESC(sel[2])}</p>`;
    else if (st.id === 'balai') {
      h += `<p>Kantor Admin di jantung <b>Pusat Koloni</b>. Dari sini semua kabar dunia diumumkan, kelahiran & evolusi dicatat, dan Ketua tiap wilayah dipilih.</p>`;
      h += `<div class="b3d-stats">${[['👥 Warga hidup', d.warga], ['🗺️ Wilayah', d.wilayah], ['📅 Hari dunia', d.hari], ['🏆 Liga Wilayah', d.liga]].filter(([, v]) => v != null && v !== '').map(([k, v]) => `<div><small>${k}</small><b>${ESC(v)}</b></div>`).join('')}</div>`;
    } else {
      h += `<p>Rumah megah <b>Sahabat Admin</b>, tangan kanan Admin, di sisi timur Balai Admin. Lenteranya menyala saat Sahabat pulang beristirahat.</p>`;
      h += `<div class="b3d-stats">${[['♛ Penghuni', d.penghuni], ['✨ Tingkat', d.tingkat], ['⚔️ Arena', d.arena], ['🌙 Status', d.status]].filter(([, v]) => v != null && v !== '').map(([k, v]) => `<div><small>${k}</small><b>${ESC(v)}</b></div>`).join('')}</div>`;
    }
    h += `<p class="muted" style="font-size:.78rem">Ketuk nama bagian di atas untuk menyorotnya.</p>`;
    el.querySelector('.p3d-info').innerHTML = h;
  }
  function open(id, o = {}) {
    ensure(); st = { id, o, ang: -.6, auto: true, part: null, malam: !!o.malam };
    el.querySelector('.p3d-nama').textContent = id === 'balai' ? 'Balai Admin' : 'Paviliun Sahabat';
    el.querySelector('.p3d-sub').textContent = '3D 360° · Pusat Koloni';
    const ak = el.querySelector('.b3d-aksi'); const A = o.aksi || [];
    ak.innerHTML = A.map(([t], i) => `<button class="btn" type="button" data-i="${i}">${ESC(t)}</button>`).join('');
    for (const b of ak.querySelectorAll('[data-i]')) b.onclick = () => { close(); A[+b.dataset.i][1](); };
    parts(); info(); syncAuto(); el.hidden = false; draw(); loop();
  }
  window.Bangunan3D = { open, model, render };
})();
