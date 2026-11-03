import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
globalThis.fetch = async () => new Response('{}');
const { processComment, newWarga } = await import('../lib/rules.js');
const { setJSON, redis } = await import('../lib/db.js');
const F = await import('../lib/fasilitas.js');
const E = await import('../lib/ekonomi.js');
const { parseComment } = await import('../lib/parse.js');

test('Tebak fasilitas: tebakan sebelum dibuka, hadiah untuk yang benar, sekali saja', async () => {
  await redis('SET', 'tier_schema', '6'); await redis('SET', 'evolusi_cerita_1', '1');
  for (const [u, nama, spot] of [['ani', 'Ani', 1], ['budi', 'Budi', 2], ['cici', 'Cici', 3]]) await setJSON('warga', u, newWarga({ username: u, nama, hewan: ['Kucing'], spot }));
  assert.equal(parseComment('Tebak: kolam renang').tebak, 'Kolam Renang'.replace('Kolam Renang', 'kolam renang'));
  const oase = F.JADWAL.find((f) => f.id === 'oase');
  const sebelum = new Date(oase.buka - 3600e3).toISOString();
  const k = (id, u, text, t = sebelum) => processComment({ id, username: u, text, mediaId: 'm', timestamp: t });
  assert.equal(await k('t1', 'ani', 'Tebak: kolam minum'), 'tebak');
  assert.equal(await k('t2', 'budi', 'Tebak: bioskop'), 'tebak');
  assert.equal(await k('t3', 'cici', 'Tebak: perpustakaan'), 'tebak');
  assert.equal(await k('t4', 'cici', 'Tebak: danau'), 'tebak'); // tebakan terakhir yang dihitung
  assert.equal(await k('t5', 'orang', 'Tebak: kolam'), 'tebak:bukan-warga');
  assert.equal(F.publik(oase.buka - 1000).tebak.petunjuk, oase.petunjuk);
  oase.siap = true;
  const umum = [];
  const r = await F.umumkanYangBaru({ now: oase.buka + 1000, umumkan: async (t) => umum.push(t), bonus: (u, n) => E.bonusBiji(u, n) });
  const ro = r.find((x) => x.id === 'oase');
  assert.deepEqual(ro.benar.sort(), ['Ani', 'Cici']); assert.equal(ro.tebakan, 3);
  assert.equal((await E.saldo('ani')).biji, F.HADIAH_TEBAK); assert.equal((await E.saldo('budi')).biji, 0);
  assert.ok(umum.some((t) => /FASILITAS BARU: Oase Pokomen/.test(t)) && umum.some((t) => /Tebakan benar: 2 dari 3/.test(t)));
  assert.equal((await F.umumkanYangBaru({ now: oase.buka + 5000 })).length, 0); // sekali saja
  assert.ok(F.publik(oase.buka + 1000).dibangun.some((f) => f.id === 'tereuma'));
  oase.siap = false;
});
