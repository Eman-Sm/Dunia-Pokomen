// Minimal Upstash Redis REST client (no dependencies).
// Works with the env vars created by the Upstash integration on Vercel
// (UPSTASH_REDIS_REST_URL / _TOKEN) or the legacy KV names (KV_REST_API_URL / _TOKEN).

// Find the REST URL/token whatever prefix the Vercel integration used
// (UPSTASH_REDIS_REST_URL, KV_REST_API_URL, or a custom prefix like MYDB_KV_REST_API_URL).
function findEnv(suffixes) {
  for (const s of suffixes) if (process.env[s]) return process.env[s];
  for (const [k, v] of Object.entries(process.env)) if (v && suffixes.some((s) => k.endsWith('_' + s))) return v;
  return null;
}
const URL_ = findEnv(['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL']);
const TOKEN = findEnv(['UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN']);

let memory = null; // in-memory fallback for local tests (POKOMEN_MEMORY_DB=1)

function mem() {
  if (!memory) memory = { h: new Map(), s: new Map(), k: new Map(), l: new Map() };
  return memory;
}

async function memCmd([cmd, ...a]) {
  const m = mem();
  const H = (k) => { if (!m.h.has(k)) m.h.set(k, new Map()); return m.h.get(k); };
  const S = (k) => { if (!m.s.has(k)) m.s.set(k, new Set()); return m.s.get(k); };
  const L = (k) => { if (!m.l.has(k)) m.l.set(k, []); return m.l.get(k); };
  switch (cmd.toUpperCase()) {
    case 'GET': return m.k.has(a[0]) ? m.k.get(a[0]) : null;
    case 'SET': { if (a.map((x) => String(x).toUpperCase()).includes('NX') && m.k.has(a[0])) return null; m.k.set(a[0], String(a[1])); return 'OK'; }
    case 'DEL': { let n = 0; for (const k of a) { for (const st of [m.k, m.h, m.s, m.l]) if (st.delete(k)) n++; } return n; }
    case 'INCR': { const v = Number(m.k.get(a[0]) || 0) + 1; m.k.set(a[0], String(v)); return v; }
    case 'HGET': return H(a[0]).has(a[1]) ? H(a[0]).get(a[1]) : null;
    case 'HSET': { const h = H(a[0]); for (let i = 1; i < a.length; i += 2) h.set(a[i], String(a[i + 1])); return 1; }
    case 'HDEL': return H(a[0]).delete(a[1]) ? 1 : 0;
    case 'HGETALL': { const out = []; for (const [k, v] of H(a[0])) out.push(k, v); return out; }
    case 'HLEN': return H(a[0]).size;
    case 'SADD': { const s = S(a[0]); let n = 0; for (const v of a.slice(1)) if (!s.has(v)) { s.add(v); n++; } return n; }
    case 'SISMEMBER': return S(a[0]).has(a[1]) ? 1 : 0;
    case 'LPUSH': { const l = L(a[0]); l.unshift(...a.slice(1).reverse()); return l.length; }
    case 'LRANGE': { const l = L(a[0]); const e = Number(a[2]) < 0 ? l.length + Number(a[2]) + 1 : Number(a[2]) + 1; return l.slice(Number(a[1]), e); }
    case 'LTRIM': { const l = L(a[0]); const e = Number(a[2]) < 0 ? l.length + Number(a[2]) + 1 : Number(a[2]) + 1; m.l.set(a[0], l.slice(Number(a[1]), e)); return 'OK'; }
    case 'LREM': { const l = L(a[0]); const before = l.length; m.l.set(a[0], l.filter((x) => x !== a[2])); return before - m.l.get(a[0]).length; }
    default: throw new Error('memdb: unsupported ' + cmd);
  }
}

export async function redis(...command) {
  if (process.env.POKOMEN_MEMORY_DB === '1') return memCmd(command.map(String));
  if (!URL_ || !TOKEN) throw new Error('Database belum disambungkan. Hubungkan Upstash Redis di tab Storage Vercel lalu redeploy.');
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command.map(String)),
  });
  const j = await r.json();
  if (j.error) throw new Error('Redis: ' + j.error);
  return j.result;
}

export async function getJSON(key, field) {
  const v = field === undefined ? await redis('GET', key) : await redis('HGET', key, field);
  return v ? JSON.parse(v) : null;
}

export async function setJSON(key, field, value) {
  return redis('HSET', key, field, JSON.stringify(value));
}

export async function hgetallJSON(key) {
  const arr = (await redis('HGETALL', key)) || [];
  const out = [];
  for (let i = 0; i < arr.length; i += 2) {
    try { out.push(JSON.parse(arr[i + 1])); } catch { /* skip */ }
  }
  return out;
}

export function _resetMemory() { memory = null; }
