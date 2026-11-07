import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
const { newWarga } = await import('../lib/rules.js');
const { setJSON, getJSON } = await import('../lib/db.js');
const ob = await import('../lib/obrolan.js');
const KD = await import('../lib/kendali.js');

test('kendali God Mode: hanya pemilik tier 5, posisi kedaluwarsa setelah 45 detik', async () => {
  const g = newWarga({ username: 'dewa', nama: 'Dewa', hewan: ['Naga'], spot: 30 }); g.tier = 5; await setJSON('warga', 'dewa', g);
  await setJSON('warga', 'biasa9', newWarga({ username: 'biasa9', nama: 'Biasa', hewan: ['Kucing'], spot: 31 }));
  const kg = await ob.tokenFor('dewa'), kb = await ob.tokenFor('biasa9');
  await assert.rejects(() => KD.gerak({ token: kb, x: 100, y: 100 }), /God Mode/);
  await assert.rejects(() => KD.gerak({ token: 'palsu', x: 100, y: 100 }), /link pribadi/);
  const t0 = 1_800_000_000_000;
  const r = await KD.gerak({ token: kg, x: 99999, y: -5, now: t0 });
  assert.deepEqual([r.pos.x, r.pos.y], [1690, 10]);
  assert.deepEqual(Object.keys(await KD.posisi({ now: t0 + 1000 })), ['dewa']);
  assert.deepEqual(await KD.posisi({ now: t0 + 46000 }), {});
  await KD.gerak({ token: kg, x: 500, y: 500, now: t0 + 50000 }).catch(() => {});
  await KD.lepas({ token: kg });
  assert.deepEqual(await KD.posisi({ now: t0 + 50001 }), {});
  const { GET } = await import('../api/obrolan.js');
  const j = await (await GET(new Request('https://x/api/obrolan?kendali=1'))).json();
  assert.ok(j.kendali && typeof j.kendali === 'object');
});
