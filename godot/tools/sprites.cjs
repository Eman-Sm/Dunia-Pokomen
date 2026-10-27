// Pre-render creature sprites for the desktop / video build of the Godot world.
// Pixel-art style: only creature.js (no creature-hd.js), so every tier stays pixel art.
// The web build does not need this: the page draws sprites live with creature.js.
// usage: node godot/tools/sprites.cjs   (reads godot/data/dunia.json, writes godot/data/spr/*.png + meta.json)
// To refresh dunia.json from the live site: save https://dunia-pokomen.vercel.app/api/dunia as godot/data/dunia.json
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..'); const PUB = path.join(ROOT, '..', 'public');
(async () => {
  const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/dunia.json'), 'utf8'));
  const W = D.warga.filter((w) => !w.mati);
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent('<html><body></body></html>');
  for (const f of ['creature.js']) await p.addScriptTag({ content: fs.readFileSync(path.join(PUB, f), 'utf8') });
  const out = await p.evaluate((W) => {
    const r = {};
    for (const w of W) {
      const c = window.Creature.make(w); r[w.u] = { url: c.toDataURL(), px: c.px || 1, grow: c.grow || 1, hd: !!c.hd };
      // tier-below version for evolution moments in videos
      if (w.tier > 0) { const c2 = window.Creature.make({ ...w, tier: w.tier - 1 }); r[w.u + '#prev'] = { url: c2.toDataURL(), px: c2.px || 1, grow: c2.grow || 1, hd: !!c2.hd }; }
    }
    return r;
  }, W);
  const dir = path.join(ROOT, 'data/spr'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const meta = {};
  for (const [k, v] of Object.entries(out)) {
    const file = k.replace(/[^a-z0-9#]/gi, '_').replace('#', '__') + '.png';
    fs.writeFileSync(path.join(dir, file), Buffer.from(v.url.split(',')[1], 'base64'));
    meta[k] = { file, px: v.px, grow: v.grow, hd: v.hd };
  }
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta));
  console.log(Object.keys(meta).length, 'sprites'); await b.close();
})();
