import test from 'node:test';
import assert from 'node:assert/strict';
process.env.POKOMEN_MEMORY_DB = '1';
process.env.GEMINI_API_KEY = 'k';
process.env.GEMINI_DAILY_LIMIT = '2';
const IMG = 'A'.repeat(200);
let mode = 'classic'; const calls = [];
globalThis.fetch = async (url, opt) => {
  calls.push(String(url));
  if (String(url).includes(':generateContent')) {
    if (mode === 'classic') return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: IMG } }] } }] }));
    return new Response(JSON.stringify({ error: { message: 'use interactions' } }), { status: 400 });
  }
  if (String(url).endsWith('/interactions')) return new Response(JSON.stringify({ steps: [{ type: 'model_output', content: [{ type: 'image', data: IMG, mime_type: 'image/jpeg' }] }] }));
  return new Response('{}', { status: 404 });
};
const { generateArt, quota } = await import('../lib/gemini.js');

test('generateContent dan fallback Interactions, plus batas harian', async () => {
  const a = await generateArt({ prompt: 'a cute anime creature', ref: 'xx' });
  assert.equal(a.dataUrl, 'data:image/png;base64,' + IMG);
  mode = 'interactions';
  const b = await generateArt({ prompt: 'a cute anime creature' });
  assert.equal(b.dataUrl, 'data:image/jpeg;base64,' + IMG);
  assert.equal((await quota()).left, 0);
  await assert.rejects(generateArt({ prompt: 'again' }), /Batas harian/);
});
