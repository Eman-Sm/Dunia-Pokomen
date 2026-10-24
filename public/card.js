// Kartu Warga Pokomen — an original trading-card style ID card for each citizen.
// Drawn on a canvas (so it can be saved as PNG); tier effects are layered on top with CSS.
(function () {
  const W = 600, H = 840;
  const OL = '#2b1b17';
  const DISPLAY = '"Pixelify Sans", "Courier New", monospace';
  const BODY = 'Nunito, "Trebuchet MS", sans-serif';

  const ELEMENTS = [
    { name: 'Api', color: '#e8542c', re: /naga|dragon|phoenix|feniks|api|singa|lion|harimau|tiger|rubah|fox/ },
    { name: 'Air', color: '#3f8fd0', re: /ikan|fish|paus|whale|hiu|shark|lumba|dolphin|gurita|octopus|katak|kodok|frog|bebek|duck|pinguin|penguin|kura|penyu|duyung/ },
    { name: 'Angin', color: '#7cc0e8', re: /burung|bird|elang|eagle|garuda|kelelawar|bat|kupu|butterfly|lebah|bee|gagak|crow|merpati|angsa|pegasus|ayam/ },
    { name: 'Daun', color: '#5fa84a', re: /kelinci|rabbit|rusa|deer|panda|siput|keong|snail|monyet|monkey|domba|sheep|sapi|cow|kambing|jerapah|gajah|tupai|hamster/ },
    { name: 'Bintang', color: '#c27ae0', re: /unicorn|hantu|ghost|peri|alien|bintang/ },
  ];
  const STATS = ['Keimutan', 'Keberanian', 'Kejahilan', 'Kecerdasan'];
  const TIER_STYLE = [
    { frame: ['#b8743a', '#8f5426'], inner: '#fbe9c4', label: '#e9e2d0', text: OL },
    { frame: ['#e6ebf0', '#9aa6b2'], inner: '#f4f7fa', label: '#bfe6a8', text: OL },
    { frame: ['#ffe27a', '#c8901c'], inner: '#fff6d6', label: '#9fd3f2', text: OL },
    { frame: null, inner: '#1f1640', label: '#ffd23f', text: '#fff6d6' },
  ];

  const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  function elementOf(w) {
    const all = (w.hewan || []).join(' ').toLowerCase();
    for (const e of ELEMENTS) if (e.re.test(all)) return e;
    return { name: 'Batu', color: '#9a8a78' };
  }
  function statsOf(w) {
    const h = hash((w.u || '') + (w.hewan || []).join('+'));
    return STATS.map((n, i) => ({ n, v: Math.min(99, 28 + ((h >>> (i * 7)) % 52) + (w.tier || 0) * 6) }));
  }
  function wrap(ctx, text, maxW) {
    const words = String(text || '').split(/\s+/); const lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    return lines;
  }
  function rect(ctx, x, y, w, h, fill, stroke = OL, lw = 4) {
    ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
    if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw); }
  }

  /**
   * draw(canvas, w, { world, worldImg, spot, hari })
   */
  async function draw(canvas, w, env) {
    try { await Promise.all([document.fonts.load('700 40px "Pixelify Sans"'), document.fonts.load('600 20px Nunito')]); } catch { /* fallback fonts */ }
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const tier = Math.max(0, Math.min(3, w.tier || 0));
    const S = TIER_STYLE[tier];
    const el = elementOf(w);

    // ---- frame
    if (tier === 3) {
      const g = ctx.createLinearGradient(0, 0, W, H);
      ['#ff5f6d', '#ffc371', '#fff36b', '#6bff95', '#5ec8ff', '#a77bff', '#ff6bd6'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
      ctx.fillStyle = g;
    } else {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, S.frame[0]); g.addColorStop(1, S.frame[1]); ctx.fillStyle = g;
    }
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 8; ctx.strokeStyle = OL; ctx.strokeRect(4, 4, W - 8, H - 8);
    // inner panel
    rect(ctx, 22, 22, W - 44, H - 44, S.inner, OL, 4);
    if (tier === 3) { // cosmic stars
      const r = hash(w.u || 'x');
      for (let i = 0; i < 120; i++) {
        const x = 26 + ((r * (i + 3) * 2654435761) >>> 0) % (W - 52), y = 26 + ((r * (i + 7) * 40503) >>> 0) % (H - 52);
        ctx.fillStyle = i % 5 ? 'rgba(255,255,255,.55)' : '#ffd23f'; ctx.fillRect(x, y, i % 7 ? 2 : 4, i % 7 ? 2 : 4);
      }
    }

    // ---- header: name, number, tier
    ctx.fillStyle = S.text; ctx.textBaseline = 'alphabetic';
    let size = 46; ctx.font = `700 ${size}px ${DISPLAY}`;
    while (ctx.measureText(w.nama).width > 330 && size > 26) { size -= 2; ctx.font = `700 ${size}px ${DISPLAY}`; }
    ctx.fillText(w.nama, 44, 84);
    ctx.font = `600 18px ${DISPLAY}`; ctx.fillStyle = tier === 3 ? '#ffd23f' : '#7a5a40';
    const no = 'WARGA No. ' + String((w.spot ?? 0) + 1).padStart(4, '0');
    ctx.fillText(no, 44, 108);
    // tier badge
    ctx.font = `700 18px ${DISPLAY}`;
    const tn = (w.tierNama || ['Hewan Reguler', 'Evolusi 1', 'Evolusi 2', 'Legenda'][tier]).toUpperCase();
    const bw = ctx.measureText(tn).width + 24;
    rect(ctx, W - 44 - bw, 50, bw, 34, S.label, OL, 3);
    ctx.fillStyle = OL; ctx.fillText(tn, W - 44 - bw + 12, 74);
    // element chip
    ctx.font = `700 16px ${DISPLAY}`;
    const ew = ctx.measureText('ELEMEN ' + el.name.toUpperCase()).width + 34;
    rect(ctx, W - 44 - ew, 90, ew, 26, '#fff', OL, 3);
    ctx.fillStyle = el.color; ctx.fillRect(W - 44 - ew + 9, 98, 10, 10);
    ctx.fillStyle = OL; ctx.fillText('ELEMEN ' + el.name.toUpperCase(), W - 44 - ew + 25, 109);

    // ---- art window
    const ax = 44, ay = 126, aw = W - 88, ah = 330;
    rect(ctx, ax - 4, ay - 4, aw + 8, ah + 8, OL, null);
    if (tier === 3) {
      const g = ctx.createRadialGradient(ax + aw / 2, ay + ah / 2, 20, ax + aw / 2, ay + ah / 2, aw / 1.4);
      g.addColorStop(0, '#5b3fb0'); g.addColorStop(1, '#120c2c'); ctx.fillStyle = g; ctx.fillRect(ax, ay, aw, ah);
      for (let i = 0; i < 60; i++) { ctx.fillStyle = i % 4 ? '#ffffff' : '#ffd23f'; ctx.fillRect(ax + (i * 97) % aw, ay + (i * 53) % ah, 3, 3); }
    } else if (env && env.artImg) {
      // anime artwork (cover-fit)
    } else if (env && env.worldImg && env.spot) {
      const scale = 3; const cw = aw / scale, ch = ah / scale;
      ctx.drawImage(env.worldImg, env.spot[0] - cw / 2, env.spot[1] - ch * 0.62, cw, ch, ax, ay, aw, ah);
      ctx.fillStyle = tier === 2 ? 'rgba(255,230,140,.18)' : 'rgba(255,255,255,.06)'; ctx.fillRect(ax, ay, aw, ah);
    } else { ctx.fillStyle = '#6ab04c'; ctx.fillRect(ax, ay, aw, ah); }
    if (env && env.artImg) {
      const im = env.artImg; const s = Math.max(aw / im.width, ah / im.height);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(im, ax + (aw - im.width * s) / 2, ay + (ah - im.height * s) / 2, im.width * s, im.height * s);
      ctx.imageSmoothingEnabled = false;
    } else {
    // creature, big
    const sp = env && env.sprite ? env.sprite : window.Creature.make(w);
    const k = Math.floor(Math.min(220 / sp.width, 220 / sp.height));
    const sw = sp.width * k, sh = sp.height * k;
    const sx = ax + aw / 2 - sw / 2, sy = ay + ah - sh - 26;
    if (tier >= 2) { // glow
      const g = ctx.createRadialGradient(ax + aw / 2, sy + sh * .55, 10, ax + aw / 2, sy + sh * .55, sw * .75);
      g.addColorStop(0, tier === 3 ? 'rgba(255,214,90,.85)' : 'rgba(255,240,170,.7)'); g.addColorStop(1, 'rgba(255,214,90,0)');
      ctx.fillStyle = g; ctx.fillRect(ax, ay, aw, ah);
    }
    ctx.fillStyle = 'rgba(20,30,10,.35)'; ctx.beginPath(); ctx.ellipse(ax + aw / 2, sy + sh - 6, sw * .38, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(sp, Math.round(sx), Math.round(sy), sw, sh);
    }

    // ---- info strip
    let y = ay + ah + 18;
    rect(ctx, 44, y, W - 88, 44, tier === 3 ? '#2d2160' : '#fff8e7', OL, 3);
    ctx.fillStyle = tier === 3 ? '#fff6d6' : OL; ctx.font = `700 19px ${DISPLAY}`;
    const gab = 'GABUNGAN: ' + (w.hewan || []).join(' + ').toUpperCase();
    let gs = 19; while (ctx.measureText(gab).width > W - 120 && gs > 13) { gs--; ctx.font = `700 ${gs}px ${DISPLAY}`; }
    ctx.fillText(gab, 58, y + 29);

    // ---- stats
    y += 60;
    const st = statsOf(w);
    st.forEach((s, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x0 = 44 + col * ((W - 88) / 2 + 6), y0 = y + row * 40, bwid = (W - 88) / 2 - 6;
      ctx.font = `700 16px ${DISPLAY}`; ctx.fillStyle = tier === 3 ? '#fff6d6' : OL;
      ctx.fillText(s.n.toUpperCase(), x0, y0 + 14);
      ctx.fillText(String(s.v), x0 + bwid - ctx.measureText(String(s.v)).width, y0 + 14);
      rect(ctx, x0, y0 + 20, bwid, 14, tier === 3 ? '#120c2c' : '#f3d9a6', OL, 2);
      ctx.fillStyle = [ '#d9483b', '#3f8fd0', '#c27ae0', '#5fa84a' ][i];
      ctx.fillRect(x0 + 2, y0 + 22, Math.round((bwid - 4) * s.v / 99), 10);
    });

    // ---- story
    y += 92;
    const story = (w.cerita || []).slice(-1)[0] || 'Belum ada cerita. Ceritakan kebiasaan uniknya di kolom komentar!';
    const boxH = 108;
    rect(ctx, 44, y, W - 88, boxH, tier === 3 ? '#2d2160' : '#fff8e7', OL, 3);
    ctx.fillStyle = tier === 3 ? '#ffd23f' : '#b8743a'; ctx.fillRect(47, y + 3, 6, boxH - 6);
    ctx.font = `italic 600 19px ${BODY}`; ctx.fillStyle = tier === 3 ? '#fff6d6' : OL;
    wrap(ctx, '“' + story + '”', W - 130).slice(0, 4).forEach((ln, i) => ctx.fillText(ln, 66, y + 30 + i * 24));

    // ---- footer
    y = H - 74;
    ctx.font = `700 20px ${DISPLAY}`; ctx.fillStyle = tier === 3 ? '#ffd23f' : OL;
    ctx.fillText('PEMILIK  @' + w.u, 44, y + 6);
    const lahir = w.lahir ? new Date(w.lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
    ctx.font = `600 16px ${BODY}`; ctx.fillStyle = tier === 3 ? '#e8dcff' : '#7a5a40';
    ctx.fillText(`Lahir ${lahir} · Kavling #${(w.spot ?? 0) + 1} · ${(w.cerita || []).length} cerita`, 44, y + 30);
    ctx.font = `700 16px ${DISPLAY}`; ctx.fillStyle = tier === 3 ? '#ffd23f' : '#b8743a';
    const brand = 'DUNIA POKOMEN';
    ctx.fillText(brand, W - 44 - ctx.measureText(brand).width, y + 30);
    return canvas;
  }

  window.KartuWarga = { draw, elementOf, statsOf };
})();
