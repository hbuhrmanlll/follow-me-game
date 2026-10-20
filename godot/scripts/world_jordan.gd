## The Jordan River valley in 3D: a sandy bank to walk along, the river behind
## it, reeds, date palms, acacia trees, oleander bushes, rocks, the travelers'
## goat-hair tents, flowers, birds, and mountain ridges fading into the haze.
## Everything is made in code. Scenery is merged into a few big meshes so the
## game stays smooth on phones, and plants sway in the wind.
class_name WorldJordan
extends Node3D

const WALK_MIN := Vector3(-18.0, 0.0, -1.2)
const WALK_MAX := Vector3(64.0, 0.0, 6.5)
const RIVER_NEAR := -3.0 # z of the near edge of the water
const RIVER_FAR := -12.0
const STORY_POINT := Vector3(48.0, 0.0, -1.5) # where John baptizes, at the water's edge
const WATER_Y := -0.3
const HAZE := Color("c9d8e0")

var rng := RandomNumberGenerator.new()
var noise := FastNoiseLite.new()
var sun: DirectionalLight3D
var env: Environment
var solid: SurfaceTool # opaque scenery
var leafy: SurfaceTool # leaves and reeds: two-sided, and they sway
var birds: Array[Node3D] = []
var _t := 0.0


func build() -> void:
	rng.seed = 3
	noise.seed = 11
	noise.frequency = 0.05
	_environment()
	_terrain()
	_water()
	_ridges()
	solid = SurfaceTool.new()
	solid.begin(Mesh.PRIMITIVE_TRIANGLES)
	leafy = SurfaceTool.new()
	leafy.begin(Mesh.PRIMITIVE_TRIANGLES)
	# Reeds along both banks
	for i in 220:
		var x := rng.randf_range(-40, 100)
		_reeds(Vector3(x, 0, RIVER_NEAR + rng.randf_range(-0.7, 0.5)))
		if i % 2 == 0:
			_reeds(Vector3(x + 0.7, 0, RIVER_FAR + rng.randf_range(-0.4, 0.9)))
	# Date palms on the near bank and across the river
	for p in [Vector3(-12, 0, -2.2), Vector3(4, 0, -2.4), Vector3(16, 0, -2.6), Vector3(27, 0, -2.2), Vector3(38, 0, -2.3), Vector3(57, 0, -2.4), Vector3(-4, 0, -2.5), Vector3(70, 0, -2.4),
			Vector3(61, 0, -14.5), Vector3(22, 0, -14.5), Vector3(44, 0, -14), Vector3(5, 0, -15), Vector3(-10, 0, -16), Vector3(33, 0, -18), Vector3(52, 0, -19), Vector3(14, 0, -20)]:
		_palm(p, rng.randf_range(4.5, 6.5))
	for p in [Vector3(-16, 0, -2.6), Vector3(10, 0, -2.8), Vector3(21, 0, -2.7), Vector3(33, 0, -2.9), Vector3(63, 0, -2.6), Vector3(-2, 0, -16), Vector3(28, 0, -16), Vector3(40, 0, -21), Vector3(66, 0, -17), Vector3(-22, 0, -18)]:
		_acacia(p)
	for i in 40: # oleander bushes with pink flowers by the water
		var z := RIVER_NEAR + rng.randf_range(0.2, 1.2) if i % 2 else RIVER_FAR - rng.randf_range(0.5, 2.5)
		_bush(Vector3(rng.randf_range(-35, 95), 0, z), rng.randf_range(0.5, 0.9), i % 3 == 0)
	for i in 34: # bushes behind the path
		_bush(Vector3(rng.randf_range(-35, 95), 0, WALK_MAX.z + rng.randf_range(2.5, 9.0)), rng.randf_range(0.5, 1.0), false)
	for i in 60:
		var z := WALK_MAX.z + rng.randf_range(1.5, 8.0) if i % 3 else RIVER_FAR - rng.randf_range(1.0, 10.0)
		_rock(Vector3(rng.randf_range(-35, 95), 0, z), rng.randf_range(0.2, 0.75))
	for i in 120: # pebbles along the path
		_rock(Vector3(rng.randf_range(-25, 72), -0.02, rng.randf_range(-1.0, 9.0)), rng.randf_range(0.04, 0.09))
	for i in 700: # grass and wildflowers
		var z := rng.randf_range(WALK_MAX.z + 0.5, 16.0) if i % 2 else rng.randf_range(RIVER_FAR - 14.0, RIVER_FAR - 0.5)
		var at := Vector3(rng.randf_range(-40, 100), 0, z)
		at.y = _height(at.x, at.z)
		_tuft(at)
	for i in 160: # a few tufts at the edges of the path
		var at := Vector3(rng.randf_range(-25, 72), 0, [rng.randf_range(-1.6, -0.9), rng.randf_range(5.6, 7.0)][i % 2])
		_tuft(at)
	for p in [Vector3(-9, 0, -16.5), Vector3(12, 0, -16), Vector3(28, 0, -18), Vector3(54, 0, -16.5), Vector3(-26, 0, 11), Vector3(20, 0, 12.5), Vector3(76, 0, 11)]:
		_tent(p, rng.randf_range(-0.4, 0.4) + (PI if p.z > 0 else 0.0))
	_finish()
	_birds()


# ------------------------------------------------------------- light and sky

func _environment() -> void:
	env = Environment.new()
	var sky := Sky.new()
	var sm := ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = """
shader_type sky;
uniform vec3 top : source_color = vec3(0.24, 0.5, 0.82);
uniform vec3 horizon : source_color = vec3(0.78, 0.86, 0.9);
uniform vec3 ground : source_color = vec3(0.55, 0.5, 0.4);
uniform sampler2D clouds : repeat_enable, filter_linear_mipmap;
void sky() {
	vec3 d = EYEDIR;
	float h = d.y;
	vec3 col = mix(horizon, top, pow(clamp(h, 0.0, 1.0), 0.55));
	if (h < 0.0) col = mix(horizon, ground, clamp(-h * 5.0, 0.0, 1.0));
	float sd = max(dot(d, LIGHT0_DIRECTION), 0.0);
	col += LIGHT0_COLOR * (pow(sd, 900.0) * 6.0 + pow(sd, 12.0) * 0.18);
	if (h > 0.01) {
		vec2 uv = d.xz / (h + 0.06) * 0.12;
		float c = texture(clouds, uv).r * 0.7 + texture(clouds, uv * 2.7 + 0.3).r * 0.3;
		c = smoothstep(0.48, 0.78, c) * smoothstep(0.01, 0.22, h);
		vec3 cloud = mix(vec3(0.82, 0.86, 0.9), vec3(1.0, 0.99, 0.96), smoothstep(0.5, 0.9, c));
		col = mix(col, cloud, c * 0.9);
	}
	COLOR = col;
}
"""
	sm.shader = sh
	var ct := NoiseTexture2D.new()
	ct.width = 512
	ct.height = 512
	ct.seamless = true
	var cn := FastNoiseLite.new()
	cn.seed = 5
	cn.frequency = 0.008
	cn.fractal_octaves = 5
	ct.noise = cn
	sm.set_shader_parameter("clouds", ct)
	sky.sky_material = sm
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("a9bfd6") # cool sky light in the shadows
	env.ambient_light_energy = 0.55
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.0
	env.tonemap_white = 6.0
	env.glow_enabled = true
	env.glow_intensity = 0.35
	env.glow_bloom = 0.04
	env.glow_hdr_threshold = 1.1
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.0
	env.adjustment_contrast = 1.06
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	# Warm afternoon sun from the front left, so faces and robes have shape
	sun = DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-38, -58, 0)
	sun.light_color = Color("ffe4bc")
	sun.light_energy = 1.45
	sun.shadow_enabled = true
	sun.shadow_bias = 0.04
	sun.shadow_blur = 1.2
	sun.directional_shadow_max_distance = 42.0
	add_child(sun)


# ------------------------------------------------------------------ ground

func _height(x: float, z: float) -> float:
	var y := noise.get_noise_2d(x, z) * 0.35
	if z > RIVER_NEAR - 1.0 and z < WALK_MAX.z + 1.5:
		y *= 0.12 # the walking path is nearly flat
	# The riverbed, with sloping banks
	var near_bank := smoothstep(RIVER_NEAR + 0.4, RIVER_NEAR - 1.4, z)
	var far_bank := smoothstep(RIVER_FAR - 0.4, RIVER_FAR + 1.4, z)
	y -= 1.0 * near_bank * far_bank
	if z <= RIVER_FAR - 1.0:
		y += (RIVER_FAR - 1.0 - z) * 0.06 # the far side rises toward the hills
	elif z > WALK_MAX.z + 2.0:
		y += (z - WALK_MAX.z - 2.0) * 0.05
	return y


func _ground_color(x: float, z: float, y: float) -> Color:
	var n := noise.get_noise_2d(x * 2.3, z * 2.3) * 0.5 + 0.5
	var n2 := noise.get_noise_2d(x * 0.7 + 50, z * 0.7) * 0.5 + 0.5
	var sand := Color("c6b692").lerp(Color("b6a47e"), n)
	var grass := Color("7a8f45").lerp(Color("97a252"), n)
	var dry := Color("a8955e").lerp(Color("b5a06a"), n)
	var c := sand
	if z < RIVER_FAR + 0.5:
		c = grass.lerp(dry, smoothstep(0.35, 0.75, n2)) # the far bank
	elif z > WALK_MAX.z + 1.5:
		c = sand.lerp(grass.lerp(dry, n2), smoothstep(WALK_MAX.z + 1.5, WALK_MAX.z + 6.0, z) * 0.85)
	# Wet, darker sand and mud at the water's edge
	var wet := smoothstep(WATER_Y + 0.35, WATER_Y - 0.1, y)
	c = c.lerp(Color("7a6a4a"), wet * 0.75)
	return c


func _terrain() -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var x0 := -70.0
	var z0 := -42.0
	var step := 1.0
	var nx := 230
	var nz := 72
	for j in nz + 1:
		for i in nx + 1:
			var x := x0 + i * step
			var z := z0 + j * step
			var y := _height(x, z)
			st.set_color(_ground_color(x, z, y))
			st.set_uv(Vector2(x, z))
			st.add_vertex(Vector3(x, y, z))
	for j in nz:
		for i in nx:
			var a := j * (nx + 1) + i
			var b := a + 1
			var c := a + nx + 1
			var d := c + 1
			st.add_index(a); st.add_index(b); st.add_index(c)
			st.add_index(b); st.add_index(d); st.add_index(c)
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	var m := ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode diffuse_lambert, specular_disabled;
uniform sampler2D grain : repeat_enable, filter_linear_mipmap;
void fragment() {
	float g = texture(grain, UV * 0.35).r * 0.6 + texture(grain, UV * 1.7).r * 0.4;
	ALBEDO = pow(COLOR.rgb, vec3(2.2)) * (0.86 + g * 0.28);
	ROUGHNESS = 1.0;
}
"""
	m.shader = sh
	var gt := NoiseTexture2D.new()
	gt.seamless = true
	gt.width = 256
	gt.height = 256
	var gn := FastNoiseLite.new()
	gn.frequency = 0.06
	gn.fractal_octaves = 3
	gt.noise = gn
	m.set_shader_parameter("grain", gt)
	mi.material_override = m
	add_child(mi)


func _water() -> void:
	var mi := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(240, RIVER_NEAR - RIVER_FAR + 1.6)
	pm.subdivide_width = 120
	pm.subdivide_depth = 8
	mi.mesh = pm
	mi.position = Vector3(20, WATER_Y, (RIVER_NEAR + RIVER_FAR) / 2.0)
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled;
uniform vec3 deep : source_color = vec3(0.1, 0.3, 0.32);
uniform vec3 shallow : source_color = vec3(0.3, 0.46, 0.38);
uniform vec3 sky : source_color = vec3(0.55, 0.7, 0.8);
uniform sampler2D ripples : repeat_enable, filter_linear_mipmap;
varying vec3 wpos;
void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	VERTEX.y += sin(wpos.x * 0.7 + TIME * 1.4) * 0.018 + sin(wpos.z * 1.6 + wpos.x * 0.3 + TIME * 1.9) * 0.012;
}
void fragment() {
	vec2 flow = vec2(TIME * 0.05, 0.0); // the river flows along x
	float n1 = texture(ripples, wpos.xz * 0.09 + flow).r;
	float n2 = texture(ripples, wpos.xz * vec2(0.21, 0.3) + flow * 1.7 + 0.5).r;
	vec3 n = normalize(vec3((n1 - 0.5) * 0.5 + (n2 - 0.5) * 0.35, 1.0, (n2 - 0.5) * 0.5));
	NORMAL = normalize((VIEW_MATRIX * vec4(n, 0.0)).xyz);
	float edge = min(UV.y, 1.0 - UV.y);
	float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 4.0);
	vec3 col = mix(shallow, deep, smoothstep(0.04, 0.3, edge));
	col = mix(col, sky, clamp(fres * 0.6 + 0.05, 0.0, 0.5));
	float foam = smoothstep(0.085, 0.05, edge + (n1 - 0.5) * 0.04);
	col = mix(col, vec3(0.92, 0.94, 0.9), foam * 0.6);
	ALBEDO = col;
	ROUGHNESS = 0.06;
	SPECULAR = 0.8;
	ALPHA = mix(0.75, 0.96, smoothstep(0.03, 0.25, edge));
}
"""
	var m := ShaderMaterial.new()
	m.shader = sh
	var rt := NoiseTexture2D.new()
	rt.seamless = true
	rt.width = 256
	rt.height = 256
	var rn := FastNoiseLite.new()
	rn.frequency = 0.03
	rn.fractal_octaves = 3
	rt.noise = rn
	m.set_shader_parameter("ripples", rt)
	mi.material_override = m
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)


# Mountain ridges behind the far bank, each farther one paler and bluer in the haze.
func _ridges() -> void:
	var layers := [[-34.0, 5.0, Color("8f8a5a")], [-52.0, 10.0, Color("9a8f72")], [-80.0, 18.0, Color("a49a8a")], [-120.0, 26.0, Color("b1aeaa")]]
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rn := FastNoiseLite.new()
	rn.frequency = 0.012
	rn.fractal_octaves = 4
	var base := 0
	for li in layers.size():
		var z: float = layers[li][0]
		var top: float = layers[li][1]
		var col: Color = (layers[li][2] as Color).lerp(HAZE, 0.25 + li * 0.18)
		rn.seed = 30 + li
		var xs := 120
		for i in xs + 1:
			var x := -160.0 + i * 3.0
			var h: float = top * (0.55 + rn.get_noise_1d(x) * 0.6 + 0.2 * sin(x * 0.02 + li))
			for k in 4: # from the top of the ridge down its front slope
				var t := k / 3.0
				var p := Vector3(x, h * (1.0 - t) - 3.0 * t, z + t * (8.0 + li * 6.0))
				var shade := 1.0 - 0.12 * (1.0 - t) * (0.5 + 0.5 * rn.get_noise_2d(x * 3.0, 7.0))
				st.set_color(Color(col.r * shade, col.g * shade, col.b * shade).lerp(HAZE, t * 0.15))
				st.add_vertex(p)
		for i in xs:
			for k in 3:
				var a := base + i * 4 + k
				var b := base + (i + 1) * 4 + k
				st.add_index(a); st.add_index(b); st.add_index(a + 1)
				st.add_index(b); st.add_index(b + 1); st.add_index(a + 1)
		base += (xs + 1) * 4
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.vertex_color_is_srgb = true
	m.roughness = 1.0
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED # they are far away, in soft haze
	mi.material_override = m
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)


# ----------------------------------------------------- merging the scenery

## Adds a shape to the merged scenery. sway (0..1) is how much it moves in
## the wind, stored in the colour's alpha for the shader.
func _add(st: SurfaceTool, mesh: Mesh, xf: Transform3D, color: Color, sway := 0.0, flat := false) -> void:
	var arrays := mesh.surface_get_arrays(0)
	var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	var norms: PackedVector3Array = arrays[Mesh.ARRAY_NORMAL]
	var idx: PackedInt32Array = arrays[Mesh.ARRAY_INDEX] if arrays[Mesh.ARRAY_INDEX] != null else PackedInt32Array()
	if idx.is_empty():
		for i in verts.size():
			idx.append(i)
	var nb := xf.basis.inverse().transposed()
	for t in range(0, idx.size(), 3):
		var tri := [idx[t], idx[t + 1], idx[t + 2]]
		var fn := Vector3.ZERO
		if flat:
			fn = (nb * (verts[tri[2]] - verts[tri[0]]).cross(verts[tri[1]] - verts[tri[0]])).normalized()
		for v in tri:
			var c := Color(color, sway * clamp(verts[v].y / 1.0, 0.0, 1.0) if sway > 0.0 else 0.0)
			st.set_color(c)
			st.set_uv(Vector2.ZERO)
			st.set_normal(fn if flat else (nb * norms[v]).normalized())
			st.add_vertex(xf * verts[v])


## Adds triangles given as a flat list of points (three per triangle).
func _tris(st: SurfaceTool, pts: Array, colors: Array, sways: Array, thin := true) -> void:
	for t in range(0, pts.size(), 3):
		var n: Vector3 = (pts[t + 2] - pts[t]).cross(pts[t + 1] - pts[t]).normalized()
		if n.y < 0:
			n = -n
		for k in 3:
			st.set_color(Color(colors[t + k], sways[t + k]))
			st.set_uv(Vector2(1.0 if thin else 0.0, 0))
			st.set_normal(n)
			st.add_vertex(pts[t + k])


func _finish() -> void:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode cull_disabled, diffuse_lambert;
uniform float wind = 1.0;
void vertex() {
	vec3 w = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float s = COLOR.a;
	VERTEX.x += sin(TIME * 1.7 + w.x * 0.35 + w.z * 0.2) * 0.12 * s * wind;
	VERTEX.z += sin(TIME * 1.3 + w.x * 0.27) * 0.06 * s * wind;
}
void fragment() {
	if (UV.x > 0.5) NORMAL = normalize((VIEW_MATRIX * vec4(0.15, 1.0, 0.1, 0.0)).xyz);
	ALBEDO = pow(COLOR.rgb, vec3(2.2));
	ROUGHNESS = 0.9;
	BACKLIGHT = vec3(0.25, 0.3, 0.1) * step(0.001, COLOR.a);
}
"""
	for st in [solid, leafy]:
		var mi := MeshInstance3D.new()
		mi.mesh = st.commit()
		var m := ShaderMaterial.new()
		m.shader = sh
		mi.material_override = m
		add_child(mi)


# ---------------------------------------------------------------- scenery

func _reeds(at: Vector3) -> void:
	at.y = _height(at.x, at.z) - 0.05
	for k in rng.randi_range(4, 8):
		var h := rng.randf_range(0.7, 1.7)
		var base := at + Vector3(rng.randf_range(-0.35, 0.35), 0, rng.randf_range(-0.25, 0.25))
		var lean := Vector3(rng.randf_range(-0.25, 0.25), 0, rng.randf_range(-0.2, 0.2))
		var c := Color("6f8a3e").lerp(Color("b0a85e"), rng.randf())
		var wdt := 0.025
		var tip := base + Vector3(0, h, 0) + lean
		var side := Vector3(wdt, 0, 0)
		_tris(leafy, [base - side, base + side, tip], [c.darkened(0.3), c.darkened(0.3), c], [0.0, 0.0, 1.0])
		if k % 3 == 0: # a feathery seed head
			_add(leafy, Person.sphere(0.05, 6, 4), Transform3D(Basis.from_scale(Vector3(0.6, 2.2, 0.6)), tip), Color("9a7a4a"), 1.0)


func _palm(at: Vector3, height: float) -> void:
	at.y = _height(at.x, at.z)
	var lean := Vector3(rng.randf_range(-0.6, 0.6), 0, rng.randf_range(-0.3, 0.3)) / height
	var segs := int(height / 0.32)
	var top := at
	for i in segs:
		var t := float(i) / segs
		var p := at + Vector3(0, i * 0.32 + 0.16, 0) + lean * pow(i * 0.32, 1.6)
		var r := 0.17 - t * 0.06
		var xf := Transform3D(Basis.IDENTITY, p)
		_add(solid, Person.cylinder(r * 0.92, r * 1.08, 0.34, 9), xf, Color("8a6a46") if i % 2 else Color("6e5236"))
		top = p
	top.y += 0.2
	_add(solid, Person.sphere(0.24, 8, 5), Transform3D(Basis.IDENTITY, top), Color("5e4a2a"))
	# Arching fronds, each a folded ribbon of leaflets drooping at the tip
	var n := 13
	for k in n:
		var yaw := k * TAU / n + rng.randf_range(-0.2, 0.2)
		var dir := Vector3(sin(yaw), 0, cos(yaw))
		var right := Vector3(cos(yaw), 0, -sin(yaw))
		var rise := rng.randf_range(0.3, 0.9)
		var length := rng.randf_range(2.1, 2.8)
		var pts := []
		var cols := []
		var sw := []
		var steps := 7
		var prev := top
		var prev_w := 0.0
		var col := Color("4f7a2e").lerp(Color("6f9a3a"), rng.randf())
		for s in range(1, steps + 1):
			var t := float(s) / steps
			var p := top + dir * length * t + Vector3(0, rise * t - 1.9 * t * t * t, 0)
			var wd := sin(t * PI) * 0.42 + 0.05
			var fold := Vector3(0, -wd * 0.35, 0)
			var tip_c := col.lerp(Color("8aa048"), t * 0.6)
			for sd in [-1.0, 1.0]:
				var a := prev
				var b: Vector3 = prev + right * sd * prev_w + fold * (prev_w / max(wd, 0.01))
				var c: Vector3 = p + right * sd * wd + fold
				var d := p
				pts.append_array([a, b, c, a, c, d])
				var c0 := col.lerp(Color("8aa048"), (t - 1.0 / steps) * 0.6)
				cols.append_array([c0, c0, tip_c, c0, tip_c, tip_c])
				var s0 := (t - 1.0 / steps)
				sw.append_array([s0, s0, t, s0, t, t])
			prev = p
			prev_w = wd
		_tris(leafy, pts, cols, sw)
	for d in 4: # clusters of dates
		var a := d * TAU / 4.0 + 0.4
		_add(solid, Person.sphere(0.13, 7, 5), Transform3D(Basis.from_scale(Vector3(1, 1.4, 1)), top + Vector3(cos(a) * 0.2, -0.3, sin(a) * 0.2)), Color("b0652a"))


# The umbrella-shaped acacia of the Jordan valley.
func _acacia(at: Vector3) -> void:
	at.y = _height(at.x, at.z)
	var trunk := Color("5a4632")
	var s := rng.randf_range(0.85, 1.2)
	_add(solid, Person.cylinder(0.09 * s, 0.15 * s, 1.6 * s, 8), Transform3D(Basis.IDENTITY, at + Vector3(0, 0.8 * s, 0)), trunk)
	var crowns: Array[Vector3] = []
	for b in 3:
		var a := b * TAU / 3.0 + rng.randf()
		var dir := Vector3(cos(a) * 0.55, 0.8, sin(a) * 0.55).normalized()
		var start := at + Vector3(0, 1.5 * s, 0)
		var len := 1.2 * s
		var mid := start + dir * len * 0.5
		_add(solid, Person.cylinder(0.05 * s, 0.08 * s, len, 6), Transform3D(Basis(Quaternion(Vector3.UP, dir)), mid), trunk)
		crowns.append(start + dir * len)
	var center := at + Vector3(0, 2.55 * s, 0)
	var leaf := Color("6a7f3e")
	for k in 9:
		var a := k * TAU / 9.0
		var r := rng.randf_range(0.6, 1.5) * s
		var p := center + Vector3(cos(a) * r, rng.randf_range(-0.1, 0.25), sin(a) * r)
		var sc := Vector3(rng.randf_range(0.8, 1.2), 0.32, rng.randf_range(0.8, 1.2)) * s
		_add(leafy, Person.sphere(0.75, 9, 5), Transform3D(Basis.from_scale(sc), p), leaf.lerp(Color("85954a"), rng.randf()), 0.2, true)
	_add(leafy, Person.sphere(0.9, 10, 5), Transform3D(Basis.from_scale(Vector3(1.6, 0.3, 1.6) * s), center + Vector3(0, 0.2, 0)), leaf.darkened(0.1), 0.15, true)


func _bush(at: Vector3, size: float, flowers: bool) -> void:
	at.y = _height(at.x, at.z)
	var green := Color("4f6a32").lerp(Color("6a7f3e"), rng.randf())
	for k in 4:
		var p := at + Vector3(rng.randf_range(-0.4, 0.4), size * rng.randf_range(0.4, 0.7), rng.randf_range(-0.3, 0.3)) * Vector3(size, 1, size)
		_add(leafy, Person.sphere(size * 0.55, 8, 5), Transform3D(Basis.from_scale(Vector3(1, 0.85, 1)), p), green.lerp(Color("7a8a4a"), rng.randf() * 0.4), 0.25, true)
	if flowers:
		for k in 10:
			var a := rng.randf() * TAU
			var p := at + Vector3(cos(a) * size * 0.55, size * rng.randf_range(0.5, 1.0), sin(a) * size * 0.45)
			_add(leafy, Person.sphere(0.06, 5, 3), Transform3D(Basis.IDENTITY, p), Color("e86a8a").lerp(Color("f0a0b8"), rng.randf()), 0.3)


func _rock(at: Vector3, size: float) -> void:
	at.y = _height(at.x, at.z) - size * 0.25
	var basis := Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(rng.randf_range(1.0, 1.6), rng.randf_range(0.5, 0.85), rng.randf_range(0.9, 1.3)))
	var c := Color("a49882").lerp(Color("85796a"), rng.randf())
	_add(solid, _rock_mesh(rng.randi() % 4), Transform3D(basis.scaled(Vector3.ONE * size), at), c, 0.0, true)


var _rock_meshes := {}
func _rock_mesh(kind: int) -> ArrayMesh:
	if _rock_meshes.has(kind):
		return _rock_meshes[kind]
	var src := Person.sphere(1.0, 8, 5).get_mesh_arrays()
	var verts: PackedVector3Array = src[Mesh.ARRAY_VERTEX]
	var rn := FastNoiseLite.new()
	rn.seed = 100 + kind
	rn.frequency = 1.4
	for i in verts.size():
		verts[i] *= 1.0 + rn.get_noise_3dv(verts[i]) * 0.35
	src[Mesh.ARRAY_VERTEX] = verts
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, src)
	_rock_meshes[kind] = mesh
	return mesh


func _tuft(at: Vector3) -> void:
	var base_c := Color("7a8f3e").lerp(Color("b0a45a"), rng.randf())
	var pts := []
	var cols := []
	var sw := []
	var h := rng.randf_range(0.18, 0.4)
	for k in rng.randi_range(5, 8):
		var a := rng.randf() * TAU
		var b := at + Vector3(rng.randf_range(-0.08, 0.08), 0, rng.randf_range(-0.08, 0.08))
		var tip := b + Vector3(cos(a) * h * 0.4, h * rng.randf_range(0.7, 1.2), sin(a) * h * 0.4)
		var side := Vector3(-sin(a), 0, cos(a)) * 0.022
		pts.append_array([b - side, b + side, tip])
		cols.append_array([base_c.darkened(0.35), base_c.darkened(0.35), base_c.lightened(0.1)])
		sw.append_array([0.0, 0.0, 0.5])
	_tris(leafy, pts, cols, sw)
	if rng.randf() < 0.22: # a red anemone, the "lilies of the field"
		var top := at + Vector3(0, h * 1.1, 0)
		_add(leafy, Person.sphere(0.045, 6, 4), Transform3D(Basis.from_scale(Vector3(1, 0.5, 1)), top), [Color("d8343a"), Color("f2d040"), Color("f4f0e8"), Color("b04ac0")][rng.randi() % 4], 0.5)


# A travelers' tent of black goat-hair cloth, sloping down at the back, with
# poles, a striped side curtain and guy ropes.
func _tent(at: Vector3, yaw: float) -> void:
	at.y = _height(at.x, at.z)
	var b := Basis(Vector3.UP, yaw)
	var cloth_c := Color("3a2e26")
	var stripe := Color("c8b48a")
	var w := 2.4
	var front := 1.9
	var back := 1.0
	var d := 2.6
	var p := func(x: float, y: float, z: float) -> Vector3: return at + b * Vector3(x, y, z)
	var pts := []
	var cols := []
	var sw := []
	# The roof: two sloping panels meeting at a low ridge
	var ridge := 0.25
	for side in [-1.0, 1.0]:
		var a = p.call(0, front + ridge, d / 2.0)
		var c = p.call(0, back + ridge, -d / 2.0)
		var e = p.call(side * w, front - 0.15, d / 2.0)
		var f = p.call(side * w, back - 0.25, -d / 2.0)
		pts.append_array([a, e, f, a, f, c])
		cols.append_array([cloth_c, cloth_c, cloth_c, cloth_c, cloth_c, cloth_c])
		sw.append_array([0, 0, 0, 0, 0, 0])
		# Side curtain with a woven stripe
		var g = p.call(side * w, 0.0, d / 2.0 - 0.3)
		var hh = p.call(side * w, 0.0, -d / 2.0)
		pts.append_array([e, g, hh, e, hh, f])
		cols.append_array([cloth_c, stripe.darkened(0.2), stripe.darkened(0.2), cloth_c, stripe.darkened(0.2), cloth_c])
		sw.append_array([0, 0, 0, 0, 0, 0])
	# The back wall
	var bl = p.call(-w, back - 0.25, -d / 2.0)
	var br = p.call(w, back - 0.25, -d / 2.0)
	var bc = p.call(0, back + ridge, -d / 2.0)
	pts.append_array([bl, br, bc, bl, p.call(w, 0, -d / 2.0), br, bl, p.call(-w, 0, -d / 2.0), p.call(w, 0, -d / 2.0)])
	for k in 9:
		cols.append(cloth_c.darkened(0.2))
		sw.append(0)
	_tris(solid, pts, cols, sw, false)
	# Poles and ropes
	for x in [-w * 0.95, 0.0, w * 0.95]:
		var top: Vector3 = p.call(x, front + (ridge if x == 0.0 else -0.15), d / 2.0)
		var foot: Vector3 = p.call(x, 0, d / 2.0)
		_add(solid, Person.cylinder(0.035, 0.04, top.y - at.y, 5), Transform3D(Basis.IDENTITY, (top + foot) / 2.0), Color("6e5236"))
		var stake: Vector3 = p.call(x * 1.3, 0, d / 2.0 + 1.1)
		var mid := (top + stake) / 2.0
		_add(solid, Person.cylinder(0.008, 0.008, top.distance_to(stake), 4), Transform3D(Basis(Quaternion(Vector3.UP, (top - stake).normalized())), mid), Color("b8a888"))
	# A rug and a clay pot at the entrance
	_add(solid, Person.box(Vector3(1.6, 0.02, 1.0)), Transform3D(b, p.call(0, 0.01, d / 2.0 - 0.6)), Color("8a3a2a"))
	_add(solid, Person.sphere(0.2, 8, 6), Transform3D(Basis.IDENTITY, p.call(w * 0.6, 0.18, d / 2.0 + 0.3)), Color("b8673a"))


# ------------------------------------------------------------------ birds

func _birds() -> void:
	for i in 6:
		var bird := Node3D.new()
		var m := Person.mat(Color("3a3430"))
		for side in [-1.0, 1.0]:
			var wing := MeshInstance3D.new()
			wing.mesh = Person.box(Vector3(0.5, 0.02, 0.14))
			wing.position.x = side * 0.25
			wing.material_override = m
			var pivot := Node3D.new()
			pivot.add_child(wing)
			pivot.name = "L" if side < 0 else "R"
			bird.add_child(pivot)
		bird.set_meta("phase", rng.randf() * TAU)
		bird.set_meta("radius", rng.randf_range(10, 22))
		bird.set_meta("center", Vector3(rng.randf_range(0, 50), rng.randf_range(11, 17), rng.randf_range(-22, -10)))
		add_child(bird)
		birds.append(bird)


func _process(delta: float) -> void:
	_t += delta
	for bird in birds:
		var ph: float = bird.get_meta("phase")
		var r: float = bird.get_meta("radius")
		var c: Vector3 = bird.get_meta("center")
		var a := ph + _t * 0.12
		bird.position = c + Vector3(cos(a) * r, sin(_t * 0.5 + ph) * 0.8, sin(a) * r * 0.5)
		bird.rotation.y = -a
		var flap := sin(_t * 9.0 + ph) * 0.6 if fmod(_t + ph, 4.0) < 2.2 else 0.15 # flap, then glide
		bird.get_node("L").rotation.z = flap
		bird.get_node("R").rotation.z = -flap
