// Outfit Toko (6 Nov 2026): aksesori yang digambar di atas sprite hewan (semua tingkat).
// draw(ctx, X, HY, rx, ry, eye, p): koordinat dalam satuan sprite (ctx sudah diskalakan oleh pemanggil).
// p = { kepala, mata, leher } berisi id barang dari lib/pakaian.js.
(function () {
  const E = (g, cx, cy, rx, ry, fill, rot = 0) => { g.beginPath(); g.ellipse(cx, cy, Math.max(.1, rx), Math.max(.1, ry), rot, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); };
  const P = (g, pts, fill) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) g.lineTo(q[0], q[1]); g.closePath(); g.fillStyle = fill; g.fill(); };
  const L = (g, pts, col, w) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) g.lineTo(q[0], q[1]); g.strokeStyle = col; g.lineWidth = w; g.stroke(); };
  const bunga = (g, x, y, r, c) => { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; E(g, x + Math.cos(a) * r * .7, y + Math.sin(a) * r * .7, r * .55, r * .55, c); } E(g, x, y, r * .45, r * .45, '#ffd23f'); };

  const KEPALA = {
    topi_pesta(g, X, top) {
      P(g, [[X - 2.6, top + .8], [X + 2.6, top + .8], [X + .6, top - 6]], '#f05a9a');
      L(g, [[X - 1.7, top - .9], [X + 2.1, top - .3]], '#ffd23f', .7); L(g, [[X - .7, top - 3], [X + 1.5, top - 2.6]], '#ffd23f', .6);
      E(g, X + .6, top - 6.2, 1, 1, '#ffd23f');
    },
    pita(g, X, top, rx) {
      const bx = X + rx * .5, by = top + 1;
      P(g, [[bx, by], [bx - 2.6, by - 1.7], [bx - 2.6, by + 1.5]], '#ff7ab0'); P(g, [[bx, by], [bx + 2.6, by - 1.7], [bx + 2.6, by + 1.5]], '#ff7ab0');
      E(g, bx, by, .8, .8, '#e0407e');
    },
    mahkota_bunga(g, X, top, rx, ry, HY) {
      const C = ['#ff7ab0', '#ffffff', '#b48cff', '#ff9a3c', '#7cc0ff'];
      for (let i = 0; i < 5; i++) { const a = Math.PI * (-.86 + i * .18); bunga(g, X + Math.cos(a) * rx * .82, HY + Math.sin(a) * ry * .92, 1.15, C[i]); }
    },
    topi_koboi(g, X, top, rx) {
      E(g, X, top + .9, rx * 1.35, 1.1, '#8a5428');
      P(g, [[X - 2.8, top + .9], [X - 2.4, top - 2.8], [X, top - 2.1], [X + 2.4, top - 2.8], [X + 2.8, top + .9]], '#b8793f');
      L(g, [[X - 2.7, top - .1], [X + 2.7, top - .1]], '#4a2c14', .7);
    },
    topi_penyihir(g, X, top, rx) {
      E(g, X, top + .7, rx * 1.3, 1.15, '#4a2470');
      P(g, [[X - 3, top + .7], [X + 3, top + .7], [X + 1.2, top - 4], [X + 3.4, top - 7.4], [X - .4, top - 4.2]], '#6b3fa0');
      L(g, [[X - 2.8, top - .1], [X + 2.8, top - .1]], '#ffd23f', .6);
      const sx = X + .2, sy = top - 2.4; P(g, [[sx, sy - 1], [sx + .3, sy - .3], [sx + 1, sy], [sx + .3, sy + .3], [sx, sy + 1], [sx - .3, sy + .3], [sx - 1, sy], [sx - .3, sy - .3]], '#ffd23f');
    },
  };
  const MATA = {
    kacamata_hitam(g, X, ey, dx) {
      for (const s of [-1, 1]) { E(g, X + s * dx, ey, 1.55, 1.15, '#1e1e26'); E(g, X + s * dx - .55, ey - .4, .4, .25, 'rgba(255,255,255,.75)'); }
      L(g, [[X - dx + 1.3, ey - .3], [X + dx - 1.3, ey - .3]], '#1e1e26', .5);
    },
    kacamata_bulat(g, X, ey, dx) {
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(X + s * dx, ey, 1.55, 1.55, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(200,235,255,.35)'; g.fill(); g.strokeStyle = '#6a4a2a'; g.lineWidth = .45; g.stroke(); }
      L(g, [[X - dx + 1.5, ey - .2], [X + dx - 1.5, ey - .2]], '#6a4a2a', .45);
    },
  };
  const WSYAL = { 1: ['#e5533d', '#b83a28'], 2: ['#3d8fd8', '#2a6aa8'], 3: ['#3fae5a', '#2b8442'], 4: ['#e8b923', '#b88e12'], 5: ['#8f5ad8', '#6a3cad'], 6: ['#f08a2c', '#c0661a'] };
  const syalW = (n) => (g, X, ny, rx) => {
    const [c, c2] = WSYAL[n];
    E(g, X, ny, rx * .9, 1.25, c);
    L(g, [[X - rx * .8, ny], [X + rx * .8, ny]], 'rgba(255,255,255,.75)', .45);
    P(g, [[X + 1.4, ny + .4], [X + 3.2, ny + .4], [X + 3, ny + 4.4], [X + 1.6, ny + 4.4]], c2);
    L(g, [[X + 1.7, ny + 2.4], [X + 3, ny + 2.4]], 'rgba(255,255,255,.75)', .4);
    E(g, X + 2.3, ny + 4.6, .55, .55, '#fff6c8');
  };
  const LEHER = {
    syal_w1: syalW(1), syal_w2: syalW(2), syal_w3: syalW(3), syal_w4: syalW(4), syal_w5: syalW(5), syal_w6: syalW(6),
    syal(g, X, ny, rx) {
      E(g, X, ny, rx * .9, 1.2, '#d9483b');
      for (let k = -2; k <= 2; k++) L(g, [[X + k * 1.6, ny - .8], [X + k * 1.6, ny + .8]], 'rgba(255,255,255,.55)', .3);
      P(g, [[X + 1.4, ny + .4], [X + 3.2, ny + .4], [X + 3, ny + 4.2], [X + 1.6, ny + 4.2]], '#c03a2f');
      L(g, [[X + 1.6, ny + 3.6], [X + 3, ny + 3.6]], 'rgba(255,255,255,.6)', .3);
    },
    dasi_kupu(g, X, ny) {
      const y = ny + .3;
      P(g, [[X, y], [X - 2.4, y - 1.4], [X - 2.4, y + 1.4]], '#d9483b'); P(g, [[X, y], [X + 2.4, y - 1.4], [X + 2.4, y + 1.4]], '#d9483b');
      E(g, X, y, .7, .7, '#a8302a');
    },
    kalung_lonceng(g, X, ny, rx) {
      g.beginPath(); g.ellipse(X, ny - .4, rx * .8, 1, 0, 0, Math.PI); g.strokeStyle = '#d9483b'; g.lineWidth = .7; g.stroke();
      E(g, X, ny + 1, 1.2, 1.2, '#ffd23f'); E(g, X, ny + 1.5, .35, .3, '#8a6a10'); E(g, X - .4, ny + .6, .3, .3, '#fff6c8');
    },
  };
  /** gambar outfit yang dipakai. eye = { dx, dy } jarak mata dari pusat kepala */
  function draw(g, X, HY, rx, ry, eye, p) {
    if (!p) return;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    const top = HY - ry;
    try {
      if (p.leher && LEHER[p.leher]) LEHER[p.leher](g, X, HY + ry - .2, rx);
      if (p.mata && MATA[p.mata]) MATA[p.mata](g, X, HY + eye.dy, eye.dx);
      if (p.kepala && KEPALA[p.kepala]) KEPALA[p.kepala](g, X, top, rx, ry, HY);
    } finally { g.restore(); }
  }
  /** pratinjau kecil untuk kartu Toko: kepala bulat polos + barang */
  function preview(cv, id, bagian, warna = '#f0a040') {
    const g = cv.getContext('2d'); const s = cv.width / 20; g.clearRect(0, 0, cv.width, cv.height); g.save(); g.scale(s, s);
    E(g, 10, 12.5, 5.6, 4.8, warna); E(g, 10, 14.3, 2.6, 1.8, '#ffe2b8');
    g.fillStyle = '#2b1b17'; g.fillRect(7.3, 11.4, .9, 1.6); g.fillRect(11.8, 11.4, .9, 1.6);
    draw(g, 10, 12.5, 5.6, 4.8, { dx: 2.25, dy: -.3 }, { [bagian]: id });
    g.restore();
  }
  const kunci = (p) => (p ? [p.kepala || '', p.mata || '', p.leher || ''].join(',') : '');
  window.Pakaian = { draw, preview, kunci };
})();
