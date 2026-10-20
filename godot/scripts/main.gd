## Chapter 1 in 3D: walk along the Jordan, talk to the people there, find the
## lost water jars, then reach the star to see John baptize Jesus.
extends Node3D

const CHAPTER := "ch01"
const WALK_SPEED := 3.4
const CAM_OFFSET := Vector3(0, 2.9, 7.6)

var world: WorldJordan
var ui: GameUI
var cam: Camera3D
var voice: AudioStreamPlayer
var chapter: Dictionary
var place: Dictionary

var mode := "title" # title, explore, story, done
var player: Person
var target := Vector3.ZERO
var walking := false
var talk_after_walk: Dictionary = {}
var villagers: Array[Dictionary] = []
var giver: Dictionary = {}
var quest_mark: Label3D
var jars: Array[Node3D] = []
var found := 0
var quest_started := false
var coins := 0
var mistakes := 0
var star: Node3D
var john: Person
var jesus: Person
var crowd: Array[Person] = []
var dove: Node3D
var bubbles := {} # Person -> bubble on screen
var _t := 0.0
var _tapped := false
var shot_pos := Vector3.ZERO # where the camera is during the story
var shot_look := Vector3.ZERO


func _ready() -> void:
	chapter = Content.chapter(CHAPTER)
	place = Content.explore.get("places", {}).get("jordan", {})
	world = WorldJordan.new()
	add_child(world)
	world.build()
	cam = Camera3D.new()
	cam.fov = 50
	cam.far = 300
	add_child(cam)
	voice = AudioStreamPlayer.new()
	add_child(voice)
	ui = GameUI.new()
	add_child(ui)
	_cast()
	if "autoplay" in OS.get_cmdline_user_args():
		var bot := preload("res://scripts/autoplay.gd").new()
		bot.game = self
		add_child(bot)
	await ui.title_screen("Follow Me", "Chapter 1 · " + chapter.get("title", ""))
	_start_explore()


# Everyone in the chapter, in their starting places.
func _cast() -> void:
	var look := Content.look_for("townspeople", 4)
	look["sex"] = "m"
	look["beard"] = "none"
	look["age"] = "young"
	look["mantle"] = "#3f6fa8"
	look["hairStyle"] = "short"
	look["head"] = ""
	player = Person.new().setup_look(look)
	player.position = Vector3(-12, 0, 3)
	player.rotation.y = PI / 2.0
	add_child(player)
	var spots := [Vector3(-4, 0, 1.0), Vector3(9, 0, 4.8), Vector3(24, 0, 1.4)]
	var lines: Array = place.get("villagers", [])
	for i in spots.size():
		var p := Person.new().setup("townspeople", i * 3 + 1)
		p.position = spots[i]
		p.rotation.y = randf_range(-0.6, 0.6)
		add_child(p)
		var v := {"p": p, "line": lines[i % lines.size()] if lines.size() else "Shalom!", "talked": false}
		villagers.append(v)
	giver = villagers[1]
	quest_mark = Label3D.new()
	quest_mark.text = "!"
	quest_mark.font = load("res://fonts/lilita_one_regular.ttf")
	quest_mark.font_size = 160
	quest_mark.modulate = Color("ffd23a")
	quest_mark.outline_size = 28
	quest_mark.outline_modulate = Color("2a1a10")
	quest_mark.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	quest_mark.no_depth_test = true
	quest_mark.position = Vector3(0, 2.45, 0)
	giver.p.add_child(quest_mark)
	for pos in [Vector3(3, 0, 6.0), Vector3(15.5, 0, -0.6), Vector3(31, 0, 5.4)]:
		var j := Props.jar()
		j.position = pos
		j.rotation.y = randf() * TAU
		add_child(j)
		jars.append(j)
	star = Props.story_star()
	star.position = Vector3(42, 0, 2.2)
	add_child(star)
	john = Person.new().setup("john-baptist")
	john.position = WorldJordan.STORY_POINT
	add_child(john)
	for i in 10:
		var p := Person.new().setup("townspeople", 20 + i)
		var side := -1.0 if i < 5 else 1.0
		var k := i % 5
		p.position = WorldJordan.STORY_POINT + Vector3(side * (3.0 + (k % 3) * 1.0 + randf() * 0.3), 0, 0.6 + (k / 3) * 1.4 + (k % 3) * 0.5)
		add_child(p)
		p.face(WorldJordan.STORY_POINT)
		crowd.append(p)
	john.face(WorldJordan.STORY_POINT + Vector3(-2, 0, 4))
	jesus = Person.new().setup("jesus")
	jesus.position = Vector3(60, 0, -1.8)
	jesus.visible = false
	add_child(jesus)


func _start_explore() -> void:
	mode = "explore"
	ui.show_hud(true)
	ui.set_coins(coins, false)
	ui.hint(Content.explore.get("hint", "Walk to the star!"))
	_speak_phrase(Content.explore.get("hint", ""))


func _process(delta: float) -> void:
	_t += delta
	if star:
		star.get_node("Star").rotation.y += delta * 1.8
		star.get_node("Star").position.y = 1.4 + sin(_t * 2.0) * 0.12
		star.get_node("Ring").scale = Vector3.ONE * (1.0 + sin(_t * 3.0) * 0.08)
	if quest_mark:
		quest_mark.position.y = 2.45 + sin(_t * 3.0) * 0.08
	for j in jars:
		j.get_node("Glow").scale = Vector3.ONE * (1.0 + sin(_t * 4.0 + j.position.x) * 0.15)
	if dove:
		Props.flap(dove, _t)
	_place_bubbles()
	match mode:
		"title":
			var a := _t * 0.12
			cam.position = Vector3(20 + sin(a) * 16.0, 7.5, 13.5)
			cam.look_at(Vector3(20 + sin(a) * 14.0, 0.5, -6))
		"explore":
			_walk(delta)
			_follow_camera(delta)
		"story":
			cam.position = cam.position.lerp(shot_pos, min(1.0, delta * 1.6))
			var look_now := -cam.global_transform.basis.z
			var want := (shot_look - cam.position).normalized()
			cam.look_at(cam.position + look_now.lerp(want, min(1.0, delta * 2.0)))


func _follow_camera(delta: float) -> void:
	var goal := Vector3(player.position.x, 0, max(player.position.z, 1.5)) + CAM_OFFSET
	cam.position = cam.position.lerp(goal, min(1.0, delta * 3.0)) if cam.position.distance_to(goal) < 30 else goal
	cam.look_at(Vector3(cam.position.x, 1.25, player.position.z - 4.5))


func _walk(delta: float) -> void:
	if not walking:
		player.speed = 0.0
		return
	var d := target - player.position
	d.y = 0
	if d.length() < 0.08:
		walking = false
		player.speed = 0.0
		if not talk_after_walk.is_empty():
			var v := talk_after_walk
			talk_after_walk = {}
			_talk(v)
		return
	var stepv: Vector3 = d.normalized() * min(d.length(), WALK_SPEED * delta)
	player.position += stepv
	player.speed = WALK_SPEED
	player.rotation.y = lerp_angle(player.rotation.y, atan2(d.x, d.z), min(1.0, delta * 12.0))
	# Pick up jars
	for j in jars.duplicate():
		if Vector2(j.position.x - player.position.x, j.position.z - player.position.z).length() < 0.9:
			_collect(j)
	# Reach the star
	if star and Vector2(star.position.x - player.position.x, star.position.z - player.position.z).length() < 1.3:
		_story()


func _unhandled_input(event: InputEvent) -> void:
	var pressed: bool = event is InputEventScreenTouch and event.pressed
	if not pressed:
		return
	_tapped = true
	if mode != "explore":
		return
	var pos: Vector2 = event.position
	# Tapped on someone?
	for v in villagers:
		var head: Vector3 = v.p.global_position + Vector3(0, 1.1, 0)
		if not cam.is_position_behind(head) and cam.unproject_position(head).distance_to(pos) < 90:
			var p: Person = v.p
			var side := -1.0 if player.position.x < p.position.x else 1.0
			_walk_to(p.position + Vector3(side * 1.1, 0, 0.3))
			talk_after_walk = v
			return
	var from := cam.project_ray_origin(pos)
	var dir := cam.project_ray_normal(pos)
	if dir.y >= -0.01:
		return
	var hit := from + dir * (-from.y / dir.y)
	talk_after_walk = {}
	_walk_to(hit)
	_tap_marker(hit)


func _walk_to(p: Vector3) -> void:
	target = Vector3(clamp(p.x, WorldJordan.WALK_MIN.x, WorldJordan.WALK_MAX.x), 0, clamp(p.z, WorldJordan.WALK_MIN.z, WorldJordan.WALK_MAX.z))
	walking = true


func _tap_marker(at: Vector3) -> void:
	var m := MeshInstance3D.new()
	var t := TorusMesh.new()
	t.inner_radius = 0.22
	t.outer_radius = 0.3
	m.mesh = t
	m.material_override = Props.glow_mat(Color.WHITE, 0.7)
	m.position = Vector3(at.x, 0.04, at.z)
	add_child(m)
	var tw := create_tween()
	tw.tween_property(m, "scale", Vector3(2, 1, 2), 0.4)
	tw.parallel().tween_property(m, "transparency", 1.0, 0.4)
	tw.tween_callback(m.queue_free)


func _talk(v: Dictionary) -> void:
	var p: Person = v.p
	p.face(player.position)
	player.face(p.position)
	var text: String = v.line
	if v == giver:
		if not quest_started:
			quest_started = true
			text = place.get("quest", {}).get("ask", text)
			quest_mark.text = "?"
			ui.hint("Find the 3 water jars!  0 / 3")
		elif found >= 3:
			text = Content.explore.get("questDone", "Thank you!")
		else:
			text = place.get("quest", {}).get("ask", text)
	if not v.talked:
		v.talked = true
		_earn(1, p.position)
	_bubble(p, text)


# A speech bubble over someone's head, read aloud.
func _bubble(p: Person, text: String) -> void:
	if bubbles.has(p) and is_instance_valid(bubbles[p]):
		bubbles[p].queue_free()
	var b := ui.bubble(text)
	bubbles[p] = b
	_place_bubbles()
	Sound.play("talk")
	p.talking = true
	var dur := _speak_phrase(text)
	await get_tree().create_timer(max(2.5, dur + 1.2)).timeout
	p.talking = false
	if is_instance_valid(b) and bubbles.get(p) == b:
		bubbles.erase(p)
		var tw := create_tween()
		tw.tween_property(b, "modulate:a", 0.0, 0.25)
		tw.tween_callback(b.queue_free)


func _place_bubbles() -> void:
	for p in bubbles.keys():
		var b: Control = bubbles[p]
		if not is_instance_valid(b):
			bubbles.erase(p)
			continue
		var head: Vector3 = p.global_position + Vector3(0, 2.15, 0)
		b.visible = not cam.is_position_behind(head)
		var at := cam.unproject_position(head)
		b.pivot_offset = Vector2(b.size.x / 2.0, b.size.y)
		b.position = Vector2(clamp(at.x - b.size.x / 2.0, 10, get_viewport().get_visible_rect().size.x - b.size.x - 10), max(90, at.y - b.size.y - 14))


# Plays the recorded sentences of a piece of text, one after another.
# Returns roughly how long the recording lasts.
func _speak_phrase(text: String) -> float:
	var streams := Content.phrase_streams(text)
	var total := 0.0
	for s in streams:
		total += s.get_length()
	_play_streams(streams)
	return total


func _play_streams(streams: Array) -> void:
	for s in streams:
		voice.stream = s
		voice.play()
		await voice.finished


func _collect(j: Node3D) -> void:
	jars.erase(j)
	Sound.play("coin")
	var tw := create_tween()
	tw.tween_property(j, "position:y", 1.6, 0.35).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(j, "rotation:y", j.rotation.y + TAU, 0.5)
	tw.tween_property(j, "scale", Vector3.ZERO, 0.2)
	tw.tween_callback(j.queue_free)
	found += 1
	_earn(5, j.position)
	ui.pop("Jar %d of 3!" % found)
	ui.hint("Find the 3 water jars!  %d / 3" % found)
	if found >= 3:
		ui.hint(Content.explore.get("hint", "Walk to the star!"))
		quest_mark.queue_free()
		quest_mark = null
		await get_tree().create_timer(0.8).timeout
		giver.p.cheer()
		_bubble(giver.p, Content.explore.get("questDone", "Thank you!"))
		_earn(10, giver.p.position)
		Sound.play("fanfare")


func _earn(n: int, _from: Vector3) -> void:
	coins += n
	ui.set_coins(coins)


# ---------------------------------------------------------------- the story

func _story() -> void:
	if mode != "explore":
		return
	mode = "story"
	walking = false
	player.speed = 0.0
	Sound.play("fanfare")
	var tw := create_tween()
	tw.tween_property(star, "scale", Vector3.ZERO, 0.4)
	tw.tween_callback(star.queue_free)
	star = null
	ui.hint("")
	# The player joins the crowd
	player.position = WorldJordan.STORY_POINT + Vector3(-2.4, 0, 3.0)
	player.face(WorldJordan.STORY_POINT)
	_shot(WorldJordan.STORY_POINT + Vector3(0.6, 2.4, 7.5), WorldJordan.STORY_POINT + Vector3(0, 1.1, 0))
	var scenes: Array = chapter.get("scenes", [])
	# Scene 1: John preaching
	for line in scenes[0].get("lines", []):
		await _line(line)
	ui.hide_line()
	await _puzzle(scenes[0].get("puzzle", {}))
	# Scene 2: Jesus comes
	jesus.visible = true
	_shot(WorldJordan.STORY_POINT + Vector3(3.0, 2.2, 7.0), WorldJordan.STORY_POINT + Vector3(1.5, 1.1, 0))
	var lines: Array = scenes[1].get("lines", [])
	var walk_in := create_tween()
	jesus.speed = 2.0
	jesus.face(WorldJordan.STORY_POINT)
	walk_in.tween_property(jesus, "position", WorldJordan.STORY_POINT + Vector3(1.4, 0, 0.6), 4.5)
	walk_in.tween_callback(_jesus_arrived)
	for line in lines:
		if line.has("cutscene"):
			_baptism()
		await _line(line)
	ui.hide_line()
	var puzzles: Array = scenes[1].get("puzzles", [])
	for pz in puzzles:
		if pz.get("type") == "multipleChoice":
			await _puzzle(pz)
	_end()


func _jesus_arrived() -> void:
	jesus.speed = 0.0
	jesus.face(john.position)
	john.face(jesus.position)


func _shot(pos: Vector3, look: Vector3) -> void:
	shot_pos = pos
	shot_look = look


func _speaker(id: String) -> Person:
	match id:
		"john-baptist": return john
		"jesus": return jesus
	return null


# One line of the story: shown in the story box, read aloud, and acted out.
func _line(line: Dictionary) -> void:
	var who: String = line.get("speaker", "narrator")
	var text := Content.line_text(line)
	var ref: String = line.get("ref", "")
	var color := Color(Content.characters.get(who, {}).get("color", "#6b5a45"))
	await ui.show_line(Content.name_of(who), text, ref, color)
	var p := _speaker(who)
	if p:
		p.talking = true
	if who == "voice-from-heaven":
		ui.flash(Color("fff2c0"), 0.45, 3.0)
	var stream := Content.line_audio(line)
	var min_time: float = 1.2
	var max_time: float = 2.0 + text.length() * 0.06
	if stream:
		voice.stream = stream
		voice.play()
		max_time = stream.get_length() + 0.7
	var t := 0.0
	_tapped = false
	while t < max_time:
		await get_tree().process_frame
		t += get_process_delta_time()
		if _tapped and t > 0.4:
			if t >= min_time or not stream:
				break
			_tapped = false
	voice.stop()
	if p:
		p.talking = false


func _puzzle(pz: Dictionary) -> void:
	if pz.is_empty():
		return
	_speak_phrase(pz.get("prompt", ""))
	var wrong := await ui.ask(pz.get("prompt", ""), pz.get("choices", []), pz.get("hint", ""), pz.get("ref", ""))
	voice.stop()
	mistakes += wrong
	var n := 10 if wrong == 0 else 5
	_earn(n, Vector3.ZERO)
	ui.pop("That's right!  +%d" % n, Color("bff0a8"))
	_speak_phrase("That's right!")
	for p in crowd:
		if randf() < 0.6:
			p.cheer()
	player.cheer()
	await get_tree().create_timer(1.4).timeout


# The baptism: Jesus and John wade in, Jesus goes under the water and comes
# up, the heavens open, and the Spirit comes down like a dove.
func _baptism() -> void:
	var water := WorldJordan.STORY_POINT + Vector3(0, -0.55, -3.0)
	_shot(WorldJordan.STORY_POINT + Vector3(1.2, 2.0, 4.5), water + Vector3(0, 1.0, 0))
	jesus.speed = 1.6
	john.speed = 1.6
	jesus.face(water)
	john.face(water)
	var tw := create_tween().set_parallel()
	tw.tween_property(jesus, "position", water + Vector3(0.5, 0, 0), 3.0)
	tw.tween_property(john, "position", water + Vector3(-0.6, 0.05, 0.2), 3.0)
	await tw.finished
	jesus.speed = 0.0
	john.speed = 0.0
	john.face(jesus.position)
	jesus.face(john.position)
	await get_tree().create_timer(0.4).timeout
	var dip := create_tween()
	dip.tween_property(jesus, "position:y", water.y - 1.3, 0.8).set_trans(Tween.TRANS_SINE)
	dip.tween_interval(0.4)
	dip.tween_property(jesus, "position:y", water.y, 0.9).set_trans(Tween.TRANS_SINE)
	await dip.finished
	jesus.face(cam.position)
	# The heavens open
	var light := Props.heaven_light()
	light.position = jesus.position
	light.scale = Vector3(0.01, 1, 0.01)
	add_child(light)
	create_tween().tween_property(light, "scale", Vector3.ONE, 1.6).set_trans(Tween.TRANS_SINE)
	ui.flash(Color.WHITE, 0.7, 1.6)
	_shot(WorldJordan.STORY_POINT + Vector3(1.0, 1.2, 3.0), jesus.position + Vector3(0, 3.2, 0))
	dove = Props.dove()
	dove.position = jesus.position + Vector3(0, 14, 0)
	add_child(dove)
	var fly := create_tween()
	fly.tween_property(dove, "position", jesus.position + Vector3(0, 2.25, 0.05), 4.0).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	await fly.finished
	jesus.set_shining(true)
	for p in crowd:
		p.face(jesus.position)
	_shot(WorldJordan.STORY_POINT + Vector3(0.8, 1.5, 1.6), jesus.position + Vector3(0, 1.3, 0))


func _end() -> void:
	mode = "done"
	ui.hide_line()
	var stars := 3 if mistakes == 0 else (2 if mistakes <= 2 else 1)
	_earn(stars * 5, Vector3.ZERO)
	Sound.play("fanfare")
	for p in crowd:
		p.cheer()
	player.cheer()
	var mv: Dictionary = chapter.get("memoryVerse", {})
	var verse := Content.verse_text(mv.get("ref", ""), mv.get("quote", {}))
	_speak_phrase("Chapter 1 complete!")
	await ui.end_screen("Chapter 1 complete!", stars, coins, verse, mv.get("ref", ""))
	get_tree().reload_current_scene()
