/* Pokoboll art: a perfectly round capsule-house whose architecture follows the owner's animal combination.
   window.PokobollArt.draw(ctx, cx, cy, r, w, { now, malam, ringan })  — (cx, cy) = centre of the ball, r = radius.
   window.PokobollArt.arch(w) → feature list (for captions). Shared by the map (app.js) and the Toko card (toko.js). */
(function () {
  const has = (s, re) => re.test(s);
  const RE = {
    sisik: /naga|dragon|ular|ikan|buaya|dino|kadal|reptil|t-?rex|biawak|komodo|hiu|lele/,
    bulu: /burung|elang|phoenix|merak|ayam|bebek|angsa|garuda|hantu|gagak|kakatua|pegasus|griffin|flamingo|flamengo|malaikat/,
    cangkang: /kura|penyu|siput|kepiting/,
    sayapKelelawar: /naga|dragon|kelelawar|iblis|wyvern/,
    sayapBulu: /burung|elang|phoenix|merak|garuda|pegasus|griffin|malaikat|angsa|gagak|sayap/,
    sayapKupu: /kupu|peri|lebah|capung/,
    tanduk: /naga|dragon|unicorn|banteng|rusa|kambing|badak|kerbau|iblis|sapi/,
    telingaRuncing: /kucing|rubah|serigala|anjing|harimau|kucing|lynx|cerberus|fox/,
    telingaPanjang: /kelinci|kancil/,
    telingaBulat: /beruang|panda|hamster|tikus|koala|kudanil|monyet|singa/,
    surai: /singa|kuda|unicorn|pegasus/,
    duri: /naga|dragon|dino|landak|t-?rex|komodo|buaya/,
    ekor: /naga|dragon|rubah|kucing|ular|singa|harimau|kadal|serigala|monyet|dino|t-?rex/,
    jambul: /ayam|merak|kakatua|phoenix|burung|elang/,
    reptil: /naga|dragon|ular|buaya|dino|kadal|t-?rex|komodo/,
    api: /phoenix|api|naga/,
  };
  function arch(w) {
    const s = ((w && w.hewan) || []).join(' ').toLowerCase();
    const f = {};
    for (const k of Object.keys(RE)) f[k] = has(s, RE[k]);
    f.kulit = f.sisik ? 'sisik' : f.cangkang ? 'cangkang' : f.bulu ? 'bulu' : 'bulu-halus';
    f.sayap = f.sayapKelelawar ? 'kelelawar' : f.sayapBulu ? 'bulu' : f.sayapKupu ? 'kupu' : null;
    f.telinga = f.telingaPanjang ? 'panjang' : f.telingaRuncing ? 'runcing' : f.telingaBulat && !f.surai ? 'bulat' : null;
    f.label = [f.kulit === 'sisik' ? 'sisik' : f.kulit === 'cangkang' ? 'cangkang' : f.kulit === 'bulu' ? 'bulu' : 'bulu lembut',
      f.tanduk && 'tanduk', f.sayap && ('sayap ' + f.sayap), f.surai && 'surai', f.telinga && 'telinga', f.duri && 'duri', f.ekor && 'ekor', f.jambul && 'jambul'].filter(Boolean);
    return f;
  }
  // ---- colours
  const hex = (c) => { c = String(c || '#c8a050').replace('#', ''); if (c.length === 3) c = c.split('').map((x) => x + x).join(''); const n = parseInt(c, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgb = (a, al = 1) => `rgba(${a.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(',')},${al})`;
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  function warna(w) {
    const el = w && w.elemen && window.Creature && window.Creature.elementColor ? hex(window.Creature.elementColor(w.elemen)) : null;
    const body = w && w.pal && w.pal.body ? hex(w.pal.body) : el ? el.slice() : hex('#b08a5a');
    const acc = hex((w && w.pal && w.pal.acc) || '#d8a24a');
    const glow = el || [255, 140, 40];
    const logam = mix(body, [58, 46, 40], .5);
    return { body, acc, glow, logam, gelap: mix(logam, [20, 14, 12], .55), terang: mix(body, [255, 246, 220], .35) };
  }
  // ---- helpers
  function bentukSisik(ctx, x, y, s, C, k) { ctx.fillStyle = rgb(mix(C.logam, C.body, .25 + .35 * k)); ctx.beginPath(); ctx.moveTo(x - s, y - s * .2); ctx.quadraticCurveTo(x - s * .9, y + s * .9, x, y + s * 1.1); ctx.quadraticCurveTo(x + s * .9, y + s * .9, x + s, y - s * .2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  function bentukBulu(ctx, x, y, s, C, k) { ctx.fillStyle = rgb(mix(C.body, C.acc, .15 + .3 * k)); ctx.beginPath(); ctx.moveTo(x - s * .7, y - s * .3); ctx.quadraticCurveTo(x - s * .6, y + s * 1.2, x, y + s * 1.6); ctx.quadraticCurveTo(x + s * .6, y + s * 1.2, x + s * .7, y - s * .3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + s * 1.3); ctx.stroke(); }
  function gir(ctx, x, y, r, C) {
    ctx.fillStyle = rgb(mix(C.logam, [200, 190, 170], .25)); ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? r : r * 1.25; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = rgb(C.gelap); ctx.beginPath(); ctx.arc(x, y, r * .35, 0, Math.PI * 2); ctx.fill();
  }
  function sayap(ctx, cx, cy, r, sisi, tipe, C, kepak) {
    ctx.save(); ctx.translate(cx + sisi * r * .82, cy - r * .15); ctx.scale(sisi, 1); ctx.rotate(-.15 - kepak * .12);
    const L = r * 1.05;
    if (tipe === 'kelelawar') {
      ctx.fillStyle = rgb(mix(C.body, [120, 40, 30], .35)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L * .35, -L * .95); ctx.lineTo(L * .95, -L * .55);
      ctx.quadraticCurveTo(L * .75, -L * .35, L * .85, -L * .1); ctx.quadraticCurveTo(L * .55, -L * .12, L * .55, L * .15); ctx.quadraticCurveTo(L * .3, 0, 0, L * .25); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L * .95, -L * .55); ctx.moveTo(L * .35, -L * .95); ctx.lineTo(L * .55, L * .15); ctx.stroke();
    } else if (tipe === 'kupu') {
      for (const [ry, a] of [[-L * .45, -.5], [L * .2, .3]]) { ctx.fillStyle = rgb(mix(C.acc, [255, 255, 255], .25), .92); ctx.beginPath(); ctx.ellipse(L * .45, ry, L * .45, L * .3, a, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = rgb(C.glow, .7); ctx.beginPath(); ctx.arc(L * .5, ry, L * .1, 0, Math.PI * 2); ctx.fill(); }
    } else {
      for (let i = 0; i < 5; i++) { ctx.fillStyle = rgb(mix(C.terang, C.acc, i / 6)); ctx.beginPath(); const a = -1.1 + i * .38, len = L * (1 - i * .12); ctx.ellipse(Math.cos(a) * len * .5, Math.sin(a) * len * .5, len * .55, L * .14, a, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    }
    ctx.restore();
  }
  function draw(ctx, cx, cy, r, w, o = {}) {
    const f = arch(w), C = warna(w), now = o.now || 0, malam = !!o.malam, ringan = !!o.ringan;
    const lw = Math.max(1, r / 18);
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = '#1e1410'; ctx.lineWidth = lw;
    const kepak = Math.sin(now / 600);
    // tail (behind)
    if (f.ekor) {
      ctx.strokeStyle = '#1e1410'; ctx.lineWidth = r * .2; ctx.beginPath(); ctx.moveTo(cx - r * .55, cy + r * .7); ctx.quadraticCurveTo(cx - r * 1.35, cy + r * .9, cx - r * 1.2, cy + r * .2 + Math.sin(now / 500) * r * .08); ctx.stroke();
      ctx.strokeStyle = rgb(mix(C.logam, C.body, .4)); ctx.lineWidth = r * .14; ctx.stroke();
      ctx.fillStyle = rgb(mix(C.body, C.acc, .5)); ctx.strokeStyle = '#1e1410'; ctx.lineWidth = lw; const tx = cx - r * 1.2, ty = cy + r * .2 + Math.sin(now / 500) * r * .08;
      ctx.beginPath(); ctx.moveTo(tx - r * .14, ty + r * .05); ctx.lineTo(tx, ty - r * .26); ctx.lineTo(tx + r * .14, ty + r * .05); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (f.sayap) { sayap(ctx, cx, cy, r, -1, f.sayap, C, kepak); sayap(ctx, cx, cy, r, 1, f.sayap, C, kepak); }
    // ears / horns behind the top edge
    const topY = cy - r;
    if (f.telinga) {
      for (const s of [-1, 1]) {
        ctx.fillStyle = rgb(mix(C.body, C.logam, .2)); ctx.beginPath();
        if (f.telinga === 'panjang') ctx.ellipse(cx + s * r * .32, topY - r * .35, r * .13, r * .45, s * .25, 0, Math.PI * 2);
        else if (f.telinga === 'bulat') ctx.arc(cx + s * r * .55, topY + r * .18, r * .24, 0, Math.PI * 2);
        else { ctx.moveTo(cx + s * r * .25, topY + r * .12); ctx.lineTo(cx + s * r * .55, topY - r * .42); ctx.lineTo(cx + s * r * .72, topY + r * .32); ctx.closePath(); }
        ctx.fill(); ctx.stroke();
        if (f.telinga === 'runcing') { ctx.fillStyle = rgb(C.acc); ctx.beginPath(); ctx.moveTo(cx + s * r * .36, topY + r * .14); ctx.lineTo(cx + s * r * .54, topY - r * .2); ctx.lineTo(cx + s * r * .63, topY + r * .26); ctx.closePath(); ctx.fill(); }
      }
    }
    if (f.surai) {
      for (let i = 0; i < 13; i++) { const a = Math.PI + .2 + i / 12 * (Math.PI - .4), rr = r * 1.18; ctx.fillStyle = rgb(mix(C.acc, [150, 80, 30], (i % 2) * .25)); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a - .14) * r * .92, cy + Math.sin(a - .14) * r * .92); ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); ctx.lineTo(cx + Math.cos(a + .14) * r * .92, cy + Math.sin(a + .14) * r * .92); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
    // ---- the perfect sphere
    const g = ctx.createRadialGradient(cx - r * .35, cy - r * .4, r * .1, cx, cy, r);
    g.addColorStop(0, rgb(C.terang)); g.addColorStop(.55, rgb(mix(C.body, C.logam, .45))); g.addColorStop(1, rgb(C.gelap));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // skin texture (clipped)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - lw * .5, 0, Math.PI * 2); ctx.clip(); ctx.lineWidth = Math.max(.6, lw * .55); ctx.strokeStyle = 'rgba(20,12,10,.75)';
    const detail = ringan ? .75 : 1, s0 = r * (f.kulit === 'cangkang' ? .3 : f.kulit === 'bulu' ? .2 : .23) / detail;
    if (f.kulit === 'cangkang') {
      for (let yy = -r; yy < r + s0; yy += s0 * 1.5) for (let xx = -r; xx < r + s0; xx += s0 * 1.75) {
        const ox = ((Math.round((yy + r) / (s0 * 1.5))) % 2) * s0 * .87, X = cx + xx + ox, Y = cy + yy; const k = 1 - Math.hypot(X - cx, Y - cy) / r; if (k < -.1) continue;
        ctx.fillStyle = rgb(mix(C.logam, C.body, .3 + .4 * Math.max(0, k))); ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; ctx.lineTo(X + Math.cos(a) * s0 * .8, Y + Math.sin(a) * s0 * .8); } ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    } else if (f.kulit === 'sisik' || f.kulit === 'bulu') {
      let row = 0;
      for (let yy = -r * 1.05; yy < r * 1.05; yy += s0 * .8, row++) {
        const lat = Math.sqrt(Math.max(.05, 1 - (yy / r) ** 2)), sx = s0 * 1.5 * lat;
        for (let xx = -r; xx < r + sx; xx += sx) {
          const X = cx + xx + (row % 2) * sx * .5, Y = cy + yy; const k = 1 - Math.hypot(X - cx + r * .3, Y - cy + r * .3) / (r * 1.6);
          (f.kulit === 'sisik' ? bentukSisik : bentukBulu)(ctx, X, Y, s0 * .85 * Math.max(.5, lat), C, Math.max(0, k));
        }
      }
    } else {
      ctx.strokeStyle = rgb(mix(C.gelap, C.body, .3), .8);
      for (let i = 0; i < 90 * detail; i++) { const a = i * 2.39996, d = Math.sqrt(i / (90 * detail)) * r; const X = cx + Math.cos(a) * d, Y = cy + Math.sin(a) * d; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + r * .05, Y + r * .1); ctx.stroke(); }
    }
    // roundness shading over the texture
    const sh = ctx.createRadialGradient(cx - r * .35, cy - r * .45, r * .05, cx, cy, r * 1.02);
    sh.addColorStop(0, 'rgba(255,250,235,.35)'); sh.addColorStop(.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = sh; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    // glowing seams around the equator
    const pul = .65 + .35 * Math.sin(now / 350);
    ctx.fillStyle = rgb(C.glow, (malam ? .95 : .75) * pul); ctx.fillRect(cx - r, cy - r * .2, r * 2, r * .07); ctx.fillRect(cx - r, cy + r * .13, r * 2, r * .07);
    // metal band
    const bg = ctx.createLinearGradient(0, cy - r * .14, 0, cy + r * .14); bg.addColorStop(0, rgb(mix(C.logam, [210, 200, 180], .45))); bg.addColorStop(.5, rgb(C.logam)); bg.addColorStop(1, rgb(C.gelap));
    ctx.fillStyle = bg; ctx.fillRect(cx - r, cy - r * .13, r * 2, r * .26); ctx.lineWidth = lw * .7; ctx.strokeStyle = '#1e1410'; ctx.strokeRect(cx - r, cy - r * .13, r * 2, r * .26);
    ctx.fillStyle = rgb(mix(C.logam, [240, 230, 200], .5)); for (let i = -4; i <= 4; i++) { if (Math.abs(i) < 2) continue; const X = cx + i * r * .2; ctx.beginPath(); ctx.arc(X, cy, r * .028, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // side gear (right) like a mechanism
    gir(ctx, cx + r * .7, cy + r * .02, r * .13, C);
    // the eye (lens) in the centre of the band
    const er = r * .33;
    ctx.fillStyle = rgb(mix(C.logam, [230, 220, 200], .35)); ctx.beginPath(); ctx.arc(cx, cy, er * 1.32, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rgb(C.gelap); ctx.beginPath(); ctx.arc(cx, cy, er * 1.12, 0, Math.PI * 2); ctx.fill();
    if (!ringan) { const hg = ctx.createRadialGradient(cx, cy, er * .2, cx, cy, er * 2.2); hg.addColorStop(0, rgb(C.glow, .5 * pul)); hg.addColorStop(1, rgb(C.glow, 0)); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cx, cy, er * 2.2, 0, Math.PI * 2); ctx.fill(); }
    const ig = ctx.createRadialGradient(cx, cy, er * .1, cx, cy, er); ig.addColorStop(0, 'rgb(255,248,200)'); ig.addColorStop(.35, rgb(mix(C.glow, [255, 230, 120], .4))); ig.addColorStop(1, rgb(mix(C.glow, [90, 10, 0], .45)));
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(cx, cy, er, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#140806';
    const kedip = malam && o.tidur ? .12 : 1;
    if (f.reptil) { ctx.beginPath(); ctx.ellipse(cx, cy, er * .17, er * .8 * kedip, 0, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.ellipse(cx, cy, er * .38, er * .38 * kedip, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(cx - er * .38, cy - er * .4, er * .16, 0, Math.PI * 2); ctx.fill();
    // spikes / crest along the top
    if (f.duri) { for (let i = -3; i <= 3; i++) { const a = -Math.PI / 2 + i * .26, X = cx + Math.cos(a) * r * .98, Y = cy + Math.sin(a) * r * .98; ctx.fillStyle = rgb(mix(C.logam, C.acc, .3)); ctx.beginPath(); ctx.moveTo(X + Math.cos(a + 1.57) * r * .08, Y + Math.sin(a + 1.57) * r * .08); ctx.lineTo(X + Math.cos(a) * r * .22, Y + Math.sin(a) * r * .22); ctx.lineTo(X - Math.cos(a + 1.57) * r * .08, Y - Math.sin(a + 1.57) * r * .08); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
    if (f.jambul && !f.duri) { for (let i = -1; i <= 1; i++) { ctx.fillStyle = rgb(i ? C.acc : C.glow); ctx.beginPath(); ctx.ellipse(cx + i * r * .14, topY - r * .14, r * .07, r * .22, i * .4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } }
    if (f.tanduk) {
      for (const s of [-1, 1]) { ctx.fillStyle = rgb(mix([235, 220, 190], C.logam, .25)); ctx.beginPath(); ctx.moveTo(cx + s * r * .28, topY + r * .16); ctx.quadraticCurveTo(cx + s * r * .45, topY - r * .2, cx + s * r * .62, topY - r * .5); ctx.quadraticCurveTo(cx + s * r * .5, topY - r * .05, cx + s * r * .46, topY + r * .24); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
    // outline of the sphere
    ctx.lineWidth = lw * 1.2; ctx.strokeStyle = '#1e1410'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    // specular highlight
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(cx - r * .42, cy - r * .55, r * .16, r * .08, -.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  window.PokobollArt = { draw, arch };
})();
