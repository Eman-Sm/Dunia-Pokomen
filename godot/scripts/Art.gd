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
