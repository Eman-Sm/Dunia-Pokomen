# 16 Nov: Balai Admin & Paviliun Sahabat versi megah (sprite piksel, gaya iso seperti bangunan lain)
import sys
from PIL import Image, ImageDraw
OL = (43, 27, 23, 255)
GOLD, GOLD2 = (255, 210, 63, 255), (214, 160, 30, 255)
WCOL = [(229, 83, 61), (61, 143, 216), (63, 174, 90), (232, 185, 35), (143, 90, 216), (240, 138, 44)]

class Off:
    """ImageDraw dengan geser-y (supaya bendera & kubah tidak terpotong di atas)"""
    def __init__(self, d, oy): self.d, self.oy = d, oy
    def _p(self, xy):
        if isinstance(xy, (list, tuple)) and xy and isinstance(xy[0], (list, tuple)): return [(x, y + self.oy) for x, y in xy]
        xy = list(xy); return [v + (self.oy if i % 2 else 0) for i, v in enumerate(xy)]
    def __getattr__(self, n):
        f = getattr(self.d, n)
        return lambda xy, *a, **k: f(self._p(xy), *a, **k)

def prism(d, cx, top, w, h, cl, cr, ctop=None):
    """kotak iso: belah ketupat atas (lebar 2w, tinggi w), muka kiri & kanan setinggi h."""
    hw = w // 2
    if ctop: d.polygon([(cx - w, top + hw), (cx, top), (cx + w, top + hw), (cx, top + w)], fill=ctop, outline=OL)
    d.polygon([(cx - w, top + hw), (cx, top + w), (cx, top + w + h), (cx - w, top + hw + h)], fill=cl, outline=OL)
    d.polygon([(cx, top + w), (cx + w, top + hw), (cx + w, top + hw + h), (cx, top + w + h)], fill=cr, outline=OL)

def on_left(cx, top, w, t, y):  # titik di muka kiri: t=0 tepi kiri .. 1 tengah
    x = cx - w + t * w; return x, top + w // 2 + t * (w / 2) + y
def on_right(cx, top, w, t, y):  # t=0 tengah .. 1 tepi kanan
    x = cx + t * w; return x, top + w - t * (w / 2) + y

def balai(lit=False):
    W, H = 150, 176; im = Image.new('RGBA', (W, H + 24), (0, 0, 0, 0)); d = Off(ImageDraw.Draw(im), 24); cx = 75
    d.ellipse((cx - 72, 140, cx + 72, 178), fill=(0, 0, 0, 55))
    # alas batu 2 undakan
    prism(d, cx, 96, 66, 8, (206, 200, 186, 255), (176, 170, 158, 255), (226, 220, 206, 255))
    prism(d, cx, 90, 58, 7, (222, 216, 202, 255), (190, 184, 172, 255), (236, 230, 216, 255))
    # badan aula
    top = 46; w = 50; h = 40
    prism(d, cx, top, w, h, (248, 238, 214, 255), (220, 204, 176, 255))
    # tiang putih di muka kiri & kanan
    for t in (.12, .34, .56, .78):
        x, y = on_left(cx, top, w, t, 0); d.rectangle((x - 2, y + 2, x + 2, y + h - 1), fill=(255, 252, 244, 255), outline=OL)
        d.rectangle((x - 3, y + 1, x + 3, y + 3), fill=(236, 226, 206, 255), outline=OL)
    for t in (.22, .44, .66, .88):
        x, y = on_right(cx, top, w, t, 0); d.rectangle((x - 2, y + 2, x + 2, y + h - 1), fill=(236, 228, 214, 255), outline=OL)
        d.rectangle((x - 3, y + 1, x + 3, y + 3), fill=(214, 204, 186, 255), outline=OL)
    # jendela lengkung di antara tiang
    win = (255, 222, 140, 255) if lit else (120, 196, 236, 255)
    for t in (.23, .45):
        x, y = on_left(cx, top, w, t, 10); d.rounded_rectangle((x - 3, y, x + 3, y + 13), radius=3, fill=win, outline=OL)
    for t in (.33, .55, .77):
        x, y = on_right(cx, top, w, t, 10); d.rounded_rectangle((x - 3, y, x + 3, y + 13), radius=3, fill=win if lit else (100, 170, 214, 255), outline=OL)
    # pintu besar ganda + lengkung emas
    x, y = on_left(cx, top, w, .70, 14)
    d.rounded_rectangle((x - 7, y, x + 7, y + 25), radius=6, fill=(140, 86, 50, 255), outline=OL)
    d.line((x, y + 2, x, y + 25), fill=OL); d.arc((x - 8, y - 2, x + 8, y + 12), 180, 360, fill=GOLD, width=2)
    d.point([(x - 2, y + 15), (x + 2, y + 15)], fill=GOLD)
    # papan nama emas di atas pintu
    d.rectangle((x - 12, y - 9, x + 12, y - 3), fill=GOLD, outline=OL); d.line((x - 8, y - 6, x + 8, y - 6), fill=(140, 90, 20, 255))
    # lis atap
    d.polygon([(cx - w - 4, top + w // 2 - 2), (cx, top + w + 0), (cx + w + 4, top + w // 2 - 2), (cx, top - 4)], fill=(170, 60, 50, 255), outline=OL)
    d.line((cx - w - 3, top + w // 2 - 1, cx, top + w + 1), fill=GOLD, width=2); d.line((cx, top + w + 1, cx + w + 3, top + w // 2 - 1), fill=GOLD2, width=2)
    # atap limas merah
    d.polygon([(cx - w + 2, top + w // 2 - 3), (cx, top + w - 3), (cx, top - 6), (cx - 18, top - 8)], fill=(214, 76, 60, 255), outline=OL)
    d.polygon([(cx, top + w - 3), (cx + w - 2, top + w // 2 - 3), (cx + 18, top - 8), (cx, top - 6)], fill=(176, 56, 46, 255), outline=OL)
    for k in range(1, 4):
        d.line((cx - w + 2 + k * 9, top + w // 2 - 3 + k * 2, cx - 4, top + w - 6 - k * 6), fill=(236, 110, 90, 255))
    # menara jam di tengah
    prism(d, cx, 14, 16, 22, (250, 242, 222, 255), (222, 208, 182, 255), (70, 150, 200, 255))
    d.ellipse((cx - 13, 26, cx - 3, 36), fill=(255, 250, 236, 255), outline=OL); d.line((cx - 8, 31, cx - 8, 28), fill=OL); d.line((cx - 8, 31, cx - 6, 32), fill=OL)
    d.rounded_rectangle((cx + 4, 28, cx + 10, 38), radius=3, fill=win, outline=OL)
    d.line((cx - 16, 22, cx, 30), fill=GOLD, width=2); d.line((cx, 30, cx + 16, 22), fill=GOLD2, width=2)
    # kubah biru + puncak emas
    d.pieslice((cx - 14, 8, cx + 14, 40), 180, 360, fill=(70, 150, 200, 255), outline=OL)
    d.pieslice((cx - 14, 8, cx + 14, 40), 180, 270, fill=(110, 190, 230, 255), outline=OL)
    d.line((cx - 14, 24, cx + 14, 24), fill=GOLD, width=2)
    d.line((cx, 8, cx, -6), fill=OL, width=1); d.ellipse((cx - 2, 0, cx + 2, 4), fill=GOLD, outline=OL)
    # bendera admin di puncak
    d.line((cx, -6, cx, -20), fill=OL); d.polygon([(cx, -20), (cx + 12, -16), (cx, -12)], fill=(232, 70, 80, 255), outline=OL)
    # 6 bendera wilayah di tepi alas
    for k, c in enumerate(WCOL):
        t = (k + .5) / 6
        if k < 3: x, y = on_left(cx, 90, 58, .08 + k * .2, 6)
        else: x, y = on_right(cx, 90, 58, .32 + (k - 3) * .2, 6)
        d.line((x, y, x, y - 18), fill=OL); d.polygon([(x, y - 18), (x + 8, y - 15), (x, y - 12)], fill=c + (255,), outline=OL)
    # lentera kembar di tangga
    for xx, yy in (on_left(cx, 90, 58, .55, 4), on_left(cx, 90, 58, .9, 4)):
        d.line((xx, yy, xx, yy - 12), fill=OL); d.rectangle((xx - 2, yy - 15, xx + 2, yy - 11), fill=(255, 229, 138, 255) if lit else (230, 210, 160, 255), outline=OL)
    return im

def paviliun(lit=True):
    W, H = 96, 140; im = Image.new('RGBA', (W, H + 22), (0, 0, 0, 0)); d = ImageDraw.Draw(im); cx = 48; oy = 22
    def P(pts): return [(x, y + oy) for x, y in pts]
    d.ellipse((cx - 40, H - 12 + oy, cx + 40, H - 1 + oy), fill=(0, 0, 0, 55))
    wl, wr = (246, 238, 222, 255), (218, 204, 182, 255)
    win = (255, 222, 140, 255) if lit else (150, 200, 236, 255)
    # alas
    prism(d, cx, 102 + oy, 38, 6, (210, 200, 230, 255), (176, 166, 200, 255), (226, 218, 244, 255))
    # lantai 1
    prism(d, cx, 74 + oy, 30, 30, wl, wr, (150, 104, 66, 255))
    x, y = on_left(cx, 74 + oy, 30, .62, 10); d.rounded_rectangle((x - 5, y, x + 5, y + 18), radius=5, fill=(120, 78, 50, 255), outline=OL); d.point([(x + 2, y + 10)], fill=GOLD)
    d.arc((x - 6, y - 2, x + 6, y + 10), 180, 360, fill=GOLD, width=1)
    for t in (.2,): xx, yy = on_left(cx, 74 + oy, 30, t, 10); d.rounded_rectangle((xx - 3, yy, xx + 3, yy + 9), radius=3, fill=win, outline=OL)
    for t in (.3, .7): xx, yy = on_right(cx, 74 + oy, 30, t, 10); d.rounded_rectangle((xx - 3, yy, xx + 3, yy + 9), radius=3, fill=win, outline=OL)
    # balkon 1 (pagar putih)
    d.polygon(P([(cx - 34, 87 - 6), (cx, 104 - 6), (cx + 34, 87 - 6), (cx, 70 - 6)]), fill=(150, 104, 66, 255), outline=OL)
    for t in [i / 10 for i in range(11)]:
        x, y = on_left(cx, 70 + oy - 6, 34, t, 0); d.line((x, y - 5, x, y), fill=(250, 246, 236, 255))
        x, y = on_right(cx, 70 + oy - 6, 34, t, 0); d.line((x, y - 5, x, y), fill=(250, 246, 236, 255))
    d.line((cx - 34, 81 - 6 + oy - 5 + 5, cx, 98 - 6 + oy - 5 + 5), fill=(250, 246, 236, 255))
    # lantai 2
    prism(d, cx, 46 + oy, 24, 24, wl, wr, (98, 60, 160, 255))
    for t in (.3, .7):
        xx, yy = on_left(cx, 46 + oy, 24, t, 7); d.rounded_rectangle((xx - 3, yy, xx + 3, yy + 10), radius=3, fill=win, outline=OL)
        xx, yy = on_right(cx, 46 + oy, 24, t, 7); d.rounded_rectangle((xx - 3, yy, xx + 3, yy + 10), radius=3, fill=win if lit else (120, 180, 220, 255), outline=OL)
    # spanduk ungu bermahkota
    xx, yy = on_left(cx, 46 + oy, 24, .5, 4); d.polygon([(xx - 3, yy), (xx + 3, yy + 2), (xx + 3, yy + 30), (xx, yy + 27), (xx - 3, yy + 30)], fill=(128, 82, 196, 255), outline=OL)
    d.point([(xx - 1, yy + 7), (xx, yy + 6), (xx + 1, yy + 7), (xx, yy + 8)], fill=GOLD)
    # lis + lantai 3 (menara pengamat)
    d.polygon(P([(cx - 28, 58 - 4), (cx, 72 - 4), (cx + 28, 58 - 4), (cx, 44 - 4)]), fill=(98, 60, 160, 255), outline=OL)
    prism(d, cx, 24 + oy, 16, 20, wl, wr, (98, 60, 160, 255))
    xx, yy = on_left(cx, 24 + oy, 16, .5, 6); d.rounded_rectangle((xx - 3, yy, xx + 3, yy + 9), radius=3, fill=win, outline=OL)
    xx, yy = on_right(cx, 24 + oy, 16, .5, 6); d.ellipse((xx - 4, yy, xx + 4, yy + 8), fill=win, outline=OL)
    # atap kerucut ungu tinggi
    d.polygon(P([(cx - 22, 30), (cx, 42), (cx, -6)]), fill=(140, 92, 214, 255), outline=OL)
    d.polygon(P([(cx, 42), (cx + 22, 30), (cx, -6)]), fill=(100, 62, 168, 255), outline=OL)
    for k in range(1, 5): d.line((cx - 4 * k, k * 8 - 6 + oy + k, cx, k * 9 - 4 + oy + k), fill=(176, 136, 236, 255))
    d.line((cx - 22, 30 + oy, cx, 42 + oy), fill=GOLD, width=2); d.line((cx, 42 + oy, cx + 22, 30 + oy), fill=GOLD2, width=2)
    # mahkota emas besar di puncak
    cy = oy - 12
    d.polygon([(cx - 8, cy + 8), (cx - 8, cy), (cx - 4, cy + 4), (cx, cy - 3), (cx + 4, cy + 4), (cx + 8, cy), (cx + 8, cy + 8)], fill=GOLD, outline=OL)
    d.point([(cx, cy + 5)], fill=(232, 70, 80, 255)); d.point([(cx - 5, cy + 6), (cx + 5, cy + 6)], fill=(120, 196, 236, 255))
    # menara kecil kembar di kiri & kanan (sayap)
    for sx in (-1, 1):
        tx = cx + sx * 36; prism(d, tx, 84 + oy, 8, 22, wl if sx < 0 else wr, wr)
        d.polygon([(tx - 9, 89 + oy), (tx, 93 + oy), (tx + 9, 89 + oy), (tx, 70 + oy)], fill=(128, 82, 196, 255), outline=OL)
        d.ellipse((tx - 2, 95 + oy, tx + 2, 99 + oy), fill=win, outline=OL)
        d.line((tx, 70 + oy, tx, 62 + oy), fill=OL); d.polygon([(tx, 62 + oy), (tx + 7 * sx, 64 + oy), (tx, 66 + oy)], fill=(128, 82, 196, 255))
    # lentera & pojok kopi
    for t in (.4, .85):
        x, y = on_left(cx, 102 + oy, 38, t, 4); d.line((x, y, x, y - 12), fill=OL); d.rectangle((x - 2, y - 15, x + 2, y - 11), fill=(255, 229, 138, 255) if lit else (200, 180, 140, 255), outline=OL)
    x, y = on_right(cx, 102 + oy, 38, .6, -2); d.rectangle((x - 5, y - 4, x + 5, y - 2), fill=(120, 78, 50, 255)); d.rectangle((x - 1, y - 7, x + 1, y - 5), fill=(255, 255, 255, 255))
    return im

def jembatan(L=44):
    im = Image.new('RGBA', (L + 8, 30), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    # titian tertutup dari menara (kanan) ke aula (kiri), naik ke kiri
    d.polygon([(4, 10), (L + 4, 20), (L + 4, 25), (4, 15)], fill=(160, 112, 70, 255), outline=OL)
    for k in range(4, L + 4, 6): d.line((k, 11 + (k - 4) * 10 // L, k, 15 + (k - 4) * 10 // L), fill=(120, 80, 50, 255))
    d.polygon([(2, 3), (L + 6, 13), (L + 6, 16), (2, 6)], fill=(128, 82, 196, 255), outline=OL)
    d.line((2, 4, L + 6, 14), fill=GOLD)
    for x in (5, L // 2 + 4, L + 2): d.line((x, 6 + (x - 2) * 10 // L, x, 14 + (x - 2) * 10 // L), fill=OL)
    return im

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    balai().save(f'{out}/balai_admin.png'); balai(lit=True).save(f'{out}/balai_admin_malam.png')
    paviliun(lit=False).save(f'{out}/paviliun.png'); paviliun(lit=True).save(f'{out}/paviliun_malam.png'); jembatan().save(f'{out}/jembatan_sahabat.png')
    print('ok')
