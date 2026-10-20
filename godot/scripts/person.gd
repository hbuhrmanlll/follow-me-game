## A person in the 3D world, built from simple low-poly shapes in the style of
## a stylized mobile game: robe, mantle, head covering, face, beard and two
## arms. They breathe, blink, look around, talk, gesture and walk.
## How each character looks comes from content/looks.json (shared with the 2D game).
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


static func mat(color: Color, rough := 0.85) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = rough
	return m


func _part(mesh: Mesh, color: Color, pos: Vector3, parent: Node3D, scale_by := Vector3.ONE) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat(color)
	mi.position = pos
	mi.scale = scale_by
	parent.add_child(mi)
	return mi


static func sphere(r: float, segs := 12, rings := 7) -> SphereMesh:
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2.0
	s.radial_segments = segs
	s.rings = rings
	return s


static func cylinder(top: float, bottom: float, h: float, segs := 10) -> CylinderMesh:
	var c := CylinderMesh.new()
	c.top_radius = top
	c.bottom_radius = bottom
	c.height = h
	c.radial_segments = segs
	c.rings = 1
	return c


static func box(size: Vector3) -> BoxMesh:
	var b := BoxMesh.new()
	b.size = size
	return b


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

	# A soft round shadow on the ground
	var shadow := _part(cylinder(0.32, 0.32, 0.01, 16), Color(0, 0, 0, 0.3), Vector3(0, 0.005, 0), self)
	var sm: StandardMaterial3D = shadow.material_override
	sm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	sm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	shadow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	body = Node3D.new()
	add_child(body)

	# Sandals peeking out under the robe
	foot_l = _part(box(Vector3(0.1, 0.05, 0.2)), Color("5a3a1c"), Vector3(-0.09, 0.025, 0.04), self)
	foot_r = _part(box(Vector3(0.1, 0.05, 0.2)), Color("5a3a1c"), Vector3(0.09, 0.025, 0.04), self)

	# The tunic (robe), wider at the hem
	var hem := 0.04 if female else 0.1
	_part(cylinder(0.17 * w, 0.29 * w, 1.3 - hem, 10), tunic, Vector3(0, hem + (1.3 - hem) / 2.0, 0), body)
	# The mantle: an outer cloak over the shoulders, open at the front to show the tunic
	if has_mantle:
		_part(cylinder(0.19 * w, 0.31 * w, 1.0, 10), mantle, Vector3(0, 0.62, -0.012), body, Vector3(1, 1, 0.98))
		_part(box(Vector3(0.13 * w, 1.0, 0.06)), tunic, Vector3(0.03, 0.62, 0.255 * w), body).rotation.x = -0.12
		if look.get("tassels", false):
			for sx in [-1.0, 1.0]:
				_part(box(Vector3(0.02, 0.1, 0.02)), Color("f2ecdc"), Vector3(sx * 0.26 * w, 0.1, 0.12), body)
	# Belt or sash
	if look.get("extra", "") != "toga":
		_part(cylinder(0.185 * w, 0.195 * w, 0.06, 10), mantle.darkened(0.25), Vector3(0, 0.95, 0), body)
	if look.get("extra", "") == "camelhair":
		_part(cylinder(0.18 * w, 0.3 * w, 1.2, 7), tunic.darkened(0.2), Vector3(0, 0.66, 0), body, Vector3(1.04, 1, 1.04))
	if look.get("extra", "") == "armor":
		_part(cylinder(0.2 * w, 0.22 * w, 0.42, 10), Color("9a8a6a"), Vector3(0, 1.1, 0), body)
	if look.get("extra", "") == "priest":
		_part(box(Vector3(0.18, 0.2, 0.03)), Color("d8b04a"), Vector3(0, 1.12, 0.2 * w), body)
	# Round shoulders
	_part(sphere(0.21 * w, 12, 6), mantle, Vector3(0, 1.28, 0), body, Vector3(1.15, 0.55, 0.9))

	# Arms: a sleeve and a hand, swinging from the shoulder
	arm_l = Node3D.new()
	arm_l.position = Vector3(-0.25 * w, 1.3, 0)
	body.add_child(arm_l)
	arm_r = Node3D.new()
	arm_r.position = Vector3(0.25 * w, 1.3, 0)
	body.add_child(arm_r)
	for arm in [arm_l, arm_r]:
		var sleeve := mantle if (has_mantle and not female) else tunic
		_part(cylinder(0.065, 0.085, 0.56, 8), sleeve, Vector3(0, -0.28, 0), arm)
		_part(sphere(0.058, 10, 6), skin, Vector3(0, -0.6, 0.01), arm)

	# Head, with a neck
	_part(cylinder(0.06, 0.07, 0.14, 8), skin.darkened(0.1), Vector3(0, 1.4, 0), body)
	head = Node3D.new()
	head.position = Vector3(0, 1.47, 0)
	body.add_child(head)
	var hy := 0.12 # head centre above the neck
	_part(sphere(0.15, 14, 9), skin, Vector3(0, hy, 0), head, Vector3(0.95, 1.08, 0.95))
	for sx in [-1.0, 1.0]:
		_part(sphere(0.035, 8, 5), skin, Vector3(sx * 0.145, hy, -0.01), head, Vector3(0.6, 1, 0.8)) # ears
	_part(sphere(0.03, 8, 5), skin.darkened(0.12), Vector3(0, hy - 0.01, 0.145), head, Vector3(0.8, 1.1, 1)) # nose
	# Eyes: white, dark iris, and a little shine
	for sx in [-1.0, 1.0]:
		var white := _part(sphere(0.026, 10, 6), Color("f6f1e8"), Vector3(sx * 0.052, hy + 0.025, 0.128), head, Vector3(1.1, 0.8, 0.5))
		eyes.append(white)
		_part(sphere(0.016, 8, 5), Color("3a2414"), Vector3(sx * 0.052, hy + 0.025, 0.14), head, Vector3(1, 1, 0.5))
		_part(box(Vector3(0.05, 0.012, 0.02)), hair.darkened(0.1), Vector3(sx * 0.054, hy + 0.068, 0.132), head).rotation.z = sx * -0.12 # eyebrow
	mouth = _part(box(Vector3(0.05, 0.012, 0.02)), skin.darkened(0.45), Vector3(0, hy - 0.06, 0.135), head)
	if look.get("sex", "m") == "f" or look.get("beard", "short") == "none":
		_part(sphere(0.022, 8, 5), Color("d0605a", 0.5), Vector3(-0.08, hy - 0.02, 0.115), head).material_override.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		_part(sphere(0.022, 8, 5), Color("d0605a", 0.5), Vector3(0.08, hy - 0.02, 0.115), head).material_override.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA

	# Beard
	var beard: String = "none" if female else look.get("beard", "short")
	if beard in ["short", "full", "long"]:
		var len: float = {"short": 0.07, "full": 0.1, "long": 0.15}[beard]
		_part(sphere(0.12, 12, 7), beard_c, Vector3(0, hy - 0.07 - len * 0.3, 0.05), head, Vector3(1.05, 0.55 + len * 3.0, 0.85))
		_part(box(Vector3(0.09, 0.018, 0.03)), beard_c, Vector3(0, hy - 0.04, 0.138), head) # moustache
	elif beard == "stubble":
		_part(sphere(0.125, 12, 7), skin.darkened(0.18), Vector3(0, hy - 0.06, 0.03), head, Vector3(1, 0.6, 0.85))

	# Hair or head covering
	var cover: String = look.get("head", "scarf" if female else "")
	var cover_c := _c("headColor", look.get("mantle", "#7a6a5a") if look.get("mantle") != null else "#d8ccb0")
	if cover == "scarf" or cover == "cloth":
		_part(sphere(0.175, 14, 8), cover_c, Vector3(0, hy + 0.035, -0.02), head, Vector3(1.02, 1.0, 1.02))
		_part(cylinder(0.17, 0.26, 0.42, 10), cover_c, Vector3(0, hy - 0.15, -0.06), head, Vector3(1, 1, 0.8))
		if cover == "cloth":
			_part(cylinder(0.165, 0.165, 0.03, 12), cover_c.darkened(0.45), Vector3(0, hy + 0.1, -0.01), head) # cord
	elif cover == "turban":
		_part(cylinder(0.16, 0.17, 0.14, 12), cover_c, Vector3(0, hy + 0.12, 0), head)
		_part(box(Vector3(0.08, 0.025, 0.02)), Color("d8b04a"), Vector3(0, hy + 0.12, 0.165), head)
	elif cover == "helmet":
		_part(sphere(0.17, 12, 6), Color("8a7a5a"), Vector3(0, hy + 0.04, 0), head, Vector3(1, 0.9, 1))
		_part(box(Vector3(0.04, 0.09, 0.3)), Color("a8302a"), Vector3(0, hy + 0.2, 0), head)
	else:
		var style: String = look.get("hairStyle", "short")
		if style != "bald":
			_part(sphere(0.158, 14, 8), hair, Vector3(0, hy + 0.035, -0.022), head, Vector3(1.0, 0.95, 1.0))
			if style == "long" or style == "wild":
				_part(box(Vector3(0.28, 0.26, 0.1)), hair, Vector3(0, hy - 0.08, -0.1), head)
			if style == "curly" or style == "wild":
				for i in 7:
					var a := PI * (0.1 + i / 6.0 * 0.8)
					_part(sphere(0.045 if style == "curly" else 0.06, 8, 5), hair, Vector3(cos(a) * 0.15, hy + 0.04 + sin(a) * 0.12, -0.02), head)
		if cover == "headband":
			_part(cylinder(0.16, 0.16, 0.03, 12), cover_c, Vector3(0, hy + 0.07, 0), head)

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
	mouth.scale.y = (1.0 + abs(sin(_t * 17.0)) * 3.5) if talking else 1.0
	if talking and randf() < delta * 0.5:
		gesture()
