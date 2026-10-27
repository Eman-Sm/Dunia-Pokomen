# One citizen walking around its plot. Position = feet (y-sorted in the Actors layer).
class_name PokoCreature
extends Node2D

var w := {}
var home := Vector2.ZERO
var near: Array = []            # walkable points around home
var rng := RandomNumberGenerator.new()
var target := Vector2.ZERO
var mode := "idle"
var until := 0.0
var face := 1.0
var walk_phase := 0.0
var seed_f := 0.0
var scripted := false
var seated := false
var frames := 1           # video director moves it
var spawn_t := -1.0             # birth pop
var flash_t := -1.0             # white flash (evolution)

var body: Sprite2D
var flash: Sprite2D
var crown: Sprite2D
var aura: Sprite2D              # lives in the glow layer (not darkened at night)
var sparks: CPUParticles2D
var label: Label
var el_col := Color.WHITE
var sprite_h := 36.0
var base_scale := 1.0
var tier := 0
static var cam_pos := Vector2.ZERO
static var cam_zoom := 1.0
static var vp_half := Vector2(180, 320)

func setup(data: Dictionary, spr: Dictionary, home_pos: Vector2, walk_pts: Array, glow_layer: Node2D, label_layer: Node2D, font: Font) -> void:
	w = data
	tier = int(w.get("tier", 0))
	home = home_pos
	position = home + Vector2(randf_range(-6, 6), randf_range(-3, 3))
	target = position
	rng.seed = str(w.get("u", "")).hash()
	seed_f = rng.randf() * 10.0
	until = rng.randf_range(0.3, 4.0)
	face = -1.0 if rng.randf() < .5 else 1.0
	for p in walk_pts:
		if Vector2(p[0] - home.x, (p[1] - home.y) * 1.3).length() < 80: near.append(Vector2(p[0], p[1]))
	el_col = PokoData.element_color(w.get("elemen"))
	body = Sprite2D.new(); body.centered = false; add_child(body)
	flash = Sprite2D.new(); flash.centered = false; flash.visible = false; add_child(flash)
	var mat := CanvasItemMaterial.new(); mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD; flash.material = mat
	set_sprite(spr)
	# crowns
	var g := str(w.get("gelar", "") if w.get("gelar") != null else "")
	if g.begins_with("Ketua Koloni") or w.get("sahabat"):
		crown = Sprite2D.new(); crown.texture = Art.crown_rose() if (w.get("sahabat") and not g.begins_with("Ketua")) else Art.crown_gold()
		crown.scale = Vector2(1.0, 1.0); add_child(crown)
	# aura for evolved citizens (additive glow, kept bright at night)
	if tier >= 2:
		aura = Sprite2D.new(); aura.texture = Art.radial(); aura.modulate = Color(el_col, 0.0)
		var am := CanvasItemMaterial.new(); am.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD; aura.material = am
		glow_layer.add_child(aura)
	if tier >= 3:
		sparks = CPUParticles2D.new(); sparks.amount = 4; sparks.lifetime = 2.2; sparks.texture = Art.spark()
		sparks.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE; sparks.emission_sphere_radius = 9.0
		sparks.direction = Vector2(0, -1); sparks.spread = 30; sparks.gravity = Vector2(0, -6); sparks.initial_velocity_min = 4; sparks.initial_velocity_max = 10
		sparks.scale_amount_min = 1.0; sparks.scale_amount_max = 1.0; sparks.color = el_col.lightened(0.3)
		var grad := Gradient.new(); grad.set_color(0, Color(1, 1, 1, 0)); grad.add_point(0.2, Color(1, 1, 1, 1)); grad.set_color(grad.get_point_count() - 1, Color(1, 1, 1, 0)); sparks.color_ramp = grad
		var sm := CanvasItemMaterial.new(); sm.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD; sparks.material = sm
		glow_layer.add_child(sparks)
	label = Label.new(); label.text = str(w.get("nama", "")); label.visible = false
	label.add_theme_font_override("font", font); label.add_theme_font_size_override("font_size", 9)
	var sb := StyleBoxFlat.new(); sb.bg_color = Color8(26, 20, 30, 220); sb.border_color = Color8(43, 27, 23); sb.set_border_width_all(1); sb.content_margin_left = 3; sb.content_margin_right = 3; sb.content_margin_top = 0; sb.content_margin_bottom = 1; sb.anti_aliasing = false
	label.add_theme_stylebox_override("normal", sb)
	label.add_theme_color_override("font_color", Color.WHITE); label.add_theme_color_override("font_outline_color", Color(0.1, 0.07, 0.08))
	label.add_theme_constant_override("outline_size", 0); label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label_layer.add_child(label)

func set_sprite(spr: Dictionary) -> void:
	if spr.is_empty(): return
	var tex: Texture2D = spr.tex
	var px := float(spr.px); var grow := float(spr.grow)
	var s := grow / px
	frames = int(spr.get("frames", 1))
	body.texture = tex; flash.texture = tex
	body.hframes = frames; flash.hframes = frames
	body.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	flash.texture_filter = body.texture_filter
	base_scale = s
	body.scale = Vector2(s, s); flash.scale = body.scale
	var sz := tex.get_size(); sz.x /= frames
	body.offset = Vector2(-floorf(sz.x / 2.0), -31.0 * px); flash.offset = body.offset
	sprite_h = (30.0 if frames > 1 else 36.0) * grow

func _process(dt: float) -> void:
	var now := PokoMain.clock
	if not scripted: _wander(now, dt)
	var moving := mode == "walk"
	var bob := 0.0 if frames > 1 else (absf(sin(walk_phase)) * 2.2 if moving else 0.0)
	var breath := 1.0 + (0.0 if frames > 1 else 0.025 * sin(now * 2.4 + seed_f))
	var sq := (1.0 if frames > 1 else 1.0 + 0.06 * cos(walk_phase * 2.0)) if moving else breath
	if frames > 1: body.frame = (1 + int(walk_phase / PI) % 2) if moving else 0
	var pop := 1.0
	if spawn_t >= 0.0:
		var a := clampf((now - spawn_t) / 0.4, 0.0, 1.0); pop = _out_back(a)
	body.position = Vector2(0, -bob - (9.0 if seated else 0.0))
	body.scale = Vector2(base_scale * face / sqrt(sq) * pop, base_scale * sq * pop)
	flash.visible = flash_t >= 0.0 and now - flash_t < 0.4
	if flash.visible:
		flash.position = body.position; flash.scale = body.scale; flash.frame = body.frame; flash.modulate = Color(1, 1, 1, 1.0 - (now - flash_t) / 0.4)
	var head := position + Vector2(0, -sprite_h - bob - (9.0 if seated else 0.0))
	if crown:
		crown.position = Vector2(0, -sprite_h - 3 - bob - (9.0 if seated else 0.0) + round(sin(now * 3.0)))
		crown.scale = Vector2.ONE
	if aura:
		aura.global_position = position + Vector2(0, -sprite_h * 0.45)
		var night: float = get_parent().get_meta("night", 0.0)
		var a := 0.10 + 0.18 * night if tier >= 3 else 0.10 * night
		aura.modulate = Color(el_col, a * (0.85 + 0.15 * sin(now * 2.0 + seed_f)))
		var r := (0.9 if tier >= 3 else 0.7)
		aura.scale = Vector2(r, r * 0.8)
	if sparks: sparks.global_position = position + Vector2(0, -sprite_h * 0.45)
	if label and label.visible:
		label.reset_size()
		var sp := (head - cam_pos) * cam_zoom + vp_half
		label.position = (sp + Vector2(-label.size.x / 2.0, -label.size.y - (6.0 if crown else 1.0) * cam_zoom)).round()

func _wander(now: float, dt: float) -> void:
	if mode == "walk":
		var d := target - position
		var sp := (10.0 + minf(4, tier) * 1.5) * dt
		if d.length() <= sp:
			position = target; mode = "idle"; until = now + rng.randf_range(1.5, 6.0)
		else:
			position += d.normalized() * sp; walk_phase += dt * 9.0
			if absf(d.x) > 0.3: face = -1.0 if d.x < 0 else 1.0
	elif now > until:
		if rng.randf() < 0.72 and near.size() > 0:
			target = near[rng.randi() % near.size()] + Vector2(rng.randf_range(-5, 5), rng.randf_range(-3, 3)); mode = "walk"
		else:
			until = now + rng.randf_range(1.5, 4.0); face *= -1.0 if rng.randf() < 0.3 else 1.0

func _out_back(x: float) -> float:
	var c1 := 1.70158; var c3 := c1 + 1.0
	return 1.0 + c3 * pow(x - 1.0, 3) + c1 * pow(x - 1.0, 2)

func _exit_tree() -> void:
	for n in [aura, sparks, label]:
		if n and is_instance_valid(n): n.queue_free()

func _draw() -> void:
	draw_set_transform(Vector2.ZERO, 0, Vector2(1, 0.32))
	draw_circle(Vector2.ZERO, 7.0, Color(0.08, 0.12, 0.04, 0.32))
