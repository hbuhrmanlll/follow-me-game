## The story camera. shot() glides to a new view; cut() jumps there at once.
## A gentle drift keeps still shots from looking frozen.
class_name Director
extends Node

var cam: Camera3D
var pos := Vector3.ZERO
var look := Vector3.ZERO
var speed := 1.6 # how quickly shots glide (higher is faster)
var active := false
var _t := 0.0


func _init(camera: Camera3D) -> void:
	cam = camera


## Glide to a view: the camera at `from`, looking at `at`. time > 0 sets how
## long the move should roughly take.
func shot(from: Vector3, at: Vector3, time := 0.0) -> void:
	pos = from
	look = at
	speed = 1.6 if time <= 0.0 else clamp(3.0 / time, 0.3, 6.0)
	active = true


## Jump straight to a view.
func cut(from: Vector3, at: Vector3) -> void:
	pos = from
	look = at
	cam.global_position = from
	cam.look_at(at)
	active = true


## A view of `target` from the front (the +z side), `dist` away and `height` up.
func front(target: Vector3, dist := 4.0, height := 1.6, side := 0.0) -> Vector3:
	return target + Vector3(side, height, dist)


func _process(delta: float) -> void:
	if not active:
		return
	_t += delta
	var drift := Vector3(sin(_t * 0.31) * 0.06, sin(_t * 0.23) * 0.04, 0)
	var k: float = min(1.0, delta * speed)
	cam.global_position = cam.global_position.lerp(pos + drift, k)
	var fwd := -cam.global_transform.basis.z
	var want := (look - cam.global_position).normalized()
	cam.look_at(cam.global_position + fwd.lerp(want, min(1.0, delta * speed * 1.3)))
