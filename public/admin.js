(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let PW = '';
  try { PW = sessionStorage.getItem('pokomen_pw') || ''; } catch { /* ignore */ }
  let S = null;

  async function api(action, params = {}) {
    const r = await fetch('api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + PW }, body: JSON.stringify({ action, ...params }) });
    const j = await r.json().catch(() => ({ error: 'Server tidak menjawab (' + r.status + ')' }));
    if (!r.ok || j.error) throw new Error(j.error || r.status);
    return j.data;
  }
  function toast(m) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2800); }
  function out(x) { $('out').textContent = typeof x === 'string' ? x : JSON.stringify(x, null, 2); }
  async function run(btn, action, params, msg) {
    if (btn) btn.disabled = true;
    try { const d = await api(action, params); out(d); if (msg) toast(msg); await refresh(); return d; }
    catch (e) { out('Gagal: ' + e.message); toast('Gagal: ' + e.message); }
    finally { if (btn) btn.disabled = false; }
  }

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); PW = $('pw').value;
    try { await refresh(); try { sessionStorage.setItem('pokomen_pw', PW); } catch { /* ignore */ } }
    catch (err) { $('loginMsg').textContent = err.message; }
  });

  // ---------- sidebar tabs + live world
  const world = () => { try { return $('world').contentWindow.Pokomen; } catch { return null; } };
  const reloadWorld = () => { const P = world(); if (P) P.reload(); };
  function buildTabs() {
    // tabs are shortcuts: every section stays visible, a tab scrolls to its section
    const nav = $('admTabs'), side = $('adminSide'); const secs = [...$('panel').querySelectorAll(':scope > section')];
    nav.innerHTML = secs.map((sec, i) => { sec.id = sec.id || 'sec' + i; const t = sec.querySelector('h2').textContent.replace(/ = .*/, ''); return `<button type="button" data-i="${i}" aria-controls="${sec.id}">${esc(t)}<span class="n" hidden></span></button>`; }).join('');
    const btns = [...nav.querySelectorAll('button')];
    const mark = (i) => btns.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
    let jumping = 0;
    btns.forEach((b) => (b.onclick = () => {
      const i = Number(b.dataset.i); mark(i); jumping = Date.now();
      const top = secs[i].getBoundingClientRect().top - side.getBoundingClientRect().top + side.scrollTop - nav.offsetHeight - 8;
      side.scrollTo({ top, behavior: 'smooth' });
    }));
    const onScroll = () => {
      if (Date.now() - jumping < 700) return;
      const lim = side.getBoundingClientRect().top + nav.offsetHeight + 40;
      let cur = 0; secs.forEach((sec, i) => { if (sec.getBoundingClientRect().top <= lim) cur = i; });
      if (side.scrollTop + side.clientHeight >= side.scrollHeight - 4) cur = secs.length - 1;
      mark(cur);
    };
    side.addEventListener('scroll', onScroll, { passive: true });
    nav.hidden = false; mark(0);
  }
  function badge(sectionHeading, n) {
    const b = [...$('admTabs').querySelectorAll('button')].find((x) => x.textContent.startsWith(sectionHeading)); if (!b) return;
    const s = b.querySelector('.n'); s.hidden = !n; s.textContent = n;
  }
  $('worldReload').onclick = () => { reloadWorld(); toast('Data dunia dimuat ulang'); };
  $('worldToggle').onclick = () => { document.body.classList.toggle('show-world'); $('worldToggle').textContent = document.body.classList.contains('show-world') ? 'Kembali ke panel' : 'Lihat dunia'; };
  { // resizable sidebar
    const L = $('adminLayout'), H = $('admResize');
    const set = (px) => { px = Math.max(360, Math.min(window.innerWidth - 320, px)); L.style.setProperty('--side', px + 'px'); try { localStorage.setItem('pokomen_side', px); } catch { /* ignore */ } };
    try { const v = Number(localStorage.getItem('pokomen_side')); if (v) set(v); } catch { /* ignore */ }
    H.addEventListener('pointerdown', (e) => {
      H.setPointerCapture(e.pointerId); $('world').style.pointerEvents = 'none';
      const mv = (ev) => set(window.innerWidth - ev.clientX); const up = () => { H.removeEventListener('pointermove', mv); $('world').style.pointerEvents = ''; };
      H.addEventListener('pointermove', mv); H.addEventListener('pointerup', up, { once: true });
    });
    H.addEventListener('keydown', (e) => { const cur = $('adminSide').getBoundingClientRect().width; if (e.key === 'ArrowLeft') set(cur + 40); if (e.key === 'ArrowRight') set(cur - 40); });
  }

  async function refresh() {
    S = await api('status');
    $('loginBox').hidden = true; $('panel').hidden = false;
    $('chipHari').textContent = 'HARI KE-' + S.hari;
    $('chipWarga').textContent = S.warga.filter((w) => !w.hidden && !w.mati).length + ' WARGA';
    const conn = [
      ['Akun', S.account ? '@' + S.account.username : '<b style="color:var(--berry)">Belum tersambung</b>' + (S.igError ? ' — ' + esc(S.igError) : '')],
      ['Sumber token', esc(S.tokenSource)],
      ['Token terakhir diperbarui', esc(S.tokenRefreshed || '–')],
      ['Sinkron terakhir', esc(S.lastSync || 'belum pernah')],
      ['Hari pertama', esc(S.hariPertama || 'belum diatur')],
      ['Tingkat', esc(S.tiers.join(' → '))],
    ];
    $('conn').innerHTML = conn.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    if (S.hariPertama) $('hariPertama').value = S.hariPertama;
    renderPending(); renderWarga(); renderUsulan(); renderDukungan(); renderMenunggu();
    loadPemilu(); loadUnfollow();
    if ($('admTabs').hidden) buildTabs();
    badge('Antrean komentar', S.pending.length); badge('Menunggu konfirmasi', S.menunggu.length);
    const stale = S.warga.filter((w) => w.artVer && !w.mati && (w.artTier ?? 0) < w.tier).length; badge('Warga', stale);
    reloadWorld();
  }

  let PM = null;
  async function loadPemilu() {
    try { PM = await api('pemilu_status'); } catch (e) { $('pmInfo').textContent = 'Gagal memuat: ' + e.message; return; }
    const sel = new Set(PM.cfg.posts || []);
    $('pmMedia').innerHTML = PM.media.length ? PM.media.map((m) => `<label class="f" style="font-weight:600;display:flex;gap:8px;align-items:center">
      <input type="checkbox" data-media="${esc(m.id)}" ${sel.has(m.id) ? 'checked' : ''}> ${esc(new Date(m.timestamp).toLocaleString('id-ID'))} · ${esc((m.caption || '').slice(0, 60))}</label>`).join('')
      : `<span class="muted">${PM.mediaError ? 'Tidak bisa membaca postingan: ' + esc(PM.mediaError) : 'Belum ada postingan.'}</span>`;
    if (PM.cfg.tutup) { const d = new Date(PM.cfg.tutup); $('pmTutup').value = new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 16); }
    const h = PM.hasil;
    const warga = new Map(S.warga.map((w) => [w.username, w]));
    $('pmT').innerHTML = h && h.kandidat.length ? h.kandidat.slice(0, 30).map((k, i) => `<tr><td>${i + 1}</td><td>@${esc(k.u)}</td><td>${esc(warga.get(k.u)?.nama || '-')}${warga.get(k.u)?.gelar ? ' 👑' : ''}</td><td>${k.likes}</td><td>${k.komentar}</td><td>${esc(k.kampanye || '')}</td>
      <td><button class="btn ghost" type="button" data-ketua="${esc(k.u)}">Tetapkan Ketua</button></td></tr>`).join('')
      : '<tr><td colspan="7" class="muted">Belum ada calon. Klik Hitung ulang setelah ada komentar di postingan terpilih.</td></tr>';
    $('pmInfo').textContent = h ? `Terakhir dihitung ${new Date(h.updatedAt).toLocaleString('id-ID')} · ${h.jumlahCalon} calon dari ${h.jumlahPeserta} akun${h.likesAvailable ? '' : ' · like belum terbaca dari Instagram'}${h.closed ? ' · DITUTUP' : ''}` : 'Belum pernah dihitung.';
    $('pmT').querySelectorAll('[data-ketua]').forEach((b) => b.onclick = () => run(b, 'tetapkan_ketua', { username: b.dataset.ketua }, 'Ketua Koloni ditetapkan'));
  }
  $('pmSave').onclick = (e) => {
    const posts = [...document.querySelectorAll('[data-media]:checked')].map((x) => x.dataset.media).reverse();
    const v = $('pmTutup').value;
    run(e.target, 'pemilu_set', { posts, tutup: v ? v + ':00+07:00' : null }, 'Pengaturan pemilihan disimpan');
  };
  $('pmCount').onclick = (e) => run(e.target, 'pemilu_hitung', {}, 'Klasemen diperbarui');
  function renderMenunggu() {
    $('followInfo').textContent = S.requireFollow
      ? 'Wajib follow AKTIF. Pendaftar menerima DM otomatis dan baru lahir setelah membalas DM dan terbukti sudah follow.'
      : 'Wajib follow NONAKTIF. Komentar yang valid langsung lahir. Aktifkan dengan REQUIRE_FOLLOW=1 di Vercel (lihat README).';
    const list = S.menunggu || [];
    $('menungguT').innerHTML = list.length ? list.map((x) => `<tr data-u="${esc(x.username)}"><td>@${esc(x.username)}</td><td>${esc(x.nama)}</td><td>${esc((x.hewan || []).join(' + '))}</td>
      <td>${x.dmSent ? 'terkirim' : `<span style="color:var(--berry)">gagal${x.dmError ? ': ' + esc(x.dmError) : ''}</span>`}</td>
      <td>${x.following === false ? 'belum follow' : 'menunggu balasan DM'}</td>
      <td class="adm-row"><button class="btn green" type="button" data-ok>Lahirkan</button><button class="btn ghost" type="button" data-no>Hapus</button></td></tr>`).join('')
      : '<tr><td colspan="6" class="muted">Tidak ada yang menunggu.</td></tr>';
    $('menungguT').querySelectorAll('[data-ok]').forEach((b) => b.onclick = () => run(b, 'approve_menunggu', { username: b.closest('tr').dataset.u }, 'Warga dilahirkan'));
    $('menungguT').querySelectorAll('[data-no]').forEach((b) => b.onclick = () => run(b, 'dismiss_menunggu', { username: b.closest('tr').dataset.u }, 'Dihapus dari daftar tunggu'));
  }
  function renderPending() {
    const tb = $('pending');
    if (!S.pending.length) { tb.innerHTML = '<tr><td colspan="6" class="muted">Antrean kosong.</td></tr>'; return; }
    tb.innerHTML = S.pending.map((p, i) => `<tr>
      <td>@${esc(p.username)}</td><td style="max-width:280px">${esc(p.text)}</td>
      <td><input type="text" id="pn${i}" value="${esc(p.parsed?.nama || '')}"></td>
      <td><input type="text" id="ph${i}" value="${esc((p.parsed?.hewan || []).join(' + '))}"></td>
      <td><input type="text" id="pc${i}" value="${esc(p.parsed?.cerita || '')}"></td>
      <td class="adm-row"><button class="btn green" data-ok="${i}" type="button">Lahirkan</button><button class="btn ghost" data-no="${i}" type="button">Abaikan</button></td></tr>`).join('');
    tb.querySelectorAll('[data-ok]').forEach((b) => b.onclick = () => { const i = b.dataset.ok; run(b, 'resolve_pending', { id: S.pending[i].id, approve: true, nama: $('pn' + i).value, hewan: $('ph' + i).value, cerita: $('pc' + i).value }, 'Warga dilahirkan'); });
    tb.querySelectorAll('[data-no]').forEach((b) => b.onclick = () => run(b, 'resolve_pending', { id: S.pending[b.dataset.no].id, approve: false }, 'Komentar diabaikan'));
  }

  function renderWarga() {
    const q = $('wq').value.trim().toLowerCase();
    const stale = (w) => w.artVer && !w.mati && (w.artTier ?? 0) < w.tier;
    const nStale = S.warga.filter(stale).length;
    $('wStaleN').textContent = nStale ? `(${nStale})` : '(0)';
    const list = S.warga.filter((w) => (!q || w.username.includes(q) || (w.nama || '').toLowerCase().includes(q)) && (!$('wStale').checked || stale(w)));
    $('wargaT').innerHTML = list.length ? list.map((w) => `<tr data-u="${esc(w.username)}">
      <td>${w.spot + 1}</td><td>@${esc(w.username)}</td>
      <td><input type="text" data-f="nama" value="${esc(w.nama)}"></td>
      <td><input type="text" data-f="hewan" value="${esc((w.hewan || []).join(' + '))}"></td>
      <td><select data-f="tier">${S.tiers.map((t, i) => `<option value="${i}" ${i === w.tier ? 'selected' : ''}>${i + 1}. ${esc(t)}</option>`).join('')}</select>
        <input type="text" data-f="elemen" value="${esc(w.elemen || '')}" placeholder="Elemen" style="margin-top:4px">
        <input type="text" data-f="outfit" value="${esc(w.outfit || '')}" placeholder="Outfit" style="margin-top:4px">
        <input type="text" data-f="wujud" value="${esc(w.wujud || '')}" placeholder="Wujud Dewa" style="margin-top:4px"></td>
      <td class="artcell">${w.artVer ? `<img src="api/art?u=${encodeURIComponent(w.username)}&v=${w.artVer}" alt="" width="96" height="64">` : '<span class="muted">belum ada</span>'}
        ${stale(w) ? `<div class="stale">⚠ Gambar perlu diperbarui: dibuat saat ${esc(S.tiers[w.artTier ?? 0])}, sekarang ${esc(S.tiers[w.tier])}</div>` : ''}
        <div class="adm-row"><button class="btn ghost" type="button" data-prompt>Salin prompt Gemini</button>
        <label class="btn ghost">Unggah gambar<input type="file" accept="image/*" data-art hidden></label>
        ${w.artVer ? '<button class="btn red" type="button" data-noart>Hapus</button>' : ''}</div></td>
      <td><input type="checkbox" data-f="hidden" ${w.hidden ? 'checked' : ''} aria-label="Sembunyikan"></td>
      <td class="adm-row"><button class="btn ghost" data-map type="button">Lihat di peta</button><button class="btn ghost" data-save type="button">Simpan</button>${w.mati ? '<button class="btn green" data-revive type="button">Hidupkan</button>' : '<button class="btn ghost" data-kill type="button">Matikan</button>'}<button class="btn red" data-del type="button">Hapus</button>${w.mati ? '<br><span class="muted">RIP: unfollow</span>' : ''}</td></tr>`).join('')
      : '<tr><td colspan="8" class="muted">Belum ada warga.</td></tr>';
    $('wargaT').querySelectorAll('[data-save]').forEach((b) => b.onclick = () => {
      const tr = b.closest('tr'); const patch = {};
      tr.querySelectorAll('[data-f]').forEach((el) => { patch[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value; });
      patch.tier = Number(patch.tier);
      run(b, 'update_warga', { username: tr.dataset.u, patch }, 'Warga disimpan');
    });
    $('wargaT').querySelectorAll('[data-prompt]').forEach((b) => b.onclick = () => {
      const w = S.warga.find((x) => x.username === b.closest('tr').dataset.u);
      const p = geminiPrompt(w);
      navigator.clipboard.writeText(p).then(() => toast('Prompt disalin. Tempel di Gemini.'), () => { out(p); toast('Prompt ada di kotak Hasil aksi terakhir. Salin manual.'); });
    });
    $('wargaT').querySelectorAll('[data-art]').forEach((inp) => inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      try { const dataUrl = await compress(f); await run(null, 'set_art', { username: inp.closest('tr').dataset.u, dataUrl }, 'Gambar anime tersimpan di kartu'); }
      catch (e) { toast('Gagal: ' + e.message); }
    });
    $('wargaT').querySelectorAll('[data-noart]').forEach((b) => b.onclick = () => run(b, 'remove_art', { username: b.closest('tr').dataset.u }, 'Gambar dihapus'));
    $('wargaT').querySelectorAll('[data-map]').forEach((b) => b.onclick = () => { const P = world(); if (!P || !P.focus(b.closest('tr').dataset.u)) toast('Peta belum siap atau warga tersembunyi'); if (window.innerWidth <= 900) { document.body.classList.add('show-world'); $('worldToggle').textContent = 'Kembali ke panel'; } });
    $('wargaT').querySelectorAll('[data-revive]').forEach((b) => b.onclick = () => run(b, 'hidupkan', { username: b.closest('tr').dataset.u }, 'Hewan hidup kembali'));
    $('wargaT').querySelectorAll('[data-kill]').forEach((b) => {
      let armed = false;
      b.onclick = () => {
        if (!armed) { armed = true; b.textContent = 'Yakin mati?'; setTimeout(() => { armed = false; b.textContent = 'Matikan'; }, 3000); return; }
        run(b, 'matikan', { username: b.closest('tr').dataset.u }, 'Hewan mati (diterlantarkan)');
      };
    });
    $('wargaT').querySelectorAll('[data-del]').forEach((b) => {
      let armed = false;
      b.onclick = () => {
        if (!armed) { armed = true; b.textContent = 'Yakin?'; setTimeout(() => { armed = false; b.textContent = 'Hapus'; }, 3000); return; }
        run(b, 'delete_warga', { username: b.closest('tr').dataset.u }, 'Warga dihapus');
      };
    });
  }
  $('wq').addEventListener('input', () => S && renderWarga());
  $('wStale').addEventListener('change', () => S && renderWarga());

  // ---------- unfollow = dead
  async function loadUnfollow() {
    try {
      const d = await api('unfollow_status');
      const l = d.last;
      $('ufInfo').textContent = `${d.hidup} hewan hidup, ${d.mati} mati. ${d.punyaId} warga bisa dicek otomatis.` +
        (l ? ` Cek terakhir ${new Date(l.t).toLocaleString('id-ID')}: ${l.dicek} dicek, ${l.unfollow.length} unfollow, ${l.tidakBisaDicek} tidak dijawab Instagram.` : '');
    } catch (e) { $('ufInfo').textContent = e.message; }
  }
  function renderUf(list) {
    $('ufT').innerHTML = list.length ? list.map((w) => `<tr><td><input type="checkbox" data-uf="${esc(w.username)}"></td><td>@${esc(w.username)}</td><td>${esc(w.nama)} (${esc((w.hewan || []).join(' + '))})</td><td>${esc(S.tiers[w.tier] || '')}</td></tr>`).join('')
      : '<tr><td colspan="4" class="muted">Semua warga masih follow.</td></tr>';
    $('ufKill').disabled = !list.length;
  }
  $('ufAuto').onclick = async () => { const d = await run($('ufAuto'), 'cek_unfollow', {}, 'Cek otomatis selesai'); if (d) loadUnfollow(); };
  $('ufFile').onchange = async () => { const f = $('ufFile').files[0]; if (!f) return; $('ufText').value = await f.text(); toast('File dimuat. Klik Bandingkan.'); };
  $('ufCompare').onclick = async () => {
    try {
      const d = await api('banding_followers', { text: $('ufText').value });
      out({ jumlahFollower: d.jumlahFollower, jumlahWarga: d.jumlahWarga, bukanFollower: d.bukanFollower.length });
      renderUf(d.bukanFollower);
      toast(`${d.bukanFollower.length} warga tidak ada di daftar follower`);
    } catch (e) { toast('Gagal: ' + e.message); }
  };
  $('ufAll').onchange = () => $('ufT').querySelectorAll('[data-uf]').forEach((c) => (c.checked = $('ufAll').checked));
  $('ufKill').onclick = async () => {
    const usernames = [...$('ufT').querySelectorAll('[data-uf]:checked')].map((c) => c.dataset.uf);
    if (!usernames.length) return toast('Pilih dulu akunnya');
    const b = $('ufKill');
    if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = `Yakin matikan ${usernames.length} hewan?`; setTimeout(() => { b.dataset.armed = ''; b.textContent = 'Matikan yang dipilih'; }, 4000); return; }
    b.dataset.armed = '';
    await run(b, 'matikan', { usernames }, usernames.length + ' hewan mati');
    renderUf([]); loadUnfollow();
  };

  // ---------- Gemini prompt + image compression
  // Regular, Pseudo-evo, Mega, Mythical, Legendary, God Mode
  const TIER_FX = [
    'base form, small and cute, soft gentle lighting, calm pastel colors',
    'grown-up bigger and stronger body than its base form, confident stance, light sparkles, shiny highlights in the eyes',
    'MEGA EVOLUTION: its element awakens, intense elemental aura and elemental energy swirling around the body, glowing elemental markings on the fur/skin, dramatic rim light',
    'MYTHICAL EVOLUTION: wearing light fantasy armor plates (helmet, shoulder guards, chest plate) fused with its elemental power, glowing gems on the armor, mythical aura',
    'LEGENDARY EVOLUTION: wearing a custom outfit over its armor, flowing cape, heroic pose, radiant golden aura, lens flare, magical particles everywhere',
    'GOD MODE: its base form is transformed into a completely new divine body, towering and majestic, golden halo, cosmic galaxy sky, intense rainbow aura, light rays bursting from behind, epic cinematic lighting',
  ];
  const WUJUD_EN = [[/beast|zoid/i, 'a giant mechanical beast robot (mecha beast anime style) with armored plates, glowing visor eyes and thrusters'], [/mecha|robot|gundam/i, 'a giant humanoid mecha robot (mecha anime style) with armored plates, glowing visor eyes and jet thrusters'], [/cyborg|android/i, 'a cyborg with half mechanical body and glowing circuit lines'], [/kristal|crystal/i, 'a living crystal body, translucent and faceted, refracting rainbow light'], [/roh|spirit|cahaya/i, 'a pure light spirit body, glowing and semi-transparent'], [/kaiju/i, 'a colossal kaiju monster form with glowing spikes']];
  const ELEM_BG = { Api: 'a volcanic valley at sunset with floating embers', Air: 'a sparkling lake with water splashes and bubbles', Angin: 'a bright sky with clouds and wind streaks', Tanah: 'rocky canyon with floating boulders', Petir: 'a stormy sky with lightning bolts', Es: 'a frozen glacier with snowflakes', Daun: 'a lush forest meadow with falling leaves', Cahaya: 'a heavenly sky with sun rays', Kegelapan: 'a moonlit dark forest with purple mist' };
  const ELEM_EN = { Api: 'fire', Air: 'water', Angin: 'wind', Tanah: 'earth', Petir: 'lightning', Es: 'ice', Daun: 'nature/leaf', Cahaya: 'light', Kegelapan: 'darkness' };
  const EN = { kucing: 'cat', naga: 'dragon', ayam: 'chicken', rubah: 'fox', ikan: 'fish', kelinci: 'rabbit', rusa: 'deer', panda: 'panda', lebah: 'bee', babi: 'pig', burung: 'bird', katak: 'frog', kodok: 'frog', unicorn: 'unicorn', paus: 'whale', harimau: 'tiger', macan: 'tiger', kupu: 'butterfly', 'kupu-kupu': 'butterfly', serigala: 'wolf', elang: 'eagle', kura: 'turtle', 'kura-kura': 'turtle', penyu: 'sea turtle', gajah: 'elephant', domba: 'sheep', kelelawar: 'bat', monyet: 'monkey', hiu: 'shark', bebek: 'duck', siput: 'snail', phoenix: 'phoenix', gurita: 'octopus', singa: 'lion', merak: 'peacock', hamster: 'hamster', pinguin: 'penguin', anjing: 'dog', sapi: 'cow', kambing: 'goat', kuda: 'horse', tupai: 'squirrel', beruang: 'bear', ular: 'snake', buaya: 'crocodile', komodo: 'komodo dragon', jerapah: 'giraffe', lumba: 'dolphin', 'lumba-lumba': 'dolphin', gagak: 'crow', angsa: 'swan', semut: 'ant', laba: 'spider', 'laba-laba': 'spider', tikus: 'mouse', badak: 'rhinoceros', zebra: 'zebra', koala: 'koala' };
  const toEN = (h) => { const k = String(h).toLowerCase().trim(); return EN[k] ? `${EN[k]} (${h})` : h; };
  function geminiPrompt(w) {
    const tier = Math.max(0, Math.min(5, w.tier || 0));
    const el = tier >= 2 && w.elemen ? w.elemen : null;
    const story = (w.cerita || []).slice(-1)[0]?.text || '';
    return [
      `Create an anime-style illustration (Japanese anime, cel-shaded, clean line art, vibrant colors, high detail) of an original cute fantasy creature named "${w.nama}".`,
      `It is a hybrid of ${(w.hewan || []).map(toEN).join(' and ')}, clearly showing recognizable features of each animal blended into one creature.`,
      story ? `Personality and habit (written in Indonesian): "${story}". Show this habit in the pose or a small detail.` : 'Give it a cheerful, curious personality.',
      `Full body, centered, dynamic pose, big expressive eyes, friendly and family-friendly.`,
      `Evolution stage: ${TIER_FX[tier]}.`,
      el ? `Element: ${ELEM_EN[el] || el} (${el}) — show this element clearly in the aura and effects.` : '',
      tier >= 4 && w.outfit ? `Custom outfit (written in Indonesian): "${w.outfit}".` : '',
      tier >= 5 && w.wujud ? `New divine base form: ${(WUJUD_EN.find(([re]) => re.test(w.wujud)) || [0, w.wujud])[1]}, while keeping recognizable features of the original animals and its name "${w.nama}".` : '',
      `Background: ${el ? (ELEM_BG[el] || 'a magical landscape matching the ' + el + ' element') : 'a peaceful pixel-farm style meadow'}.`,
      `Landscape orientation, 3:2 aspect ratio. No text, no letters, no logo, no watermark, no card frame.`,
    ].filter(Boolean).join(' ');
  }
  function compress(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const TW = 900, TH = 600; // 3:2
        const c = document.createElement('canvas'); c.width = TW; c.height = TH;
        const g = c.getContext('2d');
        const s = Math.max(TW / img.width, TH / img.height);
        const w = img.width * s, h = img.height * s;
        g.drawImage(img, (TW - w) / 2, (TH - h) / 2, w, h);
        let q = 0.86, url = c.toDataURL('image/webp', q);
        if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/jpeg', q);
        while (url.length > 850000 && q > 0.4) { q -= 0.1; url = c.toDataURL(url.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg', q); }
        URL.revokeObjectURL(img.src); resolve(url);
      };
      img.onerror = () => reject(new Error('File bukan gambar'));
      img.src = URL.createObjectURL(file);
    });
  }

  function renderUsulan() {
    $('usulanT').innerHTML = S.usulan.length ? S.usulan.map((x) => `<tr data-id="${esc(x.id)}">
      <td>${esc(x.text)}</td><td>@${esc(x.username)}</td>
      <td><input type="number" data-f="likes" value="${x.likes || 0}" style="width:90px"></td>
      <td><select data-f="status"><option value="">Voting</option><option value="dibangun" ${x.status === 'dibangun' ? 'selected' : ''}>Dibangun</option><option value="ditolak" ${x.status === 'ditolak' ? 'selected' : ''}>Ditolak</option></select></td>
      <td><input type="text" data-f="episode" value="${esc(x.episode || '')}" style="width:70px"></td>
      <td><button class="btn ghost" data-save type="button">Simpan</button></td></tr>`).join('')
      : '<tr><td colspan="6" class="muted">Belum ada usulan.</td></tr>';
    $('usulanT').querySelectorAll('[data-save]').forEach((b) => b.onclick = () => {
      const tr = b.closest('tr'); const p = { id: tr.dataset.id };
      tr.querySelectorAll('[data-f]').forEach((el) => { p[el.dataset.f] = el.value; });
      run(b, 'set_usulan', p, 'Usulan disimpan');
    });
  }

  function renderDukungan() {
    $('trInfo').textContent = S.trakteerReady ? 'Trakteer tersambung. Pendukung baru muncul otomatis di Papan Terima Kasih.' : 'Belum aktif: isi TRAKTEER_URL dan TRAKTEER_WEBHOOK_TOKEN di Vercel lalu redeploy.';
    const rej = S.trakteerLastRejected;
    $('trRaw').textContent = (S.trakteerLastRaw || 'Belum ada data masuk.') + (rej ? `\n\nPermintaan terakhir yang DITOLAK: ${rej.t}\nAlasan: ${rej.alasan}\nToken di URL: ${rej.adaTokenDiURL ? 'ada' : 'TIDAK ada'} · Token di header: ${rej.adaTokenDiHeader ? 'ada' : 'tidak ada'}` : '');
    $('dukT').innerHTML = S.dukungan.length ? S.dukungan.map((x) => `<tr data-id="${esc(x.id)}"><td>${esc(x.nama)}</td><td>${esc(x.jumlah)} ${esc(x.unit)}</td><td>${esc(x.pesan)}</td>
      <td><input type="checkbox" data-show ${x.hidden ? '' : 'checked'} aria-label="Tampilkan di website"></td></tr>`).join('')
      : '<tr><td colspan="4" class="muted">Belum ada dukungan.</td></tr>';
    $('dukT').querySelectorAll('[data-show]').forEach((c) => c.onchange = () => run(null, 'set_dukungan', { id: c.closest('tr').dataset.id, hidden: !c.checked }, c.checked ? 'Ditampilkan' : 'Disembunyikan'));
  }
  $('btnSync').onclick = (e) => run(e.target, 'sync', { posts: Number($('syncPosts').value) }, 'Sinkron selesai');
  $('btnSub').onclick = (e) => run(e.target, 'subscribe_webhook', {}, 'Webhook aktif');
  $('btnRefresh').onclick = (e) => run(e.target, 'refresh_token', {}, 'Token diperbarui');
  $('btnToken').onclick = (e) => run(e.target, 'set_token', { token: $('newToken').value }, 'Token disimpan');
  $('btnHari').onclick = (e) => run(e.target, 'set_hari_pertama', { date: $('hariPertama').value }, 'Tanggal disimpan');
  $('addForm').addEventListener('submit', (e) => { e.preventDefault(); run(e.submitter, 'add_warga', { username: $('aU').value, nama: $('aN').value, hewan: $('aH').value, cerita: $('aC').value }, 'Warga dilahirkan').then(() => e.target.reset()); });
  $('usForm').addEventListener('submit', (e) => { e.preventDefault(); run(e.submitter, 'add_usulan', { text: $('usText').value, likes: $('usLikes').value }, 'Usulan ditambahkan').then(() => e.target.reset()); });
  $('newsForm').addEventListener('submit', (e) => { e.preventDefault(); run(e.submitter, 'post_log', { text: $('newsText').value }, 'Kabar diumumkan').then(() => e.target.reset()); });

  if (PW) refresh().catch(() => { $('loginBox').hidden = false; });
})();
