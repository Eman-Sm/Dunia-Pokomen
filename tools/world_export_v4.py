# Web world v4 (27 Okt malam): wilayah 1-3 sama besar (r=12 seperti Wilayah 3), berpagar + gerbang + jalan setapak,
# Balai Warga pindah ke Pusat Koloni.
# Web world v2: one open clearing (no plots) where citizens roam, surrounded by dense wilderness.
# Open areas are listed in OPEN_BLOBS so new land (e.g. the east clearing on day 4) can be added later.
import json, math, random, sys
from PIL import Image, ImageDraw
import world_gen as Wd, assets as A

OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/dunia-pokomen/public/assets'
# (centre_i, centre_j, radius_i, radius_j) in tile units
R_WIL = 12.0
def tile_of(x, y): return ((x - 850) / 16 + (y - 804) / 8) / 2, ((y - 804) / 8 - (x - 850) / 16) / 2
CENTRES = {1: tile_of(850, 995), 2: tile_of(1250, 640), 3: tile_of(560, 520)}
REGB = {n: [(c[0], c[1], R_WIL, R_WIL)] for n, c in CENTRES.items()}
PKC = tile_of(880, 740)
PKB = (PKC[0], PKC[1], 5.5, 5.5)
OPEN_BLOBS = [b for v in REGB.values() for b in v] + [PKB]
from PIL import ImageFont
FONTB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 9)
def in_blobs(i, j, blobs, wob=True):
    w = (Wd.n_flower(i * 1.7, j * 1.7) - .5) * .35 if wob else 0
    return any(((i + .5 - ci) / ri) ** 2 + ((j + .5 - cj) / rj) ** 2 < 1 + w for ci, cj, ri, rj in blobs)
def region_of(i, j):
    for n, bl in REGB.items():
        if in_blobs(i, j, bl): return n
    return 0
# dirt path tiles linking Wilayah 1 -> Pusat Koloni -> Wilayah 3
PATH = set(); GATES = {}
def line_tiles(a, b):
    n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1])) * 2) + 1
    for k in range(n + 1):
        t = k / n; PATH.add((math.floor(a[0] + (b[0] - a[0]) * t), math.floor(a[1] + (b[1] - a[1]) * t)))
for n, c in CENTRES.items():
    dx, dy = PKC[0] - c[0], PKC[1] - c[1]; L = math.hypot(dx, dy); ux, uy = dx / L, dy / L
    g = (c[0] + ux * (R_WIL + .4), c[1] + uy * (R_WIL + .4)); GATES[n] = g
    line_tiles((c[0] + ux * 3, c[1] + uy * 3), (PKC[0] - ux * 5, PKC[1] - uy * 5))
HT = (round(PKC[0]) - 1, round(PKC[1]) - 1)
HOUSE_TILES = {(HT[0] + a, HT[1] + b) for a in (0, 1) for b in (0, 1)}

def is_open(i, j):
    w = (Wd.n_flower(i * 1.7, j * 1.7) - .5) * .35
    return any(((i + .5 - ci) / ri) ** 2 + ((j + .5 - cj) / rj) ** 2 < 1 + w for ci, cj, ri, rj in OPEN_BLOBS)

# ground: build with every tile "clear" so nothing is baked; we place our own scenery
tiles = Wd.tile_list()
Wd.CLEAR |= set(tiles)
bases, _dyn = Wd.build()
cv = bases[0].convert('RGBA')
d = ImageDraw.Draw(cv)
rnd = random.Random(21)
K = {t: Wd.kind(*t) for t in tiles}

# darker forest floor outside the clearing, fresh meadow inside
for (i, j) in sorted(tiles, key=lambda t: t[0] + t[1]):
    if K[(i, j)] != 'grass': continue
    x, y = Wd.iso(i, j)
    dia = [(x, y), (x + 16, y + 8), (x, y + 16), (x - 16, y + 8)]
    if is_open(i, j):
        col = (112, 184, 80) if (i + j) % 2 else (105, 176, 75)
        d.polygon(dia, fill=col)
        for _ in range(5):
            px, py = x + rnd.randint(-10, 10), y + rnd.randint(4, 12)
            if abs(px - x) / 16 + abs(py - y - 8) / 8 < .8: d.point((px, py), fill=rnd.choice([(86, 150, 62), (140, 204, 100)]))
        if rnd.random() < .22:
            px, py = x + rnd.randint(-7, 7), y + rnd.randint(5, 11)
            c = rnd.choice([(255, 255, 255), (255, 214, 80), (240, 130, 170), (150, 170, 255)])
            d.point([(px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)], fill=c); d.point((px, py), fill=(255, 200, 60))
    else:
        f = Wd.n_forest(i, j)
        col = (70, 128, 58) if (i + j) % 2 else (66, 122, 55)
        if f > .6: col = tuple(int(c * .9) for c in col)
        d.polygon(dia, fill=col)
        for _ in range(3):
            px, py = x + rnd.randint(-9, 9), y + rnd.randint(5, 11)
            d.point((px, py), fill=(52, 98, 44))

# dirt path + Pusat Koloni plaza
for (i, j) in sorted(tiles, key=lambda t: t[0] + t[1]):
    x, y = Wd.iso(i, j)
    dia = [(x, y), (x + 16, y + 8), (x, y + 16), (x - 16, y + 8)]
    if K[(i, j)] != 'grass': continue
    if in_blobs(i, j, [PKB], False):
        d.polygon(dia, fill=(196, 190, 176) if (i + j) % 2 else (184, 178, 164)); d.line([(x - 16, y + 8), (x, y)], fill=(150, 144, 132))
    elif (i, j) in PATH:
        d.polygon(dia, fill=(200, 150, 96) if (i + j) % 2 else (190, 140, 88))
        for _ in range(3): d.point((x + rnd.randint(-8, 8), y + rnd.randint(5, 11)), fill=(160, 112, 66))
# scenery
items = []
occupied = set()
for (i, j) in tiles:
    k = K[(i, j)]
    if k not in ('grass', 'sand') or (i, j) in HOUSE_TILES or (i, j) in PATH or in_blobs(i, j, [PKB], False): continue
    # keep a mown strip outside each fence and along paths so fences & gates stay visible
    if any(math.hypot(i + .5 - c[0], j + .5 - c[1]) < R_WIL + 2.3 for c in CENTRES.values()) and not is_open(i, j): continue
    if math.hypot(i + .5 - PKC[0], j + .5 - PKC[1]) < 7.5 and not is_open(i, j): continue
    if any((i + a, j + b) in PATH for a in (-1, 0, 1) for b in (-1, 0, 1)): continue
    x, y = Wd.iso(i + .5, j + .5)
    near_water = any(K.get((i + a, j + b), Wd.kind(i + a, j + b)) == 'water' for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    near_road = any(K.get((i + a, j + b), Wd.kind(i + a, j + b)) in ('road', 'bridge') for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    if is_open(i, j):
        # a few shade trees, never next to the hall or the road
        if near_road or any((i + a, j + b) in HOUSE_TILES for a in (-1, 0, 1) for b in (-1, 0, 1)): continue
        r = rnd.random()
        if r < .045: spr = A.tree_round(rnd.randint(0, 99)) if rnd.random() < .7 else A.tree_pine(0)
        elif r < .07: spr = rnd.choice([A.bush(), A.rock(i), A.mushroom()])
        else: continue
        occupied.add((i, j))
        items.append((x + rnd.randint(-3, 3), y + rnd.randint(-1, 1), spr))
        continue
    if k == 'sand':
        if rnd.random() < .06: items.append((x, y, A.rock(i + j)))
        continue
    if near_water and rnd.random() < .35:
        items.append((x, y, A.reeds())); continue
    if near_road and rnd.random() < .5:
        if rnd.random() < .3: items.append((x, y, A.bush()))
        continue
    r = rnd.random()
    if r < .86:
        f = Wd.n_forest2(i, j)
        spr = A.tree_pine(0) if (f > .55 or rnd.random() < .3) else A.tree_round(rnd.randint(0, 99))
        items.append((x + rnd.randint(-4, 4), y + rnd.randint(-2, 2), spr))
        if rnd.random() < .35:  # undergrowth
            items.append((x + rnd.randint(-8, 8), y + rnd.randint(2, 5), rnd.choice([A.bush(), A.mushroom()])))
    elif r < .93:
        items.append((x, y, rnd.choice([A.bush(), A.stump(), A.mushroom(), A.rock(i)])))

def board(text):
    tw = int(ImageDraw.Draw(Image.new('L', (1, 1))).textlength(text, font=FONTB)) + 10
    im = Image.new('RGBA', (tw, 28), (0, 0, 0, 0)); g = ImageDraw.Draw(im); g.fontmode = '1'
    g.rectangle((tw // 2 - 1, 12, tw // 2 + 1, 27), fill=(110, 70, 40)); g.rectangle((0, 0, tw - 1, 13), fill=(222, 176, 110))
    g.text((5, 1), text, font=FONTB, fill=(43, 27, 23)); return A.outline(im)
def dummy():
    im = Image.new('RGBA', (14, 24), (0, 0, 0, 0)); g = ImageDraw.Draw(im)
    g.rectangle((6, 9, 7, 23), fill=(120, 80, 44)); g.rectangle((1, 11, 12, 12), fill=(120, 80, 44))
    g.ellipse((2, 1, 11, 9), fill=(220, 190, 130)); g.rectangle((3, 11, 10, 19), fill=(200, 160, 100)); g.point([(5, 5), (8, 5)], fill=(43, 27, 23)); return A.outline(im)
def fence_seg(p, q, col=(170, 116, 66)):
    """one fence piece: post at p, two rails to q (image anchored at its bottom)"""
    x0, y0 = min(p[0], q[0]) - 3, min(p[1], q[1]) - 15; x1, y1 = max(p[0], q[0]) + 3, max(p[1], q[1]) + 2
    im = Image.new('RGBA', (int(x1 - x0) + 1, int(y1 - y0) + 1), (0, 0, 0, 0)); g = ImageDraw.Draw(im)
    P = (p[0] - x0, p[1] - y0); Q = (q[0] - x0, q[1] - y0)
    for off in (10, 5): g.line((P[0], P[1] - off, Q[0], Q[1] - off), fill=(43, 27, 23), width=4); g.line((P[0], P[1] - off, Q[0], Q[1] - off), fill=(214, 160, 100), width=2)
    g.rectangle((P[0] - 2, P[1] - 13, P[0] + 2, P[1]), fill=(43, 27, 23)); g.rectangle((P[0] - 1, P[1] - 12, P[0] + 1, P[1] - 1), fill=col)
    g.point((P[0], P[1] - 12), fill=(230, 180, 120))
    return im, x0, y1
def gerbang(text):
    im = Image.new('RGBA', (74, 58), (0, 0, 0, 0)); g = ImageDraw.Draw(im); g.fontmode = '1'
    for x in (6, 62): g.rectangle((x, 14, x + 6, 57), fill=(140, 92, 50)); g.line((x, 14, x, 57), fill=(110, 70, 40)); g.rectangle((x - 1, 52, x + 7, 57), fill=(120, 120, 130))
    g.rectangle((0, 8, 73, 22), fill=(150, 98, 56)); g.rectangle((0, 8, 73, 10), fill=(190, 134, 80)); g.rectangle((0, 22, 73, 24), fill=(110, 70, 40))
    tw = g.textlength(text, font=FONTB); g.rectangle((37 - tw / 2 - 4, 10, 37 + tw / 2 + 4, 21), fill=(232, 208, 160)); g.text((37 - tw / 2, 10), text, font=FONTB, fill=(43, 27, 23))
    for x in (9, 65): g.polygon([(x - 4, 8), (x, 0), (x + 4, 8)], fill=(214, 70, 60))
    return A.outline(im)
FENCE = {}
for n, c in CENTRES.items():
    gx, gy = GATES[n]; pts = []; N = 72
    gang = math.atan2(gy - c[1], gx - c[0])
    for q in range(N):
        a_ = q / N * 2 * math.pi
        if abs((a_ - gang + math.pi) % (2 * math.pi) - math.pi) < .2: pts.append(None); continue  # gate opening
        ti, tj = c[0] + (R_WIL + .4) * math.cos(a_), c[1] + (R_WIL + .4) * math.sin(a_)
        k_ = K.get((math.floor(ti), math.floor(tj)), Wd.kind(math.floor(ti), math.floor(tj)))
        pts.append(('road' if k_ in ('road', 'bridge') else None) if k_ in ('water', 'road', 'bridge') else Wd.iso(ti, tj))
    # extra gates where an old road crosses the fence
    q = 0
    while q < N:
        if pts[q] == 'road':
            e = q
            while e + 1 < N and pts[e + 1] == 'road': e += 1
            mid = (q + e) / 2 / N * 2 * math.pi
            gi, gj = c[0] + (R_WIL + .4) * math.cos(mid), c[1] + (R_WIL + .4) * math.sin(mid)
            gxp2, gyp2 = Wd.iso(gi, gj); items.append((gxp2, gyp2 + 6, gerbang(f'WILAYAH {n}')))
            q = e + 1
        else: q += 1
    pts = [p if p != 'road' else None for p in pts]
    FENCE[str(n)] = [list(p) if p else None for p in pts]
    for q in range(N):
        p, r_ = pts[q], pts[(q + 1) % N]
        if p and r_:
            im, x0, y1 = fence_seg(p, r_); items.append((x0 + im.width // 2, y1 - 2, im))
    gxp, gyp = Wd.iso(gx, gy); items.append((gxp, gyp + 6, gerbang(f'WILAYAH {n}')))
def dummy():
    im = Image.new('RGBA', (14, 24), (0, 0, 0, 0)); g = ImageDraw.Draw(im)
    g.rectangle((6, 9, 7, 23), fill=(120, 80, 44)); g.rectangle((1, 11, 12, 12), fill=(120, 80, 44))
    g.ellipse((2, 1, 11, 9), fill=(220, 190, 130)); g.rectangle((3, 11, 10, 19), fill=(200, 160, 100)); g.point([(5, 5), (8, 5)], fill=(43, 27, 23)); return A.outline(im)
for di, dj in ((3.0, -1.5), (3.8, -0.5), (2.2, -0.2)):
    x, y = Wd.iso(PKC[0] + di, PKC[1] + dj); items.append((x, y + 8, dummy()))
x, y = Wd.iso(PKC[0] - 2.6, PKC[1] + 2.2); items.append((x, y + 8, board('PUSAT KOLONI')))
x, y = Wd.iso(PKC[0] + 3.4, PKC[1] - 2.6); items.append((x, y + 8, board('TEMPAT LATIHAN')))
hs, ha = Wd.house_sprite()
hx, hy = Wd.iso(*HT)
items.append((hx, hy + 16, None))
for x, y, im in sorted(items, key=lambda t: t[1]):
    if im is None: cv.alpha_composite(hs, (int(hx - ha[0]), int(hy - ha[1]))); continue
    cv.alpha_composite(im, (int(x - im.width // 2), int(y - im.height + 2)))
cv.convert('RGB').save(f'{OUT}/world.png', optimize=True)

# walkable tiles inside the clearing (centres), away from trees, the hall and water
walk = []
for (i, j) in tiles:
    if not is_open(i, j) or K[(i, j)] not in ('grass', 'road') or in_blobs(i, j, [PKB], False): continue
    if (i, j) in occupied or (3 <= i <= 7 and 3 <= j <= 7): continue  # keep the hall and its porch clear
    if any(Wd.kind(i + a, j + b) == 'water' for a in (-1, 0, 1) for b in (-1, 0, 1)): continue
    x, y = Wd.iso(i + .5, j + .5)
    if 40 < x < Wd.W - 40 and 60 < y < Wd.H - 40: walk.append([round(x), round(y)])
# homes: 50 per wilayah, spread by farthest-point order inside each region; overflow goes to Wilayah 1..3
def homes_in(cands, start_xy, n):
    rest = cands[:]; out = []
    if not rest: return out
    start = min(rest, key=lambda p: dist(p, start_xy)); out.append(start); rest.remove(start)
    best = {tuple(p): dist(p, start) for p in rest}
    while rest and len(out) < n:
        p = max(rest, key=lambda q: best[tuple(q)]); out.append(p); rest.remove(p)
        for q in rest: best[tuple(q)] = min(best[tuple(q)], dist(q, p))
    return out
def dist(p, q): return math.hypot(p[0] - q[0], (p[1] - q[1]) * 2)
RTILE = {}
for (i, j) in tiles:
    x, y = Wd.iso(i + .5, j + .5)
    if [round(x), round(y)] in walk: RTILE[(round(x), round(y))] = region_of(i, j)
by_reg = {n: [p for p in walk if RTILE.get(tuple(p)) == n] for n in REGB}
centre = {n: Wd.iso(*c) for n, c in CENTRES.items()}
spots = []
for n in (1, 2, 3): spots += homes_in(by_reg[n], centre[n], 50)
for k in range(100): spots.append(spots[(k % 3) * 50 + 25 + k // 3 % 25])  # overflow (until Wilayah 4/5 open)
homes = spots
REGION_POS = {str(n): list(centre[n]) for n in REGB}
json.dump({'w': Wd.W, 'h': Wd.H, 'center': list(Wd.iso(*PKC)), 'walk': walk, 'spots': homes, 'open': OPEN_BLOBS, 'wilayah': REGION_POS, 'pk': list(Wd.iso(*PKC)),
           'lights': [[hx + 12, hy + 10, 26], [hx - 14, hy + 16, 18]], 'balai': [hx, hy], 'pagar': FENCE, 'gerbang': {str(n): list(Wd.iso(*g)) for n, g in GATES.items()}}, open(f'{OUT}/world.json', 'w'))
print('walk tiles', len(walk), 'items', len(items))
