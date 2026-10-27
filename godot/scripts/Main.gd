# Dunia Pokomen HD — world renderer.
#   Web (Mode HD):  data from the host page (window.POKO), pan/zoom/tap, tap = open Kartu Warga on the page.
#   Desktop:        res://data/*, same controls (handy for previews).
#   Video:          godot --path godot --write-movie out.avi --fixed-fps 30 -- --shots=res://shots/NAME.json
class_name PokoMain
extends Node2D

static var clock := 0.0          # simulated seconds (deterministic in Movie Maker)

var D := PokoData.new()
var mode := "desktop"
var actors: Node2D
var glow: Node2D
var labels: Node2D
var regions: Node2D
var cam: Camera2D
var modulate_node: CanvasModulate
var lamp_nodes: Array = []
var fireflies: CPUParticles2D
var clouds: Array = []
var creatures := {}
var homes: Array = []
var hour := 12.0
var hour_override := -1.0
var selected := ""
var me := ""
var font: Font
var director: Director = null
var ui: CanvasLayer
var info: Label
var waiting := 0.0
var built := false
var view_w := 760.0
var target_view := 760.0
var target_pos := Vector2.ZERO
var touches := {}
var drag_from := Vector2.ZERO
var dragging := false
var moved := 0.0
var label_px := 10.0
const ZOOMS := [0.5, 1.0, 2.0, 3.0, 4.0]
var _fly_cb
var pinch_acc := 0.0

func _ready() -> void:
	var ff: FontFile = load("res://data/fonts/DejaVuSans-Bold.ttf")
	ff.antialiasing = TextServer.FONT_ANTIALIASING_NONE; ff.hinting = TextServer.HINTING_NORMAL
	ff.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_DISABLED
	font = ff
	var args := {}
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	if OS.has_feature("web"): mode = "web"
	elif args.has("shots"): mode = "video"
	if args.has("jam"): hour_override = float(args.jam)
	if mode == "video":
		director = Director.new(); director.load(args.shots); add_child(director)
		pass  # output size comes from --resolution WxH on the command line
	if mode != "web": _build()

func _build() -> void:
	if mode == "web":
		D.load_web()
		me = str(JavaScriptBridge.eval("window.POKO.me || ''", true))
		var j = JavaScriptBridge.eval("window.POKO.jam", true)
		if j != null and str(j) != "": hour_override = float(j)
		_fly_cb = JavaScriptBridge.create_callback(_on_fly)
		JavaScriptBridge.get_interface("window").pokoFly = _fly_cb
	else:
		D.load_local(director.dunia_path if director else "res://data/dunia.json")
	homes = D.world.spots
	# --- world
	var ws := Sprite2D.new(); ws.centered = false; ws.texture = D.world_texture()
	var sm := ShaderMaterial.new(); sm.shader = load("res://shaders/world.gdshader"); ws.material = sm
	add_child(ws)
	regions = Node2D.new(); regions.set_script(load("res://scripts/Regions.gd")); add_child(regions)
	actors = Node2D.new(); actors.y_sort_enabled = true; add_child(actors)
	# drifting cloud shadows
	for i in 5:
		var c := Sprite2D.new(); c.texture = Art.radial(); c.modulate = Color(0.05, 0.08, 0.15, 0.10)
		c.scale = Vector2(4.5 + i, 2.4 + i * 0.4); c.position = Vector2(300 + i * 330, 500 + (i * 197) % 700); add_child(c); clouds.append(c)
	modulate_node = CanvasModulate.new(); add_child(modulate_node)
	# glow + labels are drawn on a layer that follows the camera but is NOT darkened at night
	var gl := CanvasLayer.new(); gl.layer = 1; gl.follow_viewport_enabled = true; add_child(gl)
	glow = Node2D.new(); gl.add_child(glow)
	# labels live in screen space (crisp 1:1 pixel text at every zoom level)
	var ll := CanvasLayer.new(); ll.layer = 2; add_child(ll)
	labels = Node2D.new(); ll.add_child(labels)
	for L in D.world.get("lights", []):
		var s := Sprite2D.new(); s.texture = Art.radial(); s.position = Vector2(L[0], L[1])
		var m := CanvasItemMaterial.new(); m.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD; s.material = m
		s.scale = Vector2.ONE * float(L[2]) / 40.0; s.modulate = Color(1, 0.75, 0.4, 0); glow.add_child(s); lamp_nodes.append(s)
	fireflies = CPUParticles2D.new(); fireflies.amount = 70; fireflies.lifetime = 4.0; fireflies.texture = Art.dot()
	fireflies.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE; fireflies.emission_rect_extents = Vector2(330, 280)
	fireflies.position = Vector2(850, 900); fireflies.gravity = Vector2.ZERO; fireflies.initial_velocity_min = 2; fireflies.initial_velocity_max = 6
	fireflies.spread = 180; fireflies.color = Color(0.9, 1, 0.55); fireflies.scale_amount_min = 0.6; fireflies.scale_amount_max = 1.0
	var fg := Gradient.new(); fg.set_color(0, Color(1, 1, 1, 0)); fg.add_point(0.5, Color(1, 1, 1, 1)); fg.set_color(fg.get_point_count() - 1, Color(1, 1, 1, 0)); fireflies.color_ramp = fg
	var fm := CanvasItemMaterial.new(); fm.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD; fireflies.material = fm
	glow.add_child(fireflies)
	# --- citizens
	for w in D.dunia.get("warga", []):
		if w.get("mati"): continue
		_add_creature(w)
	regions.setup(self)
	# --- camera
	cam = Camera2D.new(); add_child(cam); cam.make_current()
	var c: Array = D.world.get("center", [850, 900])
	target_pos = Vector2(c[0] + 120, c[1] - 10)
	if me != "" and creatures.has(me): target_pos = creatures[me].position; target_view = get_viewport_rect().size.x / 3.0
	if mode == "web" and me == "":
		var vp0 := get_viewport_rect().size
		target_view = vp0.x / 2.0
	cam.position = target_pos; view_w = target_view
	# post-process (bloom, grade, vignette)
	var pl := CanvasLayer.new(); pl.layer = 4; add_child(pl)
	var pr := ColorRect.new(); pr.set_anchors_preset(Control.PRESET_FULL_RECT); pr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var pm := ShaderMaterial.new(); pm.shader = load("res://shaders/post.gdshader"); pr.material = pm; pl.add_child(pr)
	if director: director.attach(self)
	if mode == "desktop": _build_ui()
	built = true
	if mode == "web": JavaScriptBridge.eval("window.pokoReady && window.pokoReady()", true)

func _add_creature(w: Dictionary) -> void:
	var u := str(w.u)
	var spr: Dictionary = D.sprites.get(u, {})
	if spr.is_empty(): return
	var p: Array = homes[int(w.get("spot", 0)) % homes.size()]
	var c := PokoCreature.new()
	actors.add_child(c)
	c.setup(w, spr, Vector2(p[0], p[1]), D.world.walk, glow, labels, font)
	creatures[u] = c

func _build_ui() -> void:
	ui = CanvasLayer.new(); ui.layer = 5; add_child(ui)
	info = Label.new(); info.position = Vector2(12, 10)
	info.add_theme_font_size_override("font_size", 15); info.add_theme_color_override("font_outline_color", Color(0.1, 0.07, 0.08))
	info.add_theme_constant_override("outline_size", 6); ui.add_child(info)

# ---------------------------------------------------------------- frame
func _process(dt: float) -> void:
	if not built:
		if mode == "web":
			waiting += dt
			var ok := D.web_ready()
			if int(waiting * 2) != int((waiting - dt) * 2): print("poko: menunggu data ", ok)
			if ok: _build(); print("poko: dunia siap, ", creatures.size(), " warga")
		return
	clock += dt
	if director: director.step(clock)
	_sky()
	# camera smoothing (interactive) or direct (video)
	if not director:
		cam.position = cam.position.lerp(target_pos, clampf(dt * 10.0, 0, 1))
		view_w = lerpf(view_w, target_view, clampf(dt * 10.0, 0, 1))
	var vp := get_viewport_rect().size
	cam.zoom = Vector2.ONE * (vp.x / view_w)
	for i in clouds.size():
		var c: Sprite2D = clouds[i]; c.position.x += dt * (5.0 + i); if c.position.x > 2000: c.position.x = -300
	_labels(vp)
	PokoCreature.cam_pos = cam.position; PokoCreature.cam_zoom = cam.zoom.x; PokoCreature.vp_half = vp / 2.0
	if info:
		info.text = "Dunia Pokomen HD · %s · %d warga" % [_jam_nama(), creatures.size()]

func _sky() -> void:
	var h := hour_override
	if director: h = director.hour(clock)
	elif h < 0.0:
		var t := Time.get_unix_time_from_system() / 3600.0 + 7.0
		h = fposmod(t, 24.0)
	hour = h
	var dark := 0.0; var warm := 0.0
	if h < 4.5 or h >= 19.5: dark = 1.0
	elif h < 6.5: dark = 1.0 - clampf((h - 4.5) / 2.0, 0, 1); warm = 1.0 - absf(h - 5.6) / 1.1
	elif h >= 16.5: dark = clampf((h - 17.6) / 1.9, 0, 1); warm = 1.0 - absf(h - 17.8) / 1.4
	warm = clampf(warm, 0, 1)
	var col := Color(1, 1, 1).lerp(Color8(70, 82, 150), dark * 0.82).lerp(Color8(255, 176, 120), warm * 0.45)
	modulate_node.color = col
	actors.set_meta("night", dark)
	var flick := 0.92 + 0.08 * sin(clock * 9.0)
	for s in lamp_nodes: s.modulate.a = 0.75 * clampf((dark - 0.2) / 0.6, 0, 1) * flick
	fireflies.modulate.a = clampf((dark - 0.4) / 0.4, 0, 1)
	for c in clouds: c.modulate.a = 0.10 * (1.0 - dark)

func _jam_nama() -> String:
	var h := hour
	if h < 4.5: return "Malam"
	if h < 6.5: return "Fajar"
	if h < 11: return "Pagi"
	if h < 15: return "Siang"
	if h < 18: return "Sore"
	return "Malam"

var _lab_t := 0.0
func _labels(vp: Vector2) -> void:
	_lab_t -= get_process_delta_time()
	if _lab_t > 0: return
	_lab_t = 0.2
	var z := cam.zoom.x
	var half := vp / z / 2.0
	var rect := Rect2(cam.position - half, half * 2.0)
	var ranked: Array = []
	for u in creatures:
		var c: PokoCreature = creatures[u]
		c.label.visible = false
		if not rect.has_point(c.position): continue
		var pr := 0.0
		if u == me: pr += 1e9
		if u == selected: pr += 1e8
		if director and director.labelled.has(u): pr += 1e8
		if c.w.get("gelar") or c.w.get("sahabat"): pr += 1e7
		pr += c.tier * 1e5 - c.position.distance_to(cam.position)
		ranked.append([pr, c])
	ranked.sort_custom(func(a, b): return a[0] > b[0])
	var limit := 0 if z < 0.9 else (8 if z < 1.9 else 24)
	if director: limit = director.label_limit; label_px = director.label_px
	var lim_px := 0.0
	var boxes: Array = []
	for i in ranked.size():
		var c: PokoCreature = ranked[i][1]
		var forced: bool = ranked[i][0] >= 1e7
		if i >= limit and not forced: break
		var u := str(c.w.u)
		var name := str(c.w.get("nama", ""))
		if c.w.get("kembar"): name += " " + str(int(c.w.get("spot", 0)) + 1)
		var tag := ""
		var g := str(c.w.get("gelar")) if c.w.get("gelar") != null else ""
		if g != "": tag = "♛ " if g.begins_with("Ketua") else ""
		c.label.text = ("★ " if u == me else "") + tag + name
		c.label.add_theme_font_size_override("font_size", int(label_px))
		c.label.add_theme_color_override("font_color", Color8(255, 214, 64) if (g != "" or u == me) else (Color8(255, 179, 209) if c.w.get("sahabat") else Color.WHITE))
		var r := Rect2(c.position + Vector2(-26 / z, -c.sprite_h - 12 / z), Vector2(52 / z, 11 / z))
		var clash := false
		for b in boxes:
			if b.intersects(r): clash = true; break
		if clash and not forced: continue
		boxes.append(r); c.label.visible = true

# ---------------------------------------------------------------- input (web & desktop)
func _unhandled_input(e: InputEvent) -> void:
	if not built or director: return
	var vp := get_viewport_rect().size
	if e is InputEventMouseButton:
		if e.button_index == MOUSE_BUTTON_WHEEL_UP and e.pressed: _zoom_step(e.position, 1)
		elif e.button_index == MOUSE_BUTTON_WHEEL_DOWN and e.pressed: _zoom_step(e.position, -1)
		elif e.button_index == MOUSE_BUTTON_LEFT:
			if e.pressed: dragging = true; drag_from = e.position; moved = 0.0
			else:
				dragging = false
				if moved < 8.0 * DisplayServer.screen_get_scale(): _tap(e.position)
	elif e is InputEventMouseMotion and dragging and touches.size() < 2:
		var d: Vector2 = e.relative
		moved += d.length(); target_pos -= d / cam.zoom.x; cam.position = target_pos
	elif e is InputEventScreenTouch:
		if e.pressed: touches[e.index] = e.position
		else: touches.erase(e.index)
	elif e is InputEventScreenDrag:
		if touches.size() == 2 and touches.has(e.index):
			var keys := touches.keys()
			var a: Vector2 = touches[keys[0]]; var b: Vector2 = touches[keys[1]]
			var before := a.distance_to(b)
			touches[e.index] = e.position
			a = touches[keys[0]]; b = touches[keys[1]]
			var after := a.distance_to(b)
			if before > 1.0 and after > 1.0:
				pinch_acc += log(after / before)
				if absf(pinch_acc) > 0.35: _zoom_step((a + b) / 2.0, 1 if pinch_acc > 0 else -1); pinch_acc = 0.0
		else:
			touches[e.index] = e.position
	elif e is InputEventMagnifyGesture:
		_zoom_step(e.position, 1 if e.factor > 1.0 else -1)
	target_pos = target_pos.clamp(Vector2(150, 200), Vector2(1550, 1600))

func _zoom_step(p: Vector2, dir: int) -> void:
	var vp := get_viewport_rect().size
	var z0 := cam.zoom.x
	var i := 0
	for k in ZOOMS.size():
		if absf(ZOOMS[k] - z0) < absf(ZOOMS[i] - z0): i = k
	i = clampi(i + dir, 0, ZOOMS.size() - 1)
	var world_before := cam.position + (p - vp / 2.0) / z0
	var z: float = ZOOMS[i]
	target_view = vp.x / z; view_w = target_view
	cam.zoom = Vector2.ONE * z
	target_pos = world_before - (p - vp / 2.0) / z; cam.position = target_pos

func _tap(p: Vector2) -> void:
	var vp := get_viewport_rect().size
	var wp := cam.position + (p - vp / 2.0) / cam.zoom.x
	var best := ""; var bd := 22.0 / maxf(0.6, cam.zoom.x) + 10.0
	for u in creatures:
		var c: PokoCreature = creatures[u]
		var d := wp.distance_to(c.position + Vector2(0, -c.sprite_h * 0.45))
		if d < bd: bd = d; best = u
	selected = best
	_lab_t = 0
	if best != "":
		target_pos = creatures[best].position + Vector2(0, -20)
		if mode == "web": JavaScriptBridge.eval("window.pokoSelect && window.pokoSelect(%s)" % JSON.stringify(best), true)
	elif mode == "web":
		JavaScriptBridge.eval("window.pokoSelect && window.pokoSelect(null)", true)

func _on_fly(args) -> void:
	if args.size() > 0: fly_to(str(args[0]))

# called from the page: fly to a creature (search box, "Hewanku")
func fly_to(u: String) -> void:
	if creatures.has(u):
		selected = u; target_pos = creatures[u].position + Vector2(0, -20); target_view = get_viewport_rect().size.x / 3.0; _lab_t = 0
