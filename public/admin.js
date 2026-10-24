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

  async function refresh() {
    S = await api('status');
    $('loginBox').hidden = true; $('panel').hidden = false;
    $('chipHari').textContent = 'HARI KE-' + S.hari;
    $('chipWarga').textContent = S.warga.filter((w) => !w.hidden).length + ' WARGA';
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
    renderPending(); renderWarga(); renderUsulan(); renderDukungan();
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
    const list = S.warga.filter((w) => !q || w.username.includes(q) || (w.nama || '').toLowerCase().includes(q));
    $('wargaT').innerHTML = list.length ? list.map((w) => `<tr data-u="${esc(w.username)}">
      <td>${w.spot + 1}</td><td>@${esc(w.username)}</td>
      <td><input type="text" data-f="nama" value="${esc(w.nama)}"></td>
      <td><input type="text" data-f="hewan" value="${esc((w.hewan || []).join(' + '))}"></td>
      <td><select data-f="tier">${S.tiers.map((t, i) => `<option value="${i}" ${i === w.tier ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></td>
      <td><input type="text" data-f="spriteUrl" value="${esc(w.spriteUrl || '')}" placeholder="https://…png"></td>
      <td><input type="checkbox" data-f="hidden" ${w.hidden ? 'checked' : ''} aria-label="Sembunyikan"></td>
      <td class="adm-row"><button class="btn ghost" data-save type="button">Simpan</button><button class="btn red" data-del type="button">Hapus</button></td></tr>`).join('')
      : '<tr><td colspan="8" class="muted">Belum ada warga.</td></tr>';
    $('wargaT').querySelectorAll('[data-save]').forEach((b) => b.onclick = () => {
      const tr = b.closest('tr'); const patch = {};
      tr.querySelectorAll('[data-f]').forEach((el) => { patch[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value; });
      patch.tier = Number(patch.tier);
      run(b, 'update_warga', { username: tr.dataset.u, patch }, 'Warga disimpan');
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
    $('trRaw').textContent = S.trakteerLastRaw || 'Belum ada data masuk.';
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
