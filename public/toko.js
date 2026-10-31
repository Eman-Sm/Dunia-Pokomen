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
    return `<details class="tk-duel"><summary><b>${esc(d.namaA)}</b> vs <b>${esc(d.namaB)}</b> · 🏆 ${esc(W)} <time>${jam(d.t)}</time></summary><ol>${d.catatan.map((c) => `<li>${esc(c)}</li>`).join('')}</ol></details>`;
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
    else if (aksi === 'terima') { const d = r.duel; toast(`Duel selesai: ${d.menang === d.a ? d.namaA : d.namaB} MENANG!`); }
    await muat();
  }

  for (const b of sec.querySelectorAll('.tk-tabs button')) b.onclick = () => { tab = b.dataset.tab; render(); };
  if (location.hash === '#toko') tab = 'toko';
  muat();
  setInterval(() => { if (!document.hidden && !sec.hidden && tab === 'arena') muat(); }, 30000);
})();
