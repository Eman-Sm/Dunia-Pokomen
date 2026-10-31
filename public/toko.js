// Toko Pokomen (24 jam) · Tempat Latihan · Arena (07.00–21.00 WIB)
(() => {
  const $ = (id) => document.getElementById(id);
  const sec = $('toko'); if (!sec) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = { get(k) { try { return localStorage.getItem(k); } catch { return null; } } };
  const qs = new URLSearchParams(location.search);
  const TOKEN = () => qs.get('k') || LS.get('pokomen_k') || '';
  const LABEL = { nyawa: '❤️ Nyawa', serang: '⚔️ Serang', tahan: '🛡️ Tahan', cepat: '💨 Cepat' };
  const IKON = { batu: '💎', latihan: '🏋️', nama: '🏷️', rupa: '🐾', elemen: '🔥', kekuatan: '✨' };
  let T = null, AR = null, tab = 'toko', konfirm = null;

  async function get(path) { const r = await fetch(path, { cache: 'no-store' }); return r.json(); }
  async function post(path, body) { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: TOKEN(), ...body }) }); return r.json(); }
  function toast(m) { const t = $('toast'); if (!t) return; t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 3200); }
  const jam = (iso) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  async function muat() {
    const k = TOKEN() ? '?k=' + encodeURIComponent(TOKEN()) : '';
    try { [T, AR] = await Promise.all([get('api/toko' + k), get('api/arena' + k)]); } catch { return; }
    sec.hidden = !(T && T.buka);
    const nav = document.querySelector('a[href="#toko"]'); if (nav) nav.hidden = sec.hidden;
    if (!sec.hidden) render();
  }

  function dompet() {
    const s = T.saya;
    if (!s) return `<div class="tk-login">🔑 Mau belanja, berlatih, atau bertanding? Kirim <b>DM: TOKO</b> ke <a href="https://www.instagram.com/duniapokomen/" target="_blank" rel="noopener">@duniapokomen</a> untuk link pribadimu.</div>`;
    const D = (window.Pokomen && window.Pokomen.data && window.Pokomen.data()) || {};
    const bars = Object.keys(LABEL).map((k) => { const v = s.stat[k], mx = Math.max(v, (k === 'nyawa' ? 300 : 60)); return `<div class="tk-bar"><span>${LABEL[k]}</span><i><b style="width:${Math.round(v / mx * 100)}%"></b></i><em>${v}${s.stat.maks[k] ? ' · MAKS' : ''}</em></div>`; }).join('');
    return `<div class="tk-dompet">
      <div class="tk-saldo"><small>Biji Kopi ${esc(s.nama)}</small><b>${s.saldo.biji}</b><span>☕ 1 Kopi Admin = 5 Biji</span>${D.trakteer ? `<a class="btn traktir" href="${esc(D.trakteer)}" target="_blank" rel="noopener">Tambah Biji Kopi</a>` : ''}</div>
      <div class="tk-batu"><small>Batu Evolusi</small><b>💎 ${s.batu}</b>${s.syaratBatu ? `<span>butuh ${s.syaratBatu} + cerita untuk naik tingkat</span>` : ''}</div>
      <div class="tk-stat"><small>Statistik · Kekuatan ${s.stat.kuat}</small>${bars}</div>
    </div>`;
  }

  function tokoTab() {
    return `<div class="tk-grid">${T.katalog.filter((x) => x.id !== 'latihan').map((x) => `
      <div class="tk-item"><div class="ik">${IKON[x.id] || '🎁'}</div><b>${esc(x.label)}</b><span>${esc(x.ket)}</span>
        <div class="harga">${x.biji} Biji</div>
        ${['nama', 'rupa', 'elemen', 'kekuatan'].includes(x.id) ? `<input class="tk-nilai" data-for="${x.id}" maxlength="60" placeholder="${{ nama: 'Nama baru', rupa: 'mis. Kucing + Naga', elemen: 'mis. Petir', kekuatan: 'Skill baru' }[x.id]}">` : ''}
        <button class="btn tk-beli" type="button" data-item="${x.id}" ${T.saya ? '' : 'disabled'}>${konfirm === x.id ? 'Yakin? Tekan lagi' : 'Beli'}</button></div>`).join('')}
      <div class="tk-item segera"><div class="ik">👕</div><b>Outfit</b><span>Baju & aksesori untuk hewanmu</span><div class="harga">Segera</div></div></div>`;
  }

  function latihanTab() {
    const L = T.latihan, s = T.saya;
    const ke = s ? s.stat.latihKe : 0, lagi = L.superTiap - (ke % L.superTiap);
    return `<p class="tk-info">🏋️ Satu sesi latihan = <b>${L.harga} Biji Kopi</b>. Setiap sesi ke-${L.superTiap} jadi <b>LATIHAN SUPER (2x)!</b>${s ? ` <span class="tk-super">${lagi === L.superTiap ? 'Sesi berikutnya: biasa' : `${lagi} sesi lagi menuju Latihan Super`}</span>` : ''}</p>
      <div class="tk-latih">${Object.keys(LABEL).map((k) => `<button class="btn tk-latih-btn" type="button" data-stat="${k}" ${s && !s.stat.maks[k] ? '' : 'disabled'}>${LABEL[k]}<small>+${L.naik[k]} per sesi${s && s.stat.maks[k] ? ' · maksimal' : ''}</small></button>`).join('')}</div>
      <p class="muted">Batas latihan naik setiap hewanmu berevolusi. Semua hewan dengan tingkat sama mulai dari statistik yang sama.</p>`;
  }

  function duelHTML(d) {
    const W = d.menang === d.a ? d.namaA : d.namaB;
    return `<details class="tk-duel"><summary><b>${esc(d.namaA)}</b> vs <b>${esc(d.namaB)}</b> · 🏆 ${esc(W)} <time>${jam(d.t)}</time></summary>${d.gerak ? `<button class="btn tk-replay" type="button" data-id="${esc(d.id)}">▶ Tonton replay</button>` : ''}<ol>${d.catatan.map((c) => `<li>${esc(c)}</li>`).join('')}</ol></details>`;
  }
  function arenaTab() {
    const A = AR || {}; const me = A.saya;
    const masuk = me ? me.tantangan.filter((t) => t.ke === me.u) : [], keluar = me ? me.tantangan.filter((t) => t.dari === me.u) : [];
    const D = (window.Pokomen && window.Pokomen.data && window.Pokomen.data()) || {};
    const nama = (u) => ((D.warga || []).find((w) => w.u === u) || {}).nama || u;
    return `<p class="tk-info">${A.buka ? '🟢 Arena <b>BUKA</b>' : '🔴 Arena <b>TUTUP</b>'} · setiap hari pukul ${String(A.jam?.[0] ?? 7).padStart(2, '0')}.00–${A.jam?.[1] ?? 21}.00 WIB · maks. 5 tantangan per hari · juara mingguan dapat <b>💎 1 Batu Evolusi</b></p>
      ${masuk.length ? `<div class="tk-masuk"><b>⚔️ Kamu ditantang!</b>${masuk.map((t) => `<div><span>${esc(t.namaDari)} menantang ${esc(t.namaKe)} · sampai ${jam(t.sampai)}</span><button class="btn tk-terima" type="button" data-id="${esc(t.id)}">Terima & bertarung</button><button class="btn ghost tk-tolak" type="button" data-id="${esc(t.id)}">Tolak</button></div>`).join('')}</div>` : ''}
      ${keluar.length ? `<p class="muted">Menunggu jawaban: ${keluar.map((t) => esc(t.namaKe)).join(', ')}</p>` : ''}
      ${me ? `<form class="tk-tantang" id="tkTantang" autocomplete="off"><input id="tkLawan" placeholder="Nama hewan lawan" maxlength="40" required><button class="btn" type="submit" ${A.buka ? '' : 'disabled'}>⚔️ Tantang</button></form>` : '<p class="muted">Bisa juga lewat komentar: <code>Tantang: nama hewan</code> lalu lawan membalas <code>Terima: nama penantang</code>.</p>'}
      <div class="tk-kolom"><div><h4>🏆 Klasemen minggu ini</h4><ol class="tk-klas">${(A.klasemen || []).map((k) => `<li><b>${esc(nama(k.u))}</b><span>${k.menang} menang · ${k.main} duel</span></li>`).join('') || '<li class="muted">Belum ada duel minggu ini.</li>'}</ol></div>
      <div><h4>⚔️ Duel terbaru</h4>${(A.duel || []).map(duelHTML).join('') || '<p class="muted">Belum ada duel.</p>'}</div></div>`;
  }

  function render() {
    $('tkDompet').innerHTML = dompet();
    for (const b of sec.querySelectorAll('.tk-tabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
    $('tkIsi').innerHTML = tab === 'toko' ? tokoTab() : tab === 'latihan' ? latihanTab() : arenaTab();
    for (const b of sec.querySelectorAll('.tk-beli')) b.onclick = () => beli(b.dataset.item);
    for (const b of sec.querySelectorAll('.tk-latih-btn')) b.onclick = () => latih(b.dataset.stat, b);
    for (const b of sec.querySelectorAll('.tk-terima')) b.onclick = () => arena('terima', { id: b.dataset.id }, b);
    for (const b of sec.querySelectorAll('.tk-tolak')) b.onclick = () => arena('tolak', { id: b.dataset.id }, b);
    for (const b of sec.querySelectorAll('.tk-replay')) b.onclick = () => bukaReplay(b.dataset.id);
    const f = $('tkTantang'); if (f) f.onsubmit = (e) => { e.preventDefault(); arena('tantang', { lawan: $('tkLawan').value }, f.querySelector('button')); };
  }

  async function beli(item) {
    if (konfirm !== item) { konfirm = item; render(); setTimeout(() => { if (konfirm === item) { konfirm = null; render(); } }, 4000); return; }
    konfirm = null;
    const inp = sec.querySelector(`.tk-nilai[data-for="${item}"]`);
    const r = await post('api/toko', { item, nilai: inp ? inp.value : undefined });
    if (r.error) { toast(r.error); render(); return; }
    toast(r.pesan || 'Berhasil!'); T.saya = r.saya; render();
    if (window.Pokomen && window.Pokomen.reload) window.Pokomen.reload();
  }
  async function latih(stat, btn) {
    btn.disabled = true;
    const r = await post('api/toko', { item: 'latihan', stat });
    if (r.error) toast(r.error); else { toast(r.pesan); T.saya = r.saya; }
    render();
  }
  async function arena(aksi, body, btn) {
    if (btn) btn.disabled = true;
    const r = await post('api/arena', { aksi, ...body });
    if (r.error) toast(r.error);
    else if (aksi === 'tantang') toast(`Tantangan untuk ${r.tantangan.namaKe} terkirim! Tunggu dia menerima (2 jam).`);
    else if (aksi === 'terima') { bukaReplay(r.duel.id, r.duel); }
    await muat();
  }

  // ================= REPLAY DUEL (bisa dibagikan: ?duel=<id>) =================
  let RP = null;
  function sprite(u, nama) {
    const D = (window.Pokomen && window.Pokomen.data && window.Pokomen.data()) || {};
    const w = (D.warga || []).find((x) => x.u === u);
    try { return window.Creature.make(w || { u, nama, hewan: ['Kucing'], tier: 0 }); } catch { return null; }
  }
  async function bukaReplay(id, duel) {
    let d = duel;
    if (!d) { try { const r = await get('api/arena?duel=' + encodeURIComponent(id)); if (r.error) { toast(r.error); return; } d = r.duel; } catch { return; } }
    tutupReplay();
    const el = document.createElement('div'); el.className = 'rp-modal'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Replay duel');
    el.innerHTML = `<div class="rp-box"><div class="rp-head"><b>⚔️ ${esc(d.namaA)} vs ${esc(d.namaB)}</b><button class="btn ghost sq rp-x" type="button" aria-label="Tutup">×</button></div>
      <canvas class="rp-cv" width="720" height="560"></canvas>
      <div class="rp-tools"><button class="btn rp-ulang" type="button">▶ Putar ulang</button><button class="btn ghost rp-cepat" type="button">⏩ 1x</button><button class="btn ghost rp-suara" type="button">🔊 Suara</button><button class="btn ghost rp-link" type="button">🔗 Salin link</button></div></div></div>`;
    document.body.appendChild(el);
    const cv = el.querySelector('.rp-cv'), ctx = cv.getContext('2d');
    RP = { el, d, cv, ctx, t0: performance.now(), cepat: 1, lastT: -1, part: [], pop: [], heboh: 0, spA: sprite(d.a, d.namaA), spB: sprite(d.b, d.namaB), raf: 0 };
    el.querySelector('.rp-x').onclick = tutupReplay;
    el.onclick = (e) => { if (e.target === el) tutupReplay(); };
    el.querySelector('.rp-ulang').onclick = () => { SFX.init(); mulaiUlang(); };
    el.querySelector('.rp-suara').onclick = (e) => { SFX.on = !SFX.on; SFX.init(); e.target.textContent = SFX.on ? '🔊 Suara' : '🔇 Bisu'; };
    el.addEventListener('pointerdown', () => SFX.init());
    SFX.init(); el.querySelector('.rp-suara').textContent = SFX.on ? '🔊 Suara' : '🔇 Bisu';
    el.querySelector('.rp-cepat').onclick = (e) => { RP.cepat = RP.cepat === 1 ? 2 : 1; e.target.textContent = `⏩ ${RP.cepat}x`; mulaiUlang(); };
    el.querySelector('.rp-link').onclick = async () => { const url = `${location.origin}/?duel=${encodeURIComponent(d.id)}#toko`; try { await navigator.clipboard.writeText(url); toast('Link replay tersalin! Bagikan ke temanmu.'); } catch { toast(url); } };
    document.addEventListener('keydown', escTutup);
    loop();
  }
  function escTutup(e) { if (e.key === 'Escape') tutupReplay(); }
  function tutupReplay() { if (!RP) return; cancelAnimationFrame(RP.raf); RP.el.remove(); RP = null; document.removeEventListener('keydown', escTutup); }

  // ---------- REPLAY EPIK: intro VS, serangan berenergi, kritis, jurus, K.O. slow-motion, selebrasi ----------
  const WARNA_EL = { Api: '#ff6a2a', Air: '#3aa0ff', Angin: '#9ff0d8', Tanah: '#c98a4a', Petir: '#ffe14a', Es: '#bfe8ff', Daun: '#6ed36a', Cahaya: '#fff3a0', Kegelapan: '#a35cff' };
  function wargaOf(u) { const D = (window.Pokomen && window.Pokomen.data && window.Pokomen.data()) || {}; return (D.warga || []).find((x) => x.u === u) || null; }
  function warnaOf(u, cad) { const w = wargaOf(u); return WARNA_EL[w && w.elemen] || cad; }
  const INTRO = 2.8, OUTRO = 4;
  function jadwal(d) {
    const G = d.gerak || []; let t = INTRO; const S = [];
    G.forEach((g, i) => {
      const akhir = i === G.length - 1;
      const dur = akhir ? 3 : g.kritis ? 1.55 : g.jurus ? 1.45 : g.hindar ? 1.05 : 1.05;
      const imp = akhir ? .3 : g.jurus ? .5 : .42; // titik benturan (fraksi segmen)
      S.push({ g, i, t0: t, dur, akhir, ti: t + dur * imp, imp }); t += dur;
    });
    return { S, selesai: t };
  }
  // ---- suara 8-bit kecil (Web Audio), bisa dimatikan ----
  const SFX = {
    ctx: null, on: true,
    init() { try { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); } catch { this.ctx = null; } },
    nada(f, f2, dur, tipe = 'square', vol = .12, mulai = 0) {
      const c = this.ctx; if (!c || !this.on) return; const t = c.currentTime + mulai;
      const o = c.createOscillator(), g = c.createGain(); o.type = tipe; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .02);
    },
    desis(dur, f, vol = .15, mulai = 0) {
      const c = this.ctx; if (!c || !this.on) return; const t = c.currentTime + mulai;
      const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), x = b.getChannelData(0); for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; fl.type = 'bandpass'; fl.frequency.value = f; g.gain.value = vol;
      s.connect(fl).connect(g).connect(c.destination); s.start(t);
    },
    pukul(kuat) { this.nada(kuat ? 180 : 140, 40, kuat ? .35 : .2, 'sine', kuat ? .5 : .35); this.desis(kuat ? .25 : .12, kuat ? 1800 : 1200, kuat ? .35 : .22); if (kuat) this.nada(880, 220, .25, 'square', .08); },
    wus() { this.desis(.22, 3200, .12); },
    jurus() { [523, 659, 784, 1047].forEach((f, i) => this.nada(f, f, .12, 'square', .07, i * .06)); },
    vs() { this.nada(110, 55, .6, 'sawtooth', .18); this.desis(.4, 600, .25); },
    mulai() { this.nada(440, 440, .12, 'square', .1); this.nada(880, 880, .3, 'square', .1, .15); },
    ko() { this.nada(600, 60, .9, 'sawtooth', .14); this.nada(90, 30, .8, 'sine', .5); this.desis(.6, 900, .3); },
    menang() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.nada(f, f, .16, 'square', .08, .9 + i * .13)); this.desis(1.8, 1500, .08, .9); },
  };
  const ease = (k) => (k < 0 ? 0 : k > 1 ? 1 : 1 - Math.pow(1 - k, 3));
  const clamp01 = (k) => Math.max(0, Math.min(1, k));

  function mulaiUlang() { if (!RP) return; RP.t0 = performance.now(); RP.lastT = -1; RP.part = []; RP.pop = []; RP.ghost = null; RP.heboh = 0; }
  function loop() {
    if (!RP) return;
    RP.raf = requestAnimationFrame(loop);
    const { d, cv, ctx } = RP; const W = cv.width, H = cv.height;
    if (!RP.J) { RP.J = jadwal(d); RP.part = []; RP.pop = []; RP.lastT = -1; RP.heboh = 0; RP.cA = warnaOf(d.a, '#ffd23f'); RP.cB = warnaOf(d.b, '#5aaaff'); }
    const { S, selesai: TEND } = RP.J;
    const now = performance.now(); const dtNyata = Math.min(.05, (now - (RP.prev || now)) / 1000); RP.prev = now;
    let t = (now - RP.t0) / 1000 * RP.cepat;
    if (t < RP.lastT) { RP.part = []; RP.pop = []; RP.ghost = null; } // diputar ulang
    const ringan = !!(window.Pokomen && window.Pokomen.ringan && window.Pokomen.ringan());
    const N = [d.nyawa[d.a], d.nyawa[d.b]];
    const selesai = t >= TEND;
    const seg = S.find((s) => t >= s.t0 && t < s.t0 + s.dur) || null;
    const akhirSeg = S[S.length - 1];

    // ---------- event (dipicu sekali saat waktu melewatinya) ----------
    const lewat = (x) => RP.lastT < x && t >= x;
    if (lewat(.05)) SFX.wus();
    if (lewat(.95)) { SFX.vs(); RP.heboh = 1; }
    if (lewat(2.15)) SFX.mulai();
    for (const s of S) {
      const g = s.g, aIsP = g.p === d.a;
      const xL = aIsP ? 520 : 200, warna = aIsP ? RP.cA : RP.cB;
      if (lewat(s.t0 + .05) && g.jurus) SFX.jurus();
      if (lewat(s.ti - .12)) SFX.wus();
      if (lewat(s.ti)) {
        if (g.hindar) { RP.pop.push({ t, x: xL, s: 'MISS', c: '#9fd0ff', b: 30 }); continue; }
        const kuat = g.kritis || s.akhir;
        SFX.pukul(kuat); if (s.akhir) SFX.ko();
        RP.heboh = Math.min(1.6, RP.heboh + (kuat ? 1 : .5));
        const n = ringan ? 10 : kuat ? 34 : 20;
        for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * (kuat ? 380 : 240); RP.part.push({ x: xL, y: 340, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: .5 + Math.random() * .4, age: 0, c: i % 3 ? warna : '#fffaee', sz: 4 + Math.random() * (kuat ? 8 : 5) }); }
        RP.part.push({ ring: 1, x: xL, y: 345, age: 0, life: .45, c: warna, r0: 20, r1: kuat ? 190 : 120 });
        RP.pop.push({ t, x: xL, s: '-' + g.dmg, c: g.kritis ? '#ffd23f' : '#ff5a3a', b: g.kritis ? 58 : 42 });
      }
    }
    if (akhirSeg && lewat(TEND + .3)) SFX.menang();
    RP.lastT = t;

    // ---------- nyawa (ada "bayangan" putih yang turun pelan, ala game fighting) ----------
    let hp = [N[0], N[1]];
    for (const s of S) { if (t >= s.ti) hp = s.g.hp; }
    if (selesai) hp = [d.sisa[d.a], d.sisa[d.b]];
    if (!RP.ghost || t < .1) RP.ghost = [N[0], N[1]];
    for (let k = 0; k < 2; k++) RP.ghost[k] = RP.ghost[k] > hp[k] ? Math.max(hp[k], RP.ghost[k] - N[k] * dtNyata * .55 * RP.cepat) : hp[k];

    // ---------- posisi petarung ----------
    const y = 410; let xA = 200, xB = 520, yA = 0, yB = 0, rotA = 0, rotB = 0, flashA = 0, flashB = 0, auraA = 0, auraB = 0;
    let zoom = 1, fokus = [W / 2, 330], kilat = 0, getar = 0, garisCepat = 0, hitstop = false;
    const jejak = []; // afterimage
    if (t < INTRO) { // masuk dari kiri & kanan
      const k = ease(t / .7); xA = -120 + (200 + 120) * k; xB = W + 120 - (W + 120 - 520) * k;
      if (t > .95 && t < 1.25) { getar = (1.25 - t) * 40; kilat = (1.25 - t) * 2; }
    }
    if (seg && !selesai) {
      const g = seg.g, aIsP = g.p === d.a, f = (t - seg.t0) / seg.dur, I = seg.imp;
      let xP = aIsP ? 200 : 520; const dir = aIsP ? 1 : -1, xT = aIsP ? 520 : 200;
      const tujuan = xT - dir * 105;
      let dx = 0, xLdx = 0, xLy = 0, lRot = 0, lFlash = 0;
      const ancang = I * .55; // fase ancang-ancang
      if (f < ancang) { const k = f / ancang; dx = -dir * 26 * Math.sin(k * Math.PI / 2); if (aIsP) auraA = k; else auraB = k; }
      else if (f < I) { const k = ease((f - ancang) / (I - ancang)); dx = -dir * 26 * (1 - k) + (tujuan - xP) * k; if (aIsP) auraA = 1; else auraB = 1; garisCepat = g.kritis || seg.akhir ? .8 : .4;
        for (let j = 1; j <= (ringan ? 1 : 3); j++) { const kj = ease((f - ancang - j * .035) / (I - ancang)); jejak.push({ a: aIsP, x: xP + (tujuan - xP) * Math.max(0, kj), al: .32 - j * .08 }); } }
      else {
        const sesudah = (t - seg.ti);
        const stop = seg.akhir ? .45 : g.kritis ? .14 : .06; // hitstop: waktu "membeku" sesaat
        if (sesudah < stop) { hitstop = true; dx = tujuan - xP; }
        else { const k = clamp01((f - I - stop / seg.dur) / (1 - I - stop / seg.dur)); dx = (tujuan - xP) * (1 - ease(k)); }
        if (g.hindar) { const k = clamp01(sesudah / .45); xLdx = dir * Math.sin(k * Math.PI) * 90; xLy = -Math.sin(k * Math.PI) * 60; for (let j = 1; j <= (ringan ? 1 : 3); j++) jejak.push({ a: !aIsP, x: xT + dir * Math.sin(clamp01((sesudah - j * .04) / .45) * Math.PI) * 90, yy: -Math.sin(clamp01((sesudah - j * .04) / .45) * Math.PI) * 60, al: .3 - j * .08 }); }
        else {
          lFlash = sesudah < .18 ? 1 - sesudah / .18 : 0;
          if (seg.akhir) { const k = ease(clamp01((sesudah - stop) / 1.1)); xLdx = dir * 95 * k; xLy = -Math.sin(k * Math.PI) * 110; lRot = dir * k * 1.5; }
          else { const k = clamp01(sesudah / .35); xLdx = dir * Math.sin(k * Math.PI) * (g.kritis ? 60 : 32); }
          const kuat = g.kritis || seg.akhir;
          if (sesudah < (kuat ? .35 : .2)) { getar = (kuat ? 22 : 10) * (1 - sesudah / (kuat ? .35 : .2)); kilat = (kuat ? .75 : .4) * (1 - sesudah / (kuat ? .35 : .2)); }
          if (kuat) { const zk = sesudah < .6 ? Math.sin(clamp01(sesudah / .6) * Math.PI) : 0; zoom = 1 + (seg.akhir ? .38 : .22) * zk; fokus = [xT, 330]; if (sesudah < .4) garisCepat = 1; }
        }
      }
      if (seg.akhir && f < I) { const k = clamp01((f - .15) / (I - .15)); zoom = 1 + .18 * k; fokus = [(200 + 520) / 2, 340]; }
      if (aIsP) { xA = xP + dx; xB = xT + xLdx; yB = xLy; rotB = lRot; flashB = lFlash; } else { xB = xP + dx; xA = xT + xLdx; yA = xLy; rotA = lRot; flashA = lFlash; }
    }
    const kalahA = selesai && d.menang !== d.a, kalahB = selesai && d.menang !== d.b;
    if (kalahA) xA = 200 - 95; if (kalahB) xB = 520 + 95; // tetap di tempat jatuhnya

    // ---------- kamera ----------
    ctx.save();
    const gx = (Math.random() - .5) * getar, gy = (Math.random() - .5) * getar;
    const zk = Math.min(1, (zoom - 1) / .38); ctx.translate(W / 2 + gx, H / 2 + gy); ctx.scale(zoom, zoom); ctx.translate(-(W / 2 + (fokus[0] - W / 2) * zk), -(H / 2 + (fokus[1] - H / 2) * zk));
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    RP.heboh = Math.max(.15, RP.heboh - dtNyata * .6);

    // langit malam stadion
    const lg = ctx.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, '#120d2e'); lg.addColorStop(.45, '#2c1f5a'); lg.addColorStop(1, '#3b2a4a');
    ctx.fillStyle = lg; ctx.fillRect(-60, -60, W + 120, H + 120);
    // lampu sorot yang bergerak
    if (!ringan) for (let i = 0; i < 2; i++) {
      const ax = i ? W - 40 : 40, sw = Math.sin(t * .9 + i * 2) * 120, tx = W / 2 + sw + (i ? 60 : -60);
      const sg = ctx.createLinearGradient(ax, 0, tx, 420); sg.addColorStop(0, 'rgba(255,250,210,.32)'); sg.addColorStop(1, 'rgba(255,250,210,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(ax - 10, 0); ctx.lineTo(ax + 10, 0); ctx.lineTo(tx + 90, 430); ctx.lineTo(tx - 90, 430); ctx.closePath(); ctx.fill();
    }
    // penonton (makin heboh saat ada pukulan)
    const warnaP = ['#ffcd32', '#5aaaff', '#6ec85a', '#ff8a8a', '#c9a0ff', '#ffb36b'];
    for (let r = 0; r < 3; r++) {
      ctx.fillStyle = ['#241a3e', '#2d2150', '#372862'][r]; ctx.fillRect(-60, 120 + r * 34, W + 120, 36);
      for (let i = 0; i < 24; i++) {
        const x = -20 + i * 32 + (r % 2) * 16, bob = Math.abs(Math.sin(t * (5 + RP.heboh * 6) + i * 1.7 + r)) * (2 + RP.heboh * 10);
        ctx.fillStyle = warnaP[(i + r * 2) % 6]; ctx.fillRect(x, 124 + r * 34 - bob, 18, 18);
        ctx.fillStyle = '#2b1b17'; ctx.fillRect(x + 4, 130 + r * 34 - bob, 3, 3); ctx.fillRect(x + 11, 130 + r * 34 - bob, 3, 3);
        if (RP.heboh > .9 && (i + r) % 3 === 0) { ctx.fillStyle = warnaP[(i + r * 2) % 6]; ctx.fillRect(x + (i % 2 ? 16 : -4), 116 + r * 34 - bob * 1.4, 5, 10); } // tangan diangkat
      }
    }
    ctx.fillStyle = '#5b3d2a'; ctx.fillRect(-60, 222, W + 120, 16); ctx.fillStyle = '#7b5538'; ctx.fillRect(-60, 222, W + 120, 5);
    // lantai arena
    ctx.fillStyle = '#4a3a5a'; ctx.fillRect(-60, 238, W + 120, H);
    ctx.fillStyle = '#b9b2a2'; ctx.beginPath(); ctx.ellipse(W / 2, 400, 340, 125, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a69e8d'; for (let i = 0; i < 14; i++) { ctx.fillRect(W / 2 - 300 + (i * 47) % 600, 330 + (i * 29) % 140, 22, 8); }
    // cincin bercahaya dua warna (elemen kedua petarung)
    const denyut = .55 + .45 * Math.sin(t * 4);
    ctx.lineWidth = 6; ctx.strokeStyle = RP.cA; ctx.globalAlpha = .55 + .35 * denyut; ctx.beginPath(); ctx.ellipse(W / 2, 400, 340, 125, 0, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = RP.cB; ctx.beginPath(); ctx.ellipse(W / 2, 400, 340, 125, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#8a8476'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(W / 2, 400, 120, 44, 0, 0, Math.PI * 2); ctx.stroke();

    // garis kecepatan
    if (garisCepat > 0 && !ringan) { ctx.save(); ctx.globalAlpha = .35 * garisCepat; ctx.strokeStyle = '#fffaee'; ctx.lineWidth = 3;
      for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2 + t * 3, r0 = 220 + ((i * 37) % 60); ctx.beginPath(); ctx.moveTo(fokus[0] + Math.cos(a) * r0, fokus[1] + Math.sin(a) * r0 * .7); ctx.lineTo(fokus[0] + Math.cos(a) * (r0 + 160), fokus[1] + Math.sin(a) * (r0 + 160) * .7); ctx.stroke(); }
      ctx.restore(); }

    // ---------- petarung ----------
    const gambar = (sp, x, yOff, flip, kalah, flash, aura, warna, rot, alpha = 1) => {
      if (!sp) return; const s = 150 / Math.max(sp.width, sp.height); const w = sp.width * s, h = sp.height * s;
      if (alpha === 1) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 52 * (1 + yOff / 300), 12, 0, 0, Math.PI * 2); ctx.fill(); }
      if (aura > 0 && !ringan) { const rg = ctx.createRadialGradient(x, y - h * .4, 10, x, y - h * .4, 110); rg.addColorStop(0, warna); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = .55 * aura * (.75 + .25 * Math.sin(t * 30)); ctx.fillStyle = rg; ctx.fillRect(x - 120, y - h * .4 - 120, 240, 240); ctx.globalAlpha = 1;
        for (let i = 0; i < 6; i++) { const ph = (t * 1.6 + i / 6) % 1; ctx.fillStyle = warna; ctx.globalAlpha = aura * (1 - ph); ctx.fillRect(x - 50 + ((i * 37) % 100), y - ph * 150, 6, 10); } ctx.globalAlpha = 1; }
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y + yOff); if (flip) ctx.scale(-1, 1);
      if (kalah) { ctx.rotate(1.35); ctx.globalAlpha = .7 * alpha; } else if (rot) ctx.rotate(flip ? -rot : rot);
      ctx.imageSmoothingEnabled = !!sp.hd; ctx.drawImage(sp, -w / 2, -h * .86, w, h);
      if (flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, flash) * .9; ctx.drawImage(sp, -w / 2, -h * .86, w, h); ctx.drawImage(sp, -w / 2, -h * .86, w, h); }
      ctx.restore();
    };
    for (const j of jejak) gambar(j.a ? RP.spA : RP.spB, j.x, j.yy || 0, !j.a, false, 0, 0, '', 0, Math.max(0, j.al));
    const lompat = selesai ? Math.abs(Math.sin((t - TEND) * 6)) * 34 : 0;
    const idle = (k) => (selesai || hitstop ? 0 : Math.sin(t * 5 + k) * 3);
    if (selesai) { // sorot pemenang
      const xw = d.menang === d.a ? xA : xB; const sg = ctx.createRadialGradient(xw, y - 60, 10, xw, y - 60, 200); sg.addColorStop(0, 'rgba(255,240,160,.55)'); sg.addColorStop(1, 'rgba(255,240,160,0)'); ctx.fillStyle = sg; ctx.fillRect(xw - 220, y - 280, 440, 440);
    }
    gambar(RP.spA, xA, yA - (selesai && d.menang === d.a ? lompat : 0) + idle(0), false, kalahA, flashA, selesai && d.menang === d.a ? 1 : auraA, RP.cA, rotA);
    gambar(RP.spB, xB, yB - (selesai && d.menang === d.b ? lompat : 0) + idle(2), true, kalahB, flashB, selesai && d.menang === d.b ? 1 : auraB, RP.cB, rotB);
    if (selesai) { // mahkota di atas pemenang
      const xw = d.menang === d.a ? xA : xB, yw = y - 162 - lompat; ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#2b1b17'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(xw - 26, yw + 18); ctx.lineTo(xw - 26, yw); ctx.lineTo(xw - 13, yw + 10); ctx.lineTo(xw, yw - 8); ctx.lineTo(xw + 13, yw + 10); ctx.lineTo(xw + 26, yw); ctx.lineTo(xw + 26, yw + 18); ctx.closePath(); ctx.stroke(); ctx.fill();
    }

    // ---------- partikel ----------
    const dtP = hitstop ? dtNyata * .15 : dtNyata * RP.cepat;
    RP.part = RP.part.filter((p) => (p.age += dtP) < p.life);
    for (const p of RP.part) {
      const k = p.age / p.life;
      if (p.ring) { ctx.globalAlpha = 1 - k; ctx.strokeStyle = p.c; ctx.lineWidth = 8 * (1 - k) + 1; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r0 + (p.r1 - p.r0) * ease(k), (p.r0 + (p.r1 - p.r0) * ease(k)) * .55, 0, 0, Math.PI * 2); ctx.stroke(); continue; }
      p.x += p.vx * dtP; p.y += p.vy * dtP; p.vy += 600 * dtP; ctx.globalAlpha = 1 - k; ctx.fillStyle = p.c; ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);
    }
    ctx.globalAlpha = 1;
    // angka damage memantul
    const besar = (s, xx, yy, warna, ukuran, skala = 1, miring = 0) => { ctx.save(); ctx.translate(xx, yy); ctx.rotate(miring); ctx.scale(skala, skala); ctx.font = `700 ${ukuran}px "Pixelify Sans", monospace`; ctx.textAlign = 'center'; ctx.lineWidth = Math.max(6, ukuran / 6); ctx.strokeStyle = '#2b1b17'; ctx.strokeText(s, 0, 0); ctx.fillStyle = warna; ctx.fillText(s, 0, 0); ctx.restore(); };
    RP.pop = RP.pop.filter((p) => t - p.t < 1.1);
    for (const p of RP.pop) { const k = (t - p.t) / 1.1, sk = k < .15 ? .4 + 4 * k : 1; ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1; besar(p.s, p.x, 305 - ease(k) * 60, p.c, p.b, sk); ctx.globalAlpha = 1; }
    ctx.restore(); // akhir kamera

    // kilatan layar
    if (kilat > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(.85, kilat)})`; ctx.fillRect(0, 0, W, H); }
    // vignette saat slow-motion K.O.
    if (seg && seg.akhir && !ringan) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(0, 0, W, 34); ctx.fillRect(0, H - 34, W, 34); }

    // ---------- HUD: bar nyawa ----------
    const bar = (x, nama, v, ghost, max, kanan, warna) => {
      const w = 300, h = 22, x0 = kanan ? x - w : x;
      ctx.fillStyle = '#2b1b17'; ctx.fillRect(x0 - 4, 10, w + 8, h + 36);
      ctx.fillStyle = warna; ctx.fillRect(x0 - 4, 10, w + 8, 4);
      ctx.fillStyle = '#fffaee'; ctx.font = '700 22px "Pixelify Sans", monospace'; ctx.textAlign = kanan ? 'right' : 'left'; ctx.fillText(nama, kanan ? x : x0 + 2, 34);
      ctx.fillStyle = '#5a2a2a'; ctx.fillRect(x0, 40, w, h);
      const pg = Math.max(0, ghost / max), p = Math.max(0, v / max);
      ctx.fillStyle = '#fffaee'; ctx.fillRect(kanan ? x0 + w * (1 - pg) : x0, 40, w * pg, h);
      ctx.fillStyle = p > .5 ? '#6ec85a' : p > .25 ? '#ffcd32' : '#e04a3a'; ctx.fillRect(kanan ? x0 + w * (1 - p) : x0, 40, w * p, h);
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(kanan ? x0 + w * (1 - p) : x0, 40, w * p, 6);
      ctx.fillStyle = '#fffaee'; ctx.font = '700 17px "Pixelify Sans", monospace'; ctx.fillText(`${Math.max(0, Math.round(v))}/${max}`, kanan ? x - 4 : x0 + 4, 57);
    };
    const hudMasuk = t < INTRO ? ease((t - 1.6) / .5) : 1;
    if (hudMasuk > 0) { ctx.save(); ctx.globalAlpha = hudMasuk; bar(16, d.namaA, hp[0], RP.ghost[0], N[0], false, RP.cA); bar(W - 16, d.namaB, hp[1], RP.ghost[1], N[1], true, RP.cB); ctx.restore(); }

    // ---------- teks besar ----------
    const C = W / 2;
    if (t < INTRO) {
      // papan nama + statistik
      const kartu = (nama, st, x, warna, k, kanan) => { const xx = kanan ? W + 260 - (W + 260 - x) * k : -260 + (x + 260) * k; ctx.fillStyle = 'rgba(43,27,23,.88)'; ctx.fillRect(xx - 130, 455, 260, 74); ctx.fillStyle = warna; ctx.fillRect(xx - 130, 455, 260, 5);
        besar(nama, xx, 488, '#fffaee', 24); if (st) { ctx.font = '700 16px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd23f'; ctx.fillText(`❤ ${st.nyawa}  ⚔ ${st.serang}  🛡 ${st.tahan}  ⚡ ${st.cepat}`, xx, 516); } };
      const kk = ease((t - .3) / .6); kartu(d.namaA, d.statA, 200, RP.cA, kk, false); kartu(d.namaB, d.statB, 520, RP.cB, kk, true);
      if (t > .9) { const k = clamp01((t - .9) / .25), sk = 3 - 2 * ease(k); besar('VS', C, 300, '#ffd23f', 96, sk, -.08); }
      if (t < .9) besar('ARENA POKOMEN', C, 110, '#fffaee', 30, 1);
      if (t > 1.6 && t < 2.15) besar('SIAP…', C, 120, '#fffaee', 40, 1);
      if (t >= 2.15) { const k = clamp01((t - 2.15) / .2); besar('BERTARUNG!', C, 130, '#ff5a3a', 60, 1.6 - .6 * ease(k), -.05); }
    } else if (selesai) {
      const k = t - TEND; const W_ = d.menang === d.a ? d.namaA : d.namaB;
      if (k < .35) besar('K.O.!', C, 230, '#ff3a2a', 110, 1, -.08);
      else { besar('🏆 PEMENANG 🏆', C, 120, '#ffd23f', 34, 1); besar(W_, C, 175, '#fffaee', 50, Math.min(1, .5 + (k - .35) * 3)); besar(`menang dalam ${d.ronde} ronde`, C, 210, '#ffd23f', 20, 1); }
      // konfeti
      const n = ringan ? 18 : 46; for (let i = 0; i < n; i++) { const ph = ((k * .45 + i * .37) % 1); const x = (i * 151 + Math.sin(k * 3 + i) * 20) % W; ctx.save(); ctx.translate(x, ph * H); ctx.rotate(k * 4 + i); ctx.fillStyle = ['#ffd23f', '#ff6b6b', '#5aaaff', '#6ec85a', '#c9a0ff'][i % 5]; ctx.fillRect(-4, -6, 8, 12); ctx.restore(); }
    } else if (seg) {
      const g = seg.g, f = (t - seg.t0) / seg.dur, sesudah = t - seg.ti;
      besar(`RONDE ${g.r}`, C, 100, '#fffaee', 20, 1);
      if (g.jurus && f < seg.imp + .1) { // spanduk jurus menyapu layar
        const k = ease(f / (seg.imp * .5)), wna = g.p === d.a ? RP.cA : RP.cB;
        ctx.save(); ctx.translate(C + (1 - k) * (g.p === d.a ? -W : W), 190); ctx.rotate(-.06); ctx.fillStyle = 'rgba(43,27,23,.9)'; ctx.fillRect(-W, -34, W * 2, 68); ctx.fillStyle = wna; ctx.fillRect(-W, -34, W * 2, 6); ctx.fillRect(-W, 28, W * 2, 6); ctx.restore();
        besar(`✦ ${g.jurus.toUpperCase()} ✦`, C + (1 - k) * (g.p === d.a ? -W : W), 204, wna, 34, 1, -.06);
      }
      if (sesudah >= 0 && !g.hindar && g.kritis && sesudah < .8) besar('KRITIS!', C, 160, '#ffd23f', 64, sesudah < .12 ? 2 - sesudah / .12 : 1, -.1);
      if (sesudah >= 0 && g.hindar && sesudah < .7) besar('MENGHINDAR!', C, 180, '#9fd0ff', 46, 1, .05);
      if (seg.akhir && f < seg.imp && f > .05) besar('SERANGAN TERAKHIR…', C, 262, '#ff8a3a', 30, 1);
      if (seg.akhir && sesudah > .5) besar('K.O.!', C, 230, '#ff3a2a', 110, sesudah < .65 ? 2.2 - 1.2 * ease((sesudah - .5) / .15) : 1, -.08);
    }
    ctx.textAlign = 'start';
    if (t > TEND + OUTRO + 4) { RP.t0 = performance.now() - (TEND + 1.2) * 1000 / RP.cepat; RP.lastT = TEND + 1.2; } // tetap di layar kemenangan
  }

  for (const b of sec.querySelectorAll('.tk-tabs button')) b.onclick = () => { tab = b.dataset.tab; render(); };
  if (qs.get('duel')) { tab = 'arena'; setTimeout(() => bukaReplay(qs.get('duel')), 900); }
  if (location.hash === '#toko') tab = 'toko';
  muat();
  setInterval(() => { if (!document.hidden && !sec.hidden && tab === 'arena') muat(); }, 30000);
})();
