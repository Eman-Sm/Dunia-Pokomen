# Where the world data comes from.
#  - Web (Mode HD): the host page (public/hd/index.html) fetches /api/dunia and draws every creature
#    with creature.js, then exposes window.POKO = { dunia, sprites: {u: {url, px, grow, hd, el}} }.
#  - Desktop / video: res://data/dunia.json + res://data/spr/*.png (made by tools/sprites.cjs).
class_name PokoData
extends RefCounted

const EL_COL := {"api": "#ff5a2a", "air": "#3fa0ff", "angin": "#9fe8ff", "tanah": "#b07a3e", "petir": "#ffe23a", "es": "#bff2ff", "daun": "#5fd04a", "cahaya": "#fff2a8", "kegelapan": "#7a3fb0", "bintang": "#c27ae0"}
const FALLBACK := ["#f0a040", "#7cc0e8", "#f4a8c8", "#8fd06a", "#c79ae8", "#f2d25a", "#e88a6a", "#9ad8d0"]

var world := {}            # world.json: spots, walk, lights, open
var dunia := {}            # /api/dunia
var sprites := {}          # u -> {tex: Texture2D, px, grow, hd}
var prev_sprites := {}     # u -> tier-below sprite (video evolution moments)

static func element_color(e) -> Color:
	var k := str(e if e != null else "").to_lower().strip_edges()
	for key in EL_COL:
		if k.begins_with(key): return Color(EL_COL[key])
	if k == "": return Color("#fff2a8")
	return Color(FALLBACK[abs(k.hash()) % FALLBACK.size()])

static func read_json(path: String):
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null: return null
	return JSON.parse_string(f.get_as_text())

static func tex_from_png(path: String) -> Texture2D:
	var img := Image.new()
	if img.load(ProjectSettings.globalize_path(path)) != OK: return null
	return ImageTexture.create_from_image(img)

func load_local(dunia_path := "res://data/dunia.json") -> void:
	world = read_json("res://data/hd/world.json")
	dunia = read_json(dunia_path)
	var meta = read_json("res://data/spr/meta.json")
	if meta == null: meta = {}
	for k in meta:
		var m: Dictionary = meta[k]
		var t := tex_from_png("res://data/spr/" + m.file)
		if t == null: continue
		var rec := {"tex": t, "px": float(m.px), "grow": float(m.grow), "hd": bool(m.hd), "frames": int(m.get("frames", 1))}
		if str(k).ends_with("#prev"): prev_sprites[str(k).trim_suffix("#prev")] = rec
		else: sprites[k] = rec

# ---------------------------------------------------------------- web
func web_ready() -> bool:
	if not OS.has_feature("web"): return false
	var r = JavaScriptBridge.eval("(window.POKO && window.POKO.ready) ? 1 : 0", true)
	return r != null and int(r) == 1

func load_web() -> void:
	world = read_json("res://data/hd/world.json")
	dunia = JSON.parse_string(str(JavaScriptBridge.eval("JSON.stringify(window.POKO.dunia)", true)))
	for w in dunia.get("warga", []):
		add_web_sprite(str(w.u))

func add_web_sprite(u: String) -> void:
	var js := "(function(){var s=window.POKO.sprites[%s];return s?JSON.stringify(s):'';})()" % JSON.stringify(u)
	var raw := str(JavaScriptBridge.eval(js, true))
	if raw == "": return
	var s: Dictionary = JSON.parse_string(raw)
	var b64: String = str(s.url).split(",")[1]
	var img := Image.new()
	if img.load_png_from_buffer(Marshalls.base64_to_raw(b64)) != OK: return
	sprites[u] = {"tex": ImageTexture.create_from_image(img), "px": 1.0, "grow": 1.0, "hd": false, "frames": int(s.get("frames", 1))}

func world_texture() -> Texture2D:
	return load("res://data/hd/ground.png")
