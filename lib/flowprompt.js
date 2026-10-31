// ============================================================
//  PROMPT GOOGLE FLOW (Veo) untuk replay duel Arena — gaya anime Jepang, untuk YouTube.
//  Dibuat otomatis dari data duel (gerak per ronde) + rupa kedua hewan.
//  Instruksi berbahasa Indonesia, prompt per klip berbahasa Inggris (Veo paling akurat).
// ============================================================
const HEWAN = {
  naga: 'dragon', dragon: 'dragon', singa: 'lion', kucing: 'cat', elang: 'eagle', harimau: 'tiger', macan: 'tiger', serigala: 'wolf',
  rubah: 'fox', kelinci: 'rabbit', phoenix: 'phoenix', unicorn: 'unicorn', unikon: 'unicorn', kuda: 'horse', gagak: 'crow', ular: 'snake',
  burung: 'bird', beruang: 'bear', panda: 'panda', monyet: 'monkey', kera: 'ape', 'kura-kura': 'turtle', 'kura kura': 'turtle', ayam: 'chicken',
  bebek: 'duck', hamster: 'hamster', axolotl: 'axolotl', axolot: 'axolotl', dino: 'dinosaur', dinosaurus: 'dinosaur', 't-rex': 'T-rex', trex: 'T-rex',
  spinosaurus: 'spinosaurus', sapi: 'cow', kambing: 'goat', domba: 'sheep', gajah: 'elephant', badak: 'rhino', cheetah: 'cheetah', leopard: 'leopard',
  'macan tutul': 'leopard', komodo: 'komodo dragon', buaya: 'crocodile', ikan: 'fish', 'kupu-kupu': 'butterfly', 'kupu kupu': 'butterfly', rusa: 'deer',
  koala: 'koala', platipus: 'platypus', onta: 'camel', unta: 'camel', rajawali: 'hawk', garuda: 'garuda bird', hydra: 'hydra', pinguin: 'penguin',
  penguin: 'penguin', gorila: 'gorilla', gorilla: 'gorilla', kalajengking: 'scorpion', jamur: 'mushroom', 'ubur ubur': 'jellyfish', 'ubur-ubur': 'jellyfish',
  robot: 'robot', kerbau: 'water buffalo', bunglon: 'chameleon', anjing: 'dog', landak: 'hedgehog', rangkong: 'hornbill', cendrawasih: 'bird-of-paradise',
  bison: 'bison', banteng: 'bull', kudanil: 'hippo', jerapah: 'giraffe', hiu: 'shark', paus: 'whale', gurita: 'octopus', tentakel: 'tentacles',
  pikachu: 'electric mouse', tupai: 'squirrel', 'burung hantu': 'owl',
};
const WARNA = { putih: 'white', hitam: 'black', merah: 'red', biru: 'blue', hijau: 'green', kuning: 'yellow', emas: 'golden', ungu: 'purple', oren: 'orange', oranye: 'orange', jingga: 'orange', pink: 'pink', abu: 'gray', 'abu-abu': 'gray', perak: 'silver', coklat: 'brown', cokelat: 'brown', albino: 'albino white' };
const ELEMEN = { api: 'fire', air: 'water', petir: 'lightning', listrik: 'electric', es: 'ice', angin: 'wind', tanah: 'earth', daun: 'leaf and nature', cahaya: 'holy light', kegelapan: 'darkness', bayangan: 'shadow', kristal: 'crystal', radioaktif: 'radioactive green', galaksi: 'cosmic galaxy', telepati: 'psychic', kabut: 'mist', badai: 'storm', peledak: 'explosive', 'batu elektro': 'electric stone' };
const TINGKAT = [
  'a small cute baby creature',
  'a young creature with bright eyes',
  'an evolved creature',
  'a powerful evolved creature wearing light silver chest armor',
  'a legendary creature wearing a flowing royal cape with golden accents',
  'a divine god-form creature floating in the air with a golden halo and cosmic particles',
];

function en(teks, kamus) {
  let t = ' ' + String(teks || '').toLowerCase().replace(/[()]/g, ' ') + ' ';
  const keys = Object.keys(kamus).filter((k) => !k.endsWith('_')).sort((a, b) => b.length - a.length);
  for (const k of keys) t = t.replace(new RegExp(`(^|[^a-z])${k.replace(/[-]/g, '\\-')}(?=[^a-z]|$)`, 'g'), `$1${kamus[k]}`);
  return t.replace(/\s+/g, ' ').trim();
}
function rupa(w) {
  // "Naga Hitam" -> "black dragon": warna dipindah ke depan, lalu nama hewan diterjemahkan
  const satu = (h) => { const kata = String(h).toLowerCase().split(/\s+/); const warna = kata.filter((k) => WARNA[k]).map((k) => WARNA[k]); const sisa = kata.filter((k) => !WARNA[k]).join(' '); return [...warna, en(sisa, HEWAN)].join(' ').trim(); };
  const bagian = (Array.isArray(w.hewan) ? w.hewan : [w.hewan]).filter(Boolean).map(satu);
  const gabung = bagian.length > 1 ? `a ${bagian.join(' and ')} hybrid` : `a ${bagian[0] || 'creature'}`;
  const el = w.elemen ? en(w.elemen, ELEMEN) : null;
  return `${String(w.nama).toUpperCase()}, ${gabung}, ${TINGKAT[Math.max(0, Math.min(5, w.tier || 0))]}${el ? `, surrounded by a glowing ${el} aura` : (w.tier || 0) >= 2 ? ', surrounded by a soft glowing aura' : ''}`;
}
function jurusEN(w, j) {
  const el = w.elemen ? en(w.elemen, ELEMEN) : null;
  return el ? `a ${el} special attack` : 'a powerful special attack';
}

/** Pick 3–4 key moments from the move list. */
function momen(d) {
  const g = d.gerak || [];
  const out = [];
  const pertama = g.find((x) => !x.hindar);
  if (pertama) out.push({ jenis: 'serang', x: pertama });
  const hindar = g.find((x) => x.hindar);
  if (hindar) out.push({ jenis: 'hindar', x: hindar });
  const kritis = g.find((x) => x.kritis && x !== pertama);
  if (kritis) out.push({ jenis: 'kritis', x: kritis });
  const akhir = [...g].reverse().find((x) => !x.hindar && x.p === d.menang);
  if (akhir && !out.some((o) => o.x === akhir)) out.push({ jenis: 'akhir', x: akhir });
  return out.slice(0, 4);
}

export function promptFlow(d, A, B, { rasio = '9:16' } = {}) {
  const tegak = rasio === '9:16';
  const R = tegak ? 'vertical 9:16' : 'widescreen 16:9';
  const GAYA = `Japanese anime style, high-budget shonen battle anime, cel-shaded characters with sharp line art, sakuga-quality fluid animation, impact frames, speed lines, glowing particle effects, dynamic camera, ${R}, no text, no subtitles, no logos.`;
  const by = { [A.username || A.u]: A, [B.username || B.u]: B };
  const W = by[d.menang], K = by[d.kalah];
  const desk = (w) => rupa(w);
  const ARENA = 'a grand circular stone arena in the middle of a cozy forest village, wooden fences and pine trees around it, cute animal spectators cheering on wooden stands';
  const klip = [];
  klip.push({ judul: 'Pertemuan di Arena', teks: `${GAYA} ${ARENA}, bright daylight. On the left, ${desk(A)}, steps into the arena with a determined look. On the right, ${desk(B)}, appears ready to fight. Wind blows dust between them, camera starts wide then pushes in on each face, eyes glinting. Epic orchestral build-up with taiko drums, crowd roar.` });
  for (const m of momen(d)) {
    const P = by[m.x.p], L = by[m.x.l];
    if (m.jenis === 'hindar') klip.push({ judul: `${L.nama} menghindar`, teks: `${GAYA} In the stone arena, ${desk(P)}, lunges forward with a fast attack, but ${desk(L)}, dodges at the last moment in slow motion, leaving an afterimage, then lands lightly. Crowd gasps. Sound: whoosh, near miss, crowd "ooh".` });
    else if (m.jenis === 'kritis') klip.push({ judul: `Serangan KRITIS ${P.nama}`, teks: `${GAYA} In the stone arena, ${desk(P)}, charges up ${jurusEN(P, m.x.jurus)}, glowing brighter and brighter, then unleashes it in a devastating critical hit on ${desk(L)}, who is blasted back across the arena floor. Freeze-frame impact flash, screen shake, shockwave ring. Sound: rising energy hum, massive impact boom, crowd explodes.` });
    else if (m.jenis === 'akhir') klip.push({ judul: `Serangan terakhir ${P.nama}`, teks: `${GAYA} Climax: ${desk(P)}, leaps high against the sun and dives down with ${jurusEN(P, m.x.jurus)} as a finishing move. A huge burst of light and a shockwave explode across the arena. ${desk(L)}, is knocked down, dizzy with cartoon stars, defeated but unharmed. Sound: roaring charge, colossal impact, crowd explosion.` });
    else klip.push({ judul: `Serangan pertama ${P.nama}`, teks: `${GAYA} In the stone arena, ${desk(P)}, dashes forward in a blur and strikes first with ${m.x.jurus ? jurusEN(P, m.x.jurus) : 'a fast claw slash'}, hitting ${desk(L)}, who slides back but stays standing. Dramatic slow motion at the moment of impact, then speed ramp. Sound: whoosh, heavy hit, crowd cheer.` });
  }
  klip.push({ judul: `${W.nama} menang!`, teks: `${GAYA} Triumphant ending: ${desk(W)}, stands victorious in the center of the arena and roars to the sky, golden sparkles and confetti raining down, the cute animal spectators cheering and waving flags. In the background ${desk(K)}, gets up, smiles and gives a friendly respectful nod. Slow orbiting camera ending on a heroic low-angle pose. Sound: victory fanfare, crowd cheering.` });

  const hp = (u) => d.sisa?.[u] ?? '?';
  const teksLayar = [
    `ARENA POKOMEN · ${A.nama} (@${A.username || A.u}) VS ${B.nama} (@${B.username || B.u})`,
    ...momen(d).map((m) => m.x.hindar ? `MENGHINDAR!` : `${m.x.kritis ? 'KRITIS! ' : ''}${m.x.jurus ? m.x.jurus.toUpperCase() + ' ' : ''}-${m.x.dmg}`),
    `${W.nama.toUpperCase()} MENANG! · ${d.ronde} ronde · sisa Nyawa ${hp(d.menang)}/${d.nyawa?.[d.menang] ?? '?'} · Mau duel? komen "Tantang: nama hewan"`,
  ];
  const lines = [
    `PROMPT GOOGLE FLOW — Replay Arena Pokomen`,
    `${A.nama} (@${A.username || A.u}) vs ${B.nama} (@${B.username || B.u}) · pemenang: ${W.nama} · ${klip.length} klip × 8 detik · ${R}`,
    ``,
    `CARA PAKAI`,
    `1. Di Google Flow pilih "Ingredients to Video", unggah kartu warga ${A.nama} dan ${B.nama} sebagai bahan supaya rupanya konsisten.`,
    `2. Rasio ${tegak ? '9:16 (YouTube Shorts)' : '16:9 (video YouTube biasa)'}, model Veo 3 (sudah ada suara efek).`,
    `3. Salin satu prompt per klip, generate 2–4 variasi, pilih yang terbaik, lalu sambung di Scenebuilder/CapCut.`,
    `4. Tulisan (nama, angka -damage, KRITIS!, MENANG!) ditambahkan saat editing, karena teks buatan AI sering rusak.`,
    ``,
  ];
  klip.forEach((k, i) => lines.push(`KLIP ${i + 1} (${i * 8}–${i * 8 + 8} dtk): ${k.judul}`, k.teks, ''));
  lines.push('TEKS UNTUK DITAMBAHKAN SAAT EDITING', ...teksLayar.map((t, i) => `- Klip ${i === 0 ? 1 : i === teksLayar.length - 1 ? klip.length : i + 1}: ${t}`), '',
    `JUDUL YOUTUBE: ${A.nama} vs ${B.nama} — Duel Arena Pokomen! #shorts`,
    `DESKRIPSI: Replay duel Arena Pokomen: ${A.nama} (@${A.username || A.u}) melawan ${B.nama} (@${B.username || B.u}). Pemenang: ${W.nama} dalam ${d.ronde} ronde! Mau hewanmu bertanding? Follow @duniapokomen di Instagram, tulis hewanmu di kolom komentar, lalu tantang hewan lain di Arena. #duniapokomen #anime #pokomen`);
  return lines.join('\n');
}
