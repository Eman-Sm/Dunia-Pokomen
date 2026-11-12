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

def oase():
    W, H = 152, 100; cx, cy = 76, 54
    im, d = clearing(W, H, cx, cy, 72, 40, seed=7)
    R = random.Random(11)
    # tepi pasir & kolam
    ell(d, cx - 6, cy + 2, 46, 23, (226, 204, 150, 255), OL)
    ell(d, cx - 6, cy + 1, 40, 19, (58, 140, 210, 255), OL)
    ell(d, cx - 8, cy - 1, 34, 15, (90, 172, 232, 255))
    for k in range(9):
        x = cx - 6 + R.uniform(-28, 28); y = cy + R.uniform(-9, 9)
        d.line((x - 3, y, x + 3, y), fill=(200, 236, 255, 255))
    for lx, ly in ((cx - 26, cy + 4), (cx + 10, cy - 6)):  # daun teratai
        ell(d, lx, ly, 5, 2.5, (86, 168, 70, 255), OL); d.point((lx + 2, ly - 1), fill=(255, 150, 190, 255))
    # dermaga kayu kecil
    d.polygon([(cx + 22, cy + 4), (cx + 38, cy - 2), (cx + 42, cy + 2), (cx + 26, cy + 8)], fill=(176, 120, 66, 255), outline=OL)
    for k in range(3): d.line((cx + 26 + k * 5, cy + 6 - k * 2, cx + 30 + k * 5, cy + 1 - k * 2), fill=(130, 84, 44, 255))
    # palung minum & tempat makan (jerami)
    d.rectangle((cx + 36, cy + 16, cx + 58, cy + 23), fill=(150, 98, 52, 255), outline=OL); d.rectangle((cx + 38, cy + 17, cx + 56, cy + 19), fill=(90, 172, 232, 255))
    d.rectangle((cx - 60, cy + 12, cx - 40, cy + 21), fill=(150, 98, 52, 255), outline=OL)
    for k in range(8): d.line((cx - 58 + k * 2.4, cy + 13, cx - 57 + k * 2.4, cy + 9 - (k % 3)), fill=(236, 200, 90, 255))
    for fx, fy in ((cx - 34, cy + 26), (cx - 24, cy + 29)):  # mangkuk buah
        ell(d, fx, fy, 5, 2.5, (196, 140, 84, 255), OL); d.point((fx - 2, fy - 2), fill=(230, 70, 60, 255)); d.point((fx + 1, fy - 2), fill=(255, 200, 60, 255))
    # pohon kelapa
    for px, py in ((cx - 52, cy - 8), (cx + 50, cy - 14)):
        d.line((px, py, px + 3, py - 26), fill=(150, 104, 60, 255), width=3); d.line((px - 1, py, px + 2, py - 26), fill=OL)
        tx, ty = px + 3, py - 27
        for a in (math.pi, -2.4, -1.57, -0.75, 0, 2.6, 0.5):
            ex, ey = tx + math.cos(a) * 16, ty + math.sin(a) * 8 + 5
            mx, my = (tx + ex) / 2, (ty + ey) / 2 - 4
            nx, ny = -(ey - ty), (ex - tx); L = math.hypot(nx, ny) or 1; nx, ny = nx / L * 2.5, ny / L * 2.5
            d.polygon([(tx, ty), (mx + nx, my + ny), (ex, ey), (mx - nx, my - ny)], fill=(70, 160, 64, 255), outline=OL)
        ell(d, tx, ty + 2, 3, 2, (120, 80, 40, 255))
    # batu & alang-alang
    for bx, by in ((cx - 44, cy - 6), (cx + 30, cy + 18), (cx - 10, cy + 26)):
        ell(d, bx, by, 4, 2.5, (150, 150, 158, 255), OL)
    for rx_ in (cx - 40, cx - 37, cx + 18, cx + 21):
        d.line((rx_, cy - 10, rx_ + 1, cy - 18), fill=(70, 130, 60, 255), width=1)
    im.save(OUT + 'oase.png')
    return im

def taman():
    W, H = 150, 96; cx, cy = 75, 54
    im, d = clearing(W, H, cx, cy, 70, 38, seed=19)
    R = random.Random(5)
    ell(d, cx, cy + 1, 60, 30, (200, 170, 120, 255), OL)   # jalan setapak melingkar
    ell(d, cx, cy, 52, 25, (112, 186, 82, 255))
    FL = [(255, 96, 140), (255, 210, 64), (180, 120, 255), (255, 150, 60), (255, 255, 255), (110, 180, 255)]
    # 4 petak bunga berbentuk setengah lingkaran
    for a0 in (0, 1, 2, 3):
        a = a0 * math.pi / 2 + math.pi / 4; bx, by = cx + math.cos(a) * 30, cy + math.sin(a) * 14
        ell(d, bx, by, 17, 8, (96, 64, 40, 255), OL); ell(d, bx, by - 1, 15, 6.5, (120, 82, 50, 255))
        for _ in range(70):
            t_ = R.random() * math.tau; r_ = R.random() ** .5
            x, y = bx + math.cos(t_) * 13 * r_, by - 1 + math.sin(t_) * 5 * r_
            c = FL[(a0 * 2 + R.randrange(3)) % len(FL)]
            d.rectangle((x, y - 1, x + 1, y), fill=c + (255,))
    # air mancur di tengah
    ell(d, cx, cy + 2, 12, 6, (150, 150, 158, 255), OL); ell(d, cx, cy + 1, 9, 4, (90, 172, 232, 255))
    d.rectangle((cx - 2, cy - 10, cx + 2, cy + 1), fill=(176, 176, 186, 255), outline=OL)
    for k in (-1, 1):
        d.line((cx, cy - 12, cx + k * 6, cy - 6), fill=(160, 214, 255, 255)); d.line((cx + k * 6, cy - 6, cx + k * 7, cy - 2), fill=(160, 214, 255, 255))
    d.point((cx, cy - 14), fill=(200, 236, 255, 255))
    # gerbang lengkung bunga di tepi depan
    gx, gy = cx, cy + 37
    for px in (gx - 11, gx + 11): d.rectangle((px - 1, gy - 14, px + 1, gy), fill=(150, 98, 52, 255), outline=OL)
    d.arc((gx - 13, gy - 26, gx + 13, gy - 4), 180, 360, fill=OL, width=4); d.arc((gx - 12, gy - 25, gx + 12, gy - 5), 180, 360, fill=(80, 160, 70, 255), width=2)
    for k in range(7):
        a = math.pi + k / 6 * math.pi; x, y = gx + math.cos(a) * 12, gy - 15 + math.sin(a) * 10
        d.rectangle((x - 1, y - 1, x + 1, y + 1), fill=FL[k % len(FL)] + (255,))
    # pagar tanaman di belakang & kupu-kupu
    for k in range(7):
        hx = cx - 42 + k * 14; ell(d, hx, cy - 24 - abs(k - 3) * -1, 8, 5, (62, 140, 62, 255), OL)
    for bx, by, c in ((cx - 44, cy - 6, (255, 210, 64)), (cx + 46, cy - 10, (255, 120, 180)), (cx + 20, cy - 26, (180, 140, 255))):
        d.polygon([(bx, by), (bx - 3, by - 3), (bx - 3, by + 1)], fill=c + (255,)); d.polygon([(bx, by), (bx + 3, by - 3), (bx + 3, by + 1)], fill=c + (255,))
    # bangku
    for bx, by in ((cx - 50, cy + 14), (cx + 50, cy + 14)):
        d.rectangle((bx - 6, by - 3, bx + 6, by), fill=(150, 98, 52, 255), outline=OL); d.line((bx - 4, by + 1, bx - 4, by + 3), fill=OL); d.line((bx + 4, by + 1, bx + 4, by + 3), fill=OL)
    im.save(OUT + 'taman.png')
    return im


def klinik():
    W, H = 132, 100; cx, cy = 66, 58
    im, d = clearing(W, H, cx, cy, 62, 38, seed=23)
    ell(d, cx, cy + 12, 50, 18, (200, 170, 120, 255), OL)          # halaman
    ell(d, cx, cy + 11, 46, 15, (220, 196, 150, 255))
    # bangunan utama (dinding putih, atap hijau mint, isometrik sederhana)
    bx0, bx1, by0, by1 = cx - 34, cx + 34, cy - 22, cy + 10
    d.rectangle((bx0, by0, bx1, by1), fill=(246, 244, 236, 255), outline=OL)
    d.rectangle((bx0 + 1, by1 - 4, bx1 - 1, by1 - 1), fill=(214, 210, 200, 255))
    d.polygon([(bx0 - 6, by0 + 1), (cx, by0 - 22), (bx1 + 6, by0 + 1)], fill=(96, 200, 170, 255), outline=OL)
    d.polygon([(cx, by0 - 22), (bx1 + 6, by0 + 1), (bx1 - 8, by0 + 1), (cx, by0 - 15)], fill=(64, 160, 136, 255))
    d.line((bx0 - 6, by0 + 1, bx1 + 6, by0 + 1), fill=OL)
    # palang merah di atap
    px, py = cx, by0 - 9
    d.rectangle((px - 6, py - 6, px + 6, py + 6), fill=(255, 255, 255, 255), outline=OL)
    d.rectangle((px - 4, py - 1, px + 4, py + 1), fill=(222, 56, 56, 255)); d.rectangle((px - 1, py - 4, px + 1, py + 4), fill=(222, 56, 56, 255))
    # pintu & jendela
    d.rectangle((cx - 6, by1 - 16, cx + 6, by1), fill=(120, 190, 230, 255), outline=OL); d.line((cx, by1 - 16, cx, by1), fill=OL)
    for wx in (bx0 + 8, bx1 - 20):
        d.rectangle((wx, by0 + 7, wx + 12, by0 + 15), fill=(150, 214, 245, 255), outline=OL); d.line((wx + 6, by0 + 7, wx + 6, by0 + 15), fill=OL)
    # papan nama
    d.rectangle((cx - 16, by0 + 1, cx + 16, by0 + 6), fill=(222, 56, 56, 255), outline=OL)
    # ranjang istirahat di halaman (kiri & kanan)
    for kx in (cx - 46, cx + 38):
        d.rectangle((kx, cy + 14, kx + 10, cy + 19), fill=(255, 255, 255, 255), outline=OL)
        d.rectangle((kx, cy + 14, kx + 3, cy + 19), fill=(255, 170, 190, 255), outline=OL)
        d.line((kx + 1, cy + 20, kx + 1, cy + 22), fill=OL); d.line((kx + 9, cy + 20, kx + 9, cy + 22), fill=OL)
    # pot tanaman obat & tanda hati
    for tx in (bx0 - 2, bx1 + 2):
        d.rectangle((tx - 3, by1 - 4, tx + 3, by1 + 1), fill=(170, 100, 60, 255), outline=OL); ell(d, tx, by1 - 7, 4, 4, (80, 170, 80, 255), OL)
    hx, hy = cx + 22, cy + 22
    d.polygon([(hx, hy + 4), (hx - 4, hy), (hx - 2, hy - 2), (hx, hy), (hx + 2, hy - 2), (hx + 4, hy)], fill=(255, 96, 140, 255), outline=OL)
    im.save(OUT + 'klinik.png')
    return im


def lapangan():
    W, H = 176, 118; cx, cy = 88, 62
    im, d = clearing(W, H, cx, cy, 84, 52, seed=31)
    # lapangan rumput bergaris (pandangan atas miring)
    x0, x1, y0, y1 = cx - 64, cx + 64, cy - 30, cy + 30
    for i in range(8):
        a = x0 + i * 16
        d.rectangle((a, y0, a + 15, y1), fill=(96, 178, 74, 255) if i % 2 else (112, 194, 86, 255))
    d.rectangle((x0, y0, x1, y1), outline=OL)
    WL = (250, 250, 240, 255)
    d.rectangle((x0 + 3, y0 + 3, x1 - 3, y1 - 3), outline=WL)
    d.line((cx, y0 + 3, cx, y1 - 3), fill=WL)
    d.ellipse((cx - 11, cy - 9, cx + 11, cy + 9), outline=WL)
    for sx in (-1, 1):
        bx = cx + sx * 61
        d.rectangle((min(bx, bx - sx * 16), cy - 15, max(bx, bx - sx * 16), cy + 15), outline=WL)
        # gawang (tiang putih + jaring)
        gx = cx + sx * 66
        d.rectangle((min(gx, gx + sx * 6), cy - 9, max(gx, gx + sx * 6), cy + 9), fill=(220, 225, 230, 255), outline=OL)
        for j in range(-6, 7, 3): d.line((min(gx, gx + sx * 6), cy + j, max(gx, gx + sx * 6), cy + j), fill=(170, 175, 185, 255))
    # bola
    ell(d, cx + 18, cy + 6, 3, 3, (255, 255, 255, 255), OL); d.point((cx + 18, cy + 6), fill=OL)
    # bangku penonton (atas) dan bendera sudut
    for k in range(3):
        d.rectangle((cx - 40 + k * 28, y0 - 12, cx - 20 + k * 28, y0 - 6), fill=(201, 138, 75, 255), outline=OL)
    for fx, fy in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
        d.line((fx, fy, fx, fy - 7), fill=OL); d.polygon([(fx, fy - 7), (fx + 5, fy - 5), (fx, fy - 3)], fill=(229, 83, 61, 255), outline=OL)
    im.save(OUT + 'lapangan.png')
    return im

def pasar():
    W, H = 156, 108; cx, cy = 78, 60
    im, d = clearing(W, H, cx, cy, 74, 44, seed=41)
    ell(d, cx, cy + 8, 64, 26, (196, 170, 128, 255), OL)            # pelataran pasar
    ell(d, cx, cy + 7, 60, 23, (216, 194, 152, 255))
    for i in range(-3, 4):                                         # ubin batu
        d.line((cx + i * 16 - 6, cy - 10, cx + i * 16 + 6, cy + 26), fill=(198, 176, 136, 255))
    def lapak(x, y, c1, c2, isi):
        # tiang + meja + atap belang
        d.rectangle((x - 17, y - 2, x + 17, y + 6), fill=(150, 98, 58, 255), outline=OL)
        d.rectangle((x - 17, y - 2, x + 17, y), fill=(178, 120, 72, 255))
        d.line((x - 15, y - 22, x - 15, y - 2), fill=OL, width=2); d.line((x + 15, y - 22, x + 15, y - 2), fill=OL, width=2)
        for k in range(6):
            d.polygon([(x - 19 + k * 6.5, y - 30), (x - 12.5 + k * 6.5, y - 30), (x - 12.5 + k * 6.5, y - 21), (x - 19 + k * 6.5, y - 21)], fill=c1 if k % 2 == 0 else c2)
        d.rectangle((x - 19, y - 30, x + 20, y - 21), outline=OL)
        for k in range(6):
            ell(d, x - 16 + k * 6.5, y - 20, 3.2, 2.2, c1 if k % 2 == 0 else c2, OL)
        for k, col in enumerate(isi):
            ell(d, x - 11 + k * 7, y - 4, 3, 2.4, col, OL)
    lapak(cx - 36, cy + 2, (226, 74, 60, 255), (255, 244, 230, 255), [(255, 200, 60, 255), (120, 200, 90, 255), (240, 120, 40, 255), (200, 80, 160, 255)])
    lapak(cx + 36, cy + 2, (60, 140, 220, 255), (255, 244, 230, 255), [(255, 140, 180, 255), (250, 220, 90, 255), (160, 110, 230, 255), (90, 200, 220, 255)])
    lapak(cx, cy - 10, (255, 196, 40, 255), (255, 244, 230, 255), [(230, 90, 70, 255), (90, 170, 230, 255), (255, 210, 70, 255), (120, 200, 90, 255)])
    # papan nama PASAR
    d.rectangle((cx - 18, cy - 46, cx + 18, cy - 38), fill=(255, 231, 168, 255), outline=OL)
    for k in range(4): ell(d, cx - 11 + k * 7.3, cy - 42, 2.2, 2.2, (240, 180, 40, 255), (150, 100, 30, 255))  # koin
    d.line((cx, cy - 38, cx, cy - 32), fill=OL)
    # karung & peti
    for (x, y, col) in [(cx - 60, cy + 18, (190, 160, 110, 255)), (cx + 58, cy + 18, (190, 160, 110, 255))]:
        ell(d, x, y, 6, 5, col, OL); d.line((x - 3, y - 4, x + 3, y - 4), fill=OL)
    d.rectangle((cx - 8, cy + 18, cx + 8, cy + 26), fill=(170, 116, 64, 255), outline=OL); d.line((cx - 8, cy + 22, cx + 8, cy + 22), fill=OL)
    im.save(OUT + 'pasar.png')
    return im


def bermain():
    W, H = 160, 112; cx, cy = 80, 62
    im, d = clearing(W, H, cx, cy, 76, 46, seed=53)
    # bak pasir
    ell(d, cx + 30, cy + 22, 22, 9, (226, 200, 140, 255), OL); ell(d, cx + 30, cy + 21, 19, 7, (238, 214, 156, 255))
    d.rectangle((cx + 24, cy + 16, cx + 30, cy + 20), fill=(232, 80, 70, 255), outline=OL)  # ember
    # ayunan (kiri)
    ax0, ax1, ay = cx - 66, cx - 26, cy - 30
    for x in (ax0, ax1):
        d.line((x, ay, x - 5, cy + 6), fill=OL, width=3); d.line((x, ay, x + 5, cy + 6), fill=OL, width=3)
        d.line((x, ay, x - 4, cy + 5), fill=(220, 70, 70, 255), width=1); d.line((x, ay, x + 4, cy + 5), fill=(220, 70, 70, 255), width=1)
    d.rectangle((ax0 - 2, ay - 3, ax1 + 2, ay + 1), fill=(220, 70, 70, 255), outline=OL)
    for k, x in enumerate((ax0 + 11, ax1 - 11)):
        sy = cy - 2 + k * 3
        d.line((x - 4, ay + 1, x - 4, sy), fill=(90, 80, 80, 255)); d.line((x + 4, ay + 1, x + 4, sy), fill=(90, 80, 80, 255))
        d.rectangle((x - 6, sy, x + 6, sy + 3), fill=(255, 210, 63, 255), outline=OL)
    # perosotan (tengah belakang)
    px, py = cx + 4, cy - 16
    d.rectangle((px - 4, py - 22, px + 6, py + 12), fill=(70, 150, 220, 255), outline=OL)
    for k in range(5): d.line((px - 4, py - 18 + k * 7, px + 6, py - 18 + k * 7), fill=OL)
    d.rectangle((px - 7, py - 27, px + 9, py - 22), fill=(255, 210, 63, 255), outline=OL)
    d.polygon([(px + 6, py - 22), (px + 13, py - 22), (px + 36, py + 16), (px + 29, py + 16)], fill=(232, 80, 70, 255), outline=OL)
    # jungkat-jungkit (depan kiri)
    jx, jy = cx - 34, cy + 22
    d.polygon([(jx - 3, jy + 4), (jx + 3, jy + 4), (jx, jy - 2)], fill=(120, 80, 50, 255), outline=OL)
    d.line((jx - 22, jy + 4, jx + 22, jy - 6), fill=OL, width=5); d.line((jx - 22, jy + 3, jx + 22, jy - 7), fill=(95, 190, 92, 255), width=2)
    for x, y in ((jx - 20, jy + 2), (jx + 20, jy - 8)): d.rectangle((x - 2, y - 5, x + 2, y), fill=(255, 210, 63, 255), outline=OL)
    # bunga & bendera kecil
    for x, y, c in ((cx - 70, cy + 14, (236, 92, 150, 255)), (cx + 62, cy - 10, (255, 210, 63, 255)), (cx + 56, cy + 30, (180, 140, 255, 255))):
        ell(d, x, y, 2.5, 2.5, c, OL)
    im.save(OUT + 'bermain.png')
    return im

if __name__ == '__main__':
    pasar()
    lapangan()
    klinik()
    taman()
    oase()
    tereuma()
    print('ok')
