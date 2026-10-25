// Helpers that tie a citizen's world look to its anime card art.
//  ArtPal.palette(img)  -> { body, acc, acc2 }  dominant creature colours (background excluded)
//  ArtPal.cutout(img)   -> { canvas, coverage }  plain-background sprite cut out & trimmed
(function () {
  const hex = (r, g, b) => '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  function pixels(img, W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H);
    return { c, g, d: g.getImageData(0, 0, W, H).data };
  }

  function palette(img) {
    const W = 120, H = Math.max(40, Math.round(120 * (img.naturalHeight || img.height) / (img.naturalWidth || img.width)));
    const { d } = pixels(img, W, H);
    const q = (i) => ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
    // background = colours that dominate the outer border
    const border = new Map(); let nb = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const bx = Math.min(x, W - 1 - x) / W, by = Math.min(y, H - 1 - y) / H;
      if (bx > .16 && by > .16) continue; // outer band = scenery around the creature
      const k = q((y * W + x) * 4); border.set(k, (border.get(k) || 0) + 1); nb++;
    }
    const bgKeys = new Set([...border].filter(([, n]) => n > nb * .006).map(([k]) => k));
    const bgCols = [...bgKeys].map((k) => [((k >> 8) & 15) * 16 + 8, ((k >> 4) & 15) * 16 + 8, (k & 15) * 16 + 8]);
    // subject = central ellipse, minus anything close to a background colour, minus dark line art
    const hist = new Map();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ex = (x - W / 2) / (W * .30), ey = (y - H * .5) / (H * .4);
      if (ex * ex + ey * ey > 1) continue;
      const i = (y * W + x) * 4, p = [d[i], d[i + 1], d[i + 2]];
      const lum = .3 * p[0] + .59 * p[1] + .11 * p[2];
      if (lum < 40) continue;
      if (bgCols.some((b) => dist(p, b) < 40)) continue;
      const k = q(i); const h = hist.get(k) || { n: 0, r: 0, g: 0, b: 0 };
      h.n++; h.r += p[0]; h.g += p[1]; h.b += p[2]; hist.set(k, h);
    }
    const ranked = [...hist.values()].sort((a, b) => b.n - a.n).map((h) => [h.r / h.n, h.g / h.n, h.b / h.n, h.n]);
    // merge near-identical shades, then pick 3 clearly different colours
    const picks = [];
    for (const c of ranked) {
      const same = picks.find((p) => dist(p, c) < 64);
      if (same) { same[3] += c[3]; same.m.push(c); continue; }
      const n = c.slice(); n.m = [c]; picks.push(n);
    }
    // lit colour of each cluster: the brightest quarter of its shades (anime shading darkens the average)
    const L = (c) => .3 * c[0] + .59 * c[1] + .11 * c[2];
    for (const p of picks) {
      const m = p.m.slice().sort((a, b) => L(b) - L(a)); let n = 0, r = 0, g = 0, b = 0;
      for (const c of m) { if (n >= p[3] / 4 && n) break; r += c[0] * c[3]; g += c[1] * c[3]; b += c[2] * c[3]; n += c[3]; }
      p[0] = r / n; p[1] = g / n; p[2] = b / n;
    }
    picks.sort((a, b) => b[3] - a[3]);
    if (!picks.length) return null;
    const total = picks.reduce((a, c) => a + c[3], 0);
    const keep = picks.filter((c, i) => i === 0 || c[3] > total * .04).slice(0, 3);
    const out = keep.map((c) => hex(Math.round(c[0]), Math.round(c[1]), Math.round(c[2])));
    return { body: out[0], acc: out[1] || null, acc2: out[2] || out[1] || null };
  }

  function cutout(img, maxH = 128) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const sc = Math.min(1, 512 / Math.max(iw, ih));
    const W = Math.round(iw * sc), H = Math.round(ih * sc);
    const { c, g, d } = pixels(img, W, H);
    // reference background colour = median-ish of the border
    const bs = [];
    for (let x = 0; x < W; x += 2) bs.push((x) * 4, ((H - 1) * W + x) * 4);
    for (let y = 0; y < H; y += 2) bs.push((y * W) * 4, (y * W + W - 1) * 4);
    const ref = [0, 1, 2].map((ch) => { const v = bs.map((i) => d[i + ch]).sort((a, b) => a - b); return v[v.length >> 1]; });
    const TOL = 46, seen = new Uint8Array(W * H), stack = [];
    const isBg = (p) => dist([d[p * 4], d[p * 4 + 1], d[p * 4 + 2]], ref) < TOL;
    for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
    for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
    let removed = 0;
    while (stack.length) {
      const p = stack.pop(); if (seen[p] || !isBg(p)) continue;
      seen[p] = 1; d[p * 4 + 3] = 0; removed++;
      const x = p % W, y = (p / W) | 0;
      if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1); if (y > 0) stack.push(p - W); if (y < H - 1) stack.push(p + W);
    }
    // soften the edge: half-transparent ring next to removed pixels when the colour is close to the background
    for (let p = 0; p < W * H; p++) {
      if (seen[p] || d[p * 4 + 3] === 0) continue;
      const x = p % W, y = (p / W) | 0;
      const nb = (x > 0 && seen[p - 1]) || (x < W - 1 && seen[p + 1]) || (y > 0 && seen[p - W]) || (y < H - 1 && seen[p + W]);
      if (nb && dist([d[p * 4], d[p * 4 + 1], d[p * 4 + 2]], ref) < TOL * 1.6) d[p * 4 + 3] = 140;
    }
    g.putImageData(new ImageData(d, W, H), 0, 0);
    // trim
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return { canvas: null, coverage: 0 };
    const tw = x1 - x0 + 1, th = y1 - y0 + 1, s2 = Math.min(1, maxH / th);
    const o = document.createElement('canvas'); o.width = Math.max(1, Math.round(tw * s2)); o.height = Math.max(1, Math.round(th * s2));
    const og = o.getContext('2d'); og.imageSmoothingQuality = 'high'; og.drawImage(c, x0, y0, tw, th, 0, 0, o.width, o.height);
    return { canvas: o, coverage: 1 - removed / (W * H) };
  }

  window.ArtPal = { palette, cutout };
})();
