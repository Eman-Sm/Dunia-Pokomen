// Local preview: node dev-server.mjs  (uses in-memory DB with sample data, no Instagram needed)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
process.env.POKOMEN_MEMORY_DB = process.env.POKOMEN_MEMORY_DB || '1';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
process.env.IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN || 'dev';
process.env.IG_USERNAME = process.env.IG_USERNAME || 'duniapokomen';
process.env.TRAKTEER_WEBHOOK_TOKEN = process.env.TRAKTEER_WEBHOOK_TOKEN || 'dev';
process.env.TRAKTEER_URL = process.env.TRAKTEER_URL || 'https://trakteer.id/';
const { processComment } = await import('./lib/rules.js');
const routes = { '/api/dunia': await import('./api/dunia.js'), '/api/admin': await import('./api/admin.js'), '/api/webhook': await import('./api/webhook.js'), '/api/trakteer': await import('./api/trakteer.js'), '/api/art': await import('./api/art.js') };
const seed = [
  ['budi', 'Namaku Bolu, Kucing + Naga. Dia suka menghangatkan air mandi warga', 'p1'],
  ['ani', 'Nama: Piyo | Hewan: Ayam + Naga | Cerita: suka tidur di atap Balai Warga', 'p1'],
  ['kiko.id', 'aku Kiko, rubah & ikan, suka berenang di sungai', 'p1'],
  ['momo', 'Nama hewanku Momo kelinci + rusa dia suka makan wortel', 'p1'],
  ['sari', 'aku mau ikut dong min, jadi apa ya', 'p1'],
  ['rina', 'Usul: Kolam Minum', 'p1'],
  ['budi', 'Cerita: Bolu belajar berenang di danau barat', 'p2'],
];
let n = 0;
for (const [u, t, m] of seed) await processComment({ id: 'seed' + n++, username: u, text: t, mediaId: m, timestamp: new Date().toISOString(), likeCount: 5 });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const mod = routes[url.pathname];
  if (mod) {
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b)); });
    const request = new Request(url, { method: req.method, headers: req.headers, body });
    const fn = mod[req.method];
    const out = fn ? await fn(request) : new Response('Method not allowed', { status: 405 });
    res.writeHead(out.status, Object.fromEntries(out.headers)); res.end(Buffer.from(await out.arrayBuffer())); return;
  }
  let p = path.join('public', url.pathname === '/' ? 'index.html' : url.pathname);
  if (!fs.existsSync(p)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('Pokomen dev: http://localhost:' + (process.env.PORT || 3000)));
