## The Jordan River valley in 3D: a sandy bank to walk along, the river behind
## it, reeds, palms and tamarisk trees, rocks, the travelers' tents, and the
## hills of the far bank fading into the haze. All built from simple shapes.
class_name WorldJordan
extends Node3D

const WALK_MIN := Vector3(-18.0, 0.0, -1.2)
const WALK_MAX := Vector3(64.0, 0.0, 6.5)
const RIVER_NEAR := -3.0 # z of the near edge of the water
const RIVER_FAR := -12.0
const STORY_POINT := Vector3(48.0, 0.0, -1.5) # where John baptizes, at the water's edge

var rng := RandomNumberGenerator.new()
var water_mat: ShaderMaterial


func build() -> void:
	rng.seed = 3
	_environment()
	_terrain()
	_water()
	_hills()
	for i in 160:
		var x := rng.randf_range(-30, 80)
		_reeds(Vector3(x, 0, RIVER_NEAR + rng.randf_range(-0.6, 0.7)))
		if i % 2 == 0:
			_reeds(Vector3(x + 0.7, 0, RIVER_FAR + rng.randf_range(-0.5, 0.8)))
	for p in [Vector3(-12, 0, -2.2), Vector3(4, 0, -2.4), Vector3(16, 0, -2.6), Vector3(27, 0, -2.2), Vector3(38, 0, -2.3), Vector3(57, 0, -2.4), Vector3(-4, 0, -2.5), Vector3(61, 0, -14.5), Vector3(22, 0, -14.5), Vector3(44, 0, -14), Vector3(5, 0, -15)]:
		_palm(p, rng.randf_range(4.2, 6.0))
	for p in [Vector3(-16, 0, -2.6), Vector3(10, 0, -2.8), Vector3(21, 0, -2.7), Vector3(34, 0, -2.9), Vector3(62, 0, -2.6), Vector3(-2, 0, -15), Vector3(33, 0, -16), Vector3(14, 0, -17)]:
		_tamarisk(p)
	for i in 70:
		var z := rng.randf_range(-1.5, 12.0)
		if z > WALK_MIN.z - 0.3 and z < WALK_MAX.z + 0.6:
			z = WALK_MAX.z + rng.randf_range(1.0, 5.0) # keep the walking path clear
		_rock(Vector3(rng.randf_range(-28, 78), 0, z), rng.randf_range(0.15, 0.6))
	for i in 90: # pebbles along the path
		_rock(Vector3(rng.randf_range(-20, 66), -0.02, rng.randf_range(-1.0, 9.0)), rng.randf_range(0.04, 0.1))
	for p in [Vector3(-9, 0, -16), Vector3(12, 0, -15.5), Vector3(28, 0, -17), Vector3(52, 0, -16)]:
		_tent(p)


func _environment() -> void:
	var env := Environment.new()
	var sky := Sky.new()
	var sm := ProceduralSkyMaterial.new()
	sm.sky_top_color = Color("4f8fd0")
	sm.sky_horizon_color = Color("d8e6ee")
	sm.ground_bottom_color = Color("8a7a5a")
	sm.ground_horizon_color = Color("d8e0d8")
	sm.sun_angle_max = 30.0
	sky.sky_material = sm
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.45
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	env.tonemap_exposure = 1.05
	env.fog_enabled = false
	env.fog_light_color = Color("dfe8ea")
	env.fog_density = 0.0035
	env.fog_sky_affect = 0.3
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.05
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-48, -32, 0)
	sun.light_color = Color("fff1d6")
	sun.light_energy = 1.15
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 45.0
	sun.shadow_blur = 1.5
	add_child(sun)


# The ground: sand along the river, grass and scrub further back, all one mesh
# with gentle bumps, coloured by height and distance from the water.
func _terrain() -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var x0 := -40.0
	var z0 := -60.0
	var step := 1.5
	var nx := 90
	var nz := 54
	var noise := FastNoiseLite.new()
	noise.seed = 11
	noise.frequency = 0.05
	var h := func(x: float, z: float) -> float:
		var y := noise.get_noise_2d(x, z) * 0.35
		if z > RIVER_NEAR - 1.0 and z < WALK_MAX.z + 1.0:
			y *= 0.15 # the walking path is nearly flat
		if z < RIVER_NEAR and z > RIVER_FAR:
			y = -0.9 # the riverbed
		elif z <= RIVER_FAR:
			y += (RIVER_FAR - z) * 0.08 # the far bank rises toward the hills
		elif z > WALK_MAX.z + 2.0:
			y += (z - WALK_MAX.z - 2.0) * 0.06
		return y
	var color := func(x: float, z: float, y: float) -> Color:
		var sand := Color("ad9262")
		var grass := Color("6f8a3e")
		var dry := Color("9a8250")
		if z > RIVER_NEAR - 0.5 and z < WALK_MAX.z + 1.5:
			return sand.lerp(Color("9c8252"), noise.get_noise_2d(x * 3, z * 3) * 0.5 + 0.5)
		if z < RIVER_FAR - 6.0:
			return dry.lerp(grass, clamp(noise.get_noise_2d(x * 2, z * 2) + 0.4, 0, 1))
		return grass.lerp(sand, clamp(noise.get_noise_2d(x * 2, z) + 0.3, 0, 1))
	for i in nx:
		for j in nz:
			var xa := x0 + i * step
			var za := z0 + j * step
			var quad := [Vector3(xa, 0, za), Vector3(xa + step, 0, za), Vector3(xa + step, 0, za + step), Vector3(xa, 0, za + step)]
			for q in quad.size():
				quad[q].y = h.call(quad[q].x, quad[q].z)
			for tri in [[0, 1, 2], [0, 2, 3]]:
				var a: Vector3 = quad[tri[0]]
				var b: Vector3 = quad[tri[1]]
				var c: Vector3 = quad[tri[2]]
				var n := (c - a).cross(b - a).normalized()
				var mid := (a + b + c) / 3.0
				st.set_color(color.call(mid.x, mid.z, mid.y))
				for v in [a, b, c]:
					st.set_normal(-n if n.y < 0 else n)
					st.add_vertex(v)
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.vertex_color_is_srgb = true
	m.roughness = 0.95
	mi.material_override = m
	add_child(mi)


func _water() -> void:
	var mi := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(160, RIVER_NEAR - RIVER_FAR + 1.5)
	pm.subdivide_width = 80
	pm.subdivide_depth = 6
	mi.mesh = pm
	mi.position = Vector3(20, -0.32, (RIVER_NEAR + RIVER_FAR) / 2.0)
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled;
uniform vec4 deep : source_color = vec4(0.16, 0.45, 0.58, 0.88);
uniform vec4 shallow : source_color = vec4(0.42, 0.7, 0.72, 0.8);
varying float wave;
void vertex() {
	wave = sin(VERTEX.x * 0.9 + TIME * 1.6) * 0.5 + sin(VERTEX.x * 0.37 - TIME * 1.1 + VERTEX.z) * 0.5;
	VERTEX.y += wave * 0.04;
}
void fragment() {
	float edge = smoothstep(0.0, 0.25, abs(UV.y - 0.5) * 2.0);
	vec4 col = mix(deep, shallow, edge * 0.7);
	float sparkle = step(0.985, sin(UV.x * 220.0 + TIME * 2.0) * sin(UV.y * 40.0 - TIME));
	ALBEDO = col.rgb + vec3(sparkle * 0.5) + vec3(wave * 0.03);
	ALPHA = col.a;
	ROUGHNESS = 0.15;
	SPECULAR = 0.7;
}
"""
	water_mat = ShaderMaterial.new()
	water_mat.shader = sh
	mi.material_override = water_mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)


func _hills() -> void:
	var colors := [Color("9a8a62"), Color("8a7e5a"), Color("a0906a"), Color("7f8a56")]
	for i in 16:
		var mi := MeshInstance3D.new()
		var s := SphereMesh.new()
		s.radius = 1.0
		s.height = 2.0
		s.radial_segments = 9
		s.rings = 5
		mi.mesh = s
		var r := rng.randf_range(10, 22)
		mi.scale = Vector3(r * rng.randf_range(1.2, 2.0), r * rng.randf_range(0.35, 0.6), r)
		mi.position = Vector3(-40 + i * 9.0 + rng.randf_range(-3, 3), -2.0, -38 - rng.randf_range(0, 18))
		mi.material_override = Person.mat(colors[i % colors.size()], 1.0)
		add_child(mi)


func _reeds(at: Vector3) -> void:
	for k in rng.randi_range(3, 6):
		var mi := MeshInstance3D.new()
		mi.mesh = Person.cylinder(0.012, 0.03, rng.randf_range(0.8, 1.6), 5)
		var hgt: float = (mi.mesh as CylinderMesh).height
		mi.position = at + Vector3(rng.randf_range(-0.3, 0.3), hgt / 2.0 - 0.3, rng.randf_range(-0.2, 0.2))
		mi.rotation = Vector3(rng.randf_range(-0.15, 0.15), 0, rng.randf_range(-0.15, 0.15))
		mi.material_override = Person.mat(Color("6f8a3e").lerp(Color("a8a058"), rng.randf()), 0.9)
		add_child(mi)


func _palm(at: Vector3, height: float) -> void:
	var trunk := Node3D.new()
	trunk.position = at
	add_child(trunk)
	var lean := rng.randf_range(-0.12, 0.12)
	var segs := int(height / 0.5)
	var top := Vector3.ZERO
	for i in segs:
		var mi := MeshInstance3D.new()
		mi.mesh = Person.cylinder(0.13 - i * 0.004, 0.16 - i * 0.004, 0.52, 7)
		top = Vector3(sin(lean) * i * 0.5, 0.26 + i * 0.5, 0)
		mi.position = top
		mi.rotation.z = -lean
		mi.material_override = Person.mat(Color("7a5a3a") if i % 2 else Color("6a4a2e"), 1.0)
		trunk.add_child(mi)
	top.y += 0.3
	for k in 9:
		var frond := MeshInstance3D.new()
		frond.mesh = Person.box(Vector3(0.32, 0.03, 2.0))
		var pivot := Node3D.new()
		pivot.position = top
		pivot.rotation = Vector3(rng.randf_range(0.35, 0.75), k * TAU / 9.0, 0)
		frond.position = Vector3(0, 0, 0.95)
		frond.material_override = Person.mat(Color("4f7a32").lerp(Color("6a8f3a"), rng.randf()), 0.9)
		pivot.add_child(frond)
		trunk.add_child(pivot)
	for d in 3:
		var date := MeshInstance3D.new()
		date.mesh = Person.sphere(0.09, 6, 4)
		date.position = top + Vector3(cos(d * 2.0) * 0.15, -0.2, sin(d * 2.0) * 0.15)
		date.material_override = Person.mat(Color("8a5a1a"))
		trunk.add_child(date)


func _tamarisk(at: Vector3) -> void:
	var t := MeshInstance3D.new()
	t.mesh = Person.cylinder(0.08, 0.14, 1.4, 6)
	t.position = at + Vector3(0, 0.7, 0)
	t.material_override = Person.mat(Color("5a4a36"), 1.0)
	add_child(t)
	for k in 5:
		var leaf := MeshInstance3D.new()
		leaf.mesh = Person.sphere(rng.randf_range(0.6, 0.95), 8, 5)
		leaf.position = at + Vector3(rng.randf_range(-0.6, 0.6), 1.6 + rng.randf_range(0, 0.8), rng.randf_range(-0.5, 0.5))
		leaf.scale = Vector3(1, 0.75, 1)
		leaf.material_override = Person.mat(Color("6f8a52").lerp(Color("8a9a62"), rng.randf()), 1.0)
		add_child(leaf)


func _rock(at: Vector3, size: float) -> void:
	var mi := MeshInstance3D.new()
	mi.mesh = Person.sphere(size, 6, 4)
	mi.position = at + Vector3(0, size * 0.3, 0)
	mi.scale = Vector3(rng.randf_range(1, 1.6), rng.randf_range(0.5, 0.9), rng.randf_range(0.9, 1.4))
	mi.rotation.y = rng.randf() * TAU
	mi.material_override = Person.mat(Color("9a8e7a").lerp(Color("7a6e5e"), rng.randf()), 1.0)
	add_child(mi)


# A travelers' tent of goat-hair cloth on poles.
func _tent(at: Vector3) -> void:
	var mi := MeshInstance3D.new()
	var p := PrismMesh.new()
	p.size = Vector3(3.2, 1.8, 2.4)
	mi.mesh = p
	mi.position = at + Vector3(0, 0.9, 0)
	mi.rotation.y = rng.randf_range(-0.3, 0.3)
	mi.material_override = Person.mat(Color("4a3a2e"), 1.0)
	add_child(mi)
	var stripe := MeshInstance3D.new()
	stripe.mesh = Person.box(Vector3(3.25, 0.12, 2.45))
	stripe.position = at + Vector3(0, 0.5, 0)
	stripe.rotation.y = mi.rotation.y
	stripe.material_override = Person.mat(Color("8a6a4a"), 1.0)
	add_child(stripe)
