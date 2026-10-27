# Farm-RPG style top-down pixel world for the Godot build (Mode HD + videos).
# Writes godot/data/hd/: ground.png (flat ground), obj/*.png (trees, houses... y-sorted in Godot),
# world.json (spots per wilayah, walk points, objects, lights, regions, landmarks).
# usage: python3 godot/tools/world_hd.py
import json, math, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'data', 'hd'); os.makedirs(os.path.join(OUT, 'obj'), exist_ok=True)
W = H = 1920
rng = random.Random(7); np.random.seed(7)
OL = (43, 27, 23)
FONT = ImageFont.truetype(os.path.join(ROOT, 'data/fonts/DejaVuSans-Bold.ttf'), 9)

# ---------------------------------------------------------------- layout (world px)
BALAI = (960, 930)
REG = {  # wilayah: centre, radius (meadow)
    1: ((960, 1010), 300), 2: ((1640, 1010), 250), 3: ((900, 470), 270), 4: ((980, 1500), 230), 5: ((360, 1000), 240),
}
PK = (960, 700)          # Pusat Koloni plaza
LOKET = (1170, 1240)     # registration hut (Loket Pendaftaran)
RIVER = [(1960, 330), (1700, 430), (1470, 560), (1330, 760), (1290, 1000), (1330, 1250), (1420, 1500), (1520, 1960)]
BRIDGES = [(1292, 1010)]
PATHS = [
    [BALAI, (960, 800), PK, (930, 600), REG[3][0]],
    [BALAI, (1120, 1000), BRIDGES[0], (1460, 1010), REG[2][0]],
    [BALAI, (970, 1200), (990, 1380), REG[4][0]],
    [BALAI, (760, 1000), (560, 1000), REG[5][0]],
    [(970, 1150), (1060, 1210), LOKET],
    [LOKET, (1250, 1450), (1330, 1960)],  # road in from the south
]
FARMS = [(640, 760, 180, 112), (1100, 760, 140, 96), (1560, 760, 150, 96)]  # x, y, w, h (tilled rows)

# ---------------------------------------------------------------- distance helpers
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
def seg_dist(ax, ay, bx, by):
    dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
    t = np.clip(((xx - ax) * dx + (yy - ay) * dy) / (L + 1e-6), 0, 1)
    return np.hypot(xx - (ax + t * dx), yy - (ay + t * dy))
def poly_dist(pts):
    d = np.full((H, W), 1e9, np.float32)
    for a, b in zip(pts, pts[1:]): d = np.minimum(d, seg_dist(*a, *b))
    return d
def smooth_noise(scale, octaves=3):
    out = np.zeros((H, W), np.float32); amp = 1.0
    for o in range(octaves):
        s = max(2, int(W / scale * (2 ** o)))
        g = np.random.rand(s + 1, s + 1).astype(np.float32)
        img = Image.fromarray((g * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
        out += np.asarray(img, np.float32) / 255 * amp; amp *= .5
    return out / out.max()
N1 = smooth_noise(14); N2 = smooth_noise(40, 2); N3 = np.random.rand(H, W).astype(np.float32)

# masks
river_pts = []
for a, b in zip(RIVER, RIVER[1:]):  # densify + wiggle
    for i in range(12):
        t = i / 12; river_pts.append((a[0] + (b[0] - a[0]) * t + math.sin((a[1] + i) * .05) * 10, a[1] + (b[1] - a[1]) * t))
river_pts.append(RIVER[-1])
dr = poly_dist(river_pts) + (N1 - .5) * 14
water = dr < 30
bank = (dr >= 30) & (dr < 34)
lake_c = (700, 1560); dl = np.hypot((xx - lake_c[0]) / 1.4, yy - lake_c[1]) + (N1 - .5) * 26
water |= dl < 110; bank |= (dl >= 110) & (dl < 114)
dp = np.full((H, W), 1e9, np.float32)
for p in PATHS: dp = np.minimum(dp, poly_dist(p))
dp += (N1 - .5) * 6
path = (dp < 11) & ~water
meadow = np.zeros((H, W), bool)
for (c, r) in REG.values(): meadow |= np.hypot(xx - c[0], yy - c[1]) + (N2 - .5) * 90 < r
meadow |= np.hypot(xx - PK[0], yy - PK[1]) < 120
meadow |= dp < 40
dpk = np.hypot(xx - PK[0], (yy - PK[1]) * 1.25)
plaza = dpk < 78
farm = np.zeros((H, W), bool)
for fx, fy, fw, fh in FARMS: farm |= (xx >= fx) & (xx < fx + fw) & (yy >= fy) & (yy < fy + fh)

# ---------------------------------------------------------------- paint ground
img = np.zeros((H, W, 3), np.float32)
G_LIGHT, G_MID, G_DARK = np.array([122, 196, 72]), np.array([104, 178, 62]), np.array([84, 152, 54])
F_FLOOR = np.array([62, 120, 52])
band = np.floor(N1 * 3 + N3 * .35).clip(0, 2)
g = np.where(band[..., None] == 0, G_DARK, np.where(band[..., None] == 1, G_MID, G_LIGHT))
img[:] = g
forest_floor = ~meadow
img[forest_floor] = (F_FLOOR + (N1[forest_floor, None] - .5) * 30)
# soft edge between meadow and forest: dither
edge = meadow & ~np.roll(meadow, 3, 0) | meadow & ~np.roll(meadow, -3, 1)
img[edge & (N3 > .5)] = F_FLOOR + 14
# grass tufts
tuft = (N3 > .985) & meadow
img[tuft] = G_DARK - 16
img[np.roll(tuft, 1, 1) & meadow] = G_DARK - 16
img[np.roll(np.roll(tuft, -1, 0), 1, 1) & meadow] = G_DARK - 6
# dirt path with darker rim
D_BASE = np.array([200, 148, 92]); D_DARK = np.array([168, 116, 70]); D_LIGHT = np.array([222, 176, 116])
img[path] = D_BASE + (N1[path, None] - .5) * 18
rim = (dp >= 9) & (dp < 11) & ~water
img[rim] = D_DARK
img[path & (N3 > .97)] = D_DARK
img[path & (N3 < .02)] = D_LIGHT
# plaza stones
P_BASE = np.array([196, 190, 176])
pl = plaza & ~water
img[pl] = P_BASE + (N3[pl, None] - .5) * 16
grid = ((xx.astype(int) // 12 + (yy.astype(int) // 8) % 2 * 6) % 12 == 0) | (yy.astype(int) % 8 == 0)
img[pl & grid] = P_BASE - 40
img[(dpk >= 78) & (dpk < 81)] = np.array([120, 112, 100])
# farmland rows
T_BASE = np.array([130, 86, 52]); T_DARK = np.array([100, 64, 38])
img[farm] = T_BASE
rows = farm & ((yy.astype(int) % 8) < 3); img[rows] = T_DARK
# water
WB = np.array([60, 140, 220]); WD = np.array([44, 112, 196]); WL = np.array([140, 205, 245])
img[water] = WB
deep = water & ((dr < 18) | (dl < 90)); img[deep] = WD
foam = water & (((dr >= 26) & (dr < 30)) | ((dl >= 104) & (dl < 110)))
img[foam] = WL
ripple = water & ~foam & (np.sin(xx * .25 + yy * .55 + N1 * 12) > .93); img[ripple] = WL - 30
img[bank] = np.array([150, 104, 60]); img[bank & (N3 > .5)] = np.array([118, 80, 46])
ground = Image.fromarray(img.clip(0, 255).astype(np.uint8))
gd = ImageDraw.Draw(ground)
# flowers
fl_cols = [(255, 255, 255), (255, 214, 64), (240, 120, 160), (170, 140, 240)]
for _ in range(2600):
    x, y = rng.randrange(W), rng.randrange(H)
    if meadow[y, x] and not path[y, x] and not water[y, x] and not plaza[y, x] and not farm[y, x]:
        c = rng.choice(fl_cols); gd.point([(x, y), (x + 1, y), (x, y - 1), (x + 1, y - 1)], fill=c); gd.point((x, y + 1), fill=(70, 130, 50))
# crops on the farm rows
for fx, fy, fw, fh in FARMS:
    kind = rng.randrange(3)
    for cy in range(fy + 6, fy + fh - 4, 16):
        for cx in range(fx + 6, fx + fw - 6, 12):
            if kind == 0:   # leafy
                gd.ellipse((cx - 4, cy - 5, cx + 4, cy + 1), fill=(70, 150, 60), outline=(40, 90, 40)); gd.point((cx, cy - 4), fill=(140, 210, 90))
            elif kind == 1:  # corn
                gd.rectangle((cx - 1, cy - 10, cx + 1, cy + 1), fill=(80, 150, 60)); gd.rectangle((cx + 1, cy - 7, cx + 3, cy - 3), fill=(240, 200, 70)); gd.line((cx - 3, cy - 6, cx - 1, cy - 4), fill=(100, 170, 70))
            else:            # sprouts with red fruit
                gd.line((cx, cy, cx, cy - 6), fill=(70, 140, 60)); gd.ellipse((cx - 3, cy - 8, cx + 3, cy - 3), fill=(90, 170, 70)); gd.point((cx + 2, cy - 4), fill=(220, 60, 60))
    gd.rectangle((fx - 3, fy - 3, fx + fw + 2, fy + fh + 2), outline=(120, 84, 52))
# bridge
for bx, by in BRIDGES:
    gd.rectangle((bx - 44, by - 14, bx + 44, by + 14), fill=(160, 110, 62), outline=OL)
    for k in range(-40, 44, 8): gd.line((bx + k, by - 13, bx + k, by + 13), fill=(128, 84, 46))
    gd.rectangle((bx - 44, by - 18, bx + 44, by - 14), fill=(120, 80, 44), outline=OL); gd.rectangle((bx - 44, by + 14, bx + 44, by + 18), fill=(120, 80, 44), outline=OL)
ground.save(os.path.join(OUT, 'ground.png'))

# ---------------------------------------------------------------- object sprites
def outline(im):
    a = np.array(im); al = a[..., 3] > 0
    m = np.zeros_like(al)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): m |= np.roll(np.roll(al, dy, 0), dx, 1)
    o = m & ~al; a[o] = (*OL, 255); return Image.fromarray(a)
def save(name, im): im.save(os.path.join(OUT, 'obj', name + '.png')); return name
def tree(kind, seed):
    r = random.Random(seed)
    if kind == 'pine':
        im = Image.new('RGBA', (30, 44), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rectangle((13, 34, 16, 42), fill=(110, 70, 40))
        for i, (w_, y_) in enumerate(((13, 24), (11, 15), (8, 7))):
            d.polygon([(15 - w_, y_ + 12), (15 + w_, y_ + 12), (15, y_ - 4)], fill=(38, 110, 70) if i % 2 == 0 else (46, 124, 78))
            d.line((15 - w_ + 2, y_ + 11, 15, y_ - 2), fill=(70, 150, 96))
        return outline(im)
    im = Image.new('RGBA', (40, 46), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle((17, 30, 22, 44), fill=(120, 78, 44)); d.line((17, 32, 17, 44), fill=(92, 58, 32)); d.point([(15, 44), (24, 44)], fill=(120, 78, 44))
    base = [(52, 132, 52), (62, 150, 58), (78, 170, 66)] if kind == 'oak' else [(70, 140, 60), (86, 160, 66), (110, 184, 78)]
    blobs = [(20, 17, 15), (10, 22, 9), (30, 22, 9), (20, 8, 10), (13, 11, 8), (27, 11, 8)]
    for (cx, cy, rr) in blobs: d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=base[0])
    for (cx, cy, rr) in blobs: d.ellipse((cx - rr + 2, cy - rr + 1, cx + rr - 3, cy + rr - 4), fill=base[1])
    for (cx, cy, rr) in blobs[3:]: d.ellipse((cx - rr + 3, cy - rr + 2, cx + 2, cy), fill=base[2])
    if kind == 'fruit':
        for _ in range(5): x, y = r.randrange(8, 32), r.randrange(6, 28); d.rectangle((x, y, x + 1, y + 1), fill=(230, 70, 60))
    return outline(im)
def bush(seed):
    im = Image.new('RGBA', (20, 14), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for cx, cy, rr in ((6, 8, 5), (13, 8, 5), (10, 5, 5)): d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=(58, 140, 56))
    for cx, cy in ((8, 4), (13, 6)): d.ellipse((cx - 2, cy - 2, cx + 2, cy + 1), fill=(96, 176, 70))
    if seed % 2: d.point([(5, 7), (14, 9), (10, 3)], fill=(240, 120, 160))
    return outline(im)
def rock():
    im = Image.new('RGBA', (16, 11), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((1, 2, 15, 11), fill=(140, 140, 150)); d.ellipse((3, 2, 11, 7), fill=(176, 176, 186)); return outline(im)
def stump():
    im = Image.new('RGBA', (16, 12), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle((3, 4, 12, 11), fill=(140, 92, 50)); d.ellipse((3, 1, 12, 6), fill=(214, 168, 110)); d.ellipse((6, 2, 9, 5), outline=(160, 110, 60)); return outline(im)
def house(w_, h_, roof, wall=(236, 214, 170), sign=None, door=(120, 70, 40)):
    im = Image.new('RGBA', (w_, h_), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    wy = int(h_ * .48)
    d.rectangle((6, wy, w_ - 7, h_ - 2), fill=wall)
    for y in range(wy + 4, h_ - 2, 6): d.line((6, y, w_ - 7, y), fill=tuple(max(0, c - 22) for c in wall))
    d.polygon([(0, wy + 2), (w_ // 2, 2), (w_ - 1, wy + 2)], fill=roof)
    for k in range(4, wy, 5): d.line((w_ // 2 - k * (w_ / 2) / wy, k + 2, w_ // 2 + k * (w_ / 2) / wy, k + 2), fill=tuple(max(0, c - 30) for c in roof))
    d.rectangle((w_ // 2 - 7, h_ - 20, w_ // 2 + 7, h_ - 2), fill=door); d.point((w_ // 2 + 4, h_ - 11), fill=(255, 214, 64))
    for wx in (14, w_ - 26):
        d.rectangle((wx, wy + 8, wx + 11, wy + 18), fill=(150, 210, 240)); d.line((wx + 5, wy + 8, wx + 5, wy + 18), fill=OL); d.line((wx, wy + 13, wx + 11, wy + 13), fill=OL)
    d.rectangle((w_ - 22, 6, w_ - 15, 18), fill=(150, 90, 70))
    if sign:
        tw_ = d.textlength(sign, font=FONT) + 8
        d.rectangle((w_ // 2 - tw_ / 2, wy - 12, w_ // 2 + tw_ / 2, wy - 1), fill=(222, 176, 110), outline=OL)
        d.fontmode = '1'; d.text((w_ // 2 - tw_ / 2 + 4, wy - 11), sign, font=FONT, fill=OL)
    return outline(im)
def loket():
    im = Image.new('RGBA', (84, 76), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle((6, 30, 78, 74), fill=(150, 98, 56))
    for x in range(6, 78, 6): d.line((x, 30, x, 74), fill=(126, 80, 44))
    d.polygon([(0, 34), (42, 6), (83, 34)], fill=(110, 70, 40))
    for k in range(10, 32, 5): d.line((42 - k * 1.4, 6 + k, 42 + k * 1.4, 6 + k), fill=(90, 56, 30))
    d.rectangle((20, 44, 64, 60), fill=(40, 26, 20)); d.rectangle((16, 60, 68, 64), fill=(200, 150, 90))
    d.fontmode = '1'
    for i, s in enumerate(('LOKET', 'PENDAFTARAN')):
        tw_ = d.textlength(s, font=FONT); d.rectangle((42 - tw_ / 2 - 3, 12 + i * 10, 42 + tw_ / 2 + 3, 21 + i * 10), fill=(232, 208, 160)); d.text((42 - tw_ / 2, 12 + i * 10), s, font=FONT, fill=OL)
    return outline(im)
def board(text):
    tw_ = int(ImageDraw.Draw(Image.new('L', (1, 1))).textlength(text, font=FONT)) + 10
    im = Image.new('RGBA', (tw_, 26), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle((tw_ // 2 - 1, 10, tw_ // 2 + 1, 25), fill=(110, 70, 40)); d.rectangle((0, 0, tw_ - 1, 12), fill=(222, 176, 110))
    d.fontmode = '1'; d.text((5, 1), text, font=FONT, fill=OL); return outline(im)
def throne():
    im = Image.new('RGBA', (30, 36), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle((4, 2, 25, 26), fill=(200, 150, 40)); d.rectangle((7, 5, 22, 24), fill=(170, 40, 50))
    for x in (4, 14, 24): d.polygon([(x - 2, 3), (x, -2), (x + 2, 3)], fill=(255, 214, 64))
    d.rectangle((2, 20, 27, 28), fill=(200, 150, 40)); d.rectangle((5, 28, 8, 35), fill=(150, 104, 30)); d.rectangle((21, 28, 24, 35), fill=(150, 104, 30))
    d.point((14, 8), fill=(120, 200, 255)); return outline(im)
def chest():
    im = Image.new('RGBA', (20, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle((1, 6, 18, 15), fill=(150, 92, 48)); d.rectangle((1, 2, 18, 7), fill=(170, 108, 58)); d.rectangle((1, 7, 18, 8), fill=(255, 205, 50)); d.rectangle((8, 6, 11, 10), fill=(255, 226, 120))
    for gx in (3, 15): d.ellipse((gx - 2, 0, gx + 2, 4), fill=(255, 214, 64))
    return outline(im)
def fence_h():
    im = Image.new('RGBA', (16, 12), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for x in (2, 13): d.rectangle((x - 1, 0, x + 1, 11), fill=(170, 116, 66))
    d.rectangle((0, 3, 15, 4), fill=(190, 134, 80)); d.rectangle((0, 7, 15, 8), fill=(190, 134, 80)); return outline(im)
def lamp():
    im = Image.new('RGBA', (8, 24), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle((3, 6, 4, 23), fill=(70, 60, 60)); d.rectangle((1, 1, 6, 6), fill=(255, 226, 140)); d.rectangle((1, 0, 6, 1), fill=(70, 60, 60)); return outline(im)
def well():
    im = Image.new('RGBA', (28, 30), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((2, 16, 25, 29), fill=(150, 150, 160)); d.ellipse((6, 18, 21, 25), fill=(40, 90, 150))
    d.rectangle((3, 4, 5, 22), fill=(120, 80, 44)); d.rectangle((22, 4, 24, 22), fill=(120, 80, 44)); d.polygon([(0, 6), (13, 0), (27, 6)], fill=(170, 60, 50)); return outline(im)
def dummy():  # training dummy for Tempat Latihan
    im = Image.new('RGBA', (16, 28), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle((7, 10, 8, 27), fill=(120, 80, 44)); d.rectangle((2, 12, 13, 14), fill=(120, 80, 44))
    d.ellipse((3, 1, 12, 10), fill=(220, 190, 130)); d.rectangle((4, 12, 11, 22), fill=(200, 160, 100)); d.point([(6, 5), (9, 5)], fill=OL); return outline(im)

SPR = {}
for k in range(3): SPR[f'oak{k}'] = save(f'oak{k}', tree('oak', k))
SPR['fruit'] = save('fruit', tree('fruit', 9)); SPR['pine'] = save('pine', tree('pine', 0))
SPR['bush0'] = save('bush0', bush(0)); SPR['bush1'] = save('bush1', bush(1)); SPR['rock'] = save('rock', rock()); SPR['stump'] = save('stump', stump())
save('balai', house(96, 84, (192, 64, 52), sign='BALAI WARGA'))
save('rumah_a', house(64, 58, (70, 110, 180))); save('rumah_b', house(64, 58, (190, 120, 50))); save('rumah_c', house(64, 58, (120, 80, 160)))
save('loket', loket()); save('throne', throne()); save('chest', chest()); save('fence', fence_h()); save('lamp', lamp()); save('well', well()); save('dummy', dummy())
for n in range(1, 6): save(f'papan{n}', board(f'WILAYAH {n}'))
save('papan_pk', board('PUSAT KOLONI'))

# ---------------------------------------------------------------- place objects (feet anchored, y-sorted)
objs = []
def add(kind, x, y): objs.append([kind, int(x), int(y)])
occupied = []
def free(x, y, r): return all((x - a) ** 2 + (y - b) ** 2 > (r + c) ** 2 for a, b, c in occupied)
def block(x, y, r): occupied.append((x, y, r))
# landmarks
add('balai', *BALAI); block(BALAI[0], BALAI[1] - 20, 56)
add('loket', *LOKET); block(LOKET[0], LOKET[1] - 20, 46)
THRONE = (BALAI[0] + 74, BALAI[1] + 22); add('throne', *THRONE); block(*THRONE, 16)
add('chest', THRONE[0] + 24, THRONE[1] + 2); block(THRONE[0] + 24, THRONE[1], 10)
add('well', BALAI[0] - 80, BALAI[1] + 30); block(BALAI[0] - 80, BALAI[1] + 20, 18)
for i, (dx, dy) in enumerate(((-40, -26), (0, -40), (40, -26))): add('dummy', PK[0] + dx, PK[1] + dy); block(PK[0] + dx, PK[1] + dy, 10)
add('papan_pk', PK[0], PK[1] + 52); block(PK[0], PK[1] + 52, 12)
for n, ((cx, cy), r) in REG.items():
    sx, sy = cx + (40 if n != 1 else -150), cy + (-r * .55 if n != 1 else 70)
    add(f'papan{n}', sx, sy); block(sx, sy, 14)
    if n != 1:  # a few cottages per region
        for k in range(3):
            a = k * 2.1 + n; hx, hy = cx + math.cos(a) * r * .55, cy + math.sin(a) * r * .45
            if not water[int(hy), int(hx)] and not path[int(hy), int(hx)] and free(hx, hy, 40):
                add(rng.choice(['rumah_a', 'rumah_b', 'rumah_c']), hx, hy); block(hx, hy - 16, 40)
for fx, fy, fw, fh in FARMS:
    for x in range(fx - 4, fx + fw + 6, 16): add('fence', x + 4, fy + fh + 10)
    block(fx + fw / 2, fy + fh / 2, max(fw, fh) / 2 + 6)
LIGHTS = [[BALAI[0] - 26, BALAI[1] - 26, 30], [BALAI[0] + 12, BALAI[1] - 14, 22], [LOKET[0], LOKET[1] - 20, 26]]
for (lx, ly) in ((BALAI[0] - 40, BALAI[1] + 48), (BALAI[0] + 40, BALAI[1] + 48), (PK[0] - 70, PK[1]), (PK[0] + 70, PK[1]), (BRIDGES[0][0] - 54, BRIDGES[0][1] - 16)):
    add('lamp', lx, ly); block(lx, ly, 6); LIGHTS.append([lx, ly - 20, 24])
for (bx, by) in BRIDGES: block(bx, by, 50)
# forest: dense trees on forest floor, sparse on meadow edges
for _ in range(9000):
    x, y = rng.randrange(8, W - 8), rng.randrange(20, H - 2)
    if water[y, x] or bank[y, x] or path[y, x] or farm[y, x] or plaza[y, x] or dp[y, x] < 18: continue
    m = meadow[y, x]
    if m and rng.random() > .025: continue
    if not free(x, y, 13 if not m else 18): continue
    kind = rng.choice(['oak0', 'oak1', 'oak2', 'oak0', 'pine', 'pine']) if not m else rng.choice(['oak1', 'fruit', 'bush0'])
    add(kind, x, y); block(x, y, 13)
for _ in range(700):
    x, y = rng.randrange(W), rng.randrange(H)
    if meadow[y, x] and not water[y, x] and not path[y, x] and not plaza[y, x] and not farm[y, x] and free(x, y, 10):
        add(rng.choice(['bush0', 'bush1', 'rock', 'stump', 'bush0']), x, y); block(x, y, 8)

# ---------------------------------------------------------------- citizen homes (spots) per wilayah + walk points
def walkable(x, y, r=7):
    x, y = int(x), int(y)
    if not (0 <= x < W and 0 <= y < H): return False
    return meadow[y, x] and not water[y, x] and not bank[y, x] and not farm[y, x] and free(x, y, r)
spots = []
for n in range(1, 6):
    (cx, cy), r = REG[n]
    got = 0; tries = 0
    pts = []
    while got < 50 and tries < 20000:
        tries += 1
        a = rng.random() * 6.283; d_ = math.sqrt(rng.random()) * r * .82
        x, y = cx + math.cos(a) * d_, cy + math.sin(a) * d_ * .9
        if walkable(x, y, 6) and all((x - p[0]) ** 2 + (y - p[1]) ** 2 > 22 ** 2 for p in pts):
            pts.append((int(x), int(y))); got += 1
    pts.sort(key=lambda p: (p[1] // 40, p[0]))
    spots += [list(p) for p in pts]
walk = []
for y in range(10, H, 14):
    for x in range(10, W, 14):
        if walkable(x, y, 5): walk.append([x, y])
world = {'w': W, 'h': H, 'spots': spots, 'walk': walk, 'objects': objs, 'lights': LIGHTS,
         'regions': {str(n): [c[0], c[1], r] for n, (c, r) in REG.items()}, 'pk': list(PK), 'throne': list(THRONE),
         'balai': list(BALAI), 'loket': list(LOKET), 'center': list(REG[1][0]), 'style': 'farm'}
json.dump(world, open(os.path.join(OUT, 'world.json'), 'w'))
print('objects', len(objs), 'spots', len(spots), 'walk', len(walk))
