# Planned regions (Wilayah 1-3) and Pusat Koloni drawn as dashed glowing rings on the ground.
extends Node2D

const REG := {1: [6.0, 6.0, 10.5], 2: [19.0, -9.0, 9.0], 3: [-16.0, -18.0, 12.0]}
const COL := {1: Color8(255, 205, 50), 2: Color8(90, 170, 255), 3: Color8(110, 200, 90)}
const PK := [-4.0, -6.0, 4.6]
var show := {}            # n -> alpha 0..1 (also "pk")
var main

func setup(m) -> void: main = m

static func iso(u: float, v: float) -> Vector2:
	return Vector2(850 + (u - v) * 16, 804 + (u + v) * 8)

func ring(a: float, b: float, r: float, n := 64) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for q in n: pts.append(iso(a + r * cos(q * TAU / n), b + r * sin(q * TAU / n)))
	return pts

func _process(_dt: float) -> void:
	queue_redraw()

func _draw() -> void:
	var t: float = main.clock if main else 0.0
	for n in REG:
		var a: float = show.get(n, 0.0)
		if a <= 0.01: continue
		var r: Array = REG[n]
		var pts := ring(r[0], r[1], r[2])
		draw_colored_polygon(pts, Color(COL[n], 0.22 * a))
		var dash := int(t * 6) % 2
		for q in range(dash, pts.size(), 2):
			draw_line(pts[q], pts[(q + 1) % pts.size()], Color(COL[n], a), 3.0)
	var pa: float = show.get("pk", 0.0)
	if pa > 0.01:
		var pts := ring(PK[0], PK[1], PK[2])
		draw_colored_polygon(pts, Color(0.9, 0.84, 0.7, 0.85 * pa))
		for q in range(int(t * 6) % 2, pts.size(), 2):
			draw_line(pts[q], pts[(q + 1) % pts.size()], Color(0.59, 0.38, 0.23, pa), 3.0)
