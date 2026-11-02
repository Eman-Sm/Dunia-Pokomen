// Reads what a non-citizen comment wants: to register ("daftar") or just to interact ("interaksi").
// Only "daftar" comments that we could not read get the correct registration format as a reply.
const HEWAN = [
  'kucing', 'anjing', 'naga', 'singa', 'harimau', 'macan', 'rubah', 'serigala', 'kelinci', 'panda', 'beruang', 'kuda', 'unicorn', 'pegasus',
  'burung', 'elang', 'garuda', 'gagak', 'merpati', 'kakatua', 'beo', 'ayam', 'bebek', 'angsa', 'ikan', 'hiu', 'paus', 'lumba', 'gurita', 'kepiting',
  'ular', 'kadal', 'komodo', 'iguana', 'kura', 'penyu', 'buaya', 'axolotl', 'katak', 'kodok', 'hamster', 'tikus', 'tupai', 'monyet', 'kera',
  'gorila', 'orangutan', 'rusa', 'domba', 'kambing', 'sapi', 'kerbau', 'babi', 'gajah', 'jerapah', 'zebra', 'badak', 'kudanil', 'lebah', 'kupu',
  'capung', 'semut', 'phoenix', 'feniks', 'pinguin', 'penguin', 'koala', 'kanguru', 'kangguru', 'llama', 'alpaka', 'dino', 'dinosaurus', 'trex',
  'cheetah', 'leopard', 'jaguar', 'hyena', 'musang', 'berang', 'landak', 'kelelawar', 'burung hantu', 'cendrawasih', 'rajawali', 'platipus',
  'cicak', 'tokek', 'bunglon', 'jangkrik', 'belalang', 'kumbang', 'siput', 'bekicot', 'ubur', 'kitsune', 'griffin', 'hydra', 'slime', 'cat', 'dog', 'dragon', 'fox', 'wolf', 'bunny', 'rabbit', 'bear', 'tiger', 'lion',
];
const HEWAN_RE = new RegExp('\\b(' + HEWAN.map((h) => h.replace(/ /g, '\\s+')).join('|') + ')', 'i');
const AKU_RE = /\b(aku|saya|gue|gua|gw|ane|aq|sy|ku|punyaku|punya\s*ku|milikku)\b|\w+ku\b/i;
const DAFTAR_RE = new RegExp([
  'daftar', 'daftarin', 'didaftarin', 'mendaftar', 'pendaftaran', 'registrasi', 'ikut(?:an)?', 'gabung', 'join',
  'adopsi', 'ngadopsi', 'pelihara', 'piara', 'lahirin', 'lahirkan', 'tetasin', 'tetaskan', 'bikinin', 'buatin', 'buatkan', 'bikinkan',
  'masukin', 'masukkan', 'tambahin', '(?:mau|pengen|pingin|ingin|pgn|mo)\\s+(?:punya|ikut|daftar|bikin|buat|jadi\\s+warga)',
  'minta\\s+hewan', 'cara(?:nya)?\\s+(?:ikut|daftar|gabung|biar|supaya|agar|dapat|dapet|punya)', '(?:gimana|bagaimana|gmn|gmna)\\s+cara',
  '(?:bisa|boleh)\\s+(?:ikut|daftar|gabung)', 'hewan\\s*(?:ku|aku|saya|gue|gw)', 'hewanku', 'peliharaanku', 'jadi\\s+warga', 'warga\\s+baru',
  'format(?:nya)?', 'namain', 'namanya',
].map((w) => '\\b' + w + '\\b').join('|'), 'i');

/** 'daftar' | 'interaksi' */
export function niatKomentar(text, parsed = {}) {
  const t = String(text || '').replace(/@[\w.]+/g, ' ').toLowerCase();
  if (parsed.nama || parsed.hewan) return 'daftar';                       // a half-filled registration
  if (/\b(nama|hewan|jenis|gabungan)\s*[:=]/i.test(t)) return 'daftar';   // tried the labelled format
  if (DAFTAR_RE.test(t)) return 'daftar';
  if (HEWAN_RE.test(t) && AKU_RE.test(t)) return 'daftar';                // "aku mau kucing naga", "kucingku si Mochi"
  if (/\b(naga|kucing|anjing|rubah|kelinci|singa|harimau|serigala|unicorn|panda|kuda|burung|ikan)\s*(?:\+|&|x|dan|campur)\s*\p{L}{3,}/iu.test(t)) return 'daftar';
  return 'interaksi';
}

// 2 Nov: daftar otomatis — ambil jenis hewan yang disebut di komentar bebas ("aku mau kucing naga")
const HEWAN_G = new RegExp('\\b(' + HEWAN.map((h) => h.replace(/ /g, '\\s+')).join('|') + ')(?:ku|nya|mu)?\\b', 'gi');
const EN = { cat: 'Kucing', dog: 'Anjing', dragon: 'Naga', fox: 'Rubah', wolf: 'Serigala', bunny: 'Kelinci', rabbit: 'Kelinci', bear: 'Beruang', tiger: 'Harimau', lion: 'Singa', dino: 'Dinosaurus', trex: 'T-Rex', feniks: 'Phoenix', penguin: 'Pinguin', kangguru: 'Kanguru', lumba: 'Lumba-lumba', kupu: 'Kupu-kupu', kura: 'Kura-kura' };
export function cariHewan(text) {
  const t = String(text || '').replace(/@[\w.]+/g, ' ');
  const out = [];
  for (const m of t.matchAll(HEWAN_G)) {
    const k = m[1].toLowerCase().replace(/\s+/g, ' ');
    const nama = EN[k] || k.replace(/(^|\s)\p{L}/gu, (x) => x.toUpperCase());
    if (!out.includes(nama)) out.push(nama);
    if (out.length >= 3) break;
  }
  return out;
}
// ajakan bergabung yang jelas (lebih ketat dari DAFTAR_RE, karena berujung hewan langsung lahir)
export const DAFTAR_KUAT_RE = new RegExp([
  'daftar', 'daftarin', 'didaftarin', 'mendaftar', 'gabung', 'join', 'adopsi', 'ngadopsi', 'lahirin', 'lahirkan', 'tetasin', 'tetaskan',
  'bikinin', 'buatin', 'buatkan', 'bikinkan', 'masukin', 'masukkan', 'tambahin', 'minta\\s+hewan', 'jadi\\s+warga',
  '(?:mau|pengen|pingin|ingin|pgn|mo|boleh|bisa)\\s+(?:punya|ikut|daftar|gabung|join|bikin|buat)', 'ikut(?:an)?\\s+(?:dong|donk|dund|min|kak|ya|daftar|gabung|join)',
  'cara(?:nya)?\\s+(?:ikut|daftar|gabung|join|punya)(?:nya)?', '^\\s*ikut(?:an)?\\s*(?:dong|donk|min|kak|ya)?\\s*[!.🙏]*\\s*$',
].map((w) => '\\b' + w + '\\b').join('|')
, 'i');
