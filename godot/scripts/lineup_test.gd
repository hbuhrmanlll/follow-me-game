## A gallery of views for checking how things look. Run the scene
## res://scenes/lineup_test.tscn; the view number comes after "--".
extends Node3D

func _ready() -> void:
	var w := WorldJordan.new()
	add_child(w)
	w.build()
	var ids := ["jesus", "john-baptist", "townspeople", "townspeople", "pharisees", "peter", "mary", "townspeople"]
	for i in ids.size():
		var p := Person.new()
		p.setup(ids[i], i)
		p.position = Vector3(40 + i * 1.0, 0, 1.5)
		add_child(p)
		if i == 1: p.talking = true
	var cam := Camera3D.new()
	cam.fov = 40
	add_child(cam)
	var view := OS.get_cmdline_user_args()[0] if OS.get_cmdline_user_args().size() else "people"
	match view:
		"people":
			cam.position = Vector3(43.5, 1.7, 6.5)
			cam.look_at(Vector3(43.5, 1.0, 1.5))
		"faces":
			cam.position = Vector3(40.5, 1.65, 3.4)
			cam.look_at(Vector3(40.5, 1.55, 1.5))
		"wide":
			cam.fov = 55
			cam.position = Vector3(30, 4.0, 12)
			cam.look_at(Vector3(36, 1.0, -4))
