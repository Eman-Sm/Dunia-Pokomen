# Planned regions (Wilayah 1-3) and Pusat Koloni drawn as dashed glowing rings on the ground.
extends Node2D

const REG := {1: [6.0, 6.0, 10.5], 2: [19.0, -9.0, 9.0], 3: [-16.0, -18.0, 12.0]}
const COL := {1: Color8(255, 205, 50), 2: Color8(90, 170, 255), 3: Color8(110, 200, 90), 4: Color8(240, 120, 160), 5: Color8(170, 140, 240)}
const PK := [-4.0, -6.0, 4.6]
var show := {}            # n -> alpha 0..1 (also "pk")
var main

func setup(m) -> void: main = m

static func iso(u: float, v: float) -> Vector2:
	return Vector2(850 + (u - v) * 16, 804 + (u + v) * 8)

func ring(a: float, b: float, r: float, n := 64) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for q in n: pts.append(Vector2(a + r * cos(q * TAU / n), b + r * 0.9 * sin(q * TAU / n)))
	return pts

func _process(_dt: float) -> void:
	queue_redraw()

func _draw() -> void:
	var t: float = main.clock if main else 0.0
	var RG: Dictionary = main.D.world.get("regions", {}) if main else {}
	for key in RG:
		var n := int(key)
		var a: float = show.get(n, 0.0)
		if a <= 0.01: continue
		var r: Array = RG[key]
		var pts := ring(r[0], r[1], r[2])
		draw_colored_polygon(pts, Color(COL.get(n, Color.WHITE), 0.18 * a))
		var dash := int(t * 6) % 2
		for q in range(dash, pts.size(), 2):
			draw_line(pts[q], pts[(q + 1) % pts.size()], Color(COL.get(n, Color.WHITE), a), 2.0)
	var pa: float = show.get("pk", 0.0)
	if pa > 0.01:
		var pk: Array = main.D.world.get("pk", [960, 700])
		var pts := ring(pk[0], pk[1], 84.0)
		for q in range(int(t * 6) % 2, pts.size(), 2):
			draw_line(pts[q], pts[(q + 1) % pts.size()], Color(0.59, 0.38, 0.23, pa), 3.0)
