// High-detail creature painter for Mega Evolution and higher (tier index >= 2).
// Same 36-unit layout as the pixel creature (feet on row 31), painted 4x finer with
// shading, anime eyes and species features so each animal is easy to recognise.
(function () {
  const R = 4, F = 36, OL = '#2b1b17';
  const X = 18;                       // centre line
  const HY = 16.6, HRX = 6.5, HRY = 5.7; // head
  const BY = 24.4, BRX = 6.4, BRY = 5.4; // body
  const FOOT = 30.6;

  function shade(hex, f) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return '#' + ((1 << 24) | (c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).slice(1);
  }
  function mix(a, b, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (((n >> 16) & 255) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11) / 255; };

  const SP = {
    ninetail: /sembilan|kyubi|nine ?tail/, fox: /rubah|fox/, cat: /kucing|cat|kitten/, tiger: /harimau|tiger|macan(?! tutul)/,
    leopard: /tutul|leopard|cheetah|jaguar/, lion: /singa|lion/, wolf: /serigala|wolf|husky/, dog: /anjing|dog|puppy/,
    rabbit: /kelinci|rabbit|bunny/, deer: /rusa|deer|kijang/, bear: /beruang|bear|badan beruang/, panda: /panda/,
    hamster: /hamster|tikus|mouse/, squirrel: /tupai|squirrel/, monkey: /monyet|kera|monkey/, gorilla: /gorila|gorilla/,
    dragon: /naga|dragon/, lizard: /kadal|iguana|cicak|tokek|buaya|komodo|t-rex|trex|dino/, snake: /ular|snake/,
    frog: /katak|kodok|frog/, fish: /ikan|fish/, shark: /hiu|shark/, whale: /paus|whale/, dolphin: /lumba|dolphin/,
    octopus: /gurita|octopus|cumi|tentakel/, chicken: /ayam|chick/, duck: /bebek|duck/, platypus: /platipus|platypus/,
    eagle: /elang|eagle|garuda|burung|bird|gagak|crow|merpati/, penguin: /pinguin|penguin/, phoenix: /phoenix|feniks/,
    peacock: /merak|peacock/, butterfly: /kupu|butterfly/, bee: /lebah|bee/, horse: /kuda|horse|pegasus/,
    unicorn: /unicorn|unikon/, elephant: /gajah|elephant/, rhino: /badak|rhino/, turtle: /kura|penyu|turtle/,
    axolotl: /axolotl/, sheep: /domba|sheep/, pig: /babi|pig/, cow: /sapi|cow|kerbau/, hippo: /kudanil|hippo/,
    bat: /kelelawar|bat/, robot: /robot/, ice: /es\b|salju|ice/,
  };

  function paint(w, o) {
    const has = (k) => SP[k].test(o.all);
    const first = (k) => SP[k].test(o.hewan[0] || '');
    const tone = (k) => (first(k) ? o.body : o.acc);
    const { tier, seed, god } = o;
    let body = o.body, belly = o.belly;
    const acc = o.acc, acc2 = o.acc2;
    if (has('penguin') && first('penguin')) belly = '#f4f4f0';
    if (has('panda')) { body = first('panda') ? '#f4f4f0' : body; }
    const eyeCol = o.elCol || (tier >= 3 ? '#7a3fb0' : '#3f6fd0');

    const mk = () => { const c = document.createElement('canvas'); c.width = c.height = F * R; const g = c.getContext('2d'); g.scale(R, R); g.lineJoin = 'round'; g.lineCap = 'round'; return [c, g]; };
    const [back, b] = mk();   // glow/aura (not outlined)
    const [cc, g] = mk();     // creature
    const [front, fx] = mk(); // sparkles in front (not outlined)

    // ---------- drawing helpers on ctx
    const E = (ctx, cx, cy, rx, ry, fill, rot = 0) => { ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(.1, rx), Math.max(.1, ry), rot, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); };
    const shaded = (ctx, cx, cy, rx, ry, base, rot = 0) => {
      const gr = ctx.createRadialGradient(cx - rx * .38, cy - ry * .45, .2, cx, cy, Math.max(rx, ry) * 1.25);
      gr.addColorStop(0, shade(base, 1.22)); gr.addColorStop(.5, base); gr.addColorStop(1, shade(base, .74));
      E(ctx, cx, cy, rx, ry, gr, rot);
    };
    const poly = (ctx, pts, fill, stroke, lw = .45) => {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
    };
    const path = (ctx, fn, fill, stroke, lw = .45) => { ctx.beginPath(); fn(ctx); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } };
    const line = (ctx, pts, col, lw = .4) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); };
    const rnd = (i) => ((seed >>> (i % 24)) ^ (seed * (i + 7))) % 1000 / 1000;

    // =============== AURA (Mega Evolution element)
    if (o.elCol) {
      const gr = b.createRadialGradient(X, 21, 1, X, 21, 17);
      gr.addColorStop(0, o.elCol + 'aa'); gr.addColorStop(.6, o.elCol + '44'); gr.addColorStop(1, o.elCol + '00');
      b.fillStyle = gr; b.fillRect(0, 0, F, F);
      const el = String(w.elemen || '').toLowerCase();
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2 + seed % 7, r = 13 + rnd(i) * 3, px = X + Math.cos(a) * r, py = 20 + Math.sin(a) * r * .8;
        if (/api|fire/.test(el)) path(fx, (c) => { c.moveTo(px, py + 1.4); c.quadraticCurveTo(px + 1.2, py, px, py - 1.8); c.quadraticCurveTo(px - 1.2, py, px, py + 1.4); }, i % 2 ? '#ffd23f' : o.elCol);
        else if (/petir|listrik|thunder/.test(el)) line(fx, [[px - .8, py - 1.4], [px + .4, py - .2], [px - .4, py + .2], [px + .8, py + 1.4]], '#ffe23a', .45);
        else if (/es|ice|salju/.test(el)) { for (let k = 0; k < 3; k++) { const aa = k * Math.PI / 3; line(fx, [[px - Math.cos(aa), py - Math.sin(aa)], [px + Math.cos(aa), py + Math.sin(aa)]], '#ffffff', .3); } }
        else if (/daun|leaf|alam/.test(el)) E(fx, px, py, 1, .5, i % 2 ? '#5fd04a' : '#3fa03a', a);
        else if (/air|water/.test(el)) path(fx, (c) => { c.moveTo(px, py - 1.3); c.quadraticCurveTo(px + 1, py + .3, px, py + .8); c.quadraticCurveTo(px - 1, py + .3, px, py - 1.3); }, '#9fd8ff');
        else if (/gelap|dark|bayang/.test(el)) E(fx, px, py, 1.1, .8, 'rgba(60,20,90,.55)');
        else if (/tanah|batu|earth/.test(el)) poly(fx, [[px - .8, py + .6], [px, py - .9], [px + .9, py + .4]], '#9a6a3a');
        else { E(fx, px, py, .35, 1.2, '#fff6c8'); E(fx, px, py, 1.2, .35, '#fff6c8'); }
      }
    }
    if (god === 'roh' || god === 'ilahi') {
      const gr = b.createRadialGradient(X, 19, 1, X, 19, 16); gr.addColorStop(0, 'rgba(255,246,200,.9)'); gr.addColorStop(1, 'rgba(255,246,200,0)');
      b.fillStyle = gr; b.fillRect(0, 0, F, F);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; line(b, [[X + Math.cos(a) * 9, 19 + Math.sin(a) * 9], [X + Math.cos(a) * 17, 19 + Math.sin(a) * 17]], 'rgba(255,236,150,.6)', .5); }
    }

    // =============== CAPE (Legendary outfit) behind everything
    if (tier >= 4) {
      const oc = o.outfitCol;
      path(g, (c) => { c.moveTo(X - 5, 20.5); c.lineTo(X + 5, 20.5); c.quadraticCurveTo(X + 10, 27, X + 10.5, 31.5); c.lineTo(X - 10.5, 31.5); c.quadraticCurveTo(X - 10, 27, X - 5, 20.5); }, shade(oc, .85));
      line(g, [[X - 6, 31], [X - 4.5, 24]], shade(oc, .65), .35); line(g, [[X + 6, 31], [X + 4.5, 24]], shade(oc, .65), .35);
    }

    // =============== WINGS
    const wingFeather = has('eagle') || has('chicken') || has('duck') || has('phoenix') || has('peacock') || (has('horse') && /pegasus/.test(o.all));
    const wingBat = has('dragon') || has('bat');
    const wingBug = has('butterfly') || has('bee');
    if (wingFeather || wingBat || wingBug || tier >= 4) {
      const wc = wingBat ? (first('dragon') ? shade(body, .9) : acc) : wingBug ? (first('butterfly') || first('bee') ? body : acc) : (has('phoenix') ? '#f05a32' : (first('eagle') || first('chicken') || first('duck') ? shade(body, .92) : acc));
      for (const s of [-1, 1]) {
        if (wingBug) {
          shaded(g, X + s * 8.5, 16.5, 5, 4.2, wc, s * -.5); shaded(g, X + s * 7, 23, 3.4, 2.8, shade(wc, .9), s * .4);
          E(g, X + s * 9.5, 15.8, 1.3, 1.1, '#fff6d6'); E(g, X + s * 9.5, 15.8, .6, .5, OL); E(g, X + s * 7.3, 23.2, .8, .7, '#fff6d6');
          if (has('bee')) for (let k = 0; k < 2; k++) line(g, [[X + s * (5 + k * 2.6), 13.5], [X + s * (6.5 + k * 2.6), 19.5]], shade(wc, .7), .3);
        } else if (wingBat) {
          const tip = [X + s * 16, 9.5], sh = [X + s * 4, 19];
          path(g, (c) => { c.moveTo(sh[0], sh[1]); c.lineTo(tip[0], tip[1]); c.quadraticCurveTo(X + s * 14.5, 16, X + s * 15, 20); c.quadraticCurveTo(X + s * 12, 17.5, X + s * 11, 21.5); c.quadraticCurveTo(X + s * 8.5, 19.5, X + s * 7, 23); c.closePath(); }, shade(wc, .95));
          line(g, [sh, [X + s * 9, 13], tip], shade(wc, .6), .55);
          line(g, [[X + s * 9, 13], [X + s * 15, 20]], shade(wc, .7), .3); line(g, [[X + s * 9, 13], [X + s * 11, 21.5]], shade(wc, .7), .3);
          E(g, tip[0], tip[1], .5, .5, '#f4f0ea');
        } else {
          const tip = [X + s * 15.5, 11];
          path(g, (c) => {
            c.moveTo(X + s * 4, 18.5); c.quadraticCurveTo(X + s * 9, 11, tip[0], tip[1]);
            c.quadraticCurveTo(X + s * 15.5, 16, X + s * 14, 18.5); c.quadraticCurveTo(X + s * 13, 19.5, X + s * 12.2, 21);
            c.quadraticCurveTo(X + s * 10.5, 21.2, X + s * 9.8, 22.6); c.quadraticCurveTo(X + s * 8, 22.6, X + s * 7, 24); c.closePath();
          }, wc);
          path(g, (c) => { c.moveTo(X + s * 4.5, 18.5); c.quadraticCurveTo(X + s * 9, 12.5, X + s * 14, 12.8); c.quadraticCurveTo(X + s * 10, 15, X + s * 5.5, 20.5); c.closePath(); }, shade(wc, 1.18));
          for (let k = 0; k < 3; k++) line(g, [[X + s * (7 + k * 2.2), 20 - k * .6], [X + s * (9 + k * 2.2), 22.5 - k * 1.4]], shade(wc, .7), .3);
        }
      }
    }

    // =============== TAILS
    const tailCol = (k) => (first(k) ? shade(body, .95) : acc);
    if (has('ninetail')) {
      const tc = tailCol('ninetail');
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI * .95 + i * Math.PI * .9 / 8, ex = X + Math.cos(a) * 12.5, ey = 24 + Math.sin(a) * 11;
        path(g, (c) => { c.moveTo(X + 1, 26); c.quadraticCurveTo((X + ex) / 2 + 2, (26 + ey) / 2 + 2, ex, ey); c.quadraticCurveTo((X + ex) / 2 - 1, (26 + ey) / 2 - 1, X - 1, 25); }, tc);
        E(g, ex, ey, 1.4, 1.1, '#f4f0ea', a);
      }
    } else if (has('fox') || has('squirrel')) {
      const tc = tailCol(has('fox') ? 'fox' : 'squirrel');
      path(g, (c) => { c.moveTo(X + 4, 28); c.quadraticCurveTo(X + 13, 29, X + 13.5, 21); c.quadraticCurveTo(X + 14, 14.5, X + 9.5, 13.5); c.quadraticCurveTo(X + 12, 18, X + 8.5, 22); c.quadraticCurveTo(X + 6.5, 25, X + 3, 25.5); c.closePath(); }, tc);
      line(g, [[X + 6, 26.5], [X + 11.5, 22], [X + 11.5, 17]], shade(tc, .75), .35);
      if (has('fox')) path(g, (c) => { c.moveTo(X + 9.5, 13.5); c.quadraticCurveTo(X + 14, 14.5, X + 13.7, 18.5); c.quadraticCurveTo(X + 11.5, 16.5, X + 9.5, 13.5); }, '#f8f4ee');
    } else if (has('dragon') || has('lizard') || has('snake')) {
      const tc = has('snake') && first('snake') ? body : tailCol(has('dragon') ? 'dragon' : 'lizard');
      path(g, (c) => { c.moveTo(X + 3, 26); c.quadraticCurveTo(X + 11, 31, X + 15.5, 25.5); c.quadraticCurveTo(X + 12, 28.5, X + 4, 29.5); c.closePath(); }, tc);
      if (has('dragon')) { for (let k = 0; k < 3; k++) { const t = .35 + k * .22, px = X + 3 + 12 * t, py = 27.5 - 3 * t + Math.sin(t * 3) * .5; poly(g, [[px - .9, py], [px, py - 1.9], [px + .9, py]], acc2 === acc ? shade(tc, .7) : acc2); } poly(g, [[X + 15.5, 25.5], [X + 17, 23.5], [X + 16.6, 26.6]], acc2 === acc ? shade(tc, .7) : acc2); }
    } else if (has('fish') || has('shark') || has('whale') || has('dolphin')) {
      const tc = tailCol(has('fish') ? 'fish' : has('shark') ? 'shark' : has('whale') ? 'whale' : 'dolphin');
      path(g, (c) => { c.moveTo(X + 4, 25); c.lineTo(X + 10, 22.5); c.quadraticCurveTo(X + 14.5, 19.5, X + 15.5, 18); c.quadraticCurveTo(X + 14, 23.5, X + 15.5, 30); c.quadraticCurveTo(X + 13, 28, X + 10, 27.5); c.lineTo(X + 4, 28); c.closePath(); }, tc);
      for (let k = 0; k < 3; k++) line(g, [[X + 10.5, 24.5 + k], [X + 14.5, 20 + k * 3.6]], shade(tc, .75), .3);
    } else if (has('horse') || has('unicorn') || has('lion')) {
      const hc = has('unicorn') ? '#c79ae8' : has('lion') ? shade(acc === body ? '#b8742a' : acc, .9) : shade(acc, .9);
      if (has('lion')) { line(g, [[X + 4, 27], [X + 9, 27.5], [X + 11, 23]], shade(body, .85), .9); E(g, X + 11.2, 22.4, 1.5, 1.8, hc); }
      else for (let k = 0; k < 4; k++) path(g, (c) => { c.moveTo(X + 4, 25 + k * .4); c.quadraticCurveTo(X + 12, 22 + k, X + 11 + k * .6, 31); c.quadraticCurveTo(X + 9, 27, X + 4, 26.5 + k * .4); }, k % 2 ? hc : shade(hc, 1.15));
    } else if (has('cat') || has('tiger') || has('leopard') || has('monkey') || has('dog') || has('wolf')) {
      const tc = shade(body, .95);
      const curl = has('monkey');
      path(g, (c) => { c.moveTo(X + 4, 27); c.quadraticCurveTo(X + 11, 29, X + 11, 22); c.quadraticCurveTo(X + 11, curl ? 17 : 18, X + (curl ? 8 : 12.5), curl ? 18 : 16.5); }, null, tc, has('wolf') || has('dog') ? 2.6 : 1.6);
      if (has('wolf') || has('dog')) E(g, X + 12, 17, 1.4, 1.2, shade(body, 1.15));
      if (has('tiger')) for (let k = 0; k < 3; k++) line(g, [[X + 8.5 + k * 1, 25 - k * 2.4], [X + 10.8 + k * .6, 25.6 - k * 2.4]], '#3a2418', .5);
    } else if (has('phoenix') || has('peacock')) {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * .85 + i * .38, ex = X + 4 + Math.cos(a) * 13, ey = 26 + Math.sin(a) * 10;
        path(g, (c) => { c.moveTo(X + 3, 26); c.quadraticCurveTo(ex - 2, ey + 3, ex, ey); c.quadraticCurveTo(ex + 1, ey + 2, X + 4, 27.5); }, has('phoenix') ? (i % 2 ? '#ffd23f' : '#f05a32') : '#2f8f9a');
        if (has('peacock')) { E(g, ex - .3, ey + .6, 1, .8, '#3fae5a'); E(g, ex - .3, ey + .6, .5, .4, '#3f3fb0'); }
      }
    } else if (has('rabbit') || has('sheep') || has('bear') || has('hamster') || has('panda') || has('pig') || seed % 3 === 0) {
      E(g, X + 6.2, 27, 1.8, 1.6, has('rabbit') ? '#ffffff' : shade(body, has('pig') ? .9 : 1.05));
    }

    // =============== TENTACLES (octopus)
    if (has('octopus')) {
      const tc = first('octopus') ? body : acc;
      for (let i = -3; i <= 3; i++) {
        const sx = X + i * 1.8;
        path(g, (c) => { c.moveTo(sx - .9, 26); c.quadraticCurveTo(sx + i * .8, 31, sx + i * 1.4 + (i % 2 ? 1 : -1), 32); c.quadraticCurveTo(sx + i * .6, 30.5, sx + .9, 26); }, i % 2 ? tc : shade(tc, .88));
        if (Math.abs(i) < 3) E(g, sx + i * .7, 29.5, .35, .35, shade(tc, 1.3));
      }
    }

    // =============== LEGS / FEET (behind body bottom)
    const footCol = shade(body, .82);
    const bird = (has('eagle') || has('chicken') || has('duck') || has('penguin') || has('phoenix') || has('peacock')) && (first('eagle') || first('chicken') || first('duck') || first('penguin') || first('phoenix') || first('peacock'));
    const hoof = has('horse') || has('unicorn') || has('deer') || has('cow') || has('pig') || has('sheep');
    if (has('snake') && first('snake')) {
      shaded(g, X, 28.5, 8, 2.6, shade(body, .95));
      line(g, [[X - 7, 28.5], [X + 7, 28.5]], shade(body, .7), .3);
    } else if (bird) {
      const fc = has('penguin') ? '#f5862c' : '#f2a03a';
      for (const s of [-1, 1]) { line(g, [[X + s * 2.4, 28], [X + s * 2.4, 30.3]], fc, .6); for (const d of [-1, 0, 1]) line(g, [[X + s * 2.4, 30.3], [X + s * 2.4 + d * 1.1, FOOT + .3]], fc, .5); }
    } else {
      for (const s of [-1, 1]) {
        shaded(g, X + s * 3.3, 28.9, 2.2, 1.9, footCol);
        if (hoof) E(g, X + s * 3.3, 30.3, 1.9, .8, '#4a3a2e');
        else { line(g, [[X + s * 3.3 - .6, 30], [X + s * 3.3 - .6, 30.7]], shade(footCol, .7), .25); line(g, [[X + s * 3.3 + .6, 30], [X + s * 3.3 + .6, 30.7]], shade(footCol, .7), .25); }
      }
    }

    // =============== BODY
    if (!(has('snake') && first('snake'))) {
      shaded(g, X, BY, BRX, BRY, body);
      // belly
      g.save(); path(g, (c) => c.ellipse(X, BY, BRX, BRY, 0, 0, Math.PI * 2)); g.clip();
      shaded(g, X, BY + 2, 3.8, 3.6, belly);
      // body patterns
      if (has('tiger')) for (let k = 0; k < 4; k++) { const sx = X - 5.5 + k * 3.6; path(g, (c) => { c.moveTo(sx, BY - 5); c.quadraticCurveTo(sx + 1.4, BY - 2, sx + .2, BY + 1); c.quadraticCurveTo(sx + .6, BY - 2, sx - .6, BY - 5); }, '#3a2418'); }
      if (has('leopard') || /jerapah|giraffe|sapi|cow/.test(o.all)) for (let k = 0; k < 7; k++) { const sx = X - 5 + rnd(k) * 10, sy = BY - 4 + rnd(k + 9) * 6; E(g, sx, sy, .9, .7, has('leopard') ? '#3a2a20' : '#5a3a2a'); if (has('leopard')) E(g, sx, sy, .4, .3, shade(body, 1.1)); }
      if (has('dragon') || has('lizard') || (has('snake'))) for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) path(g, (c) => { const sx = X - 5 + k * 2.4 + (r % 2) * 1.2, sy = BY - 4.5 + r * 1.7; c.arc(sx, sy, .9, 0, Math.PI); }, null, shade(body, .78), .25);
      if (has('eagle') || has('chicken') || has('duck') || has('phoenix') || has('penguin')) for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) path(g, (c) => { const sx = X - 4.4 + k * 2.6 + (r % 2) * 1.3, sy = BY - 3.8 + r * 1.9; c.arc(sx, sy, 1.1, .2, Math.PI - .2); }, null, shade(body, .8), .25);
      if (has('sheep')) for (let k = 0; k < 9; k++) E(g, X - 5 + (k % 5) * 2.5, BY - 3.5 + Math.floor(k / 5) * 2.6, 1.4, 1.2, shade('#f4f0ea', 1 - (k % 2) * .05));
      if (has('robot') || god === 'mecha' || god === 'beast' || god === 'cyborg') { line(g, [[X - 6, BY], [X + 6, BY]], '#5c6678', .3); line(g, [[X, BY - 5], [X, BY + 5]], '#5c6678', .3); E(g, X - 3.5, BY + 2.5, .4, .4, '#ffd23f'); E(g, X + 3.5, BY + 2.5, .4, .4, '#ffd23f'); }
      g.restore();
    }
    // shell
    if (has('turtle')) {
      const sc = first('turtle') ? shade(body, .75) : acc;
      shaded(g, X + .5, BY - 1.6, 6.2, 4.3, sc);
      for (let k = -1; k <= 1; k++) poly(g, [[X + k * 3.4 - 1.3, BY - 3], [X + k * 3.4 + 1.3, BY - 3], [X + k * 3.4 + 1.8, BY - 1.4], [X + k * 3.4 + 1.3, BY + .1], [X + k * 3.4 - 1.3, BY + .1], [X + k * 3.4 - 1.8, BY - 1.4]], null, shade(sc, .7), .3);
    }
    // gorilla: dark broad chest
    if (has('gorilla')) { shaded(g, X, BY - .5, 4.4, 3.6, shade(first('gorilla') ? body : '#3a3640', 1.25)); }

    // =============== MANE (lion / horse / unicorn) behind head
    if (has('lion')) {
      const mc = acc === body ? '#b8742a' : acc;
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; E(g, X + Math.cos(a) * 6.6, HY + .6 + Math.sin(a) * 6, 2.4, 2.1, i % 2 ? mc : shade(mc, .86), a); }
    }
    if (has('horse') || has('unicorn')) {
      const cols = has('unicorn') ? ['#f48cb0', '#c79ae8', '#7cc0e8', '#ffd23f'] : [shade(acc, .9), acc];
      for (let k = 0; k < 5; k++) path(g, (c) => { const sx = X - 3 + k * 1.6; c.moveTo(sx, HY - 5.4); c.quadraticCurveTo(sx + 4.5, HY - 3, X + 6 + k * .5, HY + 3 + k * 1.3); c.quadraticCurveTo(sx + 3.5, HY - 2, sx - 1.2, HY - 5); }, cols[k % cols.length]);
    }

    // =============== EARS
    const pointy = has('cat') || has('fox') || has('wolf') || has('dog') || has('tiger') || has('leopard') || has('lion') || has('squirrel') || has('ninetail');
    const earCol = (k) => tone(k);
    if (has('rabbit')) {
      const ec = earCol('rabbit');
      for (const s of [-1, 1]) { shaded(g, X + s * 3.1, HY - 8, 1.9, 5.2, ec, s * .18); E(g, X + s * 3.1, HY - 7.8, .9, 4, '#f5aab8', s * .18); }
    } else if (pointy) {
      const ec = earCol(has('cat') ? 'cat' : has('fox') ? 'fox' : has('wolf') ? 'wolf' : has('tiger') ? 'tiger' : has('lion') ? 'lion' : has('dog') ? 'dog' : 'squirrel');
      for (const s of [-1, 1]) {
        poly(g, [[X + s * 6.2, HY - .8], [X + s * 5.2, HY - 9.3], [X + s * 1.2, HY - 4.6]], ec);
        poly(g, [[X + s * 5.2, HY - 2.2], [X + s * 4.9, HY - 7.3], [X + s * 2.6, HY - 4.6]], has('fox') ? '#f8f4ee' : '#f5aab8');
        if (has('fox')) poly(g, [[X + s * 5.4, HY - 7.6], [X + s * 5.2, HY - 9.3], [X + s * 4.3, HY - 8.1]], '#3a2418');
        if (has('squirrel') || has('lion')) E(g, X + s * 5.3, HY - 8.6, .6, .8, shade(ec, .7));
      }
    } else if (has('elephant')) {
      for (const s of [-1, 1]) { shaded(g, X + s * 7.6, HY + .5, 3.6, 4.6, first('elephant') ? body : acc); E(g, X + s * 7.8, HY + .8, 2.3, 3.2, '#e8a0a8'); }
    } else if (has('horse') || has('unicorn') || has('deer') || has('cow') || has('pig')) {
      const ec = has('horse') || has('unicorn') ? earCol(has('horse') ? 'horse' : 'unicorn') : body;
      for (const s of [-1, 1]) { shaded(g, X + s * 5, HY - 5.6, 1.4, 2.6, ec, s * .5); E(g, X + s * 5, HY - 5.4, .6, 1.6, '#f5aab8', s * .5); }
    } else if (has('dragon') || has('lizard')) {
      const fc = acc2 === acc ? shade(body, .7) : acc2;
      for (const s of [-1, 1]) path(g, (c) => { c.moveTo(X + s * 5.5, HY - 2); c.lineTo(X + s * 9.5, HY - 4.5); c.lineTo(X + s * 8.3, HY - 1.8); c.lineTo(X + s * 9.8, HY - .4); c.lineTo(X + s * 6, HY + .8); c.closePath(); }, fc);
    } else if (has('bear') || has('panda') || has('hamster') || has('monkey') || has('gorilla') || has('hippo') || (!has('eagle') && !has('chicken') && !has('duck') && !has('fish') && !has('snake') && !has('frog') && !has('turtle') && !has('octopus') && !has('penguin') && !has('phoenix'))) {
      const ec = has('panda') ? '#2f2a2a' : has('monkey') ? shade(body, .9) : shade(body, .88);
      const big = has('monkey') || has('hamster');
      for (const s of [-1, 1]) { shaded(g, X + s * (big ? 6.6 : 5), HY - (big ? 1 : 4.6), big ? 2.2 : 2.1, big ? 2.4 : 2, ec); E(g, X + s * (big ? 6.6 : 5), HY - (big ? 1 : 4.6), 1, 1.1, has('panda') ? '#4a4040' : '#f0b8a8'); }
    }

    if (has('axolotl')) {
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const a = -.75 + k * .6; path(g, (c) => { const bx = X + s * 5, by = HY - .6 + k * 1.5, ex = bx + s * Math.cos(a) * 4.8, ey = by + Math.sin(a) * 3.6; c.moveTo(bx, by - .55); c.quadraticCurveTo(ex, ey - 1.1, ex, ey); c.quadraticCurveTo(ex - s * .6, ey + 1, bx, by + .55); }, k % 2 ? '#f48cb0' : '#e8607a'); }
    }
    // =============== HEAD
    shaded(g, X, HY, HRX, HRY, body);
    g.save(); path(g, (c) => c.ellipse(X, HY, HRX, HRY, 0, 0, Math.PI * 2)); g.clip();
    if (has('fox')) for (const s of [-1, 1]) E(g, X + s * 3.5, HY + 3, 3.4, 2.7, '#f8f4ee');
    if (has('wolf') || has('dog')) E(g, X, HY + 3.3, 4.6, 2.8, shade(body, 1.22));
    if (has('tiger')) { for (const s of [-1, 1]) for (let k = 0; k < 2; k++) line(g, [[X + s * 6.4, HY - 1 + k * 2], [X + s * 4.2, HY - .3 + k * 2]], '#3a2418', .5); line(g, [[X - 1.2, HY - 5.5], [X - .8, HY - 3.6]], '#3a2418', .5); line(g, [[X, HY - 5.8], [X, HY - 3.4]], '#3a2418', .5); line(g, [[X + 1.2, HY - 5.5], [X + .8, HY - 3.6]], '#3a2418', .5); }
    if (has('leopard')) for (let k = 0; k < 5; k++) E(g, X - 4 + rnd(k + 3) * 8, HY - 4 + rnd(k + 11) * 3, .6, .5, '#3a2a20');
    if (has('monkey') || has('gorilla')) path(g, (c) => { c.moveTo(X, HY - 1.2); c.bezierCurveTo(X - 2, HY - 3.6, X - 5.6, HY - 1.4, X - 4.2, HY + 2); c.bezierCurveTo(X - 3, HY + 5.5, X + 3, HY + 5.5, X + 4.2, HY + 2); c.bezierCurveTo(X + 5.6, HY - 1.4, X + 2, HY - 3.6, X, HY - 1.2); }, has('gorilla') ? '#7a7280' : '#f2cfa0');
    if (has('dragon') || has('lizard')) for (let k = 0; k < 4; k++) path(g, (c) => c.arc(X - 3 + k * 2, HY - 3.5, .9, 0, Math.PI), null, shade(body, .78), .25);
    if (has('penguin') && first('penguin')) path(g, (c) => { c.moveTo(X, HY - 2); c.bezierCurveTo(X - 3, HY - 4, X - 6, HY, X - 4, HY + 4); c.lineTo(X + 4, HY + 4); c.bezierCurveTo(X + 6, HY, X + 3, HY - 4, X, HY - 2); }, '#f4f4f0');
    if (god === 'cyborg') { g.fillStyle = 'rgba(160,170,185,.95)'; g.fillRect(X, HY - 7, 7, 14); line(g, [[X, HY - 7], [X, HY + 7]], '#5c6678', .3); }
    g.restore();

    // =============== HORNS / ANTLERS / CREST
    if (has('unicorn')) {
      poly(g, [[X - 1.3, HY - 4.8], [X, HY - 13], [X + 1.3, HY - 4.8]], '#ffd23f');
      for (let k = 0; k < 3; k++) line(g, [[X - 1 + k * .3, HY - 6 - k * 2.2], [X + 1 - k * .3, HY - 5.2 - k * 2.2]], '#d9a020', .3);
    }
    if (has('dragon')) {
      const hc = acc2 === acc ? '#f4ead0' : acc2;
      for (const s of [-1, 1]) path(g, (c) => { c.moveTo(X + s * 2, HY - 4.6); c.quadraticCurveTo(X + s * 4, HY - 9, X + s * 7, HY - 10); c.quadraticCurveTo(X + s * 4.6, HY - 7.6, X + s * 4, HY - 4); c.closePath(); }, hc, shade(hc, .7), .2);
    }
    if (has('rhino')) poly(g, [[X - 1.1, HY + 1.4], [X, HY - 3.2], [X + 1.1, HY + 1.4]], '#e8e0d0');
    if (has('deer')) for (const s of [-1, 1]) { line(g, [[X + s * 2.4, HY - 4.8], [X + s * 4, HY - 9.5], [X + s * 6.5, HY - 11]], '#8a5a34', .7); line(g, [[X + s * 3.4, HY - 7.6], [X + s * 1.8, HY - 10]], '#8a5a34', .6); line(g, [[X + s * 4.3, HY - 9.8], [X + s * 3.8, HY - 12]], '#8a5a34', .5); }
    if (has('cow') || (has('sheep') && first('sheep'))) for (const s of [-1, 1]) path(g, (c) => { c.moveTo(X + s * 4, HY - 3.6); c.quadraticCurveTo(X + s * 7.5, HY - 5, X + s * 7, HY - 7.5); c.quadraticCurveTo(X + s * 6, HY - 4.8, X + s * 3.2, HY - 2.6); }, '#e8dcc0');
    if (has('chicken')) for (let k = 0; k < 3; k++) E(g, X - 1.6 + k * 1.6, HY - 5.6 - (k === 1 ? .5 : 0), 1.1, 1.4, '#e8483b');
    if (has('phoenix')) for (let k = 0; k < 3; k++) path(g, (c) => { const sx = X - 1.6 + k * 1.6; c.moveTo(sx - .8, HY - 4.8); c.quadraticCurveTo(sx - 1, HY - 8, sx + .4, HY - 9.6 - (k === 1 ? 1.2 : 0)); c.quadraticCurveTo(sx + .4, HY - 7, sx + .8, HY - 4.8); }, k === 1 ? '#ffd23f' : '#f05a32');
    if (has('peacock')) for (let k = 0; k < 3; k++) { line(g, [[X - 1 + k, HY - 5], [X - 2 + k * 2, HY - 8]], '#2f8f9a', .3); E(g, X - 2 + k * 2, HY - 8.3, .5, .5, '#3f6fd0'); }
    if (has('eagle') && first('eagle')) for (const s of [-1, 1]) poly(g, [[X + s * 1, HY - 5.2], [X + s * 4.5, HY - 7.2], [X + s * 3.6, HY - 4.4]], shade(body, .8));

    // =============== FACE: muzzle / beak / snout
    const muzzleCol = has('bear') ? '#d8b088' : (has('cat') || has('tiger') || has('leopard') || has('lion')) ? shade(belly, 1.05) : belly;
    if (has('duck') || has('platypus')) {
      const bc = has('platypus') && !has('duck') ? '#4a3a32' : '#f5a23a';
      path(g, (c) => { c.moveTo(X - 3, HY + 1.6); c.quadraticCurveTo(X, HY + .8, X + 3, HY + 1.6); c.quadraticCurveTo(X + 3.4, HY + 3.8, X, HY + 4); c.quadraticCurveTo(X - 3.4, HY + 3.8, X - 3, HY + 1.6); }, bc, shade(bc, .65), .3);
      E(g, X - .9, HY + 1.9, .3, .2, shade(bc, .5)); E(g, X + .9, HY + 1.9, .3, .2, shade(bc, .5));
    } else if (has('eagle') || has('chicken') || has('penguin') || has('phoenix') || has('peacock')) {
      const bc = has('penguin') ? '#2b2b35' : has('eagle') && first('eagle') ? '#ffcf3a' : '#f5862c';
      path(g, (c) => { c.moveTo(X - 1.7, HY + 1); c.lineTo(X + 1.7, HY + 1); c.quadraticCurveTo(X + 1.2, HY + 3.4, X, HY + 4.2); c.quadraticCurveTo(X - .4, HY + 3, X - 1.7, HY + 1); }, bc, shade(bc, .6), .3);
      line(g, [[X - 1.4, HY + 1.9], [X + 1.3, HY + 1.9]], shade(bc, .6), .2);
      if (has('chicken')) E(g, X, HY + 4.6, .7, 1, '#e8483b');
    } else if (has('elephant')) {
      const tc = first('elephant') ? body : acc;
      path(g, (c) => { c.moveTo(X - 1.3, HY + 1); c.quadraticCurveTo(X - 1.6, HY + 5, X + .2, HY + 6.8); c.quadraticCurveTo(X + 2.2, HY + 7, X + 2.2, HY + 6); c.quadraticCurveTo(X + .6, HY + 5.5, X + 1.3, HY + 1); }, tc, shade(tc, .7), .3);
      for (let k = 0; k < 3; k++) line(g, [[X - 1.2, HY + 2.4 + k * 1.3], [X + 1.1, HY + 2.4 + k * 1.3]], shade(tc, .75), .2);
    } else if (has('pig') || has('hippo')) {
      shaded(g, X, HY + 2.3, 2.4, 1.7, has('pig') ? '#f48ca0' : shade(body, 1.1)); E(g, X - .8, HY + 2.3, .4, .55, shade(body, .55)); E(g, X + .8, HY + 2.3, .4, .55, shade(body, .55));
    } else if (has('frog') || has('axolotl') || (has('snake') && first('snake'))) {
      path(g, (c) => { c.moveTo(X - 3, HY + 2.3); c.quadraticCurveTo(X, HY + 4.3, X + 3, HY + 2.3); }, null, shade(body, .55), .35);
    } else if (has('dragon') || has('lizard')) {
      shaded(g, X, HY + 2.3, 3.4, 2.2, shade(body, 1.08));
      E(g, X - 1, HY + 1.6, .3, .25, shade(body, .5)); E(g, X + 1, HY + 1.6, .3, .25, shade(body, .5));
      line(g, [[X - 2, HY + 3.3], [X + 2, HY + 3.3]], shade(body, .55), .3);
      poly(g, [[X - 1.6, HY + 3.3], [X - 1.1, HY + 4.3], [X - .7, HY + 3.3]], '#ffffff'); poly(g, [[X + .7, HY + 3.3], [X + 1.1, HY + 4.3], [X + 1.6, HY + 3.3]], '#ffffff');
    } else if (has('fish') || has('shark') || has('whale') || has('dolphin')) {
      path(g, (c) => { c.moveTo(X - 2, HY + 2.5); c.quadraticCurveTo(X, HY + 3.6, X + 2, HY + 2.5); }, null, shade(body, .55), .35);
      if (has('shark')) for (let k = 0; k < 4; k++) poly(g, [[X - 1.6 + k, HY + 2.8], [X - 1.1 + k, HY + 3.6], [X - .6 + k, HY + 2.8]], '#ffffff');
    } else {
      const long = has('wolf') || has('dog') || has('fox') || has('horse') || has('unicorn') || has('deer');
      shaded(g, X, HY + 2.4 + (long ? .4 : 0), long ? 2.8 : 2.6, long ? 2.1 : 1.8, muzzleCol);
      const nose = has('horse') || has('unicorn') || has('deer') || has('cow') ? shade(body, .6) : has('wolf') || has('dog') || has('fox') || has('bear') || has('panda') || has('gorilla') ? '#2b2224' : '#e8607a';
      poly(g, [[X - .9, HY + 1.2], [X + .9, HY + 1.2], [X, HY + 2.2]], nose);
      path(g, (c) => { c.moveTo(X - 1.5, HY + 2.8); c.quadraticCurveTo(X - .7, HY + 3.6, X, HY + 2.6); c.quadraticCurveTo(X + .7, HY + 3.6, X + 1.5, HY + 2.8); }, null, shade(muzzleCol, .45), .3);
      if ((has('wolf') || has('dog')) && tier >= 3) { poly(g, [[X - 1.3, HY + 3], [X - 1, HY + 3.8], [X - .7, HY + 3.1]], '#ffffff'); poly(g, [[X + .7, HY + 3.1], [X + 1, HY + 3.8], [X + 1.3, HY + 3]], '#ffffff'); }
      if (has('cat') || has('tiger') || has('leopard') || has('lion') || has('hamster') || has('rabbit')) for (const s of [-1, 1]) for (let k = 0; k < 2; k++) line(g, [[X + s * 2.4, HY + 2.2 + k * .8], [X + s * 6.6, HY + 1.6 + k * 1.4]], 'rgba(255,255,255,.85)', .2);
    }
    // panda patches
    if (has('panda')) for (const s of [-1, 1]) E(g, X + s * 2.6, HY + .2, 1.9, 1.6, '#2f2a2a', s * .5);

    // =============== EYES (anime)
    for (const s of [-1, 1]) {
      const ex = X + s * 2.65, ey = HY + .1;
      E(g, ex, ey, 1.45, 1.85, '#1e1426');
      const ir = g.createLinearGradient(ex, ey - 1.8, ex, ey + 1.8); ir.addColorStop(0, '#1e1426'); ir.addColorStop(.5, shade(eyeCol, .8)); ir.addColorStop(1, shade(eyeCol, 1.35));
      E(g, ex, ey + .25, 1.15, 1.45, ir);
      if (has('dragon') || has('lizard') || has('snake') || god === 'kaiju') E(g, ex, ey + .1, .3, 1.2, '#1e1426');
      E(g, ex - .45 * s * -1 - .35, ey - .75, .55, .55, '#ffffff'); E(g, ex + .45, ey + .75, .25, .25, '#ffffff');
      if (tier >= 3) line(g, [[ex - s * 1.3, ey - 2.4], [ex + s * 1.2, ey - 2.1]], shade(body, .5), .35); // determined brow
      E(g, X + s * 4.6, HY + 1.9, 1.1, .6, 'rgba(246,140,150,.55)');
    }
    if (god === 'mecha' || god === 'beast') {
      g.fillStyle = god === 'beast' ? 'rgba(255,74,61,.95)' : 'rgba(95,240,255,.95)';
      path(g, (c) => { c.moveTo(X - 5.2, HY - .9); c.lineTo(X + 5.2, HY - .9); c.lineTo(X + 4.6, HY + 1); c.lineTo(X - 4.6, HY + 1); c.closePath(); }, g.fillStyle);
      line(g, [[X, HY - 5.6], [X, HY - 9]], '#5c6678', .5); E(g, X, HY - 9.3, .6, .6, '#ff4a3d');
    }
    if (god === 'cyborg') E(g, X + 2.65, HY + .1, .7, .7, '#ff4a3d');

    // =============== ARMOR (Mythical) + SCARF (Legendary)
    if (tier >= 3 && god !== 'roh') {
      const steel = god ? '#4a5466' : '#b6bfcc';
      const metal = (cx, cy, rx, ry) => { const gr = g.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry); gr.addColorStop(0, shade(steel, 1.25)); gr.addColorStop(.5, steel); gr.addColorStop(1, shade(steel, .7)); return gr; };
      // helmet
      g.save(); path(g, (c) => c.ellipse(X, HY, HRX + .4, HRY + .4, 0, Math.PI * 1.05, Math.PI * 1.95)); g.clip();
      g.fillStyle = metal(X, HY - 4, 6, 3); g.fillRect(X - 7, HY - 7, 14, 3.4);
      g.restore();
      poly(g, [[X - .9, HY - 5.4], [X, HY - 8.2], [X + .9, HY - 5.4]], elOr(o.elCol, '#d9483b'));
      // pauldrons
      for (const s of [-1, 1]) { E(g, X + s * 5.6, BY - 3.3, 2.5, 1.8, metal(X + s * 5.6, BY - 3.3, 2.5, 1.8)); line(g, [[X + s * 4.2, BY - 2.6], [X + s * 7, BY - 2.6]], shade(steel, .6), .25); }
      // chest plate
      path(g, (c) => { c.moveTo(X - 3.4, BY - 4); c.lineTo(X + 3.4, BY - 4); c.quadraticCurveTo(X + 3.8, BY + .5, X, BY + 2); c.quadraticCurveTo(X - 3.8, BY + .5, X - 3.4, BY - 4); }, metal(X, BY - 1, 3.6, 3), shade(steel, .55), .25);
      const gem = elOr(o.elCol, '#5ff0ff');
      E(g, X, BY - 1.6, 1, 1, gem); E(g, X - .3, BY - 2, .35, .35, '#ffffff');
    }
    if (tier >= 4) {
      const oc = o.outfitCol;
      path(g, (c) => { c.moveTo(X - 4.6, HY + 4.2); c.quadraticCurveTo(X, HY + 6.4, X + 4.6, HY + 4.2); c.lineTo(X + 4.6, HY + 5.8); c.quadraticCurveTo(X, HY + 8, X - 4.6, HY + 5.8); c.closePath(); }, oc, shade(oc, .6), .25);
      path(g, (c) => { c.moveTo(X + 2.5, HY + 6); c.lineTo(X + 4.6, HY + 10.5); c.lineTo(X + 2.6, HY + 10); c.lineTo(X + 1.5, HY + 6.4); c.closePath(); }, shade(oc, .85));
    }

    // =============== GOD MODE extras
    if (god === 'kaiju') for (let k = 0; k < 4; k++) poly(g, [[X - 3 + k * 2, HY - 5.2 + (k === 1 || k === 2 ? -.3 : 0)], [X - 2 + k * 2, HY - 8.8], [X - 1 + k * 2, HY - 5.2]], '#c8f06a', '#7aa040', .2);
    if (god === 'beast') for (let k = 0; k < 4; k++) poly(g, [[X - 3.5 + k * 2.3, BY - 4.6], [X - 2.4 + k * 2.3, BY - 7.4], [X - 1.3 + k * 2.3, BY - 4.6]], '#c8ced8', '#5c6678', .2);
    if (god === 'kristal') { for (let k = 0; k < 6; k++) line(g, [[X - 5 + k * 2, BY - 4], [X - 4 + k * 2, BY + 3]], 'rgba(255,255,255,.7)', .25); for (let k = 0; k < 4; k++) E(fx, X - 6 + rnd(k) * 12, 10 + rnd(k + 5) * 18, .35, 1.1, '#ffffff'); }
    if (god === 'mecha' || god === 'beast') for (const s of [-1, 1]) { g.fillStyle = '#5c6678'; g.fillRect(X + s * 7.2 - .8, BY - 1, 1.6, 4); E(back === null ? g : b, X + s * 7.2, BY + 4, .9, 1.6, 'rgba(95,200,255,.8)'); }

    // =============== HALO (God Mode)
    if (tier >= 5) { fx.strokeStyle = '#ffd23f'; fx.lineWidth = .7; fx.beginPath(); fx.ellipse(X, HY - 9.5, 5, 1.5, 0, 0, Math.PI * 2); fx.stroke(); fx.strokeStyle = 'rgba(255,246,200,.8)'; fx.lineWidth = .3; fx.stroke(); }

    // =============== COMPOSE: glow, outline, creature, front fx
    const out = document.createElement('canvas'); out.width = out.height = F * R;
    const o2 = out.getContext('2d');
    o2.drawImage(back, 0, 0);
    // outline = creature silhouette dilated
    const sil = document.createElement('canvas'); sil.width = sil.height = F * R;
    const s2 = sil.getContext('2d');
    const d = 3;
    for (let a = 0; a < 16; a++) s2.drawImage(cc, Math.round(Math.cos(a / 16 * Math.PI * 2) * d), Math.round(Math.sin(a / 16 * Math.PI * 2) * d));
    s2.globalCompositeOperation = 'source-in'; s2.fillStyle = tier >= 5 ? '#5a3a00' : OL; s2.fillRect(0, 0, F * R, F * R);
    o2.drawImage(sil, 0, 0);
    if (god === 'roh') o2.globalAlpha = .82;
    o2.drawImage(cc, 0, 0);
    o2.globalAlpha = 1;
    o2.drawImage(front, 0, 0);
    out.px = R;
    out.hd = true;
    return out;
  }
  function elOr(c, d) { return c || d; }

  window.CreatureHD = { paint };
})();
