# Paviliun Sahabat — sprite piksel (gaya bangunan Pusat Koloni)
from PIL import Image, ImageDraw
OL = (43, 27, 23, 255)
def make(wall=(246, 236, 214), wall2=(222, 206, 180), roof=(128, 82, 196), roof2=(98, 60, 160), trim=(120, 196, 236), lit=True):
    W, H = 64, 94
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    R = lambda b, c: d.rectangle(b, fill=c + (255,) if len(c) == 3 else c)
    cx = 32
    # bayangan
    d.ellipse((cx - 26, H - 10, cx + 26, H - 2), fill=(0, 0, 0, 60))
    # lantai 1 (kotak iso: muka kiri terang, kanan gelap)
    base_t, base_b = 52, 84
    d.polygon([(cx - 22, base_t), (cx, base_t + 8), (cx, base_b + 4), (cx - 22, base_b - 4)], fill=wall + (255,), outline=OL)
    d.polygon([(cx, base_t + 8), (cx + 22, base_t), (cx + 22, base_b - 4), (cx, base_b + 4)], fill=wall2 + (255,), outline=OL)
    # pintu + lambang
    d.polygon([(cx - 14, 70), (cx - 6, 73), (cx - 6, 86), (cx - 14, 83)], fill=(120, 78, 50, 255), outline=OL)
    d.point([(cx - 8, 79)], fill=(255, 214, 64, 255))
    # lentera kembar
    for x, y in ((cx - 15, 70), (cx - 3, 73)):
        if lit: d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(255, 226, 120, 110))
        R((x - 1, y - 1, x + 1, y + 1), (255, 229, 138) if lit else (180, 160, 120))
    # jendela kanan bawah (rak piala)
    d.polygon([(cx + 6, 66), (cx + 16, 61), (cx + 16, 71), (cx + 6, 76)], fill=trim + (255,), outline=OL)
    d.point([(cx + 9, 71), (cx + 13, 68)], fill=(255, 214, 64, 255))
    # balkon (lis lantai 2)
    d.polygon([(cx - 25, base_t - 1), (cx, base_t + 10), (cx + 25, base_t - 1), (cx, base_t - 12)], fill=(150, 104, 66, 255), outline=OL)
    # pagar balkon putih di dua sisi depan
    RL = (246, 240, 228, 255)
    for x in range(cx - 23, cx + 1, 3):
        y = base_t + (x - (cx - 23)) * 11 // 23; d.line((x, y - 6, x, y - 1), fill=RL); d.point([(x, y - 1)], fill=OL)
    for x in range(cx + 1, cx + 24, 3):
        y = base_t + 10 - (x - cx) * 11 // 23; d.line((x, y - 6, x, y - 1), fill=RL); d.point([(x, y - 1)], fill=OL)
    d.line((cx - 24, base_t - 7, cx, base_t + 4), fill=RL); d.line((cx, base_t + 4, cx + 24, base_t - 7), fill=RL)
    # spanduk ungu bermahkota di dinding kiri
    d.polygon([(cx - 21, 58), (cx - 17, 60), (cx - 17, 70), (cx - 19, 68), (cx - 21, 70)], fill=(128, 82, 196, 255), outline=OL)
    d.point([(cx - 19, 63), (cx - 20, 62), (cx - 18, 62)], fill=(255, 214, 64, 255))
    # lantai 2 (lebih kecil)
    t2, b2 = 26, 50
    d.polygon([(cx - 16, t2), (cx, t2 + 6), (cx, b2 + 4), (cx - 16, b2 - 2)], fill=wall + (255,), outline=OL)
    d.polygon([(cx, t2 + 6), (cx + 16, t2), (cx + 16, b2 - 2), (cx, b2 + 4)], fill=wall2 + (255,), outline=OL)
    # jendela lantai 2 (menyala)
    win = (255, 222, 140, 255) if lit else trim + (255,)
    d.polygon([(cx - 12, 33), (cx - 5, 36), (cx - 5, 44), (cx - 12, 41)], fill=win, outline=OL)
    d.polygon([(cx + 5, 36), (cx + 12, 33), (cx + 12, 41), (cx + 5, 44)], fill=trim + (255,), outline=OL)
    # atap kerucut ungu
    d.polygon([(cx - 20, t2 + 1), (cx, t2 + 10), (cx, 2)], fill=roof + (255,), outline=OL)
    d.polygon([(cx, t2 + 10), (cx + 20, t2 + 1), (cx, 2)], fill=roof2 + (255,), outline=OL)
    for k in range(1, 4):  # sirap
        y = 2 + k * 6
        d.line((cx - 5 * k * 1.0, y + k, cx, y + k * 2.3), fill=(160, 120, 220, 255))
    # teropong di atap
    d.line((cx + 3, 9, cx + 12, 4), fill=(90, 90, 110, 255), width=3); d.line((cx + 3, 9, cx + 12, 4), fill=OL, width=1)
    R((cx + 11, 2, cx + 14, 5), (200, 200, 220))
    # lambang sahabat di puncak: mahkota kecil
    for x in (cx - 4, cx, cx + 4): d.line((x, 0, x, 3), fill=(255, 214, 64, 255))
    R((cx - 4, 2, cx + 4, 4), (255, 214, 64)); d.point([(cx, 3)], fill=(232, 70, 80, 255))
    # pojok kopi (meja kecil + cangkir) di teras kanan
    R((cx + 18, 80, cx + 26, 82), (120, 78, 50)); d.line((cx + 19, 82, cx + 19, 86), fill=OL); d.line((cx + 25, 82, cx + 25, 86), fill=OL)
    R((cx + 20, 77, cx + 22, 79), (255, 255, 255)); d.point([(cx + 21, 75)], fill=(200, 200, 200, 160))
    # kotak surat berhati
    R((cx - 28, 76, cx - 23, 80), (232, 70, 80)); d.line((cx - 26, 80, cx - 26, 88), fill=OL); d.point([(cx - 26, 78)], fill=(255, 255, 255, 255))
    # bendera kecil ungu
    d.line((cx + 16, t2, cx + 16, t2 - 10), fill=OL); d.polygon([(cx + 16, t2 - 10), (cx + 24, t2 - 8), (cx + 16, t2 - 6)], fill=(128, 82, 196, 255))
    return im
def jembatan(L=34):
    im = Image.new('RGBA', (L + 6, 22), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.polygon([(0, 14), (L, 4), (L + 4, 8), (4, 18)], fill=(160, 112, 70, 255), outline=OL)
    for k in range(0, L, 5): d.line((k + 2, 15 - k * 10 // L, k + 4, 17 - k * 10 // L), fill=(120, 80, 50, 255))
    d.polygon([(0, 6), (L, -4 + 4), (L + 4, 2), (4, 10)], fill=(128, 82, 196, 255), outline=OL)  # atap ungu
    for x in (2, L // 2, L - 2): d.line((x, 8 - x * 8 // L, x, 16 - x * 10 // L), fill=OL)
    return im
if __name__ == '__main__':
    p = make(); p.save('paviliun.png'); jembatan().save('jembatan.png')
    make(lit=False).save('paviliun_siang.png')
    print(p.size)
