// Dunia Pokomen — public website
(function () {
  const IG_HANDLE = 'duniapokomen'; // ganti jika username Instagram berbeda
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString('id-ID');
  let TIERS = ['Hewan Reguler', 'Evolusi 1', 'Evolusi 2', 'Legenda'];

  $('igLink').href = `https://www.instagram.com/${IG_HANDLE}/`;
  $('igLink').textContent = '@' + IG_HANDLE;

  // ---------------------------------------------------------------- demo data
  function demoData() {
    const names = ['Bolu', 'Piyo', 'Kiko', 'Momo', 'Cimol', 'Gembul', 'Nori', 'Tofu', 'Kopi', 'Mochi', 'Bakso', 'Onde', 'Seblak', 'Kerupuk', 'Dodol', 'Lumpia', 'Bubu', 'Cireng', 'Wafer', 'Serabi', 'Klepon', 'Jahe', 'Pandan', 'Kenari', 'Lada', 'Gula', 'Tempe', 'Mangga', 'Jambu', 'Salak', 'Durian', 'Kelapa', 'Biskuit', 'Nastar', 'Martabak', 'Pukis', 'Getuk', 'Lemper', 'Bakpia', 'Pempek'];
    const combos = [['Kucing', 'Naga'], ['Ayam', 'Naga'], ['Rubah', 'Ikan'], ['Kelinci', 'Rusa'], ['Panda', 'Lebah'], ['Babi', 'Burung'], ['Katak', 'Unicorn'], ['Paus', 'Kucing'], ['Harimau', 'Kupu'], ['Serigala', 'Elang'], ['Kura', 'Naga'], ['Gajah', 'Ikan'], ['Domba', 'Kelelawar'], ['Monyet', 'Hiu'], ['Bebek', 'Rubah'], ['Siput', 'Phoenix'], ['Gurita', 'Kelinci'], ['Singa', 'Merak'], ['Hamster', 'Naga'], ['Pinguin', 'Rusa']];
    const stories = ['suka tidur di atap Balai Warga', 'menghangatkan air mandi warga pakai napas api', 'selalu bangun paling pagi dan membangunkan semua warga', 'mengoleksi batu bercahaya dari sungai', 'menari setiap kali hujan turun', 'menjaga kavling tetangga waktu malam', 'belajar berenang di danau barat', 'suka menyanyi di jembatan kayu'];
    const tierOf = (i) => (i === 3 ? 3 : i % 7 === 0 ? 2 : i % 3 === 0 ? 1 : 0);
    const warga = names.map((n, i) => ({
      u: n.toLowerCase() + '_' + (100 + i * 7), nama: n, hewan: combos[i % combos.length], tier: tierOf(i), tierNama: TIERS[tierOf(i)],
      spot: i, cerita: [stories[i % stories.length], ...(tierOf(i) ? [stories[(i + 3) % stories.length]] : [])].map((s) => `${n} ${s}.`),
      lahir: new Date(Date.now() - i * 3.6e6).toISOString(), sprite: null,
    }));
    return {
      demo: true, hari: 1, tiers: TIERS, jumlahWarga: warga.length, warga,
      usulan: [
        { id: 'a', u: 'kopi_156', text: 'Lumbung Makanan', likes: 1539, status: null },
        { id: 'b', u: 'cimol_128', text: 'Kubangan Lumpur', likes: 1330, status: null },
        { id: 'c', u: 'bolu_100', text: 'Kolam Minum', likes: 1178, status: null },
        { id: 'd', u: 'tofu_149', text: 'Sarang Hangat', likes: 898, status: null },
      ],
      trakteer: 'https://trakteer.id/',
      dukungan: [
        { nama: 'Rara', pesan: 'Jagain Bolu ya Min, jangan tidur!', unit: 'Kopi Admin', jumlah: 3, t: new Date(Date.now() - 1.2e6).toISOString() },
        { nama: 'Seseorang', pesan: '', unit: 'Kopi Admin', jumlah: 1, t: new Date(Date.now() - 7.2e6).toISOString() },
      ],
      log: [
        { t: new Date(Date.now() - 6e5).toISOString(), type: 'legenda', text: 'Momo milik @momo_121 kini menjadi Legenda!' },
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
    $('chipHari').textContent = 'HARI KE-' + (data.hari || 1);
    $('chipWarga').textContent = fmt(data.jumlahWarga) + ' WARGA';
    $('chipDemo').hidden = !data.demo;
    renderBook(); renderVotes(); renderNews(); renderLadder(); renderTierFilter(); renderDukungan();
    const qk = new URLSearchParams(location.search).get('kartu');
    if (qk) { const w = DATA.warga.find((x) => x.u === qk.toLowerCase()); if (w) { select(w); openKartu(w); } }
    draw();
  }

  // ---------------------------------------------------------------- map
  const box = $('mapbox'), canvas = $('map'), ctx = canvas.getContext('2d');
  let DPR = 1;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(box.clientWidth * DPR);
    canvas.height = Math.round(box.clientHeight * DPR);
    draw();
  }
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
    const list = DATA.warga.map((w) => ({ w, p: spotOf(w) })).sort((a, b) => a.p[1] - b.p[1]);
    const showNames = cam.z >= 2.6;
    const labels = [];
    for (const { w, p } of list) {
      const [x, y] = toScreen(p[0], p[1]);
      if (x < -40 || y < -40 || x > Wc + 40 || y > Hc + 60) continue;
      const sp = spriteFor(w);
      const s = cam.z * (sp.width > 40 ? 26 / sp.width : 1);
      const bob = ((tick + w.spot) % 4 < 2 ? 0 : 1) * cam.z;
      const dw = sp.width * s, dh = sp.height * s;
      ctx.fillStyle = 'rgba(20,30,10,.28)';
      ctx.beginPath(); ctx.ellipse(x, y, 7 * cam.z, 2.2 * cam.z, 0, 0, Math.PI * 2); ctx.fill();
      if (w.tier >= 3) { ctx.fillStyle = 'rgba(255,210,63,.35)'; ctx.beginPath(); ctx.ellipse(x, y - 10 * cam.z, 15 * cam.z, 14 * cam.z, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.drawImage(sp, Math.round(x - dw / 2), Math.round(y - dh + 2 * cam.z - bob), Math.round(dw), Math.round(dh));
      if (w === selected || w === hover) labels.push({ w, x, y: y - dh - 2, big: true });
      else if (showNames) labels.push({ w, x, y: y + 3 * cam.z, big: false });
    }
    for (const L of labels) drawLabel(L);
  }
  function drawLabel({ w, x, y, big }) {
    ctx.font = big ? '600 14px "Pixelify Sans", monospace' : '600 11px "Pixelify Sans", monospace';
    const t = big ? w.nama : w.nama;
    const sub = big ? '@' + w.u + ' · ' + (w.tierNama || TIERS[w.tier]) : null;
    const tw = Math.max(ctx.measureText(t).width, sub ? (ctx.font = '600 11px Nunito, sans-serif', ctx.measureText(sub).width) : 0);
    const bw = tw + 12, bh = big ? 34 : 15;
    const bx = Math.round(x - bw / 2), by = Math.round(big ? y - bh - 4 : y);
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
    for (const w of DATA.warga) {
      const [x, y] = spotOf(w);
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
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', w.nama); return c;
  }
  function select(w, fly = true) {
    selected = w;
    const card = $('card');
    const lahir = w.lahir ? new Date(w.lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    card.innerHTML = `
      <button class="btn ghost sq close" type="button" aria-label="Tutup">×</button>
      <div class="card-head"><span id="cardSprite"></span>
        <div><h3>${esc(w.nama)}</h3>
          <a class="handle" href="https://www.instagram.com/${encodeURIComponent(w.u)}/" target="_blank" rel="noopener">@${esc(w.u)}</a><br>
          <span class="tier t${w.tier}">${esc(w.tierNama || TIERS[w.tier])}</span></div></div>
      <ul class="hewan">${(w.hewan || []).map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
      ${(w.cerita || []).length ? `<ul class="stories">${w.cerita.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : '<p class="muted">Belum ada cerita. Ceritakan kebiasaan uniknya di postingan berikutnya untuk berevolusi.</p>'}
      <p class="muted">Lahir ${esc(lahir)} · kavling #${w.spot + 1}</p>
      <button class="btn" type="button" id="openKartu" style="margin-top:10px">Lihat Kartu Warga</button>`;
    card.querySelector('#cardSprite').replaceWith(spriteNode(w, 88));
    card.querySelector('.close').onclick = closeCard;
    card.querySelector('#openKartu').onclick = () => openKartu(w);
    card.hidden = false;
    if (fly) { const [x, y] = spotOf(w); flyTo(x, y - 10, Math.max(cam.z, 4)); } else draw();
  }
  function closeCard() { selected = null; $('card').hidden = true; draw(); }

  $('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('searchInput').value.trim().toLowerCase().replace(/^@/, '');
    if (!q || !DATA) return;
    const w = DATA.warga.find((x) => x.u === q) || DATA.warga.find((x) => x.nama.toLowerCase() === q)
      || DATA.warga.find((x) => x.u.includes(q) || x.nama.toLowerCase().includes(q) || (x.hewan || []).join(' ').toLowerCase().includes(q));
    if (w) select(w); else toast('Belum ada warga dengan nama itu. Sudah komen di postingan terbaru?');
  });
  $('zoomIn').onclick = () => flyTo(cam.x, cam.y, Math.min(7, cam.z * 1.6));
  $('zoomOut').onclick = () => flyTo(cam.x, cam.y, Math.max(minZ(), cam.z / 1.6));
  $('zoomHome').onclick = () => flyTo(WORLD.center[0], WORLD.center[1], homeZ());
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
    const list = DATA.warga.filter((w) => (filterTier < 0 || w.tier === filterTier) &&
      (!q || w.u.includes(q) || w.nama.toLowerCase().includes(q) || (w.hewan || []).join(' ').toLowerCase().includes(q)));
    const book = $('book');
    book.innerHTML = '';
    if (!list.length) { book.innerHTML = '<div class="empty" style="grid-column:1/-1">Belum ada warga yang cocok. Jadilah yang pertama dengan berkomentar di Instagram.</div>'; }
    for (const w of list.slice(0, shown)) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'wcard';
      b.innerHTML = `<span class="s"></span><span style="min-width:0"><b>${esc(w.nama)}</b><span>${esc((w.hewan || []).join(' + '))}</span><span>@${esc(w.u)} · ${esc(w.tierNama || TIERS[w.tier])}</span></span>`;
      b.querySelector('.s').replaceWith(spriteNode(w, 44));
      b.onclick = () => { select(w); $('peta').scrollIntoView({ behavior: 'smooth' }); };
      book.appendChild(b);
    }
    $('moreBtn').hidden = list.length <= shown;
    $('wargaSub').textContent = `${fmt(DATA.jumlahWarga)} hewan sudah lahir dari kolom komentar.`;
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
  function renderDukungan() {
    const url = DATA.trakteer;
    const list = DATA.dukungan || [];
    $('dukungan').hidden = !url && !list.length;
    for (const id of ['traktirTop', 'traktirBtn']) { $(id).hidden = !url; if (url) $(id).href = url; }
    // "melek meter": every cup keeps Admin awake one more hour, counted over the last 24 hours
    const jam = list.filter((x) => Date.now() - Date.parse(x.t) < 864e5).reduce((a, x) => a + (Number(x.jumlah) || 0), 0);
    const pct = Math.min(100, Math.round((jam / 8) * 100));
    $('melek').innerHTML = `<span>${jam >= 8 ? 'Admin melek semalaman! Warga aman.' : jam ? `Admin melek ${jam} dari 8 jam ronda malam ini` : 'Admin mulai ngantuk… zzz'}</span><div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>`;
    $('dukList').innerHTML = list.length
      ? list.map((x) => `<li><span class="dot dukung"></span><span><b>${esc(x.nama)}</b> mengirim ${fmt(x.jumlah)} ${esc(x.unit)} · melek +${fmt(x.jumlah)} jam${x.pesan ? `<br>“${esc(x.pesan)}”` : ''}<time datetime="${esc(x.t)}">${ago(x.t)}</time></span></li>`).join('')
      : '<li class="empty">Belum ada kopi malam ini. Admin mulai ngantuk, padahal netizen jahil masih berkeliaran.</li>';
  }
  function renderLadder() {
    const ex = { u: 'contoh', nama: 'Bolu', hewan: ['Kucing', 'Naga'] };
    $('ladder').innerHTML = '';
    TIERS.forEach((t, i) => {
      const d = document.createElement('div');
      d.appendChild(spriteNode({ ...ex, tier: i }, 56));
      d.appendChild(document.createTextNode(t));
      $('ladder').appendChild(d);
    });
  }

  // ---------------------------------------------------------------- kartu warga
  let kartuW = null;
  async function openKartu(w) {
    kartuW = w;
    const k = $('kartu');
    k.className = 'kartu t' + Math.max(0, Math.min(3, w.tier || 0));
    $('kartuModal').hidden = false;
    const sp = spriteFor(w);
    await window.KartuWarga.draw($('kartuCanvas'), w, { worldImg: IMG, spot: spotOf(w), sprite: sp instanceof HTMLImageElement ? null : sp });
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

  // ---------------------------------------------------------------- boot
  window.addEventListener('resize', resize);
  setInterval(() => { tick++; if (!document.hidden) draw(); }, 420);
  Promise.all([
    fetch('assets/world.json').then((r) => r.json()),
    new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'assets/world.png'; }),
  ]).then(([w, im]) => {
    WORLD = w; IMG = im;
    cam.x = w.center[0]; cam.y = w.center[1];
    resize(); cam.z = homeZ();
    load();
    if (document.fonts) document.fonts.ready.then(draw);
  });
})();
