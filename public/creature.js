// Procedural pixel creatures for any animal combination typed in a comment.
// Look is derived from the animal words (ears, wings, horns, fins, beak) and the tier.
(function () {
  const OL = '#2b1b17';
  const COLORS = [
    [/kucing|cat|kitten/, '#f0a040'], [/rubah|fox/, '#e8742c'], [/harimau|macan|tiger/, '#f08a24'], [/singa|lion/, '#e3b04b'],
    [/serigala|wolf|husky/, '#9aa3ad'], [/anjing|dog|puppy/, '#c8915a'], [/kelinci|rabbit|bunny/, '#f4f0ea'], [/rusa|kijang|deer/, '#c98a52'],
    [/panda/, '#f4f4f0'], [/beruang|bear/, '#8a5a3a'], [/babi|pig/, '#f6a8b4'], [/sapi|cow/, '#f4f0ea'], [/domba|sheep|kambing/, '#efe9dc'],
    [/naga|dragon/, '#4fae6a'], [/kadal|iguana|cicak|tokek|buaya|komodo/, '#6f9b4a'], [/katak|kodok|frog/, '#6ebe50'], [/ular|snake/, '#7aa83a'],
    [/ikan|fish/, '#4aa3df'], [/paus|whale/, '#3e6fb0'], [/hiu|shark/, '#7f95a8'], [/lumba|dolphin/, '#6aa8d8'], [/gurita|octopus|cumi/, '#d8607a'],
    [/ayam|chick|anak ayam/, '#ffd23f'], [/bebek|duck/, '#f7e05a'], [/burung|bird/, '#6ab0e8'], [/elang|eagle|garuda/, '#8a5a34'],
    [/gagak|crow|kelelawar|bat/, '#4a4058'], [/pinguin|penguin/, '#3a3a48'], [/merak|peacock/, '#2f8f9a'], [/flamingo/, '#f48cb0'],
    [/lebah|bee/, '#f2c230'], [/kupu|butterfly/, '#c27ae0'], [/semut|ant/, '#8a3a2a'], [/siput|keong|snail/, '#d9b07a'],
    [/unicorn|kuda|horse|pegasus/, '#f2eef8'], [/monyet|kera|monkey/, '#a8703f'], [/gajah|elephant/, '#a2a6b4'], [/jerapah|giraffe/, '#f0c860'],
    [/kura|penyu|turtle/, '#5f9a5a'], [/phoenix|feniks|api/, '#f05a32'], [/hantu|ghost/, '#e8eef8'], [/tupai|squirrel|hamster/, '#c87a3a'],
  ];
  const FALLBACK = ['#f0a040', '#7cc0e8', '#f4a8c8', '#8fd06a', '#c79ae8', '#f2d25a', '#e88a6a', '#9ad8d0'];
  const has = (re, t) => re.test(t);
  const RE = {
    wing: /naga|dragon|burung|bird|elang|eagle|garuda|kelelawar|bat|angsa|merpati|phoenix|feniks|pegasus|kupu|butterfly|lebah|bee|capung|ayam|bebek|gagak|crow|merak|flamingo|peri/,
    pointy: /kucing|cat|rubah|fox|serigala|wolf|anjing|dog|harimau|tiger|singa|lion|macan|husky|tupai|squirrel/,
    long: /kelinci|rabbit|bunny|keledai/,
    antler: /rusa|deer|kijang/,
    horn: /naga|dragon|unicorn|badak|kambing|sapi|cow|kerbau|domba|iblis/,
    fin: /ikan|fish|paus|whale|hiu|shark|lumba|dolphin|duyung|mermaid/,
    beak: /ayam|chick|burung|bird|bebek|duck|elang|eagle|angsa|merpati|gagak|crow|pinguin|penguin|kakatua|garuda|merak|flamingo/,
    round: /panda|beruang|bear|hamster|tikus|mouse|koala|monyet|monkey/,
    shell: /kura|penyu|turtle|siput|keong|snail/,
    trunk: /gajah|elephant/,
    tent: /gurita|octopus|cumi/,
  };

  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function colorFor(word, seed) {
    const w = (word || '').toLowerCase();
    for (const [re, c] of COLORS) if (re.test(w)) return c;
    return FALLBACK[Math.abs(seed | 0) % FALLBACK.length];
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
    const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
    const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  const cache = new Map();

  const EL_COL = { api: '#ff5a2a', air: '#3fa0ff', angin: '#9fe8ff', tanah: '#b07a3e', petir: '#ffe23a', es: '#bff2ff', daun: '#5fd04a', cahaya: '#fff2a8', kegelapan: '#7a3fb0', bintang: '#c27ae0' };
  function elementColor(e) { const k = String(e || '').toLowerCase().trim(); return EL_COL[k] || FALLBACK[hash(k) % FALLBACK.length]; }
  const OUT_COL = [[/merah|red/, '#d9483b'], [/biru|blue/, '#3f6fd0'], [/hijau|green/, '#3fae5a'], [/kuning|yellow/, '#f2c230'], [/ungu|purple|violet/, '#7a3fb0'], [/hitam|black/, '#2b2b35'], [/putih|white/, '#f4f4f0'], [/emas|gold/, '#e3b04b'], [/perak|silver/, '#b8c0cc'], [/pink|merah muda/, '#f48cb0'], [/oranye|orange|jingga/, '#f08a24'], [/coklat|cokelat|brown/, '#8a5a34']];
  function outfitColor(o) { const t = String(o || '').toLowerCase(); for (const [re, c] of OUT_COL) if (re.test(t)) return c; return '#7a3fb0'; }
  const GOD = {
    mecha: { body: '#b8c0cc', acc: '#3f6fd0', acc2: '#d9483b', belly: '#e4e8ee' },
    beast: { body: '#8c96a6', acc: '#d9483b', acc2: '#ffd23f', belly: '#c8ced8' },
    cyborg: { body: null, acc: '#5c6678', acc2: '#5ff0ff', belly: null },
    kristal: { body: '#8fe3f0', acc: '#c9f6ff', acc2: '#ffffff', belly: '#d6f8ff' },
    roh: { body: '#fff6c8', acc: '#ffe27a', acc2: '#ffffff', belly: '#ffffff' },
    kaiju: { body: '#3f6b4a', acc: '#c8f06a', acc2: '#2b4a34', belly: '#7aa070' },
    ilahi: { body: '#ffe27a', acc: '#ffffff', acc2: '#ffd23f', belly: '#fff6d6' },
  };
  function godKind(wj) {
    const t = String(wj || '').toLowerCase();
    if (/beast|zoid|binatang mesin|mesin buas/.test(t)) return 'beast';
    if (/mecha|mech|robot|gundam/.test(t)) return 'mecha';
    if (/cyborg|android|siborg/.test(t)) return 'cyborg';
    if (/kristal|crystal|permata/.test(t)) return 'kristal';
    if (/roh|spirit|cahaya|hantu|arwah/.test(t)) return 'roh';
    if (/kaiju|monster raksasa|godzilla/.test(t)) return 'kaiju';
    return t ? 'ilahi' : 'mecha';
  }

  const ADJ = [[/merah muda|pink/, '#f48cb0'], [/ungu|purple|violet/, '#8a5ad0'], [/merah|red/, '#d9483b'], [/biru|blue/, '#3f7fd0'], [/hitam|black/, '#34303a'],
    [/putih|white/, '#f4f2ee'], [/emas|gold/, '#e8b830'], [/kuning|yellow/, '#f2d040'], [/hijau tua/, '#3a6a3a'], [/hijau muda/, '#8fd06a'], [/hijau|green/, '#4fae6a'],
    [/oren|oranye|orange|jingga/, '#f08a24'], [/coklat|cokelat|brown/, '#8a5a34'], [/abu|grey|gray|perak|silver/, '#9aa3ad']];
  function adjColor(word) { const t = String(word || '').toLowerCase(); for (const [re, c] of ADJ) if (re.test(t)) return c; return null; }

  function make(w) {
    const hewan = (w.hewan || []).map((h) => String(h).toLowerCase());
    const all = hewan.join(' ');
    const tier = Number(w.tier || 0);
    const k = (w.u || w.nama) + '|' + all + '|' + tier + '|' + (w.elemen || '') + '|' + (w.outfit || '') + '|' + (w.wujud || '');
    if (cache.has(k)) return cache.get(k);
    const seed = hash(k);
    const S = 26;
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d');
    const px = (x, y, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
    const ell = (cx, cy, rx, ry, col) => {
      g.fillStyle = col;
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
          if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) g.fillRect(x, y, 1, 1);
    };
    const tri = (pts, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); };

    let body = colorFor(hewan[0], seed);
    let acc = hewan[1] ? colorFor(hewan[1], seed >>> 3) : shade(body, 0.75);
    let acc2 = hewan[2] ? colorFor(hewan[2], seed >>> 5) : acc;
    let belly = shade(body, 1.18);
    // God Mode: swap the base graphics
    const god = tier >= 5 ? godKind(w.wujud) : null;
    if (god) { const G = GOD[god]; body = G.body || body; acc = G.acc || acc; acc2 = G.acc2 || acc2; belly = G.belly || belly; }
    // Mega Evolution and up: high-detail painter (smoother, species features)
    if (tier >= 2 && window.CreatureHD) {
      // colour words in the comment ("Naga Ungu", "Ular Emas", "macan tutul hitam") are honoured in HD
      if (!god) {
        const b0 = adjColor(hewan[0]), a1 = adjColor(hewan[1]), a2 = adjColor(hewan[2]);
        if (b0) { body = b0; belly = b0 === '#34303a' ? '#5a5560' : shade(b0, 1.18); }
        if (a1) acc = a1; if (a2) acc2 = a2;
      }
      const hd = window.CreatureHD.paint(w, { hewan, all, tier, seed, god, body, acc, acc2, belly,
        elCol: w.elemen ? elementColor(w.elemen) : null, outfitCol: outfitColor(w.outfit) });
      hd.grow = tier >= 3 ? 1.5 : 1.3;
      cache.set(k, hd);
      return hd;
    }
    const cx = 13;
    // wings (behind)
    if (has(RE.wing, all) || tier >= 4) {
      const wc = has(RE.wing, hewan[0] || '') && hewan.length === 1 ? shade(body, .8) : acc;
      tri([[cx - 4, 15], [cx - 11, 8], [cx - 10, 17]], wc); tri([[cx + 4, 15], [cx + 11, 8], [cx + 10, 17]], wc);
      tri([[cx - 5, 16], [cx - 9, 11], [cx - 9, 17]], shade(wc, .8)); tri([[cx + 5, 16], [cx + 9, 11], [cx + 9, 17]], shade(wc, .8));
    }
    // fin tail
    if (has(RE.fin, all)) { tri([[cx + 5, 20], [cx + 11, 16], [cx + 11, 24]], has(RE.fin, hewan[0] || '') ? shade(body, .8) : acc); }
    else if (seed % 3 === 0 || has(/rubah|fox|kucing|cat|tupai|monyet|naga|dragon/, all)) { ell(cx + 7, 19, 2.2, 3.2, shade(body, .85)); }
    // tentacles
    if (has(RE.tent, all)) for (let i = -2; i <= 2; i++) { g.fillStyle = has(RE.tent, hewan[0] || '') ? shade(body, .85) : acc; g.fillRect(cx + i * 2 - 1, 21, 2, 4); }
    // body + shell
    ell(cx, 18, 6.2, 5.2, body);
    if (has(RE.shell, all)) { ell(cx + 1, 15.5, 5.5, 4, has(RE.shell, hewan[0] || '') ? shade(body, .7) : acc); px(cx - 1, 14, shade(acc, 1.3)); px(cx + 2, 15, shade(acc, 1.3)); }
    ell(cx, 19.5, 3.2, 3, belly);
    // ears
    const hy = 11;
    if (has(RE.long, all)) {
      const ec = has(RE.long, hewan[0] || '') ? body : acc;
      ell(cx - 3, 4.5, 1.6, 4.2, ec); ell(cx + 3, 4.5, 1.6, 4.2, ec);
      px(cx - 3, 4, '#f5aab8'); px(cx - 3, 5, '#f5aab8'); px(cx + 3, 4, '#f5aab8'); px(cx + 3, 5, '#f5aab8');
    } else if (has(RE.pointy, all)) {
      const ec = has(RE.pointy, hewan[0] || '') ? body : acc;
      tri([[cx - 6, hy - 1], [cx - 5, hy - 8], [cx - 1, hy - 4]], ec); tri([[cx + 6, hy - 1], [cx + 5, hy - 8], [cx + 1, hy - 4]], ec);
      px(cx - 4.6, hy - 5, '#f5aab8'); px(cx + 4.4, hy - 5, '#f5aab8');
    } else if (has(RE.round, all) || seed % 4 === 1) {
      ell(cx - 4.5, hy - 4, 2, 2, has(/panda/, all) ? '#2f2a2a' : shade(body, .85)); ell(cx + 4.5, hy - 4, 2, 2, has(/panda/, all) ? '#2f2a2a' : shade(body, .85));
    }
    // head
    ell(cx, hy, 5.6, 4.8, body);
    if (has(/panda/, all)) { ell(cx - 2.5, hy, 1.6, 1.4, '#2f2a2a'); ell(cx + 2.5, hy, 1.6, 1.4, '#2f2a2a'); }
    if (has(/harimau|tiger|macan/, all)) { px(cx, hy - 4, shade(body, .6)); px(cx - 1, hy - 3, shade(body, .6)); px(cx + 1, hy - 3, shade(body, .6)); }
    // horns / antlers
    if (has(RE.antler, all)) {
      const a = '#8a5a34';
      for (const s of [-1, 1]) { px(cx + s * 3, hy - 5, a); px(cx + s * 3, hy - 6, a); px(cx + s * 4, hy - 7, a); px(cx + s * 2, hy - 7, a); px(cx + s * 4, hy - 8, a); }
    } else if (has(RE.horn, all)) {
      const hc = has(RE.horn, hewan[0] || '') ? shade(body, .7) : acc2;
      if (has(/unicorn/, all)) tri([[cx - 1, hy - 4], [cx, hy - 10], [cx + 1, hy - 4]], '#ffd23f');
      else { tri([[cx - 4, hy - 3], [cx - 5, hy - 8], [cx - 2, hy - 4]], hc); tri([[cx + 4, hy - 3], [cx + 5, hy - 8], [cx + 2, hy - 4]], hc); }
    }
    // face
    ell(cx, hy + 2, 2.6, 1.8, belly);
    g.fillStyle = OL; g.fillRect(cx - 3, hy - 1, 1, 2); g.fillRect(cx + 2, hy - 1, 1, 2);
    if (tier >= 1) { px(cx - 3, hy - 1, '#ffffff'); px(cx + 2, hy - 1, '#ffffff'); }
    px(cx - 4, hy + 1, '#f6a0a0'); px(cx + 3, hy + 1, '#f6a0a0');
    if (has(RE.beak, all)) tri([[cx - 1.5, hy + 1], [cx + 1.5, hy + 1], [cx, hy + 3.5]], '#f5862c');
    else if (has(RE.trunk, all)) { g.fillStyle = shade(body, .9); g.fillRect(cx - 1, hy + 1, 2, 5); }
    else { px(cx, hy + 1, '#e8607a'); px(cx - 1, hy + 2, OL); px(cx + 1, hy + 2, OL); }
    // feet
    g.fillStyle = shade(body, .7); g.fillRect(cx - 4, 22, 2, 2); g.fillRect(cx + 2, 22, 2, 2);
    // God Mode details on the base body
    if (god === 'mecha' || god === 'beast' || god === 'cyborg') {
      const metal = '#5c6678';
      g.fillStyle = god === 'beast' ? '#ff4a3d' : '#5ff0ff'; g.fillRect(cx - 4, hy - 1, 9, 2);     // visor
      g.fillStyle = metal; g.fillRect(cx - 6, 17, 13, 1); g.fillRect(cx, 14, 1, 8);                 // panel lines
      px(cx - 4, 20, '#ffd23f'); px(cx + 4, 20, '#ffd23f');                                          // bolts
      px(cx, hy - 6, metal); px(cx, hy - 7, metal); px(cx, hy - 8, '#ff4a3d');                       // antenna
      if (god === 'beast') for (let i = 0; i < 4; i++) tri([[cx - 3 + i * 2, 13], [cx - 2 + i * 2, 10], [cx - 1 + i * 2, 13]], '#c8ced8');
      if (god === 'cyborg') { g.fillStyle = 'rgba(160,170,185,.9)'; g.fillRect(cx, hy - 4, 6, 14); px(cx + 2, hy - 1, '#ff4a3d'); }
    } else if (god === 'kristal') {
      g.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 6; i++) g.fillRect(cx - 5 + i * 2, 14 + (i % 3), 1, 1);
      g.fillRect(cx - 3, hy - 3, 1, 3); g.fillRect(cx + 2, 16, 1, 3);
    } else if (god === 'kaiju') {
      for (let i = 0; i < 3; i++) tri([[cx - 2 + i * 2, 13], [cx - 1 + i * 2, 9], [cx + i * 2, 13]], '#c8f06a');
    }
    // Pseudo-evo and up: bright eyes are drawn above; Legendary: outfit scarf on the base
    const outfitCol = outfitColor(w.outfit);
    if (tier >= 4) { g.fillStyle = outfitCol; g.fillRect(cx - 5, hy + 4, 10, 2); px(cx + 3, hy + 6, outfitCol); px(cx + 3, hy + 7, outfitCol); }

    // ---- composite onto a bigger canvas: aura + cape behind, armor + halo in front
    const F = 36, ox = 5, oy = 7;
    const fc = document.createElement('canvas'); fc.width = F; fc.height = F;
    const f = fc.getContext('2d');
    const fpx = (x, y, col) => { f.fillStyle = col; f.fillRect(Math.round(x), Math.round(y), 1, 1); };
    const fell = (ex, ey, rx, ry, col) => { f.fillStyle = col; for (let y = Math.floor(ey - ry); y <= Math.ceil(ey + ry); y++) for (let x = Math.floor(ex - rx); x <= Math.ceil(ex + rx); x++) if (((x - ex) / rx) ** 2 + ((y - ey) / ry) ** 2 <= 1) f.fillRect(x, y, 1, 1); };
    const X = cx + ox;
    // element aura (Mega Evolution)
    const elCol = tier >= 2 && w.elemen ? elementColor(w.elemen) : null;
    if (elCol) {
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; fpx(X + Math.cos(a) * 13, oy + 15 + Math.sin(a) * 11, i % 2 ? elCol : shade(elCol, 1.3)); }
      for (let i = 0; i < 5; i++) fpx(X - 9 + ((seed >>> i) % 18), oy + 2 + ((seed >>> (i + 3)) % 6), elCol);
    }
    // cape (Legendary outfit)
    if (tier >= 4) { f.fillStyle = shade(outfitCol, .8); f.beginPath(); f.moveTo(X - 5, oy + 14); f.lineTo(X + 5, oy + 14); f.lineTo(X + 9, oy + 26); f.lineTo(X - 9, oy + 26); f.closePath(); f.fill(); }
    // God Mode thrusters / glow
    if (god === 'roh') fell(X, oy + 15, 12, 12, 'rgba(255,246,200,.45)');
    f.drawImage(c, ox, oy);
    // armor (Mythical)
    if (tier >= 3 && god !== 'roh') {
      const steel = god ? '#3d4656' : '#a9b2bf', steelD = shade(steel, .75);
      f.fillStyle = steel; f.fillRect(X - 5, oy + hy - 5, 11, 2);                     // helmet band
      f.fillRect(X - 1, oy + hy - 7, 3, 2);                                           // helmet crest
      f.fillStyle = steelD; f.fillRect(X - 8, oy + 15, 3, 3); f.fillRect(X + 6, oy + 15, 3, 3); // shoulder pads
      f.fillStyle = steel; f.fillRect(X - 3, oy + 15, 7, 4);                          // chest plate
      fpx(X, oy + 16, elCol || '#5ff0ff');                                            // gem
    }
    // halo (God Mode)
    if (tier >= 5) { f.strokeStyle = '#ffd23f'; f.lineWidth = 1; f.beginPath(); f.ellipse(X + .5, oy + 1.5, 5, 1.6, 0, 0, Math.PI * 2); f.stroke(); }
    // outline everything
    const img = f.getImageData(0, 0, F, F); const d = img.data;
    const op = (x, y) => x >= 0 && y >= 0 && x < F && y < F && d[(y * F + x) * 4 + 3] > 40;
    const edge = [];
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) if (!op(x, y) && (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1))) edge.push([x, y]);
    f.fillStyle = tier >= 5 ? '#6a4a00' : OL;
    for (const [x, y] of edge) f.fillRect(x, y, 1, 1);
    fc.grow = tier >= 1 ? (tier >= 3 ? 1.5 : 1.3) : 1; // Pseudo-evo: grows bigger
    cache.set(k, fc);
    return fc;
  }

  window.Creature = { make, hash, elementColor };
})();
