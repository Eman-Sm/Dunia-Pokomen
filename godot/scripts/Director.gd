# Scripted camera & events for video rendering (Movie Maker).
# Shot file (JSON):
# {
#   "size": [1080, 1920], "duration": 20, "dunia": "res://data/dunia.json",
#   "hour":   [[0, 5.2], [8, 12], [16, 19.8]],                 // time -> hour of day
#   "camera": [[0, 850, 890, 760], [4, 962, 900, 240], ...],   // time, x, y, view width (world px)
#   "labels": {"limit": 12, "always": ["vanzoka.7"]},
#   "evolve": [[6.0, "vanzoka.7"]],                            // shows the tier-below sprite until t, then flash
#   "birth":  [[9.0, "giovanni98882"]],                        // hidden until t, then pops in
#   "still":  [[3, 10, "vanzoka.7"]],                          // stands at home between t0..t1
#   "regions": [[t0, t1, 1], [t0, t1, "pk"]]                   // highlight Wilayah 1/2/3 or Pusat Koloni
# }
class_name Director
extends Node

var S := {}
var size := Vector2i(720, 1280)
var duration := 10.0
var dunia_path := "res://data/dunia.json"
var labelled := {}
var label_limit := 12
var label_px := 10.0
var main
var _swapped := {}

func load(path: String) -> void:
	S = PokoData.read_json(path)
	if S == null: push_error("shots not found: " + path); S = {}
	var sz: Array = S.get("size", [720, 1280]); size = Vector2i(int(sz[0]), int(sz[1]))
	duration = float(S.get("duration", 10.0))
	dunia_path = S.get("dunia", dunia_path)
	var L: Dictionary = S.get("labels", {})
	label_limit = int(L.get("limit", 12))
	label_px = float(L.get("px", 10))
	for u in L.get("always", []): labelled[u] = true

func attach(m) -> void:
	main = m
	for e in S.get("evolve", []):
		var c = main.creatures.get(e[1]); var prev = main.D.prev_sprites.get(e[1])
		if c and prev: c.set_sprite(prev); _swapped[e[1]] = false
	for e in S.get("birth", []):
		var c = main.creatures.get(e[1]); if c: c.visible = false
	step(0.0)

static func _ease(x: float) -> float:
	x = clampf(x, 0, 1); return x * x * (3.0 - 2.0 * x)

func _interp(keys: Array, t: float) -> Array:
	if keys.is_empty(): return []
	if t <= keys[0][0]: return keys[0].slice(1)
	for i in range(keys.size() - 1):
		var a: Array = keys[i]; var b: Array = keys[i + 1]
		if t <= b[0]:
			var p := _ease((t - a[0]) / maxf(1e-6, b[0] - a[0]))
			var out := []
			for k in range(1, a.size()): out.append(lerpf(a[k], b[k], p))
			return out
	return keys[-1].slice(1)

func hour(t: float) -> float:
	var h := _interp(S.get("hour", [[0, 12]]), t)
	return h[0] if h.size() else 12.0

func step(t: float) -> void:
	if main == null: return
	var c := _interp(S.get("camera", []), t)
	if c.size() >= 3:
		main.cam.position = Vector2(c[0], c[1]); main.view_w = c[2]; main.target_view = c[2]
	for e in S.get("evolve", []):
		var cr = main.creatures.get(e[1])
		if cr and t >= e[0] and _swapped.get(e[1]) == false:
			cr.set_sprite(main.D.sprites[e[1]]); cr.flash_t = PokoMain.clock; _swapped[e[1]] = true
	for e in S.get("birth", []):
		var cr = main.creatures.get(e[1])
		if cr and t >= e[0] and not cr.visible: cr.visible = true; cr.spawn_t = PokoMain.clock; cr.flash_t = PokoMain.clock
	for s in S.get("still", []):
		var cr = main.creatures.get(s[2])
		if cr:
			var on: bool = t >= s[0] and t < s[1]
			if on and not cr.scripted: cr.scripted = true; cr.position = cr.home; cr.mode = "idle"
			elif not on and cr.scripted and t >= s[1]: cr.scripted = false
	for r in S.get("regions", []):
		var key = r[2]
		var a := clampf((t - r[0]) / 0.6, 0, 1) * (1.0 - clampf((t - r[1]) / 0.6, 0, 1))
		main.regions.show[key if key is String else int(key)] = a
	if t >= duration: main.get_tree().quit()
