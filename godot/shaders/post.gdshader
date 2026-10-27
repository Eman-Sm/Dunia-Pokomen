// Pixel-art grade on the low-res frame: slight saturation & contrast lift and a stepped vignette.
shader_type canvas_item;
uniform sampler2D screen_tex : hint_screen_texture, filter_nearest;
uniform float vignette = 0.28;
uniform float saturation = 1.12;

void fragment() {
	vec2 uv = SCREEN_UV;
	vec3 c = texture(screen_tex, uv).rgb;
	float l = dot(c, vec3(0.299, 0.587, 0.114));
	c = mix(vec3(l), c, saturation);
	c = (c - 0.5) * 1.05 + 0.5;
	float d = distance(uv, vec2(0.5));
	float v = floor(smoothstep(0.38, 0.9, d) * 4.0) / 4.0;
	c *= 1.0 - vignette * v;
	COLOR = vec4(c, 1.0);
}
