// Obrolan Warga — public chat (Semua + per Wilayah). Reading is open to everyone; writing needs the
// personal link from the DM "OBROLAN" (?u=…&k=…, kept in this browser). Messages also pop up as
// speech bubbles above the writer's creature on the map (see drawChatBubbles in app.js).
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qs = new URLSearchParams(location.search);
  let TOKEN = '';
  try {
    if (qs.get('k')) { TOKEN = qs.get('k'); localStorage.setItem('pokomen_k', TOKEN); if (qs.get('u')) localStorage.setItem('pokomen_k_u', qs.get('u').toLowerCase().replace(/^@/, '')); }
    else TOKEN = localStorage.getItem('pokomen_k') || '';
    if (qs.get('k')) { qs.delete('k'); history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '') + location.hash); } // keep the secret out of the address bar
  } catch { /* ignore */ }
  const TIERC = ['#9a8f80', '#5a9a3a', '#2f7fd0', '#8a5ad0', '#c08a10', '#d9483b'];
  const EMO = ['👋', '❤️', '😂', '🔥', '🎉', '👑'];
  const state = { ruang: 'semua', me: null, last: {}, msgs: {}, bubbles: [], kunci: false };

  async function api(body) {
    const r = await fetch('api/obrolan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return r.json();
  }
  function wilayahList() {
    const D = window.Pokomen && window.Pokomen.data && window.Pokomen.data();
    const pw = D && D.pemiluWilayah && D.pemiluWilayah.wilayah;
    return pw ? Object.keys(pw).map(Number).sort((a, b) => a - b) : [1, 2, 3];
  }
  function tabs() {
    const el = $('obTabs'); el.innerHTML = '';
    const rooms = [['semua', 'Semua warga']];
    for (const n of wilayahList()) { const l = ((window.Pokomen && window.Pokomen.data && window.Pokomen.data()) || {}).usulNamaWilayah || {}; const r = (l[n] || []).find((x) => x.status === 'resmi'); const nm = r ? ' · ' + r.nama : ''; rooms.push(['w' + n, state.me && state.me.wil === n ? `Wilayahku (${n}${nm})` : `Wilayah ${n}${nm}`]); }
    for (const [r, lab] of rooms) {
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = lab;
      b.setAttribute('aria-selected', String(r === state.ruang));
      if (state.me && r === 'w' + state.me.wil) b.classList.add('mine');
      b.onclick = () => { state.ruang = r; tabs(); render(); poll(true); };
      el.appendChild(b);
    }
    canWrite();
  }
  function canWrite() {
    const ok = !!state.me && (state.ruang === 'semua' || state.ruang === 'w' + state.me.wil) && !state.kunci;
    $('obForm').hidden = !state.me;
    $('obJoin').hidden = !!state.me;
    $('obText').disabled = !ok; $('obSend').querySelector('button').disabled = !ok;
    $('obText').placeholder = state.kunci ? 'Obrolan sedang dikunci Admin…' : ok ? 'Tulis pesan… (maks. 200 huruf)' : `Hanya warga ${state.ruang.replace('w', 'Wilayah ')} yang bisa menulis di sini`;
    $('obEmo').querySelectorAll('button').forEach((b) => (b.disabled = !ok));
  }
  const jam = (t) => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  function render() {
    const list = $('obList'); const msgs = state.msgs[state.ruang] || [];
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
    list.innerHTML = msgs.length ? msgs.map((m) => m.sistem
      ? `<li class="sys"><span>${esc(m.text)}</span><time>${jam(m.t)}</time></li>`
      : `<li${state.me && m.u === state.me.u ? ' class="me"' : ''}><button type="button" class="ob-name" data-u="${esc(m.u)}" style="color:${TIERC[Math.min(5, m.tier || 0)]}">${m.gelar ? '♛ ' : ''}${m.kopi ? '<span title="Pendukung Kopi Admin">☕</span> ' : ''}${esc(m.nama)}</button><span class="ob-wil">W${m.wil}</span><time>${jam(m.t)}</time>
         <button type="button" class="ob-flag" data-id="${m.id}" title="Laporkan pesan ini" aria-label="Laporkan">⚑</button><p>${esc(m.text)}</p></li>`).join('')
      : `<li class="empty">Belum ada obrolan di sini. ${state.me ? 'Sapa duluan yuk!' : ''}</li>`;
    list.querySelectorAll('.ob-name').forEach((b) => (b.onclick = () => window.Pokomen && window.Pokomen.focus(b.dataset.u)));
    list.querySelectorAll('.ob-flag').forEach((b) => (b.onclick = async () => {
      if (!TOKEN) { $('obJoin').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (!confirm('Laporkan pesan ini ke Admin?')) return;
      const r = await api({ aksi: 'lapor', token: TOKEN, id: b.dataset.id });
      b.textContent = r.ok ? '✓' : '!'; b.disabled = true;
    }));
    if (atBottom || !list.dataset.init) { list.scrollTop = list.scrollHeight; list.dataset.init = '1'; }
  }
  async function fetchRoom(r) {
    const sejak = state.last[r] || 0;
    const d = await fetch(`api/obrolan?ruang=${r}&sejak=${sejak}`, { cache: 'no-store' }).then((x) => x.json());
    if (d.error) return;
    state.kunci = !!d.kunci;
    const arr = state.msgs[r] || (state.msgs[r] = []);
    for (const m of d.pesan) {
      if (arr.some((x) => x.id === m.id)) continue;
      arr.push(m); state.last[r] = Math.max(state.last[r] || 0, m.id);
      if (!m.sistem && sejak && Date.now() - Date.parse(m.t) < 15000) state.bubbles.push({ u: m.u, text: m.text, at: Date.now() });
    }
    if (arr.length > 200) arr.splice(0, arr.length - 200);
  }
  let busy = false;
  async function poll(force) {
    if (busy && !force) return; busy = true;
    try {
      await fetchRoom(state.ruang);
      if (state.ruang !== 'semua') await fetchRoom('semua'); // map bubbles from the town square too
      render(); canWrite();
    } catch { /* offline */ } finally { busy = false; }
  }
  function loop() {
    const sec = document.getElementById('obrolan');
    const visible = !document.hidden;
    const near = sec && sec.getBoundingClientRect().top < innerHeight * 1.5;
    poll(); setTimeout(loop, !visible ? 20000 : near ? (window.Pokomen && window.Pokomen.ringan && window.Pokomen.ringan() ? 7000 : 4000) : 9000);
  }
  async function kirim(text) {
    $('obErr').textContent = '';
    const r = await api({ token: TOKEN, ruang: state.ruang, text });
    if (r.error) { $('obErr').textContent = r.error; return false; }
    state.bubbles.push({ u: r.pesan.u, text: r.pesan.text, at: Date.now() });
    await poll(true); return true;
  }
  async function init() {
    if (!$('obrolan')) return;
    $('obEmo').innerHTML = EMO.map((e) => `<button type="button" class="ob-e" aria-label="Kirim ${e}">${e}</button>`).join('');
    $('obEmo').querySelectorAll('button').forEach((b) => (b.onclick = () => kirim(b.textContent)));
    $('obSend').onsubmit = async (e) => {
      e.preventDefault(); const t = $('obText').value.trim(); if (!t) return;
      const btn = $('obSend').querySelector('button'); btn.disabled = true;
      if (await kirim(t)) $('obText').value = '';
      setTimeout(() => (btn.disabled = false), 3000);
    };
    if (TOKEN) {
      try {
        const r = await api({ aksi: 'cek', token: TOKEN });
        if (r.ok) { state.me = r; state.ruang = 'semua'; $('obWho').innerHTML = `Masuk sebagai <b>${esc(r.nama)}</b> · Wilayah ${r.wil}`; }
        else { TOKEN = ''; try { localStorage.removeItem('pokomen_k'); } catch { /* ignore */ } $('obWho').textContent = 'Link pribadi sudah tidak berlaku.'; }
      } catch { /* ignore */ }
    }
    const waitData = () => (window.Pokomen && window.Pokomen.data && window.Pokomen.data()) ? tabs() : setTimeout(waitData, 400);
    tabs(); waitData();
    loop();
    if (location.hash === '#obrolan') setTimeout(() => $('obrolan').scrollIntoView({ behavior: 'smooth' }), 800);
  }
  window.PokoChat = { bubbles: () => { const now = Date.now(); state.bubbles = state.bubbles.filter((b) => now - b.at < 7000); return state.bubbles; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
