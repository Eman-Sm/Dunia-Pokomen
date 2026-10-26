// Dunia Pokomen — public website
(function () {
  const IG_HANDLE = 'duniapokomen'; // ganti jika username Instagram berbeda
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString('id-ID');
  let TIERS = ['Regular', 'Pseudo-evo', 'Mega Evolution', 'Mythical Evolution', 'Legendary Evolution', 'God Mode'];
  let BENEFITS = ['-', 'Tumbuh besar', 'Elemen bangkit', 'Armor dasar', 'Outfit custom', 'Ganti wujud dasar'];

  $('igLink').href = `https://www.instagram.com/${IG_HANDLE}/`;
  $('igLink').textContent = '@' + IG_HANDLE;

  // ---------------------------------------------------------------- demo data
  function demoData() {
    const names = ['Bolu', 'Piyo', 'Kiko', 'Momo', 'Cimol', 'Gembul', 'Nori', 'Tofu', 'Kopi', 'Mochi', 'Bakso', 'Onde', 'Seblak', 'Kerupuk', 'Dodol', 'Lumpia', 'Bubu', 'Cireng', 'Wafer', 'Serabi', 'Klepon', 'Jahe', 'Pandan', 'Kenari', 'Lada', 'Gula', 'Tempe', 'Mangga', 'Jambu', 'Salak', 'Durian', 'Kelapa', 'Biskuit', 'Nastar', 'Martabak', 'Pukis', 'Getuk', 'Lemper', 'Bakpia', 'Pempek'];
    const combos = [['Kucing', 'Naga'], ['Ayam', 'Naga'], ['Rubah', 'Ikan'], ['Kelinci', 'Rusa'], ['Panda', 'Lebah'], ['Babi', 'Burung'], ['Katak', 'Unicorn'], ['Paus', 'Kucing'], ['Harimau', 'Kupu'], ['Serigala', 'Elang'], ['Kura', 'Naga'], ['Gajah', 'Ikan'], ['Domba', 'Kelelawar'], ['Monyet', 'Hiu'], ['Bebek', 'Rubah'], ['Siput', 'Phoenix'], ['Gurita', 'Kelinci'], ['Singa', 'Merak'], ['Hamster', 'Naga'], ['Pinguin', 'Rusa']];
    const stories = ['suka tidur di atap Balai Warga', 'menghangatkan air mandi warga pakai napas api', 'selalu bangun paling pagi dan membangunkan semua warga', 'mengoleksi batu bercahaya dari sungai', 'menari setiap kali hujan turun', 'menjaga kavling tetangga waktu malam', 'belajar berenang di danau barat', 'suka menyanyi di jembatan kayu'];
    const tierOf = (i) => [5, 0, 4, 3, 0, 1, 2, 0, 1, 0][i % 10];
    const ELS = ['Api', 'Air', 'Petir', 'Daun', 'Es', 'Cahaya'], OUTS = ['jubah ninja merah', 'zirah samurai biru', 'mantel penyihir ungu'], WJ = ['Mecha', 'Mecha Beast', 'Kristal', 'Roh Cahaya'];
    const warga = names.map((n, i) => ({
      u: n.toLowerCase() + '_' + (100 + i * 7), nama: n, hewan: combos[i % combos.length], tier: tierOf(i), tierNama: TIERS[tierOf(i)],
      elemen: tierOf(i) >= 2 ? ELS[i % ELS.length] : null, outfit: tierOf(i) >= 4 ? OUTS[i % OUTS.length] : null, wujud: tierOf(i) >= 5 ? WJ[(i / 10 | 0) % WJ.length] : null, skill: tierOf(i) >= 3 ? ['menyemburkan api', 'terbang tinggi', 'memanggil petir', 'gelembung air', 'badai salju', 'menghilang seperti ninja', 'lari secepat kilat', 'gempa bumi', 'sihir bintang', 'tornado daun'][i % 10] : null,
      spot: i, cerita: [stories[i % stories.length], ...(tierOf(i) ? [stories[(i + 3) % stories.length]] : [])].map((s) => `${n} ${s}.`),
      lahir: new Date(Date.now() - i * 3.6e6).toISOString(), sprite: null,
    }));
    if (warga[3]) warga[3].sahabat = 5;
    return {
      demo: true, hari: 1, tiers: TIERS, jumlahWarga: warga.length, warga,
      kopiBoard: warga[3] ? [{ u: warga[3].u, nama: warga[3].nama, total: 5 }, { u: warga[0].u, nama: warga[0].nama, total: 3 }] : [],
      usulan: [
        { id: 'a', u: 'kopi_156', text: 'Lumbung Makanan', likes: 1539, status: null },
        { id: 'b', u: 'cimol_128', text: 'Kubangan Lumpur', likes: 1330, status: null },
        { id: 'c', u: 'bolu_100', text: 'Kolam Minum', likes: 1178, status: null },
        { id: 'd', u: 'tofu_149', text: 'Sarang Hangat', likes: 898, status: null },
      ],
      pemilu: { tutup: new Date(Date.now() + 20 * 3.6e6).toISOString(), closed: false, updatedAt: new Date(Date.now() - 4 * 6e4).toISOString(), likesAvailable: true, jumlahCalon: 4, jumlahPeserta: 31,
        kandidat: [{ u: 'kiko_114', likes: 87, komentar: 3, kampanye: 'Berry gratis untuk semua!' }, { u: 'bolu_100', likes: 64, komentar: 2, kampanye: 'Keamanan nomor satu' }, { u: 'momo_121', likes: 41, komentar: 2, kampanye: null }, { u: 'piyo_107', likes: 12, komentar: 4, kampanye: 'Koloni yang damai' }] },
      trakteer: 'https://trakteer.id/',
      dukungan: [
        { nama: 'Rara', pesan: 'Jagain Bolu ya Min, jangan tidur!', unit: 'Kopi Admin', jumlah: 3, t: new Date(Date.now() - 1.2e6).toISOString() },
        { nama: 'Seseorang', pesan: '', unit: 'Kopi Admin', jumlah: 1, t: new Date(Date.now() - 7.2e6).toISOString() },
      ],
      log: [
        { t: new Date(Date.now() - 6e5).toISOString(), type: 'legenda', text: 'Bolu milik @bolu_100 kini menjadi God Mode!' },
        { t: new Date(Date.now() - 2.4e6).toISOString(), type: 'evolusi', text: 'Bolu milik @bolu_100 berevolusi menjadi Evolusi 2!' },
        { t: new Date(Date.now() - 5e6).toISOString(), type: 'lahir', text: '@kiko_114 lahir sebagai Kiko (Rubah + Ikan)' },
        { t: new Date(Date.now() - 9e6).toISOString(), type: 'bangun', text: 'Balai Warga selesai dibangun oleh Admin' },
      ],
    };
  }

  // ---------------------------------------------------------------- state
  let DATA = null, WORLD = null, IMG = null;
  const cam = { x: 850, y: 900, z: 2 };
  let selected = null, hover = null;

  async function load() {
    const wantDemo = /(^|[?&])demo=1/.test(location.search);
    let data = null;
    if (!wantDemo) {
      try {
        const r = await fetch('api/dunia', { cache: 'no-store' });
        if (r.ok) data = await r.json();
        if (data && data.error) data = null;
      } catch { data = null; }
    }
    if (!data) data = demoData();
    DATA = data;
    if (data.tiers) TIERS = data.tiers;
    if (data.benefits) BENEFITS = data.benefits;
    $('chipHari').textContent = 'HARI KE-' + (data.hari || 1);
    $('chipWarga').textContent = fmt(data.jumlahWarga) + ' WARGA';
    $('chipDemo').hidden = !data.demo;
    $('stepDM').hidden = !data.wajibFollow;
    fitted = false; refit();
    updateJam();
    renderBook(); renderVotes(); renderNews(); renderLadder(); renderTierFilter(); renderDukungan(); renderPemilu();
    const qk = new URLSearchParams(location.search).get('kartu');
    if (qk) { const w = DATA.warga.find((x) => x.u === qk.toLowerCase()); if (w) { select(w); openKartu(w); } }
    draw();
  }

  // ---------------------------------------------------------------- map
  const box = $('mapbox'), canvas = $('map'), ctx = canvas.getContext('2d');
  let DPR = 1;
  // the map can start hidden (e.g. inside Ruang Admin on a phone): fit the camera once it has a size
  let fitted = false;
  function refit() {
    if (fitted || !DATA || !WORLD || box.clientWidth < 10 || box.clientHeight < 10) return;
    const f = fitAll(); cam.x = f.x; cam.y = f.y; cam.z = f.z; fitted = true;
  }
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(box.clientWidth * DPR);
    canvas.height = Math.round(box.clientHeight * DPR);
    refit();
    if (!(cam.z > 0) || !Number.isFinite(cam.z)) { fitted = false; refit(); }
    draw();
  }
  if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(box);
  const minZ = () => Math.max(box.clientWidth / (WORLD ? WORLD.w : 1700), box.clientHeight / (WORLD ? WORLD.h : 1800));
  function clampCam() {
    cam.z = Math.max(minZ(), Math.min(7, cam.z));
    const hw = box.clientWidth / cam.z / 2, hh = box.clientHeight / cam.z / 2;
    const W = WORLD ? WORLD.w : 1700, H = WORLD ? WORLD.h : 1800;
    cam.x = Math.max(hw, Math.min(W - hw, cam.x));
    cam.y = Math.max(hh, Math.min(H - hh, cam.y));
  }
  const spotOf = (w) => (WORLD && WORLD.spots[w.spot % WORLD.spots.length]) || [850, 900];
  const toScreen = (x, y) => [(x - cam.x) * cam.z + box.clientWidth / 2, (y - cam.y) * cam.z + box.clientHeight / 2];
  const toWorld = (sx, sy) => [(sx - box.clientWidth / 2) / cam.z + cam.x, (sy - box.clientHeight / 2) / cam.z + cam.y];

  const spriteImgs = new Map();
  function spriteFor(w) {
    if (w.sprite) {
      if (!spriteImgs.has(w.sprite)) { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = draw; im.src = w.sprite; spriteImgs.set(w.sprite, im); }
      const im = spriteImgs.get(w.sprite);
      if (im.complete && im.naturalWidth) return im;
    }
    return window.Creature.make(w);
  }

  let tick = 0;
  // ---------------------------------------------------------------- living citizens: wander around their plot
  const ACT = new Map();
  const rand = (a, b) => a + Math.random() * (b - a);
  function actor(w) {
    const k = w.u + (w.makam ? ':m' + w.spot : '');
    let a = ACT.get(k);
    const [hx, hy] = spotOf(w);
    if (!a || a.hx !== hx || a.hy !== hy) {
      a = { hx, hy, x: hx + rand(-6, 6), y: hy + rand(-3, 3), tx: hx, ty: hy, mode: 'idle', until: performance.now() + rand(300, 4000), face: Math.random() < .5 ? -1 : 1, walk: 0, emote: null, emoteT: 0, seed: Math.random() * 10 };
      ACT.set(k, a);
    }
    return a;
  }
  const sleeping = () => { const h = jamWIB(); return h >= 22 || h < 5; };
  const EMO = ['♥', '♪', '!', '?', '✦'];
  function stepActors(now, dt) {
    const slp = sleeping();
    for (const w of allWarga()) {
      if (w.mati) continue;
      const a = actor(w);
      if (w === selected || slp) { a.mode = 'idle'; a.until = now + 800; continue; }
      if (w.tier >= 3 && w.skill) {
        if (!a.skillNext) a.skillNext = now + rand(1500, 8000);
        if (now >= a.skillNext) { a.skillT = now; a.skillKind = skillKind(w.skill); a.skillNext = now + (SKILL_TEST ? rand(2600, 3400) : rand(7000, 13000)); a.mode = 'idle'; a.until = now + 2400; }
        if (now - (a.skillT || -1e9) < SKILL_MS) continue;
      }
      if (a.mode === 'walk') {
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        const sp = (10 + Math.min(4, w.tier || 0) * 1.5) * dt / 1000;
        if (d <= sp) { a.x = a.tx; a.y = a.ty; a.mode = 'idle'; a.until = now + rand(1500, 6000); }
        else { a.x += dx / d * sp; a.y += dy / d * sp; a.walk += dt / 1000 * 9; if (Math.abs(dx) > .3) a.face = dx < 0 ? -1 : 1; }
      } else if (now > a.until) {
        if (Math.random() < .72) {
          // roam freely across the open clearing: pick a nearby walkable tile
          const W = WORLD && WORLD.walk;
          if (W && W.length) {
            const R = 70 + Math.min(4, w.tier || 0) * 12;
            let t = null;
            for (let k = 0; k < 8 && !t; k++) { const c = W[Math.floor(Math.random() * W.length)]; if (Math.hypot(c[0] - a.x, (c[1] - a.y) * 2) < R) t = c; }
            if (!t) t = [a.x + rand(-10, 10), a.y + rand(-5, 5)];
            a.tx = t[0] + rand(-6, 6); a.ty = t[1] + rand(-3, 3);
          } else { const ang = rand(0, Math.PI * 2), r = rand(4, 18); a.tx = a.hx + Math.cos(ang) * r; a.ty = a.hy + Math.sin(ang) * r * .55; }
          a.mode = 'walk';
        } else { a.emote = EMO[Math.floor(Math.random() * EMO.length)]; a.emoteT = now; a.until = now + rand(1200, 3000); }
      }
    }
  }
  // ---------------------------------------------------------------- skills (Mythical Evolution and up)
  const SKILL_MS = 2300;
  const SKILL_TEST = new URLSearchParams(location.search).has('skilltest'); // preview: skills fire every ~3 s
  const SKILL_KINDS = [
    ['api', /api|fire|sembur|bakar|panas|naga api|flame/], ['terbang', /terbang|fly|melayang|sayap|melesat ke udara/],
    ['petir', /petir|listrik|halilintar|thunder|lightning|setrum/], ['es', /\bes\b|salju|beku|ice|frost|dingin/],
    ['air', /air|water|gelembung|ombak|hujan|bubble|semprot/], ['daun', /daun|tanaman|bunga|akar|hutan|alam|leaf|pohon/],
    ['hilang', /hilang|teleport|tembus|bayangan|invisible|ninja|sembunyi|kamuflase/], ['lari', /cepat|lari|sprint|dash|kilat|speed/],
    ['angin', /angin|tornado|badai|puyuh|wind/], ['cahaya', /cahaya|sinar|laser|light|terang/],
    ['tanah', /tanah|batu|gempa|rock|pasir/], ['racun', /racun|poison|bisa\b|toxic/], ['sihir', /./],
  ];
  function skillKind(t) { const s = String(t || '').toLowerCase(); return (SKILL_KINDS.find(([, re]) => re.test(s)) || ['sihir'])[0]; }
  function skillState(w, A, now) {
    if (!(w.tier >= 3) || !w.skill || w.mati || A.skillT == null) return null;
    const p = (now - A.skillT) / SKILL_MS;
    return p >= 0 && p < 1 ? { kind: A.skillKind || skillKind(w.skill), p } : null;
  }
  function drawSkill(sk, w, x, y, top, face, z) {
    const { kind, p } = sk, fade = p < .12 ? p / .12 : p > .82 ? (1 - p) / .18 : 1;
    const mx = x + face * 7 * z, my = top + 12 * z; // mouth / front point
    ctx.save(); ctx.globalAlpha = Math.max(0, fade);
    const dot = (px, py, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, Math.max(1, r), 0, Math.PI * 2); ctx.fill(); };
    const seed = (i) => ((Math.sin(i * 12.9898 + w.spot * 78.233) * 43758.5453) % 1 + 1) % 1;
    if (kind === 'api') {
      for (let i = 0; i < 22; i++) { const t = ((p * 3 + seed(i)) % 1), spread = (seed(i + 9) - .5) * .9;
        const d = t * 34 * z; const px = mx + face * d, py = my + spread * d * .6 - t * 4 * z;
        dot(px, py, (2.6 - t * 1.6) * z, t < .3 ? '#fff3a0' : t < .6 ? '#ffb02e' : '#e8483b'); }
    } else if (kind === 'terbang') {
      for (let i = 0; i < 4; i++) { const yy = y - (2 + i * 3) * z; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - (8 - i) * z, yy); ctx.lineTo(x + (8 - i) * z, yy); ctx.stroke(); }
    } else if (kind === 'petir') {
      for (let b = 0; b < 3; b++) { if (((p * 9 + b * 3) | 0) % 3) continue; let px = x + (b - 1) * 10 * z, py = top - 40 * z;
        ctx.strokeStyle = '#fff36a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(px, py);
        for (let k = 0; k < 5; k++) { px += (seed(b * 7 + k) - .5) * 10 * z; py += 9 * z; ctx.lineTo(px, py); } ctx.stroke(); }
      dot(x, top + 14 * z, 16 * z * (1 - p), 'rgba(255,250,170,.35)');
    } else if (kind === 'air' || kind === 'racun') {
      const col = kind === 'air' ? ['#bfe8ff', '#5fb4f0'] : ['#c8f08a', '#6fbf3a'];
      for (let i = 0; i < 14; i++) { const t = (p * 2 + seed(i)) % 1; const px = x + (seed(i + 3) - .5) * 26 * z, py = top + 18 * z - t * 30 * z;
        ctx.strokeStyle = col[1]; ctx.lineWidth = 1.2; ctx.fillStyle = col[0]; ctx.beginPath(); ctx.arc(px, py, (1.5 + seed(i) * 2) * z, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    } else if (kind === 'es') {
      const r = (6 + p * 26) * z;
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + p; const px = x + Math.cos(a) * r, py = top + 14 * z + Math.sin(a) * r * .5;
        ctx.strokeStyle = '#e6fbff'; ctx.lineWidth = 1.4; for (let k = 0; k < 3; k++) { const aa = k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(px - Math.cos(aa) * 2.5 * z, py - Math.sin(aa) * 2.5 * z); ctx.lineTo(px + Math.cos(aa) * 2.5 * z, py + Math.sin(aa) * 2.5 * z); ctx.stroke(); } }
    } else if (kind === 'daun' || kind === 'angin') {
      for (let i = 0; i < 12; i++) { const a = p * 9 + i / 12 * Math.PI * 2, r = (10 + seed(i) * 8) * z; const px = x + Math.cos(a) * r, py = top + 14 * z + Math.sin(a) * r * .45 - p * 10 * z;
        if (kind === 'daun') { ctx.fillStyle = i % 3 ? '#5fd04a' : '#f48cb0'; ctx.beginPath(); ctx.ellipse(px, py, 2.6 * z, 1.3 * z, a, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.strokeStyle = 'rgba(230,250,255,.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, top + 14 * z - p * 10 * z, r, a, a + .9); ctx.stroke(); } }
    } else if (kind === 'cahaya') {
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + p; ctx.strokeStyle = 'rgba(255,240,160,.85)'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 9 * z, top + 14 * z + Math.sin(a) * 9 * z); ctx.lineTo(x + Math.cos(a) * (14 + p * 18) * z, top + 14 * z + Math.sin(a) * (14 + p * 18) * z); ctx.stroke(); }
    } else if (kind === 'tanah') {
      for (let i = 0; i < 9; i++) { const t = (p * 2 + seed(i)) % 1, a = seed(i + 4) * Math.PI; const px = x + Math.cos(a) * 18 * z * (seed(i) - .5) * 2, py = y - Math.sin(t * Math.PI) * 18 * z;
        ctx.fillStyle = i % 2 ? '#9a6a3a' : '#7d838d'; ctx.fillRect(px - 2 * z, py - 2 * z, 4 * z, 3 * z); }
    } else if (kind === 'hilang') {
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; dot(x + Math.cos(a) * (6 + p * 10) * z, top + 16 * z + Math.sin(a) * 4 * z, (3 - p * 2) * z, 'rgba(120,90,160,.5)'); }
    } else if (kind === 'lari') {
      for (let i = 0; i < 5; i++) { const yy = top + (10 + i * 4) * z; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - face * (10 + i * 2) * z, yy); ctx.lineTo(x - face * (24 + i * 3 + p * 8) * z, yy); ctx.stroke(); }
    } else {
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + p * 4, r = (8 + p * 16) * z; const px = x + Math.cos(a) * r, py = top + 14 * z + Math.sin(a) * r * .6;
        ctx.fillStyle = i % 2 ? '#ffd23f' : '#c79ae8'; ctx.fillRect(px - 1.5, py - 4, 3, 8); ctx.fillRect(px - 4, py - 1.5, 8, 3); }
    }
    // skill name
    if (z >= 1.4 && p < .9) {
      const label = '✦ ' + (w.skill.length > 22 ? w.skill.slice(0, 21) + '…' : w.skill);
      ctx.globalAlpha = Math.min(1, fade * 1.2);
      ctx.font = `700 ${Math.round(7 + 2.2 * z)}px "Pixelify Sans", monospace`; ctx.textAlign = 'center';
      const ly = top - 4 * z - p * 6 * z;
      ctx.lineWidth = 3; ctx.strokeStyle = '#2b1b17'; ctx.strokeText(label, x, ly); ctx.fillStyle = '#ffe27a'; ctx.fillText(label, x, ly);
      ctx.textAlign = 'start';
    }
    ctx.restore();
  }
  const posOf = (w) => { if (w.mati) return spotOf(w); const a = actor(w); return [a.x, a.y]; };

  function draw() {
    if (!IMG || !DATA) return;
    clampCam();
    const Wc = box.clientWidth, Hc = box.clientHeight;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = cam.z < 1;
    ctx.fillStyle = '#3f8fd0'; ctx.fillRect(0, 0, Wc, Hc);
    const sx = cam.x - Wc / cam.z / 2, sy = cam.y - Hc / cam.z / 2;
    ctx.drawImage(IMG, sx, sy, Wc / cam.z, Hc / cam.z, 0, 0, Wc, Hc);
    ctx.imageSmoothingEnabled = false;
    const list = allWarga().map((w) => ({ w, p: posOf(w) })).sort((a, b) => a.p[1] - b.p[1]);
    const now = performance.now(), slp = sleeping();
    const labels = [];
    for (const { w, p } of list) {
     try {
      const [x, y] = toScreen(p[0], p[1]);
      if (x < -40 || y < -40 || x > Wc + 40 || y > Hc + 60) continue;
      if (w.mati) {
        const g = drawGrave(x, y);
        labels.push({ w, x, y: g - 3, big: w === selected || w === hover });
        continue;
      }
      const sp = spriteFor(w);
      const custom = sp instanceof HTMLImageElement;
      const u = custom ? 1 : (sp.px || 1); // HD sprites have px units per pixel
      const s = cam.z * (custom ? 26 * (w.tier >= 3 ? 1.5 : w.tier >= 2 ? 1.3 : 1.1) / Math.max(sp.width, sp.height * .9) : (sp.grow || 1) / u);
      const A = actor(w);
      const walking = A.mode === 'walk';
      const bob = walking ? Math.abs(Math.sin(A.walk)) * 2.2 * cam.z : 0;
      const breath = slp ? 1 + .02 * Math.sin(now / 900 + A.seed) : 1 + .025 * Math.sin(now / 420 + A.seed);
      const dw = sp.width * s, dh = sp.height * s;
      ctx.fillStyle = 'rgba(20,30,10,.28)';
      ctx.beginPath(); ctx.ellipse(x, y, 7 * cam.z, 2.2 * cam.z, 0, 0, Math.PI * 2); ctx.fill();
      if (w.tier >= 4) { ctx.fillStyle = 'rgba(255,210,63,.35)'; ctx.beginPath(); ctx.ellipse(x, y - 10 * cam.z, 15 * cam.z, 14 * cam.z, 0, 0, Math.PI * 2); ctx.fill(); }
      const footY = custom ? dh - 1 * cam.z : 31 * u * s; // feet sit at row 31 of the 36-unit sprite
      if (sp.hd || custom) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; }
      // flip to face the walking direction, squash a little when breathing / landing a step
      const sq = walking ? 1 + .06 * Math.cos(A.walk * 2) : breath;
      const SK = slp ? null : skillState(w, A, now);
      const lift = SK && SK.kind === 'terbang' ? Math.sin(SK.p * Math.PI) * 16 * cam.z : 0;
      const shake = SK && SK.kind === 'tanah' ? Math.sin(now / 30) * 1.5 * cam.z : 0;
      const alpha = SK && SK.kind === 'hilang' ? (SK.p < .5 ? Math.max(.08, 1 - SK.p * 2) : Math.min(1, (SK.p - .5) * 2)) : 1;
      if (SK && SK.kind === 'lari') for (let g = 3; g >= 1; g--) { ctx.save(); ctx.globalAlpha = .18 * (4 - g) / 3; ctx.translate(Math.round(x - A.face * g * 7 * cam.z), Math.round(y - bob)); ctx.scale(A.face < 0 ? -1 : 1, 1); ctx.drawImage(sp, -dw / 2, -footY, dw, dh); ctx.restore(); }
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(Math.round(x + shake), Math.round(y - bob - lift)); ctx.scale(A.face < 0 ? -1 : 1, 1); ctx.scale(1 / Math.sqrt(sq), sq);
      ctx.drawImage(sp, -dw / 2, -footY, dw, dh);
      ctx.restore();
      ctx.imageSmoothingEnabled = false;
      const top = y - footY * sq - bob - lift;
      if (SK) { ctx.imageSmoothingEnabled = false; drawSkill(SK, w, x, y, top, A.face, cam.z); }
      let crownTop = Infinity;
      if (w.sahabat && alpha > .3) {
        const hp = custom ? { x: sp.width / 2, y: 0 } : headPoint(sp), hx = x + shake + A.face * (hp.x - sp.width / 2) * s / Math.sqrt(sq);
        crownTop = drawSahabatCrown(hx, y - bob - lift - (footY - hp.y * s) * sq, cam.z, now);
      }
      if (A.emote && now - A.emoteT < 1600 && !slp) {
        const age = (now - A.emoteT) / 1600, fs = Math.round(8 + 3 * cam.z);
        ctx.font = `700 ${fs}px "Pixelify Sans", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        const ex = x + 7 * cam.z, ey = top + 4 * cam.z - age * 6 * cam.z;
        ctx.globalAlpha = age > .75 ? (1 - age) / .25 : 1;
        ctx.lineWidth = 3; ctx.strokeStyle = '#2b1b17'; ctx.strokeText(A.emote, ex, ey);
        ctx.fillStyle = A.emote === '♥' ? '#ff6b8a' : A.emote === '♪' ? '#7cc0e8' : A.emote === '✦' ? '#ffd23f' : '#fffaee'; ctx.fillText(A.emote, ex, ey);
        ctx.globalAlpha = 1; ctx.textAlign = 'start';
      }
      const headTop = custom ? top : top + (sp.hd ? 3 : 6) * u * s; // first painted row of the 36px sprite
      labels.push({ w, x, y: Math.min(headTop, crownTop) - 3, big: w === selected || w === hover });
     } catch (err) { console.warn('sprite gagal', w.u, err); }
    }
    drawSky(Wc, Hc, list);
    // @username above every creature; nudge labels upward when they would overlap
    const placed = [];
    const small = labels.filter((L) => !L.big).sort((a, b) => b.y - a.y);
    const compact = cam.z < 1.8 || Wc < 520;
    const tagFont = compact ? '700 9px "Pixelify Sans", monospace' : '700 11px "Pixelify Sans", monospace';
    const maxCh = compact ? 11 : 24;
    ctx.font = tagFont;
    for (const L of small) {
      L.text = (L.w.mati ? 'RIP @' : '@') + (L.w.u.length > maxCh ? L.w.u.slice(0, maxCh - 1) + '…' : L.w.u);
      L.font = tagFont;
      const bw = ctx.measureText(L.text).width + (compact ? 6 : 10), bh = compact ? 12 : 15;
      let by = L.y - bh;
      for (let k = 0; k < 6; k++) {
        const r = { x: L.x - bw / 2, y: by, w: bw, h: bh };
        if (!placed.some((q) => r.x < q.x + q.w + 2 && r.x + r.w + 2 > q.x && r.y < q.y + q.h + 2 && r.y + r.h + 2 > q.y)) break;
        by -= bh + 3;
      }
      placed.push({ x: L.x - bw / 2, y: by, w: bw, h: bh });
      drawUserTag(L, by, bw, bh);
    }
    for (const L of labels.filter((L) => L.big)) drawLabel(L);
  }
  // ---------------------------------------------------------------- day & night (Jakarta time, WIB = UTC+7)
  const jamParam = Number(new URLSearchParams(location.search).get('jam'));
  function jamWIB() {
    if (!Number.isNaN(jamParam) && new URLSearchParams(location.search).has('jam')) return ((jamParam % 24) + 24) % 24;
    return ((Date.now() / 3.6e6 + 7) % 24 + 24) % 24;
  }
  // dark: 0 day .. 1 night, warm: dawn/dusk glow
  function langit(h) {
    const ramp = (a, b, x) => Math.max(0, Math.min(1, (x - a) / (b - a)));
    let dark = 0, warm = 0;
    if (h < 4.5 || h >= 19.5) dark = 1;
    else if (h < 6.5) { dark = 1 - ramp(4.5, 6.5, h); warm = 1 - Math.abs(h - 5.6) / 1.1; }
    else if (h >= 16.5) { dark = ramp(17.6, 19.5, h); warm = 1 - Math.abs(h - 17.8) / 1.4; }
    warm = Math.max(0, Math.min(1, warm));
    const nama = h < 4.5 ? 'Malam' : h < 6.5 ? 'Fajar' : h < 11 ? 'Pagi' : h < 15 ? 'Siang' : h < 18 ? 'Sore' : 'Malam';
    return { dark, warm, nama };
  }
  const iso = (u, v) => [850 + (u - v) * 16, 804 + (u + v) * 8];
  const LIGHTS = [[862, 894, 26], [836, 900, 18]]; // Balai Warga window & door lantern (world.json may add more)
  function drawSky(Wc, Hc, list) {
    const { dark, warm } = langit(jamWIB());
    const lights = (WORLD && WORLD.lights) || LIGHTS;
    if (dark <= 0.01 && warm <= 0.01) return;
    const mixc = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    let c = mixc([255, 255, 255], [70, 82, 150], dark * .82);
    c = mixc(c, [255, 176, 120], warm * .45);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(0, 0, Wc, Hc);
    if (dark > .25) {
      ctx.globalCompositeOperation = 'lighter';
      const a = (dark - .25) / .75;
      const flick = 0.92 + 0.08 * Math.sin(tick * 1.7);
      for (const [x, y, r] of lights) {
        const [sx, sy] = toScreen(x, y); const R = r * cam.z;
        if (sx < -R || sy < -R || sx > Wc + R || sy > Hc + R) continue;
        const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
        gr.addColorStop(0, `rgba(255,200,110,${.55 * a * flick})`); gr.addColorStop(1, 'rgba(255,160,60,0)');
        ctx.fillStyle = gr; ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
      }
      // evolved citizens glow softly at night
      for (const { w, p } of list) {
        if (!(w.tier >= 2) || w.mati) continue;
        const [sx, sy] = toScreen(p[0], p[1] - 10); const R = 16 * cam.z;
        if (sx < -R || sy < -R || sx > Wc + R || sy > Hc + R) continue;
        const col = w.elemen && window.Creature.elementColor ? window.Creature.elementColor(w.elemen) : '#fff2a8';
        const n = parseInt(col.slice(1), 16);
        const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
        gr.addColorStop(0, `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${.35 * a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr; ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
      }
      // fireflies
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 60; i++) {
        const bx = 520 + ((i * 137) % 660), by = 620 + ((i * 89) % 560);
        const x = bx + Math.sin(tick * .35 + i) * 6, y = by + Math.cos(tick * .29 + i * 1.3) * 5;
        const [sx, sy] = toScreen(x, y);
        if (sx < 0 || sy < 0 || sx > Wc || sy > Hc) continue;
        const on = (Math.sin(tick * .9 + i * 2.1) + 1) / 2;
        ctx.fillStyle = `rgba(230,255,140,${.85 * a * on})`; ctx.fillRect(Math.round(sx), Math.round(sy), Math.max(2, cam.z), Math.max(2, cam.z));
      }
      // sleeping citizens (22:00 - 05:00)
      const h = jamWIB();
      if (h >= 22 || h < 5) {
        ctx.font = `700 ${Math.round(6 + 2.5 * cam.z)}px "Pixelify Sans", monospace`; ctx.textBaseline = 'alphabetic';
        for (const { w, p } of list) {
          if (w.mati || (w.spot % 3 === 0)) continue;
          const [sx, sy] = toScreen(p[0] + 6, p[1] - 22);
          if (sx < 0 || sy < 0 || sx > Wc || sy > Hc) continue;
          const ph = ((tick + w.spot * 3) % 9) / 9;
          ctx.fillStyle = `rgba(230,236,255,${(1 - ph) * .9})`;
          ctx.fillText('z', sx + ph * 5 * cam.z, sy - ph * 7 * cam.z);
        }
      }
    }
    ctx.restore();
  }
  function updateJam() {
    const h = jamWIB(); const L = langit(h);
    const hh = String(Math.floor(h)).padStart(2, '0'), mm = String(Math.floor((h % 1) * 60)).padStart(2, '0');
    const ico = L.nama === 'Malam' ? '🌙' : L.nama === 'Fajar' ? '🌅' : L.nama === 'Sore' ? '🌇' : '☀️';
    const el = $('chipJam'); if (el) el.textContent = `${ico} ${hh}:${mm} WIB · ${L.nama}`;
  }
  setInterval(() => { updateJam(); }, 20000);

  // tombstone for a citizen that died because its owner unfollowed
  function drawGrave(x, y) {
    const z = cam.z, px = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + dx * z), Math.round(y + dy * z), Math.ceil(w * z), Math.ceil(h * z)); };
    ctx.fillStyle = 'rgba(20,30,10,.28)'; ctx.beginPath(); ctx.ellipse(x, y, 8 * z, 2.4 * z, 0, 0, Math.PI * 2); ctx.fill();
    px(-6, -15, 12, 15, '#2b1b17'); px(-5, -17, 10, 2, '#2b1b17'); px(-3, -18, 6, 1, '#2b1b17');
    px(-5, -15, 10, 14, '#9aa0aa'); px(-4, -16, 8, 1, '#9aa0aa'); px(-5, -15, 2, 14, '#b7bcc5'); px(3, -15, 2, 14, '#7d838d');
    px(-3, -12, 6, 1, '#5b616b'); px(-3, -9, 6, 1, '#5b616b'); px(-2, -6, 4, 1, '#5b616b');
    px(-7, -1, 14, 2, '#6b4a2a'); px(-6, -2, 2, 1, '#4f9a45'); px(4, -2, 2, 1, '#4f9a45'); px(5, -3, 1, 1, '#f08ab0');
    return y - 18 * z;
  }
  // topmost opaque point of a sprite (where a crown sits), cached per sprite
  function headPoint(sp) {
    if (sp._head) return sp._head;
    let res = { x: sp.width / 2, y: 0 };
    try {
      const W = sp.width, H = sp.height;
      const c = sp.getContext ? sp : (() => { const k = document.createElement('canvas'); k.width = W; k.height = H; k.getContext('2d').drawImage(sp, 0, 0); return k; })();
      const d = c.getContext('2d').getImageData(0, 0, W, H).data;
      outer: for (let yy = 0; yy < H; yy++) {
        let sx = 0, n = 0;
        for (let xx = 0; xx < W; xx++) if (d[(yy * W + xx) * 4 + 3] > 40) { sx += xx; n++; }
        if (n) { // average the first few rows so a single horn tip does not decide it
          let sy = sx, m = n;
          for (let k = 1; k <= Math.round(H * .08) && yy + k < H; k++) for (let xx = 0; xx < W; xx++) if (d[((yy + k) * W + xx) * 4 + 3] > 40) { sy += xx; m++; }
          res = { x: sy / m, y: yy }; break outer;
        }
      }
    } catch { /* tainted image: keep default */ }
    sp._head = res; return res;
  }
  // special crown for the Sahabat Admin (top coffee supporter): rose-gold, blue gem, twinkle
  function drawSahabatCrown(x, y, z, now) {
    const u = Math.max(1, z * .9), bx = Math.round(x - 6 * u), by = Math.round(y - 9 * u - Math.sin(now / 500) * u);
    const R = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(bx + Math.round(dx * u), by + Math.round(dy * u), Math.ceil(w * u), Math.ceil(h * u)); };
    R(-1, 2, 14, 7, '#2b1b17'); R(-1, -1, 3, 4, '#2b1b17'); R(4.5, -2, 3, 5, '#2b1b17'); R(10, -1, 3, 4, '#2b1b17');
    R(0, 3, 12, 5, '#ffb3d1'); R(0, 0, 2, 3, '#ffb3d1'); R(5, -1, 2, 4, '#ffb3d1'); R(10, 0, 2, 3, '#ffb3d1');
    R(0, 6, 12, 2, '#e07aa8'); R(0, 3, 12, 1, '#ffe08a'); R(1, 4, 1, 1, '#fff6d6');
    R(5, 4, 2, 2, '#4fb6ff'); R(5, 4, 1, 1, '#d6f0ff'); R(2, 5, 1, 1, '#ffd23f'); R(9, 5, 1, 1, '#ffd23f');
    R(0, -1, 2, 1, '#ffd23f'); R(5, -2, 2, 1, '#ffd23f'); R(10, -1, 2, 1, '#ffd23f');
    const tw = (Math.sin(now / 260) + 1) / 2;
    if (tw > .55) { ctx.globalAlpha = (tw - .55) / .45; R(13, -3, 1, 3, '#fffaee'); R(12, -2, 3, 1, '#fffaee'); ctx.globalAlpha = 1; }
    return by - 3 * u;
  }
  function allWarga() { return DATA ? DATA.warga.concat(DATA.makam || []) : []; }
  function drawUserTag({ w, x, y, text, font }, by, bw, bh) {
    const bx = Math.round(x - bw / 2); by = Math.round(by);
    if (by + bh < y - 2) { ctx.fillStyle = 'rgba(43,27,23,.7)'; ctx.fillRect(Math.round(x), by + bh, 1, Math.round(y - by - bh)); } // leader line
    ctx.fillStyle = '#2b1b17'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 3);
    ctx.fillStyle = w.mati ? '#c9cdd4' : w.sahabat ? '#ffd6ea' : w.gelar ? '#ffd23f' : w.tier >= 5 ? '#ffd23f' : w.tier >= 4 ? '#fff0b8' : '#fffaee'; ctx.fillRect(bx, by, bw, bh);
    if (w.gelar) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(Math.round(x) - 5, by - 6, 11, 4); ctx.fillRect(Math.round(x) - 5, by - 9, 2, 3); ctx.fillRect(Math.round(x) - 1, by - 10, 3, 4); ctx.fillRect(Math.round(x) + 4, by - 9, 2, 3); ctx.fillStyle = '#d9483b'; ctx.fillRect(Math.round(x), by - 5, 1, 2); }
    ctx.fillStyle = '#3b2416'; ctx.font = font; ctx.textBaseline = 'top';
    ctx.fillText(text, bx + (bh < 15 ? 3 : 5), by + 2);
  }
  function drawLabel({ w, x, y, big }) {
    ctx.font = big ? '600 14px "Pixelify Sans", monospace' : '600 11px "Pixelify Sans", monospace';
    const t = big ? w.nama : w.nama;
    const sub = big ? '@' + w.u + ' · ' + (w.tierNama || TIERS[w.tier]) : null;
    const tw = Math.max(ctx.measureText(t).width, sub ? (ctx.font = '600 11px Nunito, sans-serif', ctx.measureText(sub).width) : 0);
    const bw = tw + 12, bh = big ? 34 : 15;
    const bx = Math.round(x - bw / 2), by = Math.round(big ? y - bh - 2 : y);
    ctx.fillStyle = '#2b1b17'; ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 5);
    ctx.fillStyle = big ? '#fffaee' : 'rgba(255,250,238,.92)'; ctx.fillRect(bx, by, bw, bh);
    if (big) { ctx.fillStyle = '#d8572a'; ctx.fillRect(bx, by, 3, bh); }
    ctx.fillStyle = big ? '#d8572a' : '#3b2416';
    ctx.font = big ? '600 14px "Pixelify Sans", monospace' : '600 11px "Pixelify Sans", monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(t, bx + 6, by + (big ? 3 : 1));
    if (sub) { ctx.font = '600 11px Nunito, sans-serif'; ctx.fillStyle = '#7a5a40'; ctx.fillText(sub, bx + 6, by + 19); }
  }

  // pan / zoom / pick
  const ptrs = new Map();
  let dragStart = null, moved = false, pinch = null;
  box.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.card')) return;
    box.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    moved = false;
    if (ptrs.size === 1) dragStart = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y };
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.z }; }
    $('mapHint').hidden = true;
  });
  box.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) {
      const r = box.getBoundingClientRect();
      const h = pick(e.clientX - r.left, e.clientY - r.top);
      if (h !== hover) { hover = h; box.style.cursor = h ? 'pointer' : ''; draw(); }
      return;
    }
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()];
      cam.z = pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d; moved = true; draw(); return;
    }
    if (dragStart) {
      const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) { moved = true; box.classList.add('dragging'); }
      cam.x = dragStart.cx - dx / cam.z; cam.y = dragStart.cy - dy / cam.z; draw();
    }
  });
  const end = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    box.classList.remove('dragging');
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0) {
      if (!moved) {
        const r = box.getBoundingClientRect();
        const w = pick(e.clientX - r.left, e.clientY - r.top);
        if (w) select(w, false); else closeCard();
      }
      dragStart = null;
    } else { const [p] = [...ptrs.values()]; dragStart = { x: p[0], y: p[1], cx: cam.x, cy: cam.y }; }
  };
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);
  box.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = box.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const [wx, wy] = toWorld(mx, my);
    cam.z *= Math.exp(-e.deltaY * 0.0015);
    clampCam();
    cam.x = wx - (mx - box.clientWidth / 2) / cam.z; cam.y = wy - (my - box.clientHeight / 2) / cam.z;
    draw();
  }, { passive: false });

  function pick(sx, sy) {
    if (!DATA) return null;
    const [wx, wy] = toWorld(sx, sy);
    let best = null, bd = 1e9;
    for (const w of allWarga()) {
      const [x, y] = posOf(w);
      const dx = wx - x, dy = wy - (y - 9);
      const d = dx * dx + dy * dy * 0.7;
      if (Math.abs(dx) < 11 && dy > -14 && dy < 11 && d < bd) { bd = d; best = w; }
    }
    return best;
  }

  function flyTo(x, y, z) {
    const s = { x: cam.x, y: cam.y, z: cam.z }, t0 = performance.now(), D = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 650;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / D), e = p < .5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      cam.x = s.x + (x - s.x) * e; cam.y = s.y + (y - s.y) * e; cam.z = s.z + (z - s.z) * e;
      draw(); if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------- card
  function spriteNode(w, size) {
    const sp = spriteFor(w);
    if (sp instanceof HTMLImageElement) { const im = new Image(); im.src = sp.src; im.alt = w.nama; im.width = size; im.height = size; return im; }
    const c = document.createElement('canvas'); c.width = sp.width; c.height = sp.height; c.getContext('2d').drawImage(sp, 0, 0);
    if (sp.hd) c.style.imageRendering = 'auto';
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', w.nama); return c;
  }
  function select(w, fly = true) {
    selected = w;
    const card = $('card');
    if (w.mati) {
      const tgl = new Date(w.mati.t).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      card.innerHTML = `
      <button class="btn ghost sq close" type="button" aria-label="Tutup">×</button>
      <div class="card-head"><span class="grave-ico" aria-hidden="true"></span>
        <div><h3>${esc(w.nama)}</h3><span class="handle">@${esc(w.u)}</span><br><span class="tier mati">Telah tiada</span></div></div>
      <ul class="hewan">${(w.hewan || []).map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
      <p class="rip">${esc(w.nama)} mati pada ${esc(tgl)} karena diterlantarkan pemiliknya (unfollow). Makamnya tetap di sini sebagai pengingat.</p>
      <p class="muted">Pemiliknya bisa memulai lagi: follow kembali dan daftarkan hewan baru di postingan terbaru.</p>`;
      card.querySelector('.close').onclick = closeCard;
      card.hidden = false;
      if (fly) { const [x, y] = posOf(w); flyTo(x, y - 10, Math.max(cam.z, 4)); } else draw();
      return;
    }
    const lahir = w.lahir ? new Date(w.lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    card.innerHTML = `
      <button class="btn ghost sq close" type="button" aria-label="Tutup">×</button>
      <div class="card-head"><span id="cardSprite"></span>
        <div><h3>${esc(w.nama)}</h3>
          <a class="handle" href="https://www.instagram.com/${encodeURIComponent(w.u)}/" target="_blank" rel="noopener">@${esc(w.u)}</a><br>
          <span class="tier t${w.tier}">${esc(w.tierNama || TIERS[w.tier])}</span>${w.gelar ? `<span class="gelar">${esc(w.gelar)}</span>` : ''}${w.sahabat ? '<span class="gelar sahabat">♛ Sohabat Admin</span>' : ''}</div></div>
      <ul class="hewan">${(w.hewan || []).map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
      ${w.sahabat ? `<p class="skill">☕ Pengirim kopi terbanyak: <b>${fmt(w.sahabat)} ${esc((DATA.dukunganUnit) || 'Kopi Admin')}</b></p>` : ''}
      ${w.skill ? `<p class="skill">✦ Skill: <b>${esc(w.skill)}</b></p>` : w.tier >= 3 ? '<p class="muted">Skill belum diisi. Pemiliknya bisa menulis <b>Skill: ...</b> di komentar.</p>' : ''}
      ${(w.cerita || []).length ? `<ul class="stories">${w.cerita.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : '<p class="muted">Belum ada cerita. Ceritakan kebiasaan uniknya di postingan berikutnya untuk berevolusi.</p>'}
      <p class="muted">Lahir ${esc(lahir)} · kavling #${w.spot + 1}</p>
      <button class="btn" type="button" id="openKartu" style="margin-top:10px">Lihat Kartu Warga</button>`;
    if (w.art) { const im = new Image(); im.src = w.art; im.alt = w.nama; im.className = 'art'; card.querySelector('#cardSprite').replaceWith(im); }
    else card.querySelector('#cardSprite').replaceWith(spriteNode(w, 88));
    card.querySelector('.close').onclick = closeCard;
    card.querySelector('#openKartu').onclick = () => openKartu(w);
    card.hidden = false;
    if (fly) { const [x, y] = posOf(w); flyTo(x, y - 10, Math.max(cam.z, 4)); } else draw();
  }
  function closeCard() { selected = null; $('card').hidden = true; draw(); }

  $('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('searchInput').value.trim().toLowerCase().replace(/^@/, '');
    if (!q || !DATA) return;
    const W = allWarga();
    const w = W.find((x) => x.u === q && !x.makam) || W.find((x) => x.nama.toLowerCase() === q)
      || W.find((x) => x.u.includes(q) || x.nama.toLowerCase().includes(q) || (x.hewan || []).join(' ').toLowerCase().includes(q));
    if (w) select(w); else toast('Belum ada warga dengan nama itu. Sudah komen di postingan terbaru?');
  });
  $('zoomIn').onclick = () => flyTo(cam.x, cam.y, Math.min(7, cam.z * 1.6));
  $('zoomOut').onclick = () => flyTo(cam.x, cam.y, Math.max(minZ(), cam.z / 1.6));
  // camera that shows every registered citizen
  function fitAll() {
    if (!DATA || !allWarga().length || !WORLD) return { x: WORLD.center[0], y: WORLD.center[1], z: homeZ() };
    const pts = allWarga().map(spotOf);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs) - 30, x1 = Math.max(...xs) + 30, y0 = Math.min(...ys) - 70, y1 = Math.max(...ys) + 20;
    const z = Math.max(minZ(), Math.min(3.2, box.clientWidth / (x1 - x0), box.clientHeight / (y1 - y0)));
    // on narrow screens keep creatures readable: never zoom out below 1.25 if the group is only slightly wider
    if (box.clientWidth < 520 && z < 1.25 && (x1 - x0) * 1.25 < box.clientWidth * 1.35) return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: 1.25 };
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z };
  }
  $('zoomHome').onclick = () => { const f = fitAll(); flyTo(f.x, f.y, f.z); };
  const homeZ = () => Math.max(minZ(), Math.min(3, Math.max(1.7, box.clientWidth / 420)));

  // ---------------------------------------------------------------- lists
  let filterTier = -1, shown = 60;
  function renderTierFilter() {
    const f = $('tierFilter');
    f.innerHTML = ['Semua', ...TIERS].map((t, i) => `<button type="button" class="pill" aria-pressed="${i - 1 === filterTier}" data-t="${i - 1}">${esc(t)}</button>`).join('');
    f.querySelectorAll('button').forEach((b) => b.onclick = () => { filterTier = Number(b.dataset.t); shown = 60; renderTierFilter(); renderBook(); });
  }
  function renderBook() {
    const q = $('bookSearch').value.trim().toLowerCase().replace(/^@/, '');
    const list = allWarga().slice().sort((a, b) => (!!a.mati - !!b.mati) || a.spot - b.spot).filter((w) => (filterTier < 0 || w.tier === filterTier) &&
      (!q || w.u.includes(q) || w.nama.toLowerCase().includes(q) || (w.hewan || []).join(' ').toLowerCase().includes(q)));
    const book = $('book');
    book.innerHTML = '';
    if (!list.length) { book.innerHTML = '<div class="empty" style="grid-column:1/-1">Belum ada warga yang cocok. Jadilah yang pertama dengan berkomentar di Instagram.</div>'; }
    for (const w of list.slice(0, shown)) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'wcard' + (w.mati ? ' mati' : '');
      b.innerHTML = `<span class="s"></span><span style="min-width:0"><b>${esc(w.nama)}</b><span>${esc((w.hewan || []).join(' + '))}</span><span>@${esc(w.u)} · ${w.mati ? 'RIP · diterlantarkan' : esc(w.tierNama || TIERS[w.tier])}</span></span>`;
      if (w.mati) { const g = document.createElement('span'); g.className = 'grave-ico'; g.setAttribute('aria-hidden', 'true'); b.querySelector('.s').replaceWith(g); }
      else b.querySelector('.s').replaceWith(spriteNode(w, 44));
      b.onclick = () => { select(w); $('peta').scrollIntoView({ behavior: 'smooth' }); };
      book.appendChild(b);
    }
    $('moreBtn').hidden = list.length <= shown;
    $('wargaSub').textContent = `${fmt(DATA.jumlahWarga)} hewan hidup dari kolom komentar.` + (DATA.jumlahMati ? ` ${fmt(DATA.jumlahMati)} mati diterlantarkan pemiliknya.` : '');
  }
  $('bookSearch').addEventListener('input', () => { shown = 60; renderBook(); });
  $('moreBtn').onclick = () => { shown += 60; renderBook(); };

  function renderVotes() {
    const v = $('votes');
    const us = DATA.usulan || [];
    if (!us.length) { v.innerHTML = '<li class="empty">Belum ada usulan. Tulis <b>Usul: nama fasilitas</b> di komentar.</li>'; return; }
    const max = Math.max(1, ...us.map((x) => x.likes || 0));
    v.innerHTML = us.slice(0, 8).map((x) => `<li>
      <div class="row"><b>${esc(x.text)} ${x.status === 'dibangun' ? `<span class="built">DIBANGUN${x.episode ? ' · EP ' + esc(x.episode) : ''}</span>` : ''}</b><span class="num">♥ ${fmt(x.likes)}</span></div>
      <div class="bar" aria-hidden="true"><i style="width:${Math.round(((x.likes || 0) / max) * 100)}%"></i></div>
      <span class="muted">usulan @${esc(x.u)}</span></li>`).join('');
  }
  function ago(t) {
    const s = (Date.now() - Date.parse(t)) / 1000;
    if (s < 60) return 'baru saja'; if (s < 3600) return Math.floor(s / 60) + ' menit lalu';
    if (s < 86400) return Math.floor(s / 3600) + ' jam lalu'; return Math.floor(s / 86400) + ' hari lalu';
  }
  function renderNews() {
    const n = $('news');
    const log = DATA.log || [];
    n.innerHTML = log.length ? log.slice(0, 10).map((l) => `<li><span class="dot ${esc(l.type)}"></span><span>${esc(l.text)}<time datetime="${esc(l.t)}">${ago(l.t)}</time></span></li>`).join('')
      : '<li class="empty">Desa masih sepi. Kabar pertama muncul begitu warga pertama lahir.</li>';
  }
  function renderPemilu() {
    const P = DATA.pemilu;
    const ketua = DATA.warga.find((w) => w.gelar === 'Ketua Koloni');
    $('pemilu').hidden = !P || (!P.kandidat.length && !P.tutup && !ketua && !P.menunggu);
    if ($('pemilu').hidden) return;
    const clock = $('pemiluClock');
    const tick = () => {
      if (ketua && P.closed) { clock.innerHTML = `<small>KETUA KOLONI</small>@${esc(ketua.u)}`; return; }
      if (!P.tutup) { clock.innerHTML = '<small>STATUS</small>Pemilihan dibuka'; return; }
      const ms = Date.parse(P.tutup) - Date.now();
      if (ms <= 0) { clock.innerHTML = '<small>STATUS</small>Ditutup, menunggu pengumuman'; return; }
      const h = Math.floor(ms / 3.6e6), m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
      clock.innerHTML = `<small>DITUTUP DALAM</small>${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    tick(); clearInterval(renderPemilu.t); renderPemilu.t = setInterval(tick, 1000);
    const list = $('klasemen'); list.innerHTML = '';
    if (!P.kandidat.length) list.innerHTML = P.menunggu
      ? `<li class="empty" style="display:block;cursor:default">Pemilihan dimulai saat postingan <b>Hari ke-3</b> tayang. Syarat calon: komen di <b>Hari ke-2</b> dan <b>Hari ke-3</b>. Hadir juga di Hari ke-1 untuk nilai tambah!</li>`
      : '<li class="empty" style="display:block;cursor:default">Belum ada calon. Pemilik yang berkomentar di postingan Hari ke-1, ke-2 dan ke-3 masuk daftar calon!</li>';
    P.kandidat.forEach((k, i) => {
      const w = DATA.warga.find((x) => x.u === k.u);
      const li = document.createElement('li'); if (i === 0) li.className = 'top';
      li.innerHTML = `<span class="rank">${i + 1}</span><span class="s"></span><span style="min-width:0"><b>@${esc(k.u)}${w ? ' · ' + esc(w.nama) : ''}</b>${k.kampanye ? `<span class="slogan">“${esc(k.kampanye)}”</span>` : ''}</span><span class="likes">${k.hadir ? `<small>${k.hadir} hari</small> ` : ''}♥ ${fmt(k.likes)}</span>`;
      const s = li.querySelector('.s');
      if (w) s.replaceWith(spriteNode(w, 44)); else s.textContent = '';
      if (w) li.onclick = () => { select(w); $('peta').scrollIntoView({ behavior: 'smooth' }); };
      list.appendChild(li);
    });
    $('pemiluNote').textContent = 'Calon: pemilik yang hadir berkomentar di Hari ke-1, 2 dan 3. Peringkat: total like di komentarnya. ' + (P.likesAvailable === false ? 'Jumlah like belum tersedia dari Instagram, peringkat sementara diurutkan dari komentar paling awal. ' : '')
      + (P.updatedAt ? `Diperbarui ${ago(P.updatedAt)} · ${fmt(P.jumlahCalon)} calon dari ${fmt(P.jumlahPeserta)} akun yang berkomentar.` : '');
  }
  function renderDukungan() {
    const url = DATA.trakteer;
    const list = DATA.dukungan || [];
    $('dukungan').hidden = !url && !list.length;
    for (const id of ['traktirTop', 'traktirBtn']) { $(id).hidden = !url; if (url) $(id).href = url; }
    // "melek meter": every cup keeps Admin awake one more hour, counted over the last 24 hours
    const jam = list.filter((x) => Date.now() - Date.parse(x.t) < 864e5).reduce((a, x) => a + (Number(x.jumlah) || 0), 0);
    const pct = Math.min(100, Math.round((jam / 8) * 100));
    $('melek').innerHTML = `<span>${jam >= 8 ? 'Admin melek semalaman! Warga aman.' : jam ? `Admin melek ${jam} dari 8 jam ronda malam ini` : 'Admin mulai ngantuk… zzz'}</span><div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>`;
    const lb = DATA.kopiBoard || [];
    $('sahabatBoard').hidden = !lb.length;
    $('sahabatBoard').innerHTML = lb.length ? `<h3>♛ Sohabat Admin</h3><p class="muted">Pengirim kopi terbanyak yang punya hewan di dunia memakai mahkota spesial. Hanya satu, dan bisa direbut kapan saja.</p><ol>${lb.map((x, i) => `<li${i ? '' : ' class="top"'}><button type="button" class="linklike" data-u="${esc(x.u)}">${i ? '' : '♛ '}<b>${esc(x.nama)}</b> <span class="muted">@${esc(x.u)}</span></button><span>${fmt(x.total)} ☕</span></li>`).join('')}</ol>` : '';
    $('sahabatBoard').querySelectorAll('[data-u]').forEach((b) => b.onclick = () => { const w = DATA.warga.find((v) => v.u === b.dataset.u); if (w) select(w, true); });
    $('dukList').innerHTML = list.length
      ? list.map((x) => `<li><span class="dot dukung"></span><span><b>${esc(x.nama)}</b> mengirim ${fmt(x.jumlah)} ${esc(x.unit)} · melek +${fmt(x.jumlah)} jam${x.pesan ? `<br>“${esc(x.pesan)}”` : ''}<time datetime="${esc(x.t)}">${ago(x.t)}</time></span></li>`).join('')
      : '<li class="empty">Belum ada kopi malam ini. Admin mulai ngantuk, padahal netizen jahil masih berkeliaran.</li>';
  }
  function renderLadder() {
    const ex = { u: 'contoh', nama: 'Bolu', hewan: ['Kucing', 'Naga'] };
    $('ladder').innerHTML = '';
    const demoExtra = [{}, {}, { elemen: 'Api' }, { elemen: 'Api' }, { elemen: 'Api', outfit: 'jubah merah' }, { elemen: 'Api', outfit: 'jubah merah', wujud: 'Mecha' }];
    TIERS.forEach((t, i) => {
      const d = document.createElement('div');
      d.appendChild(spriteNode({ ...ex, ...demoExtra[i], tier: i }, 56));
      const b = document.createElement('b'); b.textContent = `Tier ${i + 1}: ${t}`; d.appendChild(b);
      const sm = document.createElement('small'); sm.textContent = BENEFITS[i] === '-' ? 'Tanpa benefit' : BENEFITS[i]; d.appendChild(sm);
      $('ladder').appendChild(d);
    });
  }

  // ---------------------------------------------------------------- kartu warga
  let kartuW = null;
  async function openKartu(w) {
    kartuW = w;
    const k = $('kartu');
    k.className = 'kartu t' + Math.max(0, Math.min(5, w.tier || 0));
    k.style.setProperty('--el', w.elemen ? window.Creature.elementColor(w.elemen) : '#ff9a5a');
    $('kartuModal').hidden = false;
    const sp = spriteFor(w);
    let artImg = null;
    if (w.art) artImg = await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = w.art; });
    await window.KartuWarga.draw($('kartuCanvas'), w, { worldImg: IMG, spot: posOf(w), sprite: sp instanceof HTMLImageElement ? null : sp, artImg });
    $('kartuClose').focus();
  }
  function closeKartu() { $('kartuModal').hidden = true; kartuW = null; }
  $('kartuClose').onclick = closeKartu;
  $('kartuModal').addEventListener('click', (e) => { if (e.target === $('kartuModal')) closeKartu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('kartuModal').hidden) closeKartu(); });
  $('kartuSave').onclick = () => {
    $('kartuCanvas').toBlob((b) => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(b);
      a.download = `kartu-pokomen-${kartuW ? kartuW.u : 'warga'}.png`; document.body.appendChild(a); a.click(); a.remove();
      toast('Kartu disimpan. Bagikan ke Story dan tag @' + IG_HANDLE + '!');
    }, 'image/png');
  };
  $('kartuLink').onclick = () => {
    const link = location.origin + location.pathname + '?kartu=' + encodeURIComponent(kartuW.u);
    navigator.clipboard.writeText(link).then(() => toast('Link kartu disalin.'), () => toast(link));
  };
  // tilt + foil follow pointer
  const kEl = $('kartu');
  kEl.addEventListener('pointermove', (e) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = kEl.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    kEl.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); kEl.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    kEl.style.setProperty('--ry', ((px - .5) * 18).toFixed(1) + 'deg'); kEl.style.setProperty('--rx', ((.5 - py) * 18).toFixed(1) + 'deg');
  });
  kEl.addEventListener('pointerleave', () => { kEl.style.setProperty('--rx', '0deg'); kEl.style.setProperty('--ry', '0deg'); });

  // copy buttons
  document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => {
    const el = $(b.dataset.copy);
    navigator.clipboard.writeText(el.textContent).then(() => toast('Format disalin. Tempel di kolom komentar Instagram.'), () => {
      const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      toast('Teks sudah ditandai. Salin manual dengan Ctrl+C.');
    });
  }));
  let toastT;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2600); }

  if (new URLSearchParams(location.search).has('admin')) document.body.classList.add('embed'); // inside Ruang Admin
  // used by Ruang Admin (same-origin iframe)
  window.Pokomen = {
    focus(u) { const w = allWarga().find((x) => x.u === String(u).toLowerCase() && !x.makam) || allWarga().find((x) => x.u === String(u).toLowerCase()); if (w) { $('peta').scrollIntoView({ behavior: 'smooth' }); select(w); } return !!w; },
    async reload() { try { const r = await fetch('api/dunia?t=' + Date.now(), { cache: 'no-store' }); const d = await r.json(); if (!d.error) { DATA = d; renderBook(); renderVotes(); renderNews(); renderPemilu(); $('chipWarga').textContent = fmt(d.jumlahWarga) + ' WARGA'; draw(); } } catch { /* ignore */ } },
  };

  // bump when the map changes so browsers do not keep the old cached image
  const WORLD_VER = '2026-10-25-lahan-timur';
  // ---------------------------------------------------------------- boot
  window.addEventListener('resize', resize);
  // ~30 fps animation loop (tick keeps the old 420 ms rhythm for lights and fireflies)
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(100, now - last);
    if (dt >= 33) {
      last = now; tick = now / 420;
      if (!document.hidden && DATA && WORLD) { stepActors(now, dt); draw(); }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  Promise.all([
    fetch('assets/world.json?v=' + WORLD_VER).then((r) => r.json()),
    new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'assets/world.png?v=' + WORLD_VER; }),
  ]).then(([w, im]) => {
    WORLD = w; IMG = im;
    cam.x = w.center[0]; cam.y = w.center[1];
    resize(); cam.z = homeZ();
    load();
    if (document.fonts) document.fonts.ready.then(draw);
  });
})();
