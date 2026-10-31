// Turns a free-text Instagram comment into Pokomen data.
// Recommended format to announce in the videos:
//   Nama: Bolu | Hewan: Kucing + Naga | Cerita: suka menghangatkan air mandi warga
//   Usul: Kolam Minum
// Looser free-form comments are also understood as best as possible, e.g.
//   "Namaku Bolu, kucing + naga. Dia suka tidur di atap Balai Warga"

const clean = (s) => (s || '').replace(/\s+/g, ' ').replace(/^[\s,.:;|\-–—]+|[\s,.:;|\-–—]+$/g, '').trim();
const cap = (s) => clean(s).toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

const LABELS = {
  nama: ['nama hewan', 'nama hewanku', 'namanya', 'nama'],
  hewan: ['gabungan hewan', 'gabungan', 'hewan', 'jenis', 'spesies'],
  elemen: ['elemen', 'element'],
  outfit: ['outfit', 'kostum', 'pakaian', 'baju'],
  wujud: ['wujud dewa', 'mode dewa', 'god mode', 'bentuk dewa', 'wujud'],
  cerita: ['kebiasaan unik', 'kebiasaan', 'cerita', 'kisah', 'story'],
  usul: ['usulan fasilitas', 'usul fasilitas', 'usulan', 'usul'],
  kampanye: ['kampanye', 'visi', 'slogan'],
  skill: ['skill', 'skil', 'jurus', 'kekuatan', 'kemampuan', 'ability'],
  calon: ['calon ketua', 'calon'],
  wilayahNama: ['nama wilayah', 'usul wilayah', 'wilayah'],
  pilih: ['pilih', 'vote', 'coblos', 'pilihanku'],
  cuaca: ['panggil cuaca', 'cuaca'],
  tantang: ['tantang', 'tantangan', 'duel'],
  terima: ['terima tantangan', 'terima'],
};

function labelled(text) {
  const all = [];
  for (const [key, words] of Object.entries(LABELS)) for (const w of words) all.push([key, w]);
  all.sort((a, b) => b[1].length - a[1].length);
  const re = new RegExp('(?:^|[\\s|;,.\\n)\\]!?"\'“”])(' + all.map(([, w]) => w.replace(/ /g, '\\s+')).join('|') + ')(?:\\s*\\d{1,2})?\\s*[:=]', 'giu');
  const hits = [];
  let m;
  while ((m = re.exec(text))) {
    const word = m[1].toLowerCase().replace(/\s+/g, ' ');
    const key = all.find(([, w]) => w === word)[0];
    hits.push({ key, start: m.index, valStart: re.lastIndex });
  }
  const out = {};
  hits.forEach((h, i) => {
    const end = i + 1 < hits.length ? hits[i + 1].start : text.length;
    let v = text.slice(h.valStart, end).split(/\s\|\s|\n/)[0];
    if (!out[h.key]) out[h.key] = clean(v);
  });
  return out;
}

const W2 = '[\\p{L}][\\p{L}\\-]{1,14}(?: [\\p{L}][\\p{L}\\-]{1,14})?';
const STOP = '(?=[,.!?;|\\n]|$|\\s(?:yang|dia|suka|sering|punya|dengan|ya|dong|min|kak|admin|biar|agar|plis|please)\\b)';
const COMBO_RE = new RegExp('(' + W2 + ')\\s*(?:\\+|&)\\s*(' + W2 + '?)(?:\\s*(?:\\+|&)\\s*(' + W2 + '?))?' + STOP, 'iu');
const STOPWORDS = /^(aku|saya|mau|jadi|ingin|pengen|pingin|gabungan|campuran|hewan|wujud|admin|ya|dong|nya|sebuah|seekor)\s+/iu;

function stripLead(s) {
  let prev;
  s = clean(s);
  do { prev = s; s = s.replace(STOPWORDS, ''); } while (s !== prev);
  return s;
}

// A facility suggestion must look like a short facility name, not a sentence.
const USUL_BAD = /\b(aku|saya|gue|gw|kamu|kami|kita|dia|min|admin|kak|dong|deh|nih|ya|yg|yang|biar|agar|supaya|bisa|mau|pengen|ingin|tolong|please|plis|kesepian|sedih|hewanku|hewan saya|untuk|buat|buatkan|bikin|pasti|seru|banget|gimana|kenapa|apa)\b/i;
export function validUsul(s) {
  const t = String(s || '').trim();
  if (!t || t.length > 32) return false;
  if (/[?!\p{Extended_Pictographic}]/u.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length > 4) return false;
  if (!/^[\p{L}\s\-']+$/u.test(t)) return false;
  return !USUL_BAD.test(t);
}

const NW_BAD = /\b(aku|saya|gue|gw|kamu|min|admin|kak|dong|deh|nih|yg|yang|biar|agar|supaya|bisa|mau|pengen|ingin|tolong|please|plis|untuk|buat|bikin|gimana|kenapa|apa)\b/i;
export function validNamaWilayah(s) {
  const t = String(s || '').trim();
  if (t.length < 3 || t.length > 28 || /^\d+$/.test(t)) return false;
  if (!/^[\p{L}\d\s\-']+$/u.test(t) || t.split(/\s+/).length > 4) return false;
  return !NW_BAD.test(t);
}

const LABEL_WORDS = /^(nama|hewan|cerita|elemen|outfit|wujud|usul|jenis|gabungan|skill|skil|jurus)$/i;
export function cleanNama(s) {
  let n = String(s || '').split(/[,.!/|]|\s(?:hewan|jenis|gabungan|cerita)\b/i)[0];
  return cap(n).slice(0, 24) || null;
}
export function cleanHewan(list, nama) {
  const nm = String(nama || '').toLowerCase();
  return (list || [])
    .map((h) => cap(String(h).replace(/\b(hewan|nama|jenis|gabungan)\b/gi, ' ').replace(/\(.*?\)/g, ' ')))
    .filter((h) => h && !LABEL_WORDS.test(h) && h.toLowerCase() !== nm && !(nm && h.toLowerCase().startsWith(nm + ' ')))
    .slice(0, 3);
}
function parseHewan(s) {
  if (!s) return null;
  const parts = s.replace(/\(.*?\)|\(.*$/g, ' ').split(/\s*(?:\+|&|,|\/| x | dan )\s*/iu).map(stripLead).map(cap).filter((p) => p && p.length <= 25 && !LABEL_WORDS.test(p));
  return parts.length ? parts.slice(0, 3) : null;
}

export function parseComment(raw) {
  const text = (raw || '').replace(/[‍️]/g, '').trim();
  const res = { nama: null, hewan: null, cerita: null, usul: null, elemen: null, outfit: null, wujud: null, kampanye: null, skill: null, calon: null, pilih: null, wilayahNama: null, cuaca: null, tantang: null, terima: null };
  if (!text) return res;
  const lab = labelled(text);

  if (lab.nama) res.nama = cleanNama(lab.nama);
  if (lab.hewan) res.hewan = parseHewan(lab.hewan);
  if (lab.cerita) res.cerita = clean(lab.cerita).slice(0, 280);
  if (lab.wilayahNama) { const n = cap(lab.wilayahNama.split(/[,.!?|\n]/)[0]).replace(/^Wilayah\s+(?=\p{L})/u, ''); if (validNamaWilayah(n)) res.wilayahNama = n; else res.wilayahDitolak = clean(lab.wilayahNama).slice(0, 40); }
  if ('calon' in lab) res.calon = clean(lab.calon).slice(0, 100);
  if (lab.pilih) res.pilih = clean(lab.pilih).replace(/^ketua\s+/i, '').slice(0, 40) || null;
  if (lab.kampanye) res.kampanye = clean(lab.kampanye).slice(0, 80);
  if (lab.elemen) res.elemen = cap(lab.elemen.split(/[,.!/]/)[0]).slice(0, 16);
  // outfit custom Legendary: hanya 1 pakaian (outfit lain nanti dijual di Toko)
  if (lab.outfit) res.outfit = clean(lab.outfit).split(/\s*(?:,|;|\+|&|\/|\bdan\b|\bserta\b|\bdengan\b)\s*/i)[0].slice(0, 60) || null;
  if (lab.cuaca) res.cuaca = clean(lab.cuaca).slice(0, 40);
  if (lab.tantang) res.tantang = clean(lab.tantang).replace(/^@/, '').slice(0, 40) || null;
  if (lab.terima != null) res.terima = clean(lab.terima).replace(/^@/, '').slice(0, 40);
  if (lab.wujud) res.wujud = cap(lab.wujud.split(/[,.!]/)[0]).slice(0, 30);
  if (lab.skill) res.skill = clean(lab.skill.split(/[\n|]/)[0]).slice(0, 60);
  if (lab.usul) { const u = cap(lab.usul.split(/[,.|\n]/)[0]); res.usul = validUsul(u) ? u : null; res.usulDitolak = res.usul ? null : clean(lab.usul).slice(0, 60); }

  // ---- free-form fallbacks
  let comboAt = -1;
  if (!res.hewan) {
    const m = text.match(COMBO_RE);
    if (m) { res.hewan = parseHewan([m[1], m[2], m[3]].filter(Boolean).join(' + ')); comboAt = m.index; }
  }
  if (!res.nama) {
    const m = text.match(/(?:namaku|nama aku|nama ku|nama hewanku|namanya|nama saya|^aku|^saya)\s*(?:adalah|:)?\s+(\p{L}[\p{L}\d\-]{1,15})/iu);
    if (m && !/^(mau|ingin|ikut|juga|pengen|pingin|sudah|udah|dong|jadi|baru|suka|punya|bikin|daftar|min|kak|ya)$/i.test(m[1])) res.nama = cap(m[1]);
  }
  if (res.nama && res.hewan && res.hewan[0].toLowerCase().startsWith(res.nama.toLowerCase() + ' ')) {
    res.hewan[0] = cap(res.hewan[0].slice(res.nama.length));
  }
  if (!res.cerita) {
    const m = text.match(/(?:^|[.!?\n]\s*|,\s*|\s(?=dia\s|ia\s))((?:dia|ia|hewanku|\p{Lu}[\p{L}]+)?\s*(?:suka|sering|selalu|hobi|kebiasaannya|kalau|tiap|setiap|paling suka|senang)\b[^\n]{6,})/iu);
    if (m) res.cerita = clean(m[1]).slice(0, 280);
  }
  if (res.nama && res.hewan && res.hewan.some((h) => h.toLowerCase() === res.nama.toLowerCase())) res.nama = null;
  if (res.hewan) { res.hewan = cleanHewan(res.hewan, res.nama); if (!res.hewan.length) res.hewan = null; }
  return res;
}
