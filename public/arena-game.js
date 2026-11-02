// Arena "Kartu Jurus + Main Langsung": pemilih kartu & game duel dengan tombol waktu.
// window.ArenaGame.pilihKartu({ judul, tombol, lawan }) → Promise<kartu[3] | null>
// window.ArenaGame.mainkan(setup, { kirim(taps) → Promise<duel>, replay(duel) })
import { mulai, giliran, langkah, hasil, UNGGUL, BABAK, PER_BABAK } from './duel-sim.js';

const K = { serang: { ik: '⚔️', nama: 'SERANG', warna: '#e2553f' }, tahan: { ik: '🛡️', nama: 'TAHAN', warna: '#3f8fd9' }, jurus: { ik: '⚡', nama: 'JURUS', warna: '#9b5de5' } };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const acak = () => Array.from({ length: BABAK }, () => Object.keys(K)[Math.floor(Math.random() * 3)]);

function pilihKartu({ judul = 'Pilih kartu jurusmu', tombol = 'MULAI DUEL!', lawan = '' } = {}) {
  return new Promise((selesai) => {
    let pilih = acak();
    const el = document.createElement('div'); el.className = 'ag-modal'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', judul);
    const gambar = () => {
      el.innerHTML = `<div class="ag-box"><div class="ag-head"><b>🃏 ${esc(judul)}</b><button class="btn ghost sq ag-x" type="button" aria-label="Tutup">×</button></div>
        ${lawan ? `<p class="ag-sub">Lawan: <b>${esc(lawan)}</b> · kartunya rahasia sampai duel dimulai!</p>` : ''}
        <p class="ag-aturan">⚔️ SERANG mengalahkan ⚡ JURUS · ⚡ JURUS mengalahkan 🛡️ TAHAN · 🛡️ TAHAN mengalahkan ⚔️ SERANG<br><small>Kartu yang unggul di babak itu: serangannya ×1.5!</small></p>
        ${pilih.map((k, i) => `<div class="ag-babak"><span>Babak ${i + 1}</span>${Object.keys(K).map((x) => `<button type="button" class="ag-kartu${x === k ? ' on' : ''}" data-b="${i}" data-k="${x}" style="--w:${K[x].warna}" aria-pressed="${x === k}">${K[x].ik}<small>${K[x].nama}</small></button>`).join('')}</div>`).join('')}
        <div class="ag-aksi"><button class="btn ghost ag-acak" type="button">🎲 Acak</button><button class="btn ag-ok" type="button">${esc(tombol)}</button></div></div>`;
      el.querySelector('.ag-x').onclick = () => tutup(null);
      el.querySelector('.ag-acak').onclick = () => { pilih = acak(); gambar(); };
      el.querySelector('.ag-ok').onclick = () => tutup(pilih);
      for (const b of el.querySelectorAll('.ag-kartu')) b.onclick = () => { pilih[+b.dataset.b] = b.dataset.k; gambar(); };
    };
    const tutup = (v) => { el.remove(); selesai(v); };
    el.onclick = (e) => { if (e.target === el) tutup(null); };
    gambar(); document.body.appendChild(el);
  });
}

// ---------------------------------------------------------------- the live duel
const RING_MS = 1000; // lingkaran mengecil dari besar ke target dalam 1 detik
const NILAI = (d) => (d <= 90 ? 'sempurna' : d <= 220 ? 'bagus' : 'meleset'); // selisih ms dari waktu tepat

function sprite(u, nama) {
  const D = (window.Pokomen && window.Pokomen.data && window.Pokomen.data()) || {};
  const w = (D.warga || []).find((x) => x.u === u);
  try { return window.Creature.make(w || { u, nama, hewan: ['Kucing'], tier: 0 }); } catch { return null; }
}

function mainkan(setup, { kirim, replay } = {}) {
  const { A, B } = setup; // A = penantang (lawan), B = kamu
  const s = mulai(setup.seed, A, B);
  const el = document.createElement('div'); el.className = 'ag-modal ag-main'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Duel Arena');
  el.innerHTML = `<div class="ag-box"><div class="ag-head"><b>⚔️ ${esc(B.nama)} vs ${esc(A.nama)}</b></div>
    <canvas class="ag-cv" width="720" height="600"></canvas>
    <button class="btn ag-tap" type="button">TAP!</button>
    <p class="ag-sub">Tekan <b>TAP</b> (atau spasi / ketuk layar) saat lingkaran pas di sasaran. Seranganmu: tepat = <b>SEMPURNA ×1.5</b>. Serangan lawan: tepat = <b>tangkis</b>!</p></div>`;
  document.body.appendChild(el);
  const cv = el.querySelector('.ag-cv'), ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  const spB = sprite(B.u, B.nama), spA = sprite(A.u, A.nama);
  const taps = [];
  let fase = 'intro', t0 = performance.now(), aktif = null, efek = [], teks = null, selesai = null, raf = 0, getar = 0;
  const hp = { a: A.stat.nyawa, b: B.stat.nyawa };
  const tekan = () => {
    if (fase !== 'tap' || !aktif || aktif.ditekan) return;
    const d = Math.abs(performance.now() - aktif.target); aktif.ditekan = NILAI(d);
  };
  el.querySelector('.ag-tap').onclick = tekan; cv.onpointerdown = tekan;
  const kunci = (e) => { if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tekan(); } };
  document.addEventListener('keydown', kunci);
  const tutup = () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', kunci); el.remove(); };

  function babakBaru(b) { teks = { s: `BABAK ${b + 1}`, sub: `${K[B.kartu[b]].ik} ${K[B.kartu[b]].nama}  vs  ${K[A.kartu[b]].ik} ${K[A.kartu[b]].nama}`, unggul: UNGGUL[B.kartu[b]] === A.kartu[b] ? 'b' : UNGGUL[A.kartu[b]] === B.kartu[b] ? 'a' : null, t: performance.now() }; }
  function lanjut() {
    const g = giliran(s);
    if (!g) return akhir();
    if (g.i % PER_BABAK === 0) { babakBaru(g.babak); fase = 'babak'; t0 = performance.now(); aktif = { g }; return; }
    mulaiTap(g);
  }
  function mulaiTap(g) { fase = 'tap'; const now = performance.now(); aktif = { g, mulai: now, target: now + RING_MS, ditekan: null }; }
  function terapkan() {
    const q = aktif.ditekan || 'meleset'; taps.push(q);
    const ev = langkah(s, null, q); hp.a = ev.hp[0]; hp.b = ev.hp[1];
    const kenaB = ev.l === B.u;
    efek.push({ t: performance.now(), ev, q, kenaB });
    if (!ev.hindar) getar = ev.kritis || (kenaB && q === 'meleset') ? 16 : 8;
    fase = 'pukul'; t0 = performance.now();
  }
  async function akhir() {
    fase = 'kirim'; const lokal = hasil(s);
    selesai = { lokal };
    try { const duel = kirim ? await kirim(taps) : null; selesai.duel = duel; } catch (e) { selesai.err = e && e.message || 'Gagal mengirim hasil'; }
    fase = 'akhir'; t0 = performance.now();
    const box = el.querySelector('.ag-box'); const menang = (selesai.duel || lokal).menang === B.u;
    const tb = document.createElement('div'); tb.className = 'ag-aksi';
    tb.innerHTML = `${selesai.err ? `<p class="ag-sub">⚠️ ${esc(selesai.err)}</p>` : ''}${selesai.duel && replay ? '<button class="btn ag-rep" type="button">▶ Tonton replay</button>' : ''}<button class="btn ghost ag-tutup" type="button">Tutup</button>`;
    box.querySelector('.ag-tap').remove(); box.appendChild(tb);
    tb.querySelector('.ag-tutup').onclick = tutup;
    const rp = tb.querySelector('.ag-rep'); if (rp) rp.onclick = () => { tutup(); replay(selesai.duel); };
    if (navigator.vibrate) try { navigator.vibrate(menang ? [60, 40, 120] : 200); } catch { /* ignore */ }
  }

  const besar = (str, x, y, sz, fill, rot = 0, sc = 1) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.font = `900 ${sz}px Nunito, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(5, sz / 6); ctx.strokeStyle = '#1e1410'; ctx.strokeText(str, 0, 0); ctx.fillStyle = fill; ctx.fillText(str, 0, 0); ctx.restore(); };
  const POS = { b: [210, 420], a: [510, 420] };
  function gambar(now) {
    raf = requestAnimationFrame(gambar);
    const k = now - t0;
    // background stadium
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b1440'); g.addColorStop(1, '#3b2a4a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 24; i++) { const bob = Math.abs(Math.sin(now / 160 + i + r)) * (getar ? 10 : 3); ctx.fillStyle = ['#ffcd32', '#5aaaff', '#6ec85a', '#ff8a8a', '#c9a0ff'][(i + r) % 5]; ctx.fillRect(-10 + i * 32 + (r % 2) * 16, 110 + r * 32 - bob, 18, 18); }
    ctx.fillStyle = '#b9b2a2'; ctx.beginPath(); ctx.ellipse(W / 2, 440, 330, 110, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); if (getar > 0) { ctx.translate((Math.random() - .5) * getar, (Math.random() - .5) * getar); getar = Math.max(0, getar - .8); }
    // fighters
    const lunge = (side) => { const e = efek[efek.length - 1]; if (!e || now - e.t > 450) return 0; const ph = Math.sin((now - e.t) / 450 * Math.PI); return e.ev.sisiP === side ? ph * (side === 'b' ? 110 : -110) : 0; };
    for (const [side, sp, flip] of [['b', spB, false], ['a', spA, true]]) {
      if (!sp) continue; const [x0, y] = POS[side], x = x0 + lunge(side); const sc = 150 / Math.max(sp.width, sp.height), w = sp.width * sc, h = sp.height * sc;
      const kalah = fase === 'akhir' && (selesai.duel || selesai.lokal).menang !== (side === 'b' ? B.u : A.u);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 50, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); if (kalah) { ctx.rotate(1.3); ctx.globalAlpha = .7; } ctx.imageSmoothingEnabled = !!sp.hd; ctx.drawImage(sp, -w / 2, -h * .86, w, h);
      const e = efek[efek.length - 1]; if (e && !e.ev.hindar && now - e.t < 200 && e.ev.l === (side === 'b' ? B.u : A.u)) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .7; ctx.drawImage(sp, -w / 2, -h * .86, w, h); }
      ctx.restore();
    }
    // floating numbers
    for (const e of efek) { const d = now - e.t; if (d > 900) continue; const [x] = POS[e.kenaB ? 'b' : 'a']; const y = 250 - d / 15; ctx.globalAlpha = 1 - d / 900;
      if (e.ev.hindar) besar('MISS', x, y, 34, '#9fd0ff'); else besar('-' + e.ev.dmg, x, y, e.ev.kritis ? 52 : 38, e.ev.kritis ? '#ffd23f' : '#ff5a3a');
      const lbl = { sempurna: e.kenaB ? 'TANGKIS SEMPURNA!' : 'SEMPURNA!', bagus: e.kenaB ? 'TANGKIS!' : 'BAGUS!', meleset: 'MELESET' }[e.q];
      besar(lbl, W / 2, 210 - d / 25, e.q === 'sempurna' ? 40 : 30, e.q === 'sempurna' ? '#ffd23f' : e.q === 'bagus' ? '#7be07b' : '#cfcfcf'); ctx.globalAlpha = 1; }
    ctx.restore();
    // HP bars
    const bar = (x, nama, v, max, kanan, warna) => { const w = 300, x0 = kanan ? x - w : x; ctx.fillStyle = '#1e1410'; ctx.fillRect(x0 - 4, 12, w + 8, 56); ctx.fillStyle = '#fff4dc'; ctx.font = '900 20px Nunito, system-ui, sans-serif'; ctx.textAlign = kanan ? 'right' : 'left'; ctx.fillText(nama, kanan ? x : x0 + 2, 32); ctx.fillStyle = '#5a2a2a'; ctx.fillRect(x0, 40, w, 20); const p = Math.max(0, v / max); ctx.fillStyle = p > .5 ? warna : p > .25 ? '#ffcd32' : '#e04a3a'; ctx.fillRect(kanan ? x0 + w * (1 - p) : x0, 40, w * p, 20); ctx.textAlign = 'start'; };
    bar(16, B.nama + ' (kamu)', hp.b, B.stat.nyawa, false, '#6ec85a'); bar(W - 16, A.nama, hp.a, A.stat.nyawa, true, '#6ec85a');
    // babak banner (cards reveal)
    if (fase === 'intro') { besar('VS', W / 2, 300, 110, '#ffd23f', -.08, Math.max(1, 2.4 - k / 250)); besar('SIAP?', W / 2, 520, 40, '#fff4dc'); if (k > 1400) lanjut(); }
    if (fase === 'babak' && teks) {
      ctx.fillStyle = 'rgba(15,10,30,.75)'; ctx.fillRect(0, 210, W, 170);
      besar(teks.s, W / 2, 255, 50, '#fff4dc'); besar(teks.sub, W / 2, 315, 30, '#ffe7a8');
      besar(teks.unggul === 'b' ? 'KARTUMU UNGGUL! ×1.5' : teks.unggul === 'a' ? 'KARTU LAWAN UNGGUL!' : 'SEIMBANG', W / 2, 358, 26, teks.unggul === 'b' ? '#7be07b' : teks.unggul === 'a' ? '#ff8a6a' : '#cfcfcf');
      if (k > 1700) mulaiTap(aktif.g);
    }
    // timing ring
    if (fase === 'tap' && aktif) {
      const seranganku = aktif.g.p === 'b';
      const [tx, ty] = POS[seranganku ? 'a' : 'b']; const cy = ty - 70;
      const sisa = (aktif.target - now) / RING_MS; const r = 40 + Math.max(-.4, sisa) * 120;
      ctx.lineWidth = 6; ctx.strokeStyle = '#fff4dc'; ctx.beginPath(); ctx.arc(tx, cy, 40, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = seranganku ? '#ffd23f' : '#5aaaff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(tx, cy, Math.max(4, r), 0, Math.PI * 2); ctx.stroke();
      besar(seranganku ? 'SERANG!' : 'TANGKIS!', tx, cy, 22, seranganku ? '#ffd23f' : '#9fd0ff');
      besar(`Babak ${aktif.g.babak + 1} · ${aktif.g.i % PER_BABAK + 1}/${PER_BABAK}`, W / 2, 560, 22, '#e6d8ff');
      if (aktif.ditekan || now > aktif.target + 300) terapkan();
    }
    if (fase === 'pukul' && k > 650) { aktif = null; lanjut(); }
    if (fase === 'kirim') besar('Menghitung hasil…', W / 2, 300, 34, '#fff4dc');
    if (fase === 'akhir') { const h = selesai.duel || selesai.lokal, menang = h.menang === B.u; besar(h.ko ? 'K.O.!' : 'WAKTU HABIS!', W / 2, 220, 60, '#ff5a3a', -.06); besar(menang ? 'KAMU MENANG! 🏆'.replace(' 🏆', '') : 'KAMU KALAH…', W / 2, 300, 54, menang ? '#ffd23f' : '#cfcfcf'); besar(menang ? '+1 poin Liga' : '−1 poin Liga', W / 2, 360, 30, '#fff4dc'); }
  }
  raf = requestAnimationFrame(gambar);
}

window.ArenaGame = { pilihKartu, mainkan, KARTU: K };
