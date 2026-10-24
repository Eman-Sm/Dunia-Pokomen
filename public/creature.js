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
    return FALLBACK[seed % FALLBACK.length];
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
    const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
    const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  const cache = new Map();

  function make(w) {
    const hewan = (w.hewan || []).map((h) => String(h).toLowerCase());
    const all = hewan.join(' ');
    const tier = Number(w.tier || 0);
    const k = (w.u || w.nama) + '|' + all + '|' + tier;
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

    const body = colorFor(hewan[0], seed);
    const acc = hewan[1] ? colorFor(hewan[1], seed >> 3) : shade(body, 0.75);
    const acc2 = hewan[2] ? colorFor(hewan[2], seed >> 5) : acc;
    const belly = shade(body, 1.18);
    const cx = 13;
    // wings (behind)
    if (has(RE.wing, all) || tier >= 2) {
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
    // tier extras
    if (tier >= 1) { g.fillStyle = acc2 === body ? '#d9483b' : acc2; g.fillRect(cx - 4, hy + 4, 8, 1); px(cx + 2, hy + 5, g.fillStyle); }
    if (tier >= 3) {
      g.fillStyle = '#ffd23f'; g.fillRect(cx - 3, hy - 8, 7, 3); px(cx - 3, hy - 9, '#ffd23f'); px(cx, hy - 9, '#ffd23f'); px(cx + 3, hy - 9, '#ffd23f');
      px(cx, hy - 7, '#d9483b'); px(cx - 2, hy - 7, '#4aa3df'); px(cx + 2, hy - 7, '#4aa3df');
    }
    // outline
    const img = g.getImageData(0, 0, S, S); const d = img.data;
    const op = (x, y) => x >= 0 && y >= 0 && x < S && y < S && d[(y * S + x) * 4 + 3] > 0;
    const edge = [];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (!op(x, y) && (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1))) edge.push([x, y]);
    g.fillStyle = tier >= 3 ? '#8a5a00' : OL;
    for (const [x, y] of edge) g.fillRect(x, y, 1, 1);
    cache.set(k, c);
    return c;
  }

  window.Creature = { make, hash };
})();
