// Farm-RPG style citizens for Mode HD / videos: animals standing on two legs, wearing clothes.
// Look comes from the animal words (ears, snout/beak, horns, wings, tail, mane) and the tier
// (Regular: patched tunic, Pseudo: shirt + overalls, Mega: element tunic + scarf, Mythical: armour,
// Legendary: armour + cape, God Mode: golden armour + halo). Sheet = 3 frames of 24x32 (idle, step, step).
(function () {
  const FW = 24, FH = 32, OL = '#2b1b17';
  const COL = [
    [/kucing|cat/, '#f0a040'], [/rubah|fox/, '#e8742c'], [/harimau|macan(?! tutul)|tiger/, '#f08a24'], [/singa|lion/, '#e3b04b'], [/tutul|leopard|cheetah/, '#e9b44c'],
    [/serigala|wolf|husky/, '#9aa3ad'], [/anjing|dog/, '#c8915a'], [/kelinci|rabbit|bunny/, '#f4f0ea'], [/rusa|deer|kijang/, '#c98a52'], [/panda/, '#f4f4f0'],
    [/beruang|bear/, '#8a5a3a'], [/babi|pig/, '#f6a8b4'], [/sapi|cow|banteng|kerbau/, '#f4f0ea'], [/domba|sheep|kambing/, '#efe9dc'], [/naga|dragon/, '#4fae6a'],
    [/kadal|komodo|buaya|dino|t-rex|spinosaurus/, '#6f9b4a'], [/katak|frog/, '#6ebe50'], [/ular|snake/, '#7aa83a'], [/ikan|fish|axolot/, '#f4a8c0'], [/hiu|shark/, '#7f95a8'],
    [/ayam|chick/, '#ffd23f'], [/bebek|duck/, '#f7e05a'], [/burung|bird|rangkong|cendrawasih/, '#6ab0e8'], [/elang|eagle|rajawali|garuda/, '#8a5a34'], [/gagak|crow|kelelawar|bat/, '#4a4058'],
    [/pinguin|penguin/, '#3a3a48'], [/kupu|butterfly/, '#c27ae0'], [/unicorn|unikon|kuda|horse|pegasus/, '#f2eef8'], [/monyet|kera|monkey/, '#a8703f'], [/gorila|gorilla/, '#4a4450'],
    [/gajah|elephant/, '#a2a6b4'], [/jerapah|giraffe/, '#f0c860'], [/kura|penyu|turtle/, '#5f9a5a'], [/phoenix|feniks/, '#f05a32'], [/tupai|squirrel|hamster/, '#c87a3a'],
    [/platipus|platypus/, '#8a6a4a'], [/badak|rhino/, '#9a9aa6'], [/ubur|jellyfish/, '#d8a8f0'], [/jamur|mushroom/, '#e8d0b0'], [/bison/, '#6a4a34'],
  ];
  const ADJ = [[/merah muda|pink/, '#f48cb0'], [/ungu|purple/, '#8a5ad0'], [/merah|red/, '#d9483b'], [/biru|blue/, '#3f7fd0'], [/hitam|black/, '#3a3640'],
    [/putih|white|albino/, '#f4f2ee'], [/emas|gold/, '#e8b830'], [/kuning|yellow/, '#f2d040'], [/hijau|green/, '#4fae6a'], [/oren|oranye|orange/, '#f08a24'],
    [/coklat|cokelat|brown/, '#8a5a34'], [/abu|grey|gray|perak|silver/, '#9aa3ad']];
  const EL = { api: '#ff5a2a', air: '#3fa0ff', angin: '#9fe8ff', tanah: '#b07a3e', petir: '#ffe23a', es: '#bff2ff', daun: '#5fd04a', cahaya: '#fff2a8', kegelapan: '#7a3fb0', bayangan: '#5a3f90', galaksi: '#6a4ad0', telepati: '#d08af0', badai: '#7fb0d0' };
  const SHIRTS = ['#d9483b', '#3f7fd0', '#4fae6a', '#f2c230', '#8a5ad0', '#e88a3a', '#3fa8a0', '#c0506a'];
  const RE = {
    pointy: /kucing|cat|rubah|fox|serigala|wolf|husky|harimau|tiger|singa|lion|macan|tutul|leopard|cheetah|tupai|squirrel/, long: /kelinci|rabbit|bunny/,
    round: /panda|beruang|bear|hamster|tikus|koala|monyet|kera|monkey|gorila|gorilla|platipus/, floppy: /anjing|dog|sapi|cow|domba|sheep|kambing/,
    beak: /ayam|chick|bebek|duck|burung|bird|elang|eagle|rajawali|garuda|gagak|crow|pinguin|penguin|rangkong|cendrawasih|phoenix|feniks/,
    horn: /naga|dragon|sapi|cow|banteng|kerbau|kambing|bison|badak|rhino/, uni: /unicorn|unikon/, antler: /rusa|deer|kijang/,
    wing: /naga|dragon|burung|bird|elang|eagle|garuda|rajawali|gagak|crow|kelelawar|bat|phoenix|feniks|pegasus|kupu|butterfly|bersayap/,
    tail: /kucing|cat|rubah|fox|serigala|wolf|anjing|dog|harimau|tiger|singa|lion|macan|tutul|naga|dragon|kadal|komodo|dino|monyet|tupai|ular|snake|t-rex/,
    fluffy: /rubah|fox|tupai|squirrel|ekor/, mane: /singa|lion/, stripe: /harimau|tiger|zebra/, spot: /tutul|leopard|cheetah|jerapah/, scale: /naga|dragon|ular|snake|kadal|komodo|dino/,
    gill: /axolot/, trunk: /gajah|elephant/,
  };
  function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function toHex(a) { return '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  const shade = (c, f) => toHex(hex(c).map((v) => v * f));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const elCol = (e) => { const k = String(e || '').toLowerCase(); for (const key in EL) if (k.startsWith(key)) return EL[key]; return k ? SHIRTS[hash(k) % SHIRTS.length] : '#fff2a8'; };

  function make(w) {
    const hewan = (w.hewan || []).map((h) => String(h).toLowerCase()); const all = hewan.join(' ');
    const tier = Number(w.tier || 0); const seed = hash((w.u || w.nama) + all);
    const has = (re) => re.test(all);
    let body = null; for (const [re, c] of COL) if (re.test(hewan[0] || '')) { body = c; break; }
    if (!body) for (const [re, c] of COL) if (re.test(all)) { body = c; break; }
    for (const [re, c] of ADJ) if (re.test(hewan[0] || '')) { body = c; break; }
    if (w.pal && /^#[0-9a-f]{6}$/i.test(w.pal.body)) body = w.pal.body;
    body = body || SHIRTS[seed % SHIRTS.length];
    const belly = mix(body, '#ffffff', .5), dark = shade(body, .72);
    const el = elCol(w.elemen);
    const shirt = (w.pal && /^#[0-9a-f]{6}$/i.test(w.pal.acc || '') && tier >= 1) ? w.pal.acc : SHIRTS[(seed >>> 3) % SHIRTS.length];
    const cv = document.createElement('canvas'); cv.width = FW * 3; cv.height = FH;
    const g = cv.getContext('2d');
    for (let f = 0; f < 3; f++) {
      const o = f * FW; const bob = f ? 1 : 0;
      const P = (x, y, c) => { g.fillStyle = c; g.fillRect(o + Math.round(x), Math.round(y), 1, 1); };
      const R = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(o + Math.round(x), Math.round(y), ww, hh); };
      const E = (cx, cy, rx, ry, c) => { for (let y = Math.ceil(cy - ry); y <= cy + ry; y++) for (let x = Math.ceil(cx - rx); x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) P(x, y, c); };
      const hy = 10 + bob;
      // cape (behind)
      if (tier >= 4) { const cc = tier >= 5 ? '#ffd23f' : '#c0303a'; R(6, 16 + bob, 12, 13, cc); R(6, 16 + bob, 1, 13, shade(cc, .75)); R(17, 16 + bob, 1, 13, shade(cc, .75)); }
      // wings (behind)
      if (has(RE.wing)) { const wc = has(/kupu|butterfly/) ? mix(body, '#ffffff', .2) : shade(body, .85);
        for (const s of [-1, 1]) for (let i = 0; i < 6; i++) R(12 + s * (7 + Math.min(i, 3)) - (s < 0 ? 1 : 0), 15 + bob + i - (f === 1 && s < 0 ? 1 : 0) - (f === 2 && s > 0 ? 1 : 0), 2, 1, i % 2 ? wc : shade(wc, .9)); }
      // tail (behind, right side)
      if (has(RE.tail)) { const tc = has(/naga|dragon|kadal|komodo|dino|ular|t-rex/) ? body : body; const sway = f === 1 ? -1 : f === 2 ? 1 : 0;
        const pts = [[17, 25], [18, 24], [19, 23], [20, 22], [20 + sway, 21], [21 + sway, 20]]; for (const [x, y] of pts) R(x, y + bob, 2, 2, tc);
        if (has(RE.fluffy)) { R(20 + sway, 18 + bob, 3, 3, tc); P(21 + sway, 18 + bob, '#ffffff'); P(22 + sway, 19 + bob, '#ffffff'); } }
      // legs + shoes
      const lA = f === 1 ? -1 : 0, lB = f === 2 ? -1 : 0;
      const pants = tier >= 3 ? '#4a4a58' : tier === 1 ? '#3f6fb0' : tier === 2 ? shade(el, .55) : '#6a6058';
      R(9, 25 + lA, 3, 5, pants); R(13, 25 + lB, 3, 5, pants);
      const shoe = tier >= 3 ? '#a8b0bc' : '#5a3a24'; R(8, 30 + lA, 4, 2, shoe); R(13, 30 + lB, 4, 2, shoe);
      // torso (clothes)
      let top = tier === 0 ? '#9a7a52' : tier === 1 ? shirt : tier === 2 ? el : tier >= 5 ? '#f2c230' : '#b8c0cc';
      if (tier === 2 && el === '#fff2a8') top = shirt;
      R(8, 16 + bob, 8, 9, top); R(7, 17 + bob, 10, 7, top);
      R(8, 16 + bob, 8, 1, shade(top, 1.15)); R(7, 23 + bob, 10, 1, shade(top, .8));
      if (tier === 0) { R(9, 19 + bob, 2, 2, '#7a5a3a'); P(14, 21 + bob, '#7a5a3a'); R(8, 24 + bob, 1, 1, '#9a7a52'); R(15, 24 + bob, 1, 1, '#9a7a52'); }
      if (tier === 1) { R(9, 19 + bob, 6, 6, '#3f6fb0'); R(9, 17 + bob, 1, 2, '#3f6fb0'); R(14, 17 + bob, 1, 2, '#3f6fb0'); P(9, 19 + bob, '#ffd23f'); P(14, 19 + bob, '#ffd23f'); }
      if (tier === 2) { R(7, 16 + bob, 10, 2, mix(el, '#ffffff', .4)); R(14, 18 + bob, 2, 3, mix(el, '#ffffff', .4)); R(7, 23 + bob, 10, 1, '#c8a040'); }
      if (tier >= 3) { // armour: plate, shoulder pads, gem
        const tr = tier >= 4 ? '#ffd23f' : '#e8c060';
        R(9, 18 + bob, 6, 5, shade(top, 1.12)); R(9, 18 + bob, 6, 1, tr); P(12, 20 + bob, el); P(11, 20 + bob, mix(el, '#ffffff', .5));
        R(5, 16 + bob, 4, 3, shade(top, .9)); R(15, 16 + bob, 4, 3, shade(top, .9)); R(5, 16 + bob, 4, 1, tr); R(15, 16 + bob, 4, 1, tr);
      }
      // arms (fur hands)
      const sw = f === 1 ? 1 : f === 2 ? -1 : 0;
      R(5, 18 + bob + sw, 2, 5, tier >= 3 ? shade(top, .85) : top); R(17, 18 + bob - sw, 2, 5, tier >= 3 ? shade(top, .85) : top);
      R(5, 23 + bob + sw, 2, 2, body); R(17, 23 + bob - sw, 2, 2, body);
      if (has(RE.stripe)) { P(5, 24 + bob + sw, dark); P(18, 24 + bob - sw, dark); }
      // head
      if (has(RE.mane)) E(12, hy, 8.5, 7.5, shade(body, .75));
      E(12, hy, 6.5, 5.6, body);
      E(12, hy + 3, 3.4, 2.2, has(RE.beak) ? body : belly);
      // ears / horns
      if (has(RE.long)) { R(8, hy - 11, 2, 7, body); R(14, hy - 11, 2, 7, body); P(8, hy - 9, '#f5aab8'); P(14, hy - 9, '#f5aab8'); }
      else if (has(RE.pointy)) { for (const s of [-1, 1]) { const x = 12 + s * 4; R(x - 1, hy - 6, 3, 2, body); R(x, hy - 8, 1, 2, body); P(x, hy - 6, '#f5aab8'); } }
      else if (has(RE.round)) { E(7, hy - 4, 1.8, 1.8, body); E(17, hy - 4, 1.8, 1.8, body); P(7, hy - 4, dark); P(17, hy - 4, dark); }
      else if (has(RE.floppy)) { R(5, hy - 3, 2, 5, dark); R(17, hy - 3, 2, 5, dark); }
      if (has(RE.horn)) { P(9, hy - 6, '#f4ead0'); P(8, hy - 7, '#f4ead0'); P(15, hy - 6, '#f4ead0'); P(16, hy - 7, '#f4ead0'); }
      if (has(RE.uni)) { R(12, hy - 9, 1, 4, '#ffd23f'); P(12, hy - 10, '#fff6c8'); }
      if (has(RE.antler)) { for (const s of [-1, 1]) { R(12 + s * 4, hy - 9, 1, 4, '#8a5a34'); P(12 + s * 5, hy - 9, '#8a5a34'); P(12 + s * 3, hy - 10, '#8a5a34'); } }
      if (has(RE.gill)) { for (const s of [-1, 1]) { P(12 + s * 7, hy - 2, '#f070a0'); P(12 + s * 8, hy - 3, '#f070a0'); P(12 + s * 7, hy, '#f070a0'); } }
      if (has(RE.spot)) { P(9, hy - 3, dark); P(15, hy - 2, dark); P(13, hy - 4, dark); }
      if (has(RE.stripe)) { R(11, hy - 5, 1, 2, dark); R(13, hy - 5, 1, 2, dark); P(7, hy, dark); P(17, hy, dark); }
      if (has(RE.scale)) { P(10, hy - 3, shade(body, .85)); P(14, hy - 3, shade(body, .85)); }
      // face
      R(9, hy, 1, 2, OL); R(14, hy, 1, 2, OL); P(9, hy, '#ffffff'); P(14, hy, '#ffffff');
      if (has(RE.beak)) { R(11, hy + 2, 3, 2, '#f0a030'); P(12, hy + 4, '#d07820'); }
      else if (has(RE.trunk)) { R(11, hy + 2, 2, 4, body); }
      else { P(11, hy + 2, OL); P(12, hy + 2, OL); P(12, hy + 4, '#c05050'); }
      P(8, hy + 2, '#f6a0a0'); P(15, hy + 2, '#f6a0a0');
      // tier head gear
      if (tier >= 3 && tier < 5) { R(8, hy - 6, 8, 2, '#b8c0cc'); R(8, hy - 6, 8, 1, tier >= 4 ? '#ffd23f' : '#d8dee6'); R(11, hy - 9, 2, 3, el); }
      if (tier >= 5) { for (let x = 7; x <= 17; x++) P(x, 1, '#ffe27a'); P(6, 2, '#ffe27a'); P(18, 2, '#ffe27a'); }
    }
    // outline pass
    const im = g.getImageData(0, 0, cv.width, cv.height), d = im.data, Wd = cv.width;
    const a = (x, y) => (x >= 0 && y >= 0 && x < Wd && y < FH && Math.floor(x / FW) === Math.floor(xx / FW)) ? d[(y * Wd + x) * 4 + 3] : 0;
    const out = new Uint8ClampedArray(d);
    var xx = 0;
    for (let y = 0; y < FH; y++) for (xx = 0; xx < Wd; xx++) {
      if (d[(y * Wd + xx) * 4 + 3]) continue;
      if (a(xx + 1, y) || a(xx - 1, y) || a(xx, y + 1) || a(xx, y - 1)) { const i = (y * Wd + xx) * 4; out[i] = 43; out[i + 1] = 27; out[i + 2] = 23; out[i + 3] = 255; }
    }
    g.putImageData(new ImageData(out, Wd, FH), 0, 0);
    cv.frames = 3; cv.fw = FW; cv.fh = FH; cv.px = 1; cv.grow = 1; cv.rpg = true;
    return cv;
  }
  window.CreatureRPG = { make, elementColor: elCol };
})();
