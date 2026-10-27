# Small procedural textures (crowns, glows, sparks) so the project has no binary art besides the map.
class_name Art
extends RefCounted

static var _cache := {}

static func _img(w: int, h: int) -> Image:
	return Image.create(w, h, false, Image.FORMAT_RGBA8)

static func _outline(img: Image) -> Image:
	var w := img.get_width() + 2; var h := img.get_height() + 2
	var o := _img(w, h)
	var ol := Color8(43, 27, 23)
	for y in h:
		for x in w:
			var sx := x - 1; var sy := y - 1
			var inside := sx >= 0 and sy >= 0 and sx < img.get_width() and sy < img.get_height() and img.get_pixel(sx, sy).a > 0.0
			if inside: o.set_pixel(x, y, img.get_pixel(sx, sy)); continue
			for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
				var nx: int = sx + d.x; var ny: int = sy + d.y
				if nx >= 0 and ny >= 0 and nx < img.get_width() and ny < img.get_height() and img.get_pixel(nx, ny).a > 0.0:
					o.set_pixel(x, y, ol); break
	return o

static func crown_gold() -> Texture2D:
	if _cache.has("cg"): return _cache.cg
	var im := _img(13, 9); var g := Color8(255, 205, 50)
	im.fill_rect(Rect2i(1, 4, 11, 5), g)
	for x in [1, 6, 11]:
		for y in range(0, 4):
			im.set_pixel(x, y, g)
	im.set_pixel(6, 6, Color8(220, 60, 60)); im.set_pixel(3, 6, Color8(80, 170, 230)); im.set_pixel(9, 6, Color8(80, 170, 230))
	var t := ImageTexture.create_from_image(_outline(im)); _cache.cg = t; return t

static func crown_rose() -> Texture2D:
	if _cache.has("cr"): return _cache.cr
	var im := _img(14, 11); var p := Color8(255, 179, 209)
	im.fill_rect(Rect2i(1, 4, 12, 6), p); im.fill_rect(Rect2i(1, 8, 12, 2), Color8(224, 122, 168))
	for x in [1, 6, 11]:
		im.fill_rect(Rect2i(x, 1, 2, 4), p); im.set_pixel(x, 0, Color8(255, 210, 63)); im.set_pixel(x + 1, 0, Color8(255, 210, 63))
	im.fill_rect(Rect2i(6, 5, 2, 2), Color8(79, 182, 255))
	var t := ImageTexture.create_from_image(_outline(im)); _cache.cr = t; return t

# pixel-art glow: 4 hard-edged bands with a checker dither at each edge (scaled up with nearest filtering)
static func radial(size := 32) -> Texture2D:
	if _cache.has("rad"): return _cache.rad
	var im := _img(size, size); var c := size / 2.0
	for y in size:
		for x in size:
			var d := Vector2(x + 0.5 - c, y + 0.5 - c).length() / c
			if d >= 1.0: continue
			var band := floorf((1.0 - d) * 4.0) / 4.0
			var frac := fposmod((1.0 - d) * 4.0, 1.0)
			if frac < 0.35 and (x + y) % 2 == 0: band = maxf(0.0, band - 0.25)
			im.set_pixel(x, y, Color(1, 1, 1, band * 0.9 + (0.1 if band > 0.0 else 0.0)))
	var t := ImageTexture.create_from_image(im); _cache.rad = t; return t

static func spark() -> Texture2D:
	if _cache.has("sp"): return _cache.sp
	var im := _img(3, 3); var c := Color(1, 1, 1)
	im.set_pixel(1, 0, c); im.set_pixel(0, 1, c); im.set_pixel(1, 1, c); im.set_pixel(2, 1, c); im.set_pixel(1, 2, c)
	var t := ImageTexture.create_from_image(im); _cache.sp = t; return t

static func dot() -> Texture2D:
	if _cache.has("dot"): return _cache.dot
	var im := _img(1, 1); im.set_pixel(0, 0, Color(1, 1, 1, 1))
	var t := ImageTexture.create_from_image(im); _cache.dot = t; return t

# speech-bubble emotes: 0 heart, 1 thumbs-up, 2 note, 3 apple, 4 sparkle
static func emote(kind: int) -> Texture2D:
	var key := "emo%d" % kind
	if _cache.has(key): return _cache[key]
	var im := _img(14, 14); var wcol := Color8(255, 252, 244); var ol := Color8(43, 27, 23)
	im.fill_rect(Rect2i(1, 1, 12, 9), wcol); im.fill_rect(Rect2i(2, 0, 10, 11), wcol); im.fill_rect(Rect2i(4, 11, 3, 1), wcol); im.set_pixel(4, 12, wcol)
	match kind:
		0:
			var r := Color8(232, 70, 80)
			for p in [Vector2i(4,3),Vector2i(5,3),Vector2i(8,3),Vector2i(9,3),Vector2i(3,4),Vector2i(4,4),Vector2i(5,4),Vector2i(6,4),Vector2i(7,4),Vector2i(8,4),Vector2i(9,4),Vector2i(10,4),Vector2i(4,5),Vector2i(5,5),Vector2i(6,5),Vector2i(7,5),Vector2i(8,5),Vector2i(9,5),Vector2i(5,6),Vector2i(6,6),Vector2i(7,6),Vector2i(8,6),Vector2i(6,7),Vector2i(7,7)]: im.set_pixel(p.x, p.y, r)
		1:
			var y := Color8(240, 190, 120)
			im.fill_rect(Rect2i(4, 5, 5, 4), y); im.fill_rect(Rect2i(6, 2, 2, 3), y); im.fill_rect(Rect2i(2, 5, 2, 4), Color8(63, 127, 208))
		2:
			var n := Color8(110, 64, 170)
			im.fill_rect(Rect2i(8, 2, 1, 6), n); im.fill_rect(Rect2i(5, 6, 3, 3), n); im.fill_rect(Rect2i(8, 2, 3, 1), n)
		3:
			im.fill_rect(Rect2i(4, 4, 6, 5), Color8(220, 60, 60)); im.fill_rect(Rect2i(5, 3, 4, 7), Color8(220, 60, 60)); im.set_pixel(7, 2, Color8(110, 70, 40)); im.set_pixel(8, 1, Color8(90, 170, 70)); im.set_pixel(6, 4, Color8(255, 160, 160))
		4:
			var g := Color8(255, 205, 50)
			im.fill_rect(Rect2i(6, 2, 2, 7), g); im.fill_rect(Rect2i(3, 5, 8, 2), g)
	var t := ImageTexture.create_from_image(_outline(im)); _cache[key] = t; return t

# golden light beam (pixel bands, additive)
static func beam() -> Texture2D:
	if _cache.has("beam"): return _cache.beam
	var w := 24; var h := 224
	var im := _img(w, h)
	for y in h:
		var fade := clampf(float(y) / h, 0.0, 1.0)
		for x in w:
			var d := absf(x - w / 2.0 + 0.5) / (w / 2.0)
			var a := 0.0
			if d < 0.3: a = 0.85
			elif d < 0.6: a = 0.5
			elif d < 0.85: a = 0.22 if (x + y) % 2 == 0 else 0.1
			im.set_pixel(x, y, Color(1.0, 0.92, 0.45, a * fade))
	var t := ImageTexture.create_from_image(im); _cache.beam = t; return t
