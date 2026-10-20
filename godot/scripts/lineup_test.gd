extends Node3D

func _ready() -> void:
	var w := WorldJordan.new()
	add_child(w)
	w.build()
	var ids := ["jesus", "john-the-baptist", "townspeople", "townspeople", "pharisees", "peter"]
	for i in ids.size():
		var p := Person.new()
		p.setup(ids[i], i)
		p.position = Vector3(40 + i * 1.3, 0, 1.5)
		add_child(p)
		if i == 0: p.speed = 1.0
		if i == 1: p.talking = true
	var cam := Camera3D.new()
	cam.fov = 45
	add_child(cam)
	cam.position = Vector3(43.3, 2.6, 7.5)
	cam.look_at(Vector3(43.3, 1.0, 0))
