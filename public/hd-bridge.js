// Bridge between the website and the Godot "Mode HD" world (public/hd/).
// Fetches the live world data, draws every creature with creature.js (same look as the normal map)
// and hands everything to Godot through window.POKO. Also draws the small HTML overlay
// (back button, search, citizen card) on top of the Godot canvas.
(function () {
  const qs = new URLSearchParams(location.search);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let me = qs.get('u') || '';
  try { if (!me) me = localStorage.getItem('pokomen_me') || ''; } catch { /* ignore */ }
  me = me.toLowerCase().replace(/^@/, '').trim();
  const blobUrl = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });

  async function load() {
    const [dunia, world, png] = await Promise.all([
      fetch('../api/dunia?t=' + Date.now(), { cache: 'no-store' }).then((r) => r.json()),
      fetch('../assets/world.json').then((r) => r.json()),
      fetch('../assets/world.png').then((r) => r.blob()),
    ]);
    if (dunia.error || !dunia.warga) throw new Error(dunia.error || 'data kosong');
    const sprites = {};
    for (const w of dunia.warga) {
      if (w.mati) continue;
      try { const c = window.Creature.make(w); sprites[w.u] = { url: c.toDataURL(), px: c.px || 1, grow: c.grow || 1, hd: !!c.hd }; } catch { /* skip */ }
    }
    window.POKO = { ready: true, dunia, world, worldPng: await blobUrl(png), sprites, me, jam: qs.get('jam') || '' };
  }
  load().catch((e) => { const o = document.getElementById('hdErr'); if (o) { o.textContent = 'Gagal memuat data dunia: ' + e.message; o.hidden = false; } });

  // ------------------------------------------------------------ overlay UI
  const css = `
  #hdBar{position:fixed;left:0;right:0;top:0;display:flex;gap:8px;align-items:center;padding:10px 12px;z-index:10;pointer-events:none;font:600 14px/1.2 system-ui,sans-serif}
  #hdBar>*{pointer-events:auto}
  .hdBtn{background:rgba(26,20,30,.82);color:#fff;border:2px solid #2b1b17;border-radius:12px;padding:8px 12px;text-decoration:none;font:inherit;cursor:pointer;white-space:nowrap}
  .hdBtn.gold{background:#ffd23f;color:#2b1b17}
  #hdSearch{flex:1;min-width:0;max-width:300px;background:rgba(255,252,244,.95);border:2px solid #2b1b17;border-radius:12px;padding:8px 10px;font:inherit}
  #hdCard{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);width:min(92vw,380px);background:#fffcf4;border:3px solid #2b1b17;border-radius:16px;padding:12px 14px;z-index:10;font:14px/1.35 system-ui,sans-serif;color:#2b1b17;box-shadow:0 6px 0 rgba(0,0,0,.25)}
  #hdCard h3{margin:0 0 2px;font-size:20px}#hdCard .m{color:#7a5a40;font-size:13px}#hdCard .t{display:inline-block;margin:6px 6px 0 0;padding:2px 8px;border-radius:10px;background:#efe3c8;font-size:12px;font-weight:700}
  #hdCard .x{position:absolute;right:8px;top:6px;border:0;background:none;font-size:22px;cursor:pointer}
  #hdCard a{color:#2a6fb0;font-weight:700}
  #hdErr{position:fixed;left:12px;right:12px;bottom:14px;background:#c0392b;color:#fff;padding:10px;border-radius:10px;z-index:11;font:14px system-ui}
  `;
  function overlay() {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const bar = document.createElement('div'); bar.id = 'hdBar';
    bar.innerHTML = `<a class="hdBtn" href="../peta.html${me ? '?u=' + encodeURIComponent(me) : ''}">← Peta biasa</a>
      <input id="hdSearch" type="search" placeholder="Cari nama hewan / @akun" aria-label="Cari hewan">
      ${me ? '<button class="hdBtn gold" id="hdMe" type="button">★ Hewanku</button>' : ''}`;
    document.body.appendChild(bar);
    const card = document.createElement('div'); card.id = 'hdCard'; card.hidden = true; document.body.appendChild(card);
    const err = document.createElement('div'); err.id = 'hdErr'; err.hidden = true; document.body.appendChild(err);
    const find = (q) => {
      const W = (window.POKO && window.POKO.dunia.warga) || [];
      q = q.toLowerCase().replace(/^@/, '').trim(); if (!q) return null;
      return W.find((w) => w.u === q) || W.find((w) => (w.nama + (w.kembar ? ' ' + (w.spot + 1) : '')).toLowerCase() === q) || W.find((w) => w.nama.toLowerCase().startsWith(q)) || null;
    };
    document.getElementById('hdSearch').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const w = find(e.target.value); if (w && window.pokoFly) { window.pokoFly(w.u); window.pokoSelect(w.u); e.target.blur(); }
    });
    const mb = document.getElementById('hdMe'); if (mb) mb.onclick = () => { if (window.pokoFly) { window.pokoFly(me); window.pokoSelect(me); } };
  }
  window.pokoSelect = function (u) {
    const card = document.getElementById('hdCard'); if (!card) return;
    const w = u && window.POKO && window.POKO.dunia.warga.find((x) => x.u === u);
    if (!w) { card.hidden = true; return; }
    const nama = w.nama + (w.kembar ? ' ' + (w.spot + 1) : '');
    card.innerHTML = `<button class="x" type="button" aria-label="Tutup">×</button>
      <h3>${esc(nama)}</h3><div class="m">@${esc(w.u)} · warga no. ${w.spot + 1}${w.wil ? ' · Wilayah ' + w.wil : ''}</div>
      <span class="t">${esc(w.tierNama || '')}</span>${w.gelar ? `<span class="t" style="background:#ffd23f">${esc(w.gelar)}</span>` : ''}${w.sahabat ? '<span class="t" style="background:#ffb3d1">♛ Sohabat Admin</span>' : ''}
      <div style="margin-top:6px">${esc((w.hewan || []).join(' + '))}${w.elemen ? ' · elemen ' + esc(w.elemen) : ''}</div>
      ${w.skill ? `<div style="margin-top:4px">✦ Skill: <b>${esc(w.skill)}</b></div>` : ''}
      <div style="margin-top:8px"><a href="../?u=${encodeURIComponent(w.u)}#peta">Lihat Kartu Warga lengkap →</a></div>`;
    card.querySelector('.x').onclick = () => { card.hidden = true; };
    card.hidden = false;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', overlay); else overlay();
})();
