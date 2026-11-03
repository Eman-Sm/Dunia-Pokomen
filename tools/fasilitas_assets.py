# Aset fasilitas peta (pixel art, gaya sama dengan toko.png / arena.png). python3 tools/fasilitas_assets.py
import math, random
from PIL import Image, ImageDraw
OUT = 'public/assets/'
OL = (43, 27, 23, 255)  # outline
def ell(d, cx, cy, rx, ry, fill, outline=None, w=1):
    d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=fill, outline=outline, width=w)

def clearing(W, H, cx, cy, rx, ry, seed=3):
    """lahan rumput terbuka (menutupi hutan di bawahnya), tepi bergelombang"""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    R = random.Random(seed)
    pts = []
    for k in range(64):
        a = k / 64 * math.tau; r = 1 + (R.random() - .5) * .12
        pts.append((cx + math.cos(a) * rx * r, cy + math.sin(a) * ry * r))
    d.polygon(pts, fill=(62, 140, 62, 255))
    pts2 = [(cx + (x - cx) * .93, cy + (y - cy) * .9) for x, y in pts]
    d.polygon(pts2, fill=(105, 176, 75, 255))
    for _ in range(int(rx * ry / 40)):  # bintik rumput & bunga kecil
        a = R.random() * math.tau; r = R.random() ** .5 * .85
        x, y = cx + math.cos(a) * rx * r, cy + math.sin(a) * ry * r
        c = R.choice([(92, 160, 66), (122, 190, 86), (92, 160, 66), (255, 230, 120), (255, 160, 190)])
        d.point((x, y), fill=c + (255,))
    return im, d

def tereuma():
    W, H = 168, 116; cx, cy = 84, 72
    im, d = clearing(W, H, cx, cy, 80, 42)
    # lantai batu bundar (isometrik)
    ell(d, cx, cy + 2, 58, 29, (150, 146, 134, 255), OL)
    ell(d, cx, cy, 58, 29, (196, 190, 176, 255), OL)
    for r in (40, 22):
        ell(d, cx, cy, r, r / 2, None, (170, 164, 150, 255))
    for k in range(12):
        a = k / 12 * math.tau
        d.line((cx + math.cos(a) * 22, cy + math.sin(a) * 11, cx + math.cos(a) * 57, cy + math.sin(a) * 28.5), fill=(170, 164, 150, 255))
    # jalan setapak ke selatan
    d.polygon([(cx - 8, cy + 28), (cx + 8, cy + 28), (cx + 14, H - 1), (cx - 2, H - 1)], fill=(200, 150, 96, 255))
    # bangku kayu melingkar
    for k in range(8):
        a = k / 8 * math.tau + .2
        if 1.2 < a < 1.95: continue  # celah untuk jalan masuk
        bx, by = cx + math.cos(a) * 46, cy + math.sin(a) * 23
        d.rectangle((bx - 6, by - 3, bx + 6, by), fill=(150, 98, 52, 255), outline=OL)
        d.line((bx - 4, by + 1, bx - 4, by + 3), fill=OL); d.line((bx + 4, by + 1, bx + 4, by + 3), fill=OL)
    # lampion
    for lx, ly in ((cx - 54, cy - 6), (cx + 54, cy - 6), (cx - 30, cy + 26), (cx + 30, cy + 26)):
        d.line((lx, ly, lx, ly - 18), fill=OL, width=2)
        d.rectangle((lx - 3, ly - 24, lx + 3, ly - 17), fill=(255, 196, 80, 255), outline=OL)
        d.point((lx, ly - 21), fill=(255, 245, 200, 255))
    # gazebo: lantai, tiang, atap bertingkat
    ell(d, cx, cy - 2, 20, 10, (166, 112, 62, 255), OL)
    ell(d, cx, cy - 4, 20, 10, (196, 140, 84, 255), OL)
    for px in (-15, -5, 5, 15):
        top = cy - 36; d.rectangle((cx + px - 1, top, cx + px + 1, cy - 4 + (abs(px) < 10) * 4), fill=(120, 74, 40, 255), outline=OL)
    roof = [(cx - 28, cy - 34), (cx, cy - 52), (cx + 28, cy - 34), (cx + 22, cy - 30), (cx - 22, cy - 30)]
    d.polygon(roof, fill=(214, 74, 58, 255), outline=OL)
    d.polygon([(cx - 22, cy - 30), (cx + 22, cy - 30), (cx + 28, cy - 34), (cx - 28, cy - 34)], fill=(170, 52, 44, 255), outline=OL)
    d.polygon([(cx - 14, cy - 50), (cx, cy - 62), (cx + 14, cy - 50), (cx, cy - 46)], fill=(232, 98, 72, 255), outline=OL)
    for k in range(-2, 3):
        d.line((cx + k * 9, cy - 44 + abs(k) * 3, cx + k * 11, cy - 34), fill=(180, 58, 46, 255))
    d.line((cx, cy - 62, cx, cy - 70), fill=OL, width=1)
    d.polygon([(cx, cy - 70), (cx + 8, cy - 67), (cx, cy - 64)], fill=(255, 210, 63, 255), outline=OL)
    # pot bunga di pintu masuk
    for fx in (cx - 12, cx + 12):
        d.rectangle((fx - 3, cy + 26, fx + 3, cy + 31), fill=(180, 96, 60, 255), outline=OL)
        for dx, c in ((-2, (255, 120, 160)), (0, (255, 220, 90)), (2, (160, 120, 255))):
            d.point((fx + dx, cy + 24), fill=c + (255,)); d.point((fx + dx, cy + 25), fill=(80, 150, 60, 255))
    im.save(OUT + 'tereuma.png')
    return im

if __name__ == '__main__':
    tereuma()
    print('ok')
