// Animated water on the pre-rendered world map: ripples, glints and gentle colour drift.
shader_type canvas_item;

uniform float time_scale = 1.0;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void fragment() {
	vec4 c = texture(TEXTURE, UV);
	// water in the map is a saturated blue (~ 63,143,208)
	float water = smoothstep(0.08, 0.2, c.b - c.r - 0.25) * step(0.55, c.b);
	if (water > 0.0) {
		vec2 px = UV / TEXTURE_PIXEL_SIZE;
		float t = TIME * time_scale;
		float w1 = sin(px.x * 0.09 + px.y * 0.17 + t * 1.3);
		float w2 = sin(px.x * -0.05 + px.y * 0.21 - t * 0.9);
		float ripple = (w1 + w2) * 0.5;
		vec3 col = c.rgb + vec3(0.02, 0.035, 0.05) * ripple;
		// sparkling glints
		vec2 cell = floor(px / 6.0);
		float h = hash(cell);
		float tw = pow(max(0.0, sin(t * (1.5 + h * 2.0) + h * 40.0)), 24.0);
		col += vec3(0.75, 0.85, 1.0) * tw * step(0.86, h) * 0.8;
		c.rgb = mix(c.rgb, col, water);
	}
	COLOR = c;
}
