// Reads what a non-citizen comment wants: to register ("daftar") or just to interact ("interaksi").
// Only "daftar" comments that we could not read get the correct registration format as a reply.
const HEWAN = [
  'kucing', 'anjing', 'naga', 'singa', 'harimau', 'macan', 'rubah', 'serigala', 'kelinci', 'panda', 'beruang', 'kuda', 'unicorn', 'pegasus',
  'burung', 'elang', 'garuda', 'gagak', 'merpati', 'kakatua', 'beo', 'ayam', 'bebek', 'angsa', 'ikan', 'hiu', 'paus', 'lumba', 'gurita', 'kepiting',
  'ular', 'kadal', 'komodo', 'iguana', 'kura', 'penyu', 'buaya', 'axolotl', 'katak', 'kodok', 'hamster', 'tikus', 'tupai', 'monyet', 'kera',
  'gorila', 'orangutan', 'rusa', 'domba', 'kambing', 'sapi', 'kerbau', 'babi', 'gajah', 'jerapah', 'zebra', 'badak', 'kudanil', 'lebah', 'kupu',
  'capung', 'semut', 'phoenix', 'feniks', 'pinguin', 'penguin', 'koala', 'kanguru', 'kangguru', 'llama', 'alpaka', 'dino', 'dinosaurus', 'trex',
  'cheetah', 'leopard', 'jaguar', 'hyena', 'musang', 'berang', 'landak', 'kelelawar', 'burung hantu', 'cendrawasih', 'rajawali', 'platipus',
  'kitsune', 'griffin', 'hydra', 'slime', 'cat', 'dog', 'dragon', 'fox', 'wolf', 'bunny', 'rabbit', 'bear', 'tiger', 'lion',
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
