## A person in the 3D world, in the style of a stylized animated film: a
## flowing robe, an open cloak with woven stripes, a head covering or hair,
## a friendly face, a beard and two arms. They breathe, blink, look around,
## talk, gesture and walk. How each character looks comes from
## content/looks.json (shared with the 2D game).
class_name Person
extends Node3D

const SKIN_DEFAULT := Color("a8774e")

var look := {}
var speed := 0.0 # how fast they're walking (0 = standing)
var talking := false
var _t := randf() * 10.0
var _blink := 2.0
var _gesture := 0.0
var _cheer := 0.0

var body: Node3D
var head: Node3D
var arm_l: Node3D
var arm_r: Node3D
var foot_l: MeshInstance3D
var foot_r: MeshInstance3D
var mouth: MeshInstance3D
var eyes: Array[MeshInstance3D] = []
var _shine: MeshInstance3D

# Shapes and colours are shared between everyone, which keeps the game fast.
static var _meshes := {}
static var _mats := {}


static func mat(color: Color, rough := 0.85) -> StandardMaterial3D:
	var key := "%s/%.2f" % [color.to_html(), rough]
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = rough
	if color.a < 1.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_mats[key] = m
	return m


## Soft woven cloth: catches a little light along its edges.
static func cloth(color: Color, two_sided := false) -> StandardMaterial3D:
	var key := "cloth/%s/%s" % [color.to_html(), two_sided]
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = 0.92
	m.rim_enabled = true
	m.rim = 0.35
	m.rim_tint = 0.6
	if two_sided:
		m.cull_mode = BaseMaterial3D.CULL_DISABLED
	_mats[key] = m
	return m


static func skin_mat(color: Color) -> StandardMaterial3D:
	var key := "skin/%s" % color.to_html()
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = 0.6
	m.rim_enabled = true
	m.rim = 0.25
	m.rim_tint = 0.2
	_mats[key] = m
	return m


func _part(mesh: Mesh, color: Color, pos: Vector3, parent: Node3D, scale_by := Vector3.ONE) -> MeshInstance3D:
	return _put(mesh, mat(color), pos, parent, scale_by)


func _put(mesh: Mesh, m: Material, pos: Vector3, parent: Node3D, scale_by := Vector3.ONE) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = m
	mi.position = pos
	mi.scale = scale_by
	parent.add_child(mi)
	return mi


static func sphere(r: float, segs := 16, rings := 9) -> SphereMesh:
	var key := "s/%.3f/%d/%d" % [r, segs, rings]
	if _meshes.has(key):
		return _meshes[key]
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2.0
	s.radial_segments = segs
	s.rings = rings
	_meshes[key] = s
	return s


static func cylinder(top: float, bottom: float, h: float, segs := 14) -> CylinderMesh:
	var key := "c/%.3f/%.3f/%.3f/%d" % [top, bottom, h, segs]
	if _meshes.has(key):
		return _meshes[key]
	var c := CylinderMesh.new()
	c.top_radius = top
	c.bottom_radius = bottom
	c.height = h
	c.radial_segments = segs
	c.rings = 1
	_meshes[key] = c
	return c


static func box(size: Vector3) -> BoxMesh:
	var key := "b/%s" % size
	if _meshes.has(key):
		return _meshes[key]
	var b := BoxMesh.new()
	b.size = size
	_meshes[key] = b
	return b


## A smooth shape made by spinning a side outline (radius, height) around the
## vertical axis, like a potter's wheel. from/to (in turns) leave a gap at the
## front for open cloaks.
static func lathe(profile: PackedVector2Array, segs := 20, from := 0.0, to := 1.0) -> ArrayMesh:
	var key := "l/%s/%d/%.3f/%.3f" % [profile, segs, from, to]
	if _meshes.has(key):
		return _meshes[key]
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := profile.size()
	var normals: Array[Vector2] = []
	for i in n:
		var t := profile[min(i + 1, n - 1)] - profile[max(i - 1, 0)]
		normals.append(Vector2(t.y, -t.x).normalized())
	for k in segs + 1:
		var a := TAU * (from + (to - from) * float(k) / segs)
		for i in n:
			var p := profile[i]
			st.set_normal(Vector3(sin(a) * normals[i].x, normals[i].y, cos(a) * normals[i].x))
			st.set_uv(Vector2(float(k) / segs, float(i) / (n - 1)))
			st.add_vertex(Vector3(sin(a) * p.x, p.y, cos(a) * p.x))
	for k in segs:
		for i in n - 1:
			var a0 := k * n + i
			var b0 := (k + 1) * n + i
			st.add_index(a0); st.add_index(a0 + 1); st.add_index(b0)
			st.add_index(b0); st.add_index(a0 + 1); st.add_index(b0 + 1)
	var mesh := st.commit()
	_meshes[key] = mesh
	return mesh


## Builds the person. `id` is a character id; `variant` picks a different
## everyday look for crowds and villagers.
func setup(id: String, variant := 0) -> Person:
	return setup_look(Content.look_for(id, variant))


func setup_look(l: Dictionary) -> Person:
	look = l
	_build()
	return self


func _c(key: String, fallback: String) -> Color:
	var v = look.get(key)
	return Color(v) if v is String and v != "" else Color(fallback)


const ROBE := [Vector2(0.255, 0.0), Vector2(0.27, 0.03), Vector2(0.262, 0.08), Vector2(0.235, 0.45), Vector2(0.2, 0.85), Vector2(0.188, 0.98), Vector2(0.2, 1.12), Vector2(0.21, 1.24), Vector2(0.19, 1.32), Vector2(0.14, 1.38), Vector2(0.07, 1.41), Vector2(0.0, 1.42)]
const CLOAK := [Vector2(0.268, 0.22), Vector2(0.25, 0.5), Vector2(0.215, 0.85), Vector2(0.208, 1.12), Vector2(0.214, 1.24), Vector2(0.198, 1.32), Vector2(0.15, 1.39), Vector2(0.088, 1.43)]


func _build() -> void:
	var female: bool = look.get("sex", "m") == "f"
	var broad: float = 1.12 if look.get("build", "") == "broad" else (0.9 if look.get("build", "") == "slim" else 1.0)
	var height: float = float(look.get("height", 1.0)) * (0.97 if look.get("age", "") == "young" else 1.0)
	scale = Vector3.ONE * height
	var skin := _c("skin", "#a8774e")
	var hair := _c("hair", "#2e2014")
	var beard_c := _c("beardColor", look.get("hair", "#2e2014"))
	var tunic := _c("tunic", "#d6c6a2")
	var has_mantle: bool = look.get("mantle") != null
	var mantle := _c("mantle", "#7a6a5a") if has_mantle else tunic
	var w := broad * (0.9 if female else 1.0)
	var flat := Vector3(w * 1.06, 1, w * 0.8) # people are wider than they are deep
	var skin_m := skin_mat(skin)

	# A soft round shadow on the ground
	var shadow := _part(cylinder(0.34, 0.34, 0.01, 20), Color(0, 0, 0, 0.28), Vector3(0, 0.006, 0), self, Vector3(1, 1, 0.8))
	shadow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	body = Node3D.new()
	add_child(body)

	# Sandals peeking out under the robe
	foot_l = _part(sphere(0.07, 10, 6), Color("4a3018"), Vector3(-0.085, 0.022, 0.06), self, Vector3(0.75, 0.35, 1.5))
	foot_r = _part(sphere(0.07, 10, 6), Color("4a3018"), Vector3(0.085, 0.022, 0.06), self, Vector3(0.75, 0.35, 1.5))

	# The robe (tunic): a flowing shape with a darker woven border at the hem
	var robe := PackedVector2Array(ROBE)
	_put(lathe(robe, 22), cloth(tunic), Vector3(0, 0.0, 0), body, flat)
	_put(lathe(PackedVector2Array([Vector2(0.257, 0.0), Vector2(0.272, 0.03), Vector2(0.266, 0.075)]), 22), cloth(tunic.darkened(0.28)), Vector3.ZERO, body, flat * Vector3(1.01, 1, 1.01))
	# The cloak (mantle): open at the front, with two woven stripes near the bottom
	if has_mantle:
		var open := 0.07 if not female else 0.05
		_put(lathe(PackedVector2Array(CLOAK), 22, open, 1.0 - open), cloth(mantle, true), Vector3.ZERO, body, flat)
		for y in [0.3, 0.38]:
			_put(lathe(PackedVector2Array([Vector2(0.27, y), Vector2(0.268, y + 0.035)]), 22, open, 1.0 - open), cloth(mantle.darkened(0.35), true), Vector3.ZERO, body, flat * Vector3(1.006, 1, 1.006))
		if look.get("tassels", false):
			for sx in [-1.0, 1.0]:
				_part(cylinder(0.008, 0.016, 0.12), Color("f2ecdc"), Vector3(sx * 0.12 * w, 0.17, 0.2 * w), body)
	# Belt or sash
	if look.get("extra", "") != "toga":
		_put(lathe(PackedVector2Array([Vector2(0.196, 0.93), Vector2(0.2, 0.96), Vector2(0.196, 0.99)]), 22), cloth(mantle.darkened(0.3) if has_mantle else Color("7a5a3a")), Vector3.ZERO, body, flat * Vector3(1.01, 1, 1.01))
	if look.get("extra", "") == "camelhair":
		# A rough coat of camel's hair, ragged at the bottom
		var coat := PackedVector2Array([Vector2(0.272, 0.16), Vector2(0.245, 0.5), Vector2(0.208, 0.88), Vector2(0.212, 1.14), Vector2(0.22, 1.25), Vector2(0.2, 1.33), Vector2(0.15, 1.39), Vector2(0.09, 1.43)])
		_put(lathe(coat, 16, 0.06, 0.94), cloth(Color("8a6a3e"), true), Vector3.ZERO, body, flat * Vector3(1.02, 1, 1.02))
		for k in 10:
			var a := TAU * (0.08 + k * 0.084)
			_put(cylinder(0.02, 0.035, 0.1, 5), cloth(Color("7a5a32")), Vector3(sin(a) * 0.27 * flat.x, 0.13, cos(a) * 0.27 * flat.z), body)
	if look.get("extra", "") == "armor":
		_put(lathe(PackedVector2Array([Vector2(0.22, 0.85), Vector2(0.225, 1.1), Vector2(0.22, 1.3)]), 16), mat(Color("9a8a6a"), 0.4), Vector3.ZERO, body, flat * Vector3(1.03, 1, 1.03))
	if look.get("extra", "") == "priest":
		_part(box(Vector3(0.18, 0.2, 0.03)), Color("d8b04a"), Vector3(0, 1.12, 0.17 * w), body)

	# Arms: a wide sleeve and a hand, swinging from the shoulder
	arm_l = Node3D.new()
	arm_l.position = Vector3(-0.262 * w, 1.28, 0)
	body.add_child(arm_l)
	arm_r = Node3D.new()
	arm_r.position = Vector3(0.262 * w, 1.28, 0)
	body.add_child(arm_r)
	var sleeve_c := mantle if (has_mantle and not female) else tunic
	var sleeve := lathe(PackedVector2Array([Vector2(0.0, 0.0), Vector2(0.062, -0.02), Vector2(0.07, -0.2), Vector2(0.085, -0.46), Vector2(0.092, -0.54), Vector2(0.06, -0.545)]), 12)
	for arm in [arm_l, arm_r]:
		_put(sleeve, cloth(sleeve_c), Vector3.ZERO, arm)
		_put(sphere(0.052, 12, 7), skin_m, Vector3(0, -0.6, 0.008), arm, Vector3(0.85, 1.2, 0.75))

	# Head, with a neck
	_put(cylinder(0.055, 0.065, 0.12, 12), skin_mat(skin.darkened(0.08)), Vector3(0, 1.42, 0), body)
	head = Node3D.new()
	head.position = Vector3(0, 1.47, 0)
	body.add_child(head)
	var hy := 0.12 # head centre above the neck
	_put(sphere(0.15, 22, 14), skin_m, Vector3(0, hy, 0), head, Vector3(0.93, 1.07, 0.96))
	for sx in [-1.0, 1.0]:
		_put(sphere(0.033, 10, 6), skin_m, Vector3(sx * 0.139, hy - 0.005, -0.005), head, Vector3(0.55, 1, 0.8)) # ears
	_put(sphere(0.028, 10, 6), skin_mat(skin.darkened(0.06)), Vector3(0, hy - 0.012, 0.142), head, Vector3(0.75, 1.0, 0.9)) # nose
	# Eyes: dark and friendly, each with a little catch-light
	for sx in [-1.0, 1.0]:
		var eye := _part(sphere(0.019, 12, 8), Color("24160c"), Vector3(sx * 0.05, hy + 0.02, 0.133), head, Vector3(0.85, 1.15, 0.5))
		eyes.append(eye)
		_put(sphere(0.006, 6, 4), Props.glow_mat(Color.WHITE, 1.0, 0.6), Vector3(0.25, 0.35, 0.8), eye, Vector3(1.2, 0.9, 2.0))
		_part(box(Vector3(0.042, 0.011, 0.016)), hair.darkened(0.15), Vector3(sx * 0.05, hy + 0.058, 0.135), head).rotation.z = sx * -0.15 # eyebrow
	mouth = _part(sphere(0.02, 10, 6), Color("3a1610"), Vector3(0, hy - 0.06, 0.134), head, Vector3(1.3, 0.3, 0.5))
	if female or look.get("beard", "short") == "none":
		for sx in [-1.0, 1.0]:
			_part(sphere(0.022, 8, 5), Color("d06a5a", 0.35), Vector3(sx * 0.078, hy - 0.022, 0.112), head) # cheeks

	# Beard
	var beard: String = "none" if female else look.get("beard", "short")
	if beard in ["short", "full", "long"]:
		var len: float = {"short": 0.06, "full": 0.09, "long": 0.14}[beard]
		var bm := mat(beard_c, 1.0)
		_put(sphere(0.122, 16, 10), bm, Vector3(0, hy - 0.06 - len * 0.35, 0.035), head, Vector3(1.0, 0.5 + len * 3.0, 0.88))
		for sx in [-1.0, 1.0]: # moustache
			_put(sphere(0.03, 10, 6), bm, Vector3(sx * 0.028, hy - 0.042, 0.13), head, Vector3(1.4, 0.55, 0.7)).rotation.z = sx * 0.3
		mouth.position = Vector3(0, hy - 0.068, 0.152)
	elif beard == "stubble":
		_put(sphere(0.124, 16, 10), skin_mat(skin.darkened(0.2)), Vector3(0, hy - 0.055, 0.02), head, Vector3(0.98, 0.6, 0.86))

	# Hair or head covering
	var cover: String = look.get("head", "scarf" if female else "")
	var cover_c := _c("headColor", look.get("mantle", "#7a6a5a") if look.get("mantle") != null else "#d8ccb0")
	if cover == "scarf" or cover == "cloth":
		var cm := cloth(cover_c, true)
		var hood := PackedVector2Array()
		for i in 9:
			var a := PI * 0.5 * (1.0 - i / 8.0) + (-0.25 if i == 8 else 0.0)
			hood.append(Vector2(cos(a) * 0.172 + (0.0 if i < 8 else 0.012), sin(a) * 0.178))
		_put(lathe(hood, 22, 0.13, 0.87), cm, Vector3(0, hy + 0.025, -0.012), head)
		# The cloth falls over the shoulders and down the back
		_put(lathe(PackedVector2Array([Vector2(0.165, 0.0), Vector2(0.185, -0.16), Vector2(0.23, -0.3), Vector2(0.25, -0.4)]), 18, 0.2, 0.8), cm, Vector3(0, hy + 0.02, -0.015), head, Vector3(1, 1, 0.9))
		if cover == "cloth":
			_put(lathe(PackedVector2Array([Vector2(0.168, 0.0), Vector2(0.172, 0.018), Vector2(0.168, 0.036)]), 20), mat(cover_c.darkened(0.5)), Vector3(0, hy + 0.06, -0.012), head, Vector3(1, 1, 1.02)) # cord
	elif cover == "turban":
		_put(lathe(PackedVector2Array([Vector2(0.15, 0.0), Vector2(0.172, 0.04), Vector2(0.175, 0.1), Vector2(0.15, 0.15), Vector2(0.06, 0.17)]), 18), cloth(cover_c), Vector3(0, hy + 0.04, -0.01), head)
		_part(sphere(0.022, 8, 5), Color("d8b04a"), Vector3(0, hy + 0.12, 0.17), head)
	elif cover == "helmet":
		_put(sphere(0.168, 16, 8), mat(Color("8a7a5a"), 0.35), Vector3(0, hy + 0.035, 0), head, Vector3(1, 0.92, 1))
		_part(box(Vector3(0.035, 0.09, 0.3)), Color("a8302a"), Vector3(0, hy + 0.2, 0), head)
	else:
		var style: String = look.get("hairStyle", "short")
		var hm := mat(hair, 0.95)
		if style != "bald":
			_put(sphere(0.157, 20, 12), hm, Vector3(0, hy + 0.03, -0.024), head, Vector3(1.0, 0.97, 1.0))
			if style == "long" or style == "wild":
				_put(lathe(PackedVector2Array([Vector2(0.14, 0.0), Vector2(0.155, -0.12), Vector2(0.17, -0.24), Vector2(0.16, -0.27)]), 16, 0.22, 0.78), mat(hair, 0.95), Vector3(0, hy + 0.01, -0.02), head)
			if style == "curly" or style == "wild":
				for i in 9:
					var a := PI * (0.05 + i / 8.0 * 0.9)
					_put(sphere(0.042 if style == "curly" else 0.055, 10, 6), hm, Vector3(cos(a) * 0.145, hy + 0.035 + sin(a) * 0.12, -0.03), head)
			if style == "wavy":
				_put(sphere(0.06, 10, 6), hm, Vector3(0.06, hy + 0.13, 0.07), head, Vector3(1.6, 0.6, 1))
		if cover == "headband":
			_put(lathe(PackedVector2Array([Vector2(0.162, 0.0), Vector2(0.165, 0.02), Vector2(0.162, 0.04)]), 20), cloth(cover_c), Vector3(0, hy + 0.05, -0.02), head)

	for mi in find_children("*", "MeshInstance3D", true, false):
		if mi != shadow:
			(mi as MeshInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	if look.get("extra", "") == "shine":
		set_shining(true)


func set_shining(on: bool) -> void:
	if on and _shine == null:
		_shine = MeshInstance3D.new()
		_shine.mesh = sphere(0.6, 16, 10)
		var m := StandardMaterial3D.new()
		m.albedo_color = Color(1, 0.97, 0.85, 0.22)
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.emission_enabled = true
		m.emission = Color(1, 0.95, 0.8)
		_shine.material_override = m
		_shine.position = Vector3(0, 0.9, 0)
		_shine.scale = Vector3(1, 1.6, 1)
		_shine.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(_shine)
	elif not on and _shine:
		_shine.queue_free()
		_shine = null


## Turn to face a point on the ground.
func face(point: Vector3) -> void:
	var d := point - global_position
	d.y = 0
	if d.length() > 0.01:
		rotation.y = atan2(d.x, d.z)


func cheer() -> void:
	_cheer = 1.2


func gesture() -> void:
	_gesture = 1.4


func _process(delta: float) -> void:
	_t += delta
	var walk: float = clamp(speed / 2.5, 0.0, 1.0)
	var step := _t * 9.0
	# Breathing, or the bob of walking
	body.position.y = abs(sin(step)) * 0.05 * walk + sin(_t * 1.8) * 0.004
	head.rotation.y = sin(_t * 0.6) * 0.18 * (1.0 - walk)
	head.rotation.x = sin(_t * 0.9) * 0.03
	# Arms swing when walking, rest when standing, rise to cheer or gesture
	var swing := sin(step) * 0.55 * walk
	arm_l.rotation.x = swing
	arm_r.rotation.x = -swing
	arm_l.rotation.z = -0.08
	arm_r.rotation.z = 0.08
	if _gesture > 0.0:
		_gesture -= delta
		arm_r.rotation.x = -1.1 * sin(clamp(_gesture / 1.4, 0.0, 1.0) * PI)
	if _cheer > 0.0:
		_cheer -= delta
		var k := sin(clamp(_cheer / 1.2, 0.0, 1.0) * PI)
		arm_l.rotation.z = -2.6 * k
		arm_r.rotation.z = 2.6 * k
		body.position.y += abs(sin(_cheer * 8.0)) * 0.18 * k
	foot_l.position.z = 0.04 + sin(step) * 0.16 * walk
	foot_r.position.z = 0.04 - sin(step) * 0.16 * walk
	# Blinking
	_blink -= delta
	var closed := _blink < 0.12
	for e in eyes:
		e.scale.y = 0.1 if closed else 0.8
	if _blink < 0.0:
		_blink = randf_range(2.0, 5.0)
	# The mouth moves while talking
	mouth.scale.y = 0.3 * ((1.0 + abs(sin(_t * 15.0)) * 2.2) if talking else 1.0)
	if talking and randf() < delta * 0.5:
		gesture()
