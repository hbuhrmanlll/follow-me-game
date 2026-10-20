## Small 3D things for the chapter: the story star, water jars, the dove,
## and the light from heaven.
class_name Props
extends RefCounted


static func glow_mat(color: Color, alpha := 1.0, energy := 1.5) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(color, alpha)
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.emission_enabled = true
	m.emission = color
	m.emission_energy_multiplier = energy
	if alpha < 1.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
		m.cull_mode = BaseMaterial3D.CULL_DISABLED
	return m


## A flat five-pointed star with thickness.
static func star_mesh(outer := 0.5, inner := 0.22, depth := 0.12) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var pts: Array[Vector3] = []
	for i in 10:
		var a := PI / 2.0 + i * PI / 5.0
		var r := outer if i % 2 == 0 else inner
		pts.append(Vector3(cos(a) * r, sin(a) * r, 0))
	var front := Vector3(0, 0, depth / 2.0)
	var back := Vector3(0, 0, -depth / 2.0)
	for i in 10:
		var a := pts[i]
		var b := pts[(i + 1) % 10]
		st.add_vertex(front); st.add_vertex(b + front * 0.2); st.add_vertex(a + front * 0.2)
		st.add_vertex(back); st.add_vertex(a + back * 0.2); st.add_vertex(b + back * 0.2)
		st.add_vertex(a + front * 0.2); st.add_vertex(b + front * 0.2); st.add_vertex(b + back * 0.2)
		st.add_vertex(a + front * 0.2); st.add_vertex(b + back * 0.2); st.add_vertex(a + back * 0.2)
	st.generate_normals()
	return st.commit()


static func story_star() -> Node3D:
	var n := Node3D.new()
	var s := MeshInstance3D.new()
	s.name = "Star"
	s.mesh = star_mesh()
	var m := StandardMaterial3D.new()
	m.albedo_color = Color("f6c94a")
	m.emission_enabled = true
	m.emission = Color("ffcf4a")
	m.emission_energy_multiplier = 0.8
	m.metallic = 0.4
	m.roughness = 0.3
	s.material_override = m
	s.position.y = 1.4
	n.add_child(s)
	var ring := MeshInstance3D.new()
	ring.name = "Ring"
	var t := TorusMesh.new()
	t.inner_radius = 0.75
	t.outer_radius = 0.95
	ring.mesh = t
	ring.material_override = glow_mat(Color("ffd86a"), 0.45)
	ring.position.y = 0.05
	ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	n.add_child(ring)
	var beam := MeshInstance3D.new()
	beam.mesh = Person.cylinder(0.5, 0.8, 3.0, 16)
	beam.material_override = glow_mat(Color("ffe08a"), 0.12)
	beam.position.y = 1.5
	beam.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	n.add_child(beam)
	var light := OmniLight3D.new()
	light.light_color = Color("ffd86a")
	light.light_energy = 1.5
	light.omni_range = 4.0
	light.position.y = 1.4
	n.add_child(light)
	return n


## A clay water jar, lying on its side where it rolled.
static func jar() -> Node3D:
	var n := Node3D.new()
	var clay := Person.mat(Color("b8673a"), 0.8)
	var dark := Person.mat(Color("8a4a26"), 0.8)
	var body := Node3D.new()
	body.name = "Body"
	n.add_child(body)
	var belly := MeshInstance3D.new()
	belly.mesh = Person.sphere(0.2, 14, 8)
	belly.scale = Vector3(1, 1.15, 1)
	belly.material_override = clay
	belly.position.y = 0.22
	body.add_child(belly)
	var neck := MeshInstance3D.new()
	neck.mesh = Person.cylinder(0.08, 0.11, 0.14, 12)
	neck.position.y = 0.48
	neck.material_override = clay
	body.add_child(neck)
	var lip := MeshInstance3D.new()
	var t := TorusMesh.new()
	t.inner_radius = 0.06
	t.outer_radius = 0.1
	lip.mesh = t
	lip.position.y = 0.55
	lip.material_override = dark
	body.add_child(lip)
	var band := MeshInstance3D.new()
	band.mesh = Person.cylinder(0.205, 0.205, 0.04, 14)
	band.position.y = 0.3
	band.material_override = dark
	body.add_child(band)
	body.rotation.z = PI / 2.0 - 0.15
	body.position = Vector3(0.25, 0.0, 0)
	var glow := MeshInstance3D.new()
	glow.name = "Glow"
	var ring := TorusMesh.new()
	ring.inner_radius = 0.4
	ring.outer_radius = 0.52
	glow.mesh = ring
	glow.material_override = glow_mat(Color("fff0a0"), 0.5)
	glow.position.y = 0.03
	glow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	n.add_child(glow)
	return n


## The dove, with wings that flap.
static func dove() -> Node3D:
	var n := Node3D.new()
	var white := Person.mat(Color("fbfaf4"), 0.6)
	var body := MeshInstance3D.new()
	body.mesh = Person.sphere(0.14, 12, 8)
	body.scale = Vector3(0.8, 0.75, 1.5)
	body.material_override = white
	n.add_child(body)
	var head := MeshInstance3D.new()
	head.mesh = Person.sphere(0.075, 10, 6)
	head.position = Vector3(0, 0.08, 0.2)
	head.material_override = white
	n.add_child(head)
	var beak := MeshInstance3D.new()
	beak.mesh = Person.cylinder(0.0, 0.022, 0.06, 6)
	beak.rotation.x = PI / 2.0
	beak.position = Vector3(0, 0.07, 0.29)
	beak.material_override = Person.mat(Color("e0a040"))
	n.add_child(beak)
	var tail := MeshInstance3D.new()
	tail.mesh = Person.box(Vector3(0.14, 0.02, 0.2))
	tail.position = Vector3(0, 0.0, -0.25)
	tail.material_override = white
	n.add_child(tail)
	for side in [-1, 1]:
		var pivot := Node3D.new()
		pivot.name = "WingL" if side < 0 else "WingR"
		pivot.position = Vector3(0.08 * side, 0.04, 0)
		var wing := MeshInstance3D.new()
		wing.mesh = Person.box(Vector3(0.42, 0.02, 0.2))
		wing.position = Vector3(0.21 * side, 0, 0)
		wing.material_override = white
		pivot.add_child(wing)
		n.add_child(pivot)
	var light := OmniLight3D.new()
	light.light_color = Color("fff6d0")
	light.light_energy = 1.2
	light.omni_range = 3.0
	n.add_child(light)
	return n


static func flap(dove_node: Node3D, t: float) -> void:
	var a := sin(t * 14.0) * 0.8
	dove_node.get_node("WingL").rotation.z = a
	dove_node.get_node("WingR").rotation.z = -a


## The heavens opening: a tall column of light.
static func heaven_light() -> Node3D:
	var n := Node3D.new()
	for k in 3:
		var mi := MeshInstance3D.new()
		mi.mesh = Person.cylinder(0.9 + k * 0.7, 0.6 + k * 0.5, 40.0, 24)
		mi.material_override = glow_mat(Color("fff2c0"), 0.16 - k * 0.04, 2.0)
		mi.position.y = 20.0
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		n.add_child(mi)
	var light := SpotLight3D.new()
	light.light_color = Color("fff0c8")
	light.light_energy = 6.0
	light.spot_range = 30.0
	light.spot_angle = 12.0
	light.position.y = 20.0
	light.rotation.x = -PI / 2.0
	n.add_child(light)
	return n
