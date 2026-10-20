## Everything drawn on top of the 3D world: the coin counter, the quest
## tracker, speech bubbles, the story box with a live portrait of whoever is
## speaking, quiz questions, cinematic bars, fades, confetti, and the title
## and chapter-end screens.
class_name GameUI
extends CanvasLayer

signal chosen(index: int)
signal play_pressed

const INK := Color("2a1a10")
const PAPER := Color("f7eedb")
const PAPER_EDGE := Color("d9c49a")
const BROWN := Color("6b4a2a")
const GOLD := Color("e8b44a")
const DARK := Color("1e140c")

var heading: Font = load("res://fonts/lilita_one_regular.ttf")
var body: Font = load("res://fonts/DejaVuSerif.ttf")
var body_bold: Font = load("res://fonts/DejaVuSerif-Bold.ttf")

var root: Control
var world_layer: Control # bubbles and markers, under everything else
var hud: Control
var coins_label: Label
var coin_icon: Control
var goal: PanelContainer
var goal_icon: Icon
var goal_label: Label
var story_box: PanelContainer
var story_name: Label
var story_name_tag: PanelContainer
var story_text: Label
var story_ref: Label
var next_arrow: Label
var portrait_frame: Control
var portrait_view: SubViewport
var portrait_cam: Camera3D
var portrait_icon: Icon
var portrait_of: Node3D
var bars: Array[ColorRect] = []
var fade_rect: ColorRect
var flash_rect: ColorRect
var quiz: Control
var _shown_coins := 0
var _t := 0.0


func _ready() -> void:
	layer = 10
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	_vignette()
	world_layer = Control.new()
	world_layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	world_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(world_layer)
	for top in [true, false]:
		var b := ColorRect.new()
		b.color = Color("0a0705")
		b.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.anchor_right = 1.0
		if top:
			b.anchor_bottom = 0.0
		else:
			b.anchor_top = 1.0
			b.anchor_bottom = 1.0
		root.add_child(b)
		bars.append(b)
	_build_hud()
	_build_goal()
	_build_story_box()
	flash_rect = ColorRect.new()
	flash_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	flash_rect.color = Color(1, 1, 1, 0)
	flash_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(flash_rect)
	fade_rect = ColorRect.new()
	fade_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	fade_rect.color = Color(0.04, 0.03, 0.02, 1)
	fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(fade_rect) # above the root, so it covers even the title screen
	fade_in(1.2)


func _process(delta: float) -> void:
	_t += delta
	if next_arrow and next_arrow.visible:
		next_arrow.modulate.a = 0.55 + 0.45 * sin(_t * 4.0)
	if portrait_of and is_instance_valid(portrait_of) and portrait_cam:
		var p := portrait_of as Person
		var head: Vector3 = p.head.global_position + Vector3(0, 0.1 * p.scale.y, 0)
		var fwd: Vector3 = p.global_transform.basis.z.normalized()
		var side: Vector3 = p.global_transform.basis.x.normalized()
		portrait_cam.global_position = head + fwd * 0.72 * p.scale.y + side * 0.12 + Vector3(0, 0.03, 0)
		portrait_cam.look_at(head, Vector3.UP)


func _vignette() -> void:
	var v := ColorRect.new()
	v.set_anchors_preset(Control.PRESET_FULL_RECT)
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var m := ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = """
shader_type canvas_item;
void fragment() {
	vec2 uv = (UV - 0.5) * vec2(1.0, 0.8);
	float d = length(uv);
	COLOR = vec4(0.1, 0.06, 0.03, smoothstep(0.42, 0.78, d) * 0.42);
}
"""
	m.shader = sh
	v.material = m
	root.add_child(v)


# ------------------------------------------------------------- the basics

static func panel_style(bg: Color, border: Color, radius := 22, border_w := 4) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(border_w)
	s.set_corner_radius_all(radius)
	s.shadow_color = Color(0, 0, 0, 0.3)
	s.shadow_size = 12
	s.shadow_offset = Vector2(0, 6)
	s.content_margin_left = 26
	s.content_margin_right = 26
	s.content_margin_top = 16
	s.content_margin_bottom = 16
	s.anti_aliasing = true
	return s


func label(text: String, font: Font, size: int, color: Color, outline := 0) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font", font)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if outline > 0:
		l.add_theme_constant_override("outline_size", outline)
		l.add_theme_color_override("font_outline_color", INK)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


## A chunky game button with a raised edge that presses down when tapped.
func button(text: String, size := 40, base := Color("e8962e")) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_override("font", heading)
	b.add_theme_font_size_override("font_size", size)
	for k in ["font_color", "font_hover_color", "font_focus_color"]:
		b.add_theme_color_override(k, Color.WHITE)
	b.add_theme_color_override("font_pressed_color", Color("fff0c8"))
	b.add_theme_color_override("font_disabled_color", Color(1, 1, 1, 0.6))
	b.add_theme_constant_override("outline_size", 9)
	b.add_theme_color_override("font_outline_color", base.darkened(0.55))
	var normal := panel_style(base, base.darkened(0.35), 26, 0)
	normal.border_width_bottom = 8
	normal.content_margin_left = 44
	normal.content_margin_right = 44
	normal.content_margin_top = 12
	normal.content_margin_bottom = 12
	var hover: StyleBoxFlat = normal.duplicate()
	hover.bg_color = base.lightened(0.1)
	var pressed: StyleBoxFlat = normal.duplicate()
	pressed.bg_color = base.darkened(0.08)
	pressed.border_width_bottom = 3
	pressed.content_margin_top = 17
	pressed.shadow_size = 4
	var disabled: StyleBoxFlat = normal.duplicate()
	disabled.bg_color = Color("c9bba0")
	disabled.border_color = Color("a8997c")
	b.add_theme_stylebox_override("normal", normal)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", pressed)
	b.add_theme_stylebox_override("disabled", disabled)
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	b.button_down.connect(func(): Sound.play("tap"))
	b.resized.connect(func(): b.pivot_offset = b.size / 2.0)
	return b


func fade_out(time := 0.5) -> void:
	var t := create_tween()
	t.tween_property(fade_rect, "color:a", 1.0, time)
	await t.finished


func fade_in(time := 0.6) -> void:
	fade_rect.color.a = 1.0
	create_tween().tween_property(fade_rect, "color:a", 0.0, time)


## Black bars at the top and bottom, like a film, while the story plays.
func cinematic(on: bool) -> void:
	var h := 64.0 if on else 0.0
	var t := create_tween().set_parallel().set_trans(Tween.TRANS_SINE)
	t.tween_property(bars[0], "offset_bottom", h, 0.7)
	t.tween_property(bars[1], "offset_top", -h, 0.7)
	t.tween_property(hud, "modulate:a", 0.0 if on else 1.0, 0.4)
	t.tween_property(goal, "modulate:a", 0.0 if on else 1.0, 0.4)


func flash(color: Color, peak := 0.8, time := 1.2) -> void:
	flash_rect.color = Color(color, 0)
	var t := create_tween()
	t.tween_property(flash_rect, "color:a", peak, time * 0.3)
	t.tween_property(flash_rect, "color:a", 0.0, time * 0.7)


# ------------------------------------------------------- coins and goals

func _build_hud() -> void:
	var p := PanelContainer.new()
	var st := panel_style(Color(DARK, 0.82), GOLD, 30, 3)
	st.content_margin_left = 12
	st.content_margin_right = 22
	st.content_margin_top = 8
	st.content_margin_bottom = 8
	p.add_theme_stylebox_override("panel", st)
	p.position = Vector2(22, 18)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	coin_icon = Coin.new()
	coin_icon.custom_minimum_size = Vector2(44, 44)
	row.add_child(coin_icon)
	coins_label = label("0", heading, 38, Color("ffe08a"))
	coins_label.custom_minimum_size.x = 64
	row.add_child(coins_label)
	p.add_child(row)
	p.visible = false
	hud = p
	root.add_child(p)


func show_hud(on: bool) -> void:
	hud.visible = on
	goal.visible = on and goal_label.text != ""


func set_coins(n: int, pop := true) -> void:
	if not pop:
		_shown_coins = n
		coins_label.text = str(n)
		return
	var from := _shown_coins
	_shown_coins = n
	create_tween().tween_method(func(v: float): coins_label.text = str(int(round(v))), float(from), float(n), 0.5)
	coin_icon.pivot_offset = Vector2(22, 22)
	var t := create_tween()
	t.tween_property(coin_icon, "scale", Vector2(1.35, 1.35), 0.08)
	t.tween_property(coin_icon, "scale", Vector2.ONE, 0.14)


## Coins fly up from a spot on the screen into the counter. The total changes
## when the first one arrives.
func fly_coins(from: Vector2, n: int, total: int) -> void:
	var target := hud.position + Vector2(34, 30)
	var shown := false
	for i in min(n, 6):
		var c := Coin.new()
		c.size = Vector2(34, 34)
		c.position = from + Vector2(randf_range(-26, 26), randf_range(-18, 18))
		c.mouse_filter = Control.MOUSE_FILTER_IGNORE
		root.add_child(c)
		var mid := (c.position + target) / 2.0 + Vector2(randf_range(-60, 60), -120)
		var t := create_tween()
		t.tween_interval(i * 0.07)
		t.tween_method(func(k: float): c.position = c.position.lerp(_bezier(from, mid, target, k), 0.6), 0.0, 1.0, 0.65).set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_SINE)
		t.tween_callback(c.queue_free)
		if not shown:
			shown = true
			t.tween_callback(func(): set_coins(total); Sound.play("coin"))


func _bezier(a: Vector2, b: Vector2, c: Vector2, t: float) -> Vector2:
	return a.lerp(b, t).lerp(b.lerp(c, t), t)


func _build_goal() -> void:
	goal = PanelContainer.new()
	var st := panel_style(Color(DARK, 0.78), Color(GOLD, 0.7), 28, 2)
	st.content_margin_left = 14
	st.content_margin_right = 26
	st.content_margin_top = 8
	st.content_margin_bottom = 8
	goal.add_theme_stylebox_override("panel", st)
	goal.mouse_filter = Control.MOUSE_FILTER_IGNORE
	goal.anchor_left = 0.5
	goal.anchor_right = 0.5
	goal.grow_horizontal = Control.GROW_DIRECTION_BOTH
	goal.offset_top = 20
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	goal_icon = Icon.new()
	goal_icon.custom_minimum_size = Vector2(40, 40)
	row.add_child(goal_icon)
	goal_label = label("", heading, 30, Color.WHITE)
	goal_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	row.add_child(goal_label)
	goal.add_child(row)
	goal.visible = false
	root.add_child(goal)


## The current goal at the top of the screen, with a little picture.
## kind: "talk", "jar", "star" or "done".
func objective(text: String, kind := "star") -> void:
	var changed := goal_label.text != text
	goal_label.text = text
	goal_icon.kind = kind
	goal_icon.queue_redraw()
	goal.visible = text != "" and hud.visible
	goal.reset_size()
	goal.offset_left = 0
	goal.offset_right = 0
	if changed and goal.visible:
		goal.pivot_offset = goal.size / 2.0
		goal.scale = Vector2(0.85, 0.85)
		create_tween().tween_property(goal, "scale", Vector2.ONE, 0.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


## Kept for older callers: shows text as the goal.
func hint(text: String) -> void:
	objective(text, "star")


# ------------------------------------------------------------ story box

func _build_story_box() -> void:
	story_box = PanelContainer.new()
	var st := panel_style(Color(PAPER, 0.98), PAPER_EDGE, 26, 3)
	st.content_margin_left = 30
	st.content_margin_top = 24
	st.content_margin_right = 32
	st.content_margin_bottom = 18
	story_box.add_theme_stylebox_override("panel", st)
	story_box.anchor_left = 0.5
	story_box.anchor_right = 0.5
	story_box.anchor_top = 1.0
	story_box.anchor_bottom = 1.0
	story_box.offset_left = -560
	story_box.offset_right = 560
	story_box.offset_bottom = -22
	story_box.offset_top = -22
	story_box.grow_horizontal = Control.GROW_DIRECTION_BOTH
	story_box.grow_vertical = Control.GROW_DIRECTION_BEGIN
	story_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 24)
	story_box.add_child(row)
	# The portrait: a live close-up of whoever is speaking
	portrait_frame = Control.new()
	portrait_frame.custom_minimum_size = Vector2(150, 150)
	portrait_frame.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	row.add_child(portrait_frame)
	var ring := Ring.new()
	ring.set_anchors_preset(Control.PRESET_FULL_RECT)
	portrait_frame.add_child(ring)
	var holder := SubViewportContainer.new()
	holder.stretch = true
	holder.position = Vector2(8, 8)
	holder.size = Vector2(134, 134)
	var round_m := ShaderMaterial.new()
	var rs := Shader.new()
	rs.code = """
shader_type canvas_item;
void fragment() {
	float d = length(UV - 0.5);
	COLOR.a *= smoothstep(0.5, 0.48, d);
}
"""
	round_m.shader = rs
	holder.material = round_m
	portrait_frame.add_child(holder)
	portrait_view = SubViewport.new()
	portrait_view.size = Vector2i(268, 268)
	portrait_view.render_target_update_mode = SubViewport.UPDATE_WHEN_VISIBLE
	portrait_view.msaa_3d = Viewport.MSAA_2X
	holder.add_child(portrait_view)
	portrait_cam = Camera3D.new()
	portrait_cam.fov = 32
	portrait_cam.near = 0.05
	portrait_view.add_child(portrait_cam)
	portrait_icon = Icon.new()
	portrait_icon.position = Vector2(25, 25)
	portrait_icon.size = Vector2(100, 100)
	portrait_frame.add_child(portrait_icon)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(col)
	var top := HBoxContainer.new()
	story_name_tag = PanelContainer.new()
	var nt := panel_style(Color("8a4a1a"), Color(0, 0, 0, 0), 16, 0)
	nt.content_margin_left = 16
	nt.content_margin_right = 16
	nt.content_margin_top = 3
	nt.content_margin_bottom = 3
	nt.shadow_size = 0
	story_name_tag.add_theme_stylebox_override("panel", nt)
	story_name = label("", heading, 28, Color.WHITE)
	story_name_tag.add_child(story_name)
	top.add_child(story_name_tag)
	var gap := Control.new()
	gap.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(gap)
	story_ref = label("", body_bold, 20, Color("8a7258"))
	story_ref.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	top.add_child(story_ref)
	col.add_child(top)
	story_text = label("", body, 28, INK)
	story_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	story_text.custom_minimum_size.x = 860
	story_text.add_theme_constant_override("line_spacing", 6)
	col.add_child(story_text)
	next_arrow = label("Tap to continue  ▼", heading, 20, Color("c08a3a"))
	next_arrow.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	col.add_child(next_arrow)
	story_box.visible = false
	root.add_child(story_box)


## Shows a line of the story. speaker is the person talking (for the live
## portrait), or null for the narrator or the voice from heaven.
func show_line(who: String, text: String, ref: String, color: Color, speaker: Node3D = null, kind := "book") -> void:
	story_name.text = who
	(story_name_tag.get_theme_stylebox("panel") as StyleBoxFlat).bg_color = color.darkened(0.15)
	story_ref.text = ref
	story_text.text = text
	story_text.visible_ratio = 0.0
	portrait_of = speaker
	var live := speaker != null
	portrait_view.get_parent().visible = live
	portrait_icon.visible = not live
	portrait_icon.kind = kind
	portrait_icon.queue_redraw()
	var was_hidden := not story_box.visible
	story_box.visible = true
	story_box.offset_top = story_box.offset_bottom # shrink to fit; it grows upward
	if was_hidden:
		story_box.modulate.a = 0.0
		create_tween().tween_property(story_box, "modulate:a", 1.0, 0.25)
	await get_tree().process_frame
	create_tween().tween_property(story_text, "visible_ratio", 1.0, clamp(text.length() * 0.012, 0.3, 1.6))


func hide_line() -> void:
	if not story_box.visible:
		return
	portrait_of = null
	var t := create_tween()
	t.tween_property(story_box, "modulate:a", 0.0, 0.2)
	t.tween_callback(func(): story_box.visible = false; story_box.modulate.a = 1.0)


## A speech bubble. The game moves it to follow the speaker's head.
func bubble(text: String) -> Control:
	var p := PanelContainer.new()
	var st := panel_style(Color(PAPER, 0.98), PAPER_EDGE, 22, 2)
	st.content_margin_left = 20
	st.content_margin_right = 20
	st.content_margin_top = 12
	st.content_margin_bottom = 12
	st.shadow_size = 8
	p.add_theme_stylebox_override("panel", st)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var l := label(text, body_bold, 22, INK)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size.x = 330
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_constant_override("line_spacing", 3)
	p.add_child(l)
	var tail := Tail.new()
	tail.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.add_child(tail)
	world_layer.add_child(p)
	p.scale = Vector2(0.3, 0.3)
	create_tween().tween_property(p, "scale", Vector2.ONE, 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	return p


## A small floating marker (a label with an icon) that the game moves to
## follow something in the world.
func marker(text: String, kind: String) -> Control:
	var p := PanelContainer.new()
	var st := panel_style(Color(DARK, 0.8), GOLD, 20, 2)
	st.content_margin_left = 8
	st.content_margin_right = 14 if text != "" else 8
	st.content_margin_top = 4
	st.content_margin_bottom = 4
	st.shadow_size = 4
	p.add_theme_stylebox_override("panel", st)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 6)
	var ic := Icon.new()
	ic.kind = kind
	ic.custom_minimum_size = Vector2(30, 30)
	row.add_child(ic)
	if text != "":
		row.add_child(label(text, heading, 22, Color("ffe08a")))
	p.add_child(row)
	world_layer.add_child(p)
	return p


## A big word that pops up in the middle of the screen and floats away.
func pop(text: String, color := Color("ffe08a"), size := 64) -> void:
	var l := label(text, heading, size, color, 18)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.4))
	l.add_theme_constant_override("shadow_offset_y", 6)
	var vp := get_viewport().get_visible_rect().size
	l.size = Vector2(vp.x, size * 1.4)
	l.position = Vector2(0, vp.y * 0.3)
	l.pivot_offset = Vector2(vp.x / 2, size * 0.7)
	l.scale = Vector2(0.3, 0.3)
	root.add_child(l)
	var t := create_tween()
	t.tween_property(l, "scale", Vector2.ONE, 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	t.tween_interval(0.9)
	t.tween_property(l, "position:y", l.position.y - 60, 0.5)
	t.parallel().tween_property(l, "modulate:a", 0.0, 0.5)
	t.tween_callback(l.queue_free)


func confetti(at := Vector2(-1, -1), amount := 90) -> void:
	var vp := get_viewport().get_visible_rect().size
	var c := CPUParticles2D.new()
	c.position = Vector2(vp.x / 2.0, -20) if at.x < 0 else at
	c.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	c.emission_rect_extents = Vector2(vp.x / 2.0, 10) if at.x < 0 else Vector2(40, 10)
	c.amount = amount
	c.one_shot = true
	c.explosiveness = 0.85
	c.lifetime = 3.0
	c.direction = Vector2(0, 1) if at.x < 0 else Vector2(0, -1)
	c.spread = 30.0 if at.x < 0 else 70.0
	c.initial_velocity_min = 120.0 if at.x < 0 else 380.0
	c.initial_velocity_max = 300.0 if at.x < 0 else 620.0
	c.gravity = Vector2(0, 420)
	c.angular_velocity_min = -360
	c.angular_velocity_max = 360
	c.scale_amount_min = 6.0
	c.scale_amount_max = 11.0
	var g := Gradient.new()
	g.colors = PackedColorArray([Color("f2c14a"), Color("e8604a"), Color("5ab0e0"), Color("7fd06a"), Color("f4f0e8")])
	g.offsets = PackedFloat32Array([0.0, 0.25, 0.5, 0.75, 1.0])
	c.color_initial_ramp = g
	c.z_index = 5
	root.add_child(c)
	c.emitting = true
	get_tree().create_timer(3.5).timeout.connect(c.queue_free)


# ------------------------------------------------------------------ quiz

## A multiple-choice question. Wrong answers fade out until the right one is
## picked. Returns how many wrong tries it took.
func ask(prompt: String, choices: Array, hint_text: String, ref: String) -> int:
	quiz = Control.new()
	quiz.set_anchors_preset(Control.PRESET_FULL_RECT)
	var shade := ColorRect.new()
	shade.color = Color(0.05, 0.03, 0.02, 0.55)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	quiz.add_child(shade)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	quiz.add_child(center)
	var p := PanelContainer.new()
	var st := panel_style(PAPER, PAPER_EDGE, 30, 3)
	st.content_margin_left = 40
	st.content_margin_right = 40
	st.content_margin_top = 30
	st.content_margin_bottom = 30
	p.add_theme_stylebox_override("panel", st)
	center.add_child(p)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 16)
	col.custom_minimum_size.x = 820
	p.add_child(col)
	var tag := label("QUESTION", heading, 22, Color("b07a3a"))
	tag.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(tag)
	var q := label(prompt, heading, 42, Color("5a3012"))
	q.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	q.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	col.add_child(q)
	var space := Control.new()
	space.custom_minimum_size.y = 4
	col.add_child(space)
	var note := label("", body, 23, Color("8a3a1a"))
	note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var buttons: Array[Button] = []
	var colors := [Color("3f8fcf"), Color("8a5ac0"), Color("2f9f86"), Color("d0743a")]
	for i in choices.size():
		var c: Dictionary = choices[i]
		var b := button(c.get("text", ""), 32, colors[i % colors.size()])
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		for k in ["normal", "hover", "pressed", "disabled"]:
			(b.get_theme_stylebox(k) as StyleBoxFlat).content_margin_left = 82
		b.custom_minimum_size = Vector2(740, 78)
		b.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		var badge := Badge.new()
		badge.letter = "ABCD"[i]
		badge.font = heading
		badge.position = Vector2(14, 13)
		badge.size = Vector2(48, 48)
		badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(badge)
		b.pressed.connect(func(): chosen.emit(i))
		col.add_child(b)
		buttons.append(b)
		b.modulate.a = 0.0
		var t := create_tween()
		t.tween_interval(0.25 + i * 0.09)
		t.tween_property(b, "modulate:a", 1.0, 0.25)
	col.add_child(note)
	root.add_child(quiz)
	shade.modulate.a = 0
	create_tween().tween_property(shade, "modulate:a", 1.0, 0.3)
	p.pivot_offset = Vector2(450, 250)
	p.scale = Vector2(0.9, 0.9)
	create_tween().tween_property(p, "scale", Vector2.ONE, 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	var wrong := 0
	while true:
		var i: int = await chosen
		if choices[i].get("correct", false):
			Sound.play("correct")
			buttons[i].text = choices[i].get("text", "") + "   ✓"
			var green := buttons[i].get_theme_stylebox("normal").duplicate() as StyleBoxFlat
			green.content_margin_left = 82
			green.bg_color = Color("3fae4f")
			green.border_color = Color("2a7a36")
			for k in ["normal", "hover", "pressed"]:
				buttons[i].add_theme_stylebox_override(k, green)
			for b in buttons:
				b.disabled = b != buttons[i]
			var t := create_tween()
			t.tween_property(buttons[i], "scale", Vector2(1.06, 1.06), 0.12)
			t.tween_property(buttons[i], "scale", Vector2.ONE, 0.12)
			confetti(buttons[i].global_position + buttons[i].size / 2.0, 40)
			await get_tree().create_timer(0.9).timeout
			break
		wrong += 1
		Sound.play("wrong")
		buttons[i].disabled = true
		var shake := create_tween()
		var x0 := buttons[i].position.x
		for k in 4:
			shake.tween_property(buttons[i], "position:x", x0 + (12 if k % 2 == 0 else -12), 0.04)
		shake.tween_property(buttons[i], "position:x", x0, 0.04)
		note.text = "Not quite. %s You can read about it in %s." % [hint_text, ref]
	var out := create_tween()
	out.tween_property(quiz, "modulate:a", 0.0, 0.25)
	out.tween_callback(quiz.queue_free)
	return wrong


# ------------------------------------------------------- title and end

func title_screen(title: String, chapter: String) -> void:
	var c := Control.new()
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(c)
	# Soft dark gradients at the top and bottom so the words stand out
	for top in [true, false]:
		var g := TextureRect.new()
		var gt := GradientTexture2D.new()
		var gr := Gradient.new()
		gr.colors = PackedColorArray([Color(0.06, 0.04, 0.02, 0.75), Color(0.06, 0.04, 0.02, 0.0)])
		gt.gradient = gr
		gt.fill_from = Vector2(0, 0) if top else Vector2(0, 1)
		gt.fill_to = Vector2(0, 1) if top else Vector2(0, 0)
		g.texture = gt
		g.stretch_mode = TextureRect.STRETCH_SCALE
		g.anchor_right = 1.0
		g.anchor_top = 0.0 if top else 0.55
		g.anchor_bottom = 0.5 if top else 1.0
		g.mouse_filter = Control.MOUSE_FILTER_IGNORE
		c.add_child(g)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	c.add_child(center)
	var col := VBoxContainer.new()
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 6)
	center.add_child(col)
	var small := label("THIRD HEAVEN STUDIOS PRESENTS", heading, 22, Color(1, 0.94, 0.8, 0.85), 6)
	small.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(small)
	var t := label(title, heading, 132, Color("ffe08a"), 30)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	t.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.45))
	t.add_theme_constant_override("shadow_offset_y", 10)
	col.add_child(t)
	var sub := label("— Walk with Jesus —", heading, 44, Color.WHITE, 14)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(sub)
	var spacer := Control.new()
	spacer.custom_minimum_size.y = 34
	col.add_child(spacer)
	var b := button("Play", 56, Color("e8962e"))
	b.custom_minimum_size = Vector2(300, 0)
	b.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	b.pressed.connect(func(): play_pressed.emit())
	col.add_child(b)
	var spacer2 := Control.new()
	spacer2.custom_minimum_size.y = 16
	col.add_child(spacer2)
	var ch := label(chapter, body_bold, 26, Color.WHITE, 8)
	ch.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(ch)
	var note := label("3D preview", heading, 22, Color(1, 1, 1, 0.75), 6)
	note.anchor_left = 1.0
	note.anchor_right = 1.0
	note.anchor_top = 1.0
	note.anchor_bottom = 1.0
	note.offset_left = -170
	note.offset_top = -48
	c.add_child(note)
	t.modulate.a = 0
	var intro := create_tween()
	intro.tween_interval(0.5)
	intro.tween_property(t, "modulate:a", 1.0, 0.8)
	var pulse := create_tween().set_loops()
	pulse.tween_property(b, "scale", Vector2(1.05, 1.05), 0.7).set_trans(Tween.TRANS_SINE)
	pulse.tween_property(b, "scale", Vector2.ONE, 0.7).set_trans(Tween.TRANS_SINE)
	await play_pressed
	pulse.kill()
	var out := create_tween()
	out.tween_property(c, "modulate:a", 0.0, 0.5)
	out.tween_callback(c.queue_free)


func end_screen(chapter_line: String, stars: int, coins: int, verse: String, verse_ref: String) -> void:
	var shade := ColorRect.new()
	shade.color = Color(0.05, 0.03, 0.02, 0.55)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(shade)
	var c := CenterContainer.new()
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.add_child(c)
	var p := PanelContainer.new()
	var st := panel_style(PAPER, GOLD, 32, 5)
	st.content_margin_top = 28
	st.content_margin_bottom = 28
	st.content_margin_left = 44
	st.content_margin_right = 44
	p.add_theme_stylebox_override("panel", st)
	c.add_child(p)
	var col := VBoxContainer.new()
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 12)
	col.custom_minimum_size.x = 760
	p.add_child(col)
	var t := label(chapter_line, heading, 58, Color("5a3012"))
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(t)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 22)
	col.add_child(row)
	var star_nodes: Array[Control] = []
	for i in 3:
		var s := Icon.new()
		s.kind = "star" if i < stars else "star_off"
		s.custom_minimum_size = Vector2(104, 104) if i == 1 else Vector2(88, 88)
		s.size_flags_vertical = Control.SIZE_SHRINK_END if i != 1 else Control.SIZE_SHRINK_BEGIN
		s.pivot_offset = s.custom_minimum_size / 2.0
		s.scale = Vector2.ZERO
		row.add_child(s)
		star_nodes.append(s)
	var won := HBoxContainer.new()
	won.alignment = BoxContainer.ALIGNMENT_CENTER
	won.add_theme_constant_override("separation", 10)
	won.add_child(label("You earned %d of 3 stars!" % stars, body_bold, 26, INK))
	var coin := Coin.new()
	coin.custom_minimum_size = Vector2(32, 32)
	won.add_child(coin)
	won.add_child(label(str(coins), heading, 32, Color("b07a1a")))
	col.add_child(won)
	var line := ColorRect.new()
	line.color = PAPER_EDGE
	line.custom_minimum_size = Vector2(500, 2)
	line.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	col.add_child(line)
	var mv := label("MEMORY VERSE", heading, 24, Color("b07a3a"))
	mv.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(mv)
	var v := label("“%s”" % verse, body, 30, INK)
	v.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	col.add_child(v)
	var r := label(verse_ref, body_bold, 22, Color("8a7258"))
	r.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(r)
	var spacer := Control.new()
	spacer.custom_minimum_size.y = 8
	col.add_child(spacer)
	var b := button("Play Again", 40, Color("3fae4f"))
	b.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	b.pressed.connect(func(): play_pressed.emit())
	col.add_child(b)
	shade.modulate.a = 0
	create_tween().tween_property(shade, "modulate:a", 1.0, 0.4)
	p.pivot_offset = Vector2(420, 300)
	p.scale = Vector2(0.85, 0.85)
	create_tween().tween_property(p, "scale", Vector2.ONE, 0.45).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	confetti()
	await get_tree().create_timer(0.6).timeout
	for i in 3:
		var tw := create_tween()
		tw.tween_property(star_nodes[i], "scale", Vector2(1.25, 1.25), 0.2).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tw.tween_property(star_nodes[i], "scale", Vector2.ONE, 0.12)
		if i < stars:
			Sound.play("star")
		await tw.finished
	await play_pressed


# ------------------------------------------------------- little drawings

## The pointer under a speech bubble.
class Tail extends Control:
	func _draw() -> void:
		var bottom := get_parent_control().size.y
		var mid := get_parent_control().size.x / 2.0
		draw_colored_polygon(PackedVector2Array([Vector2(mid - 15, bottom - 3), Vector2(mid + 15, bottom - 3), Vector2(mid, bottom + 18)]), Color("d9c49a"))
		draw_colored_polygon(PackedVector2Array([Vector2(mid - 12, bottom - 4), Vector2(mid + 12, bottom - 4), Vector2(mid, bottom + 14)]), Color("f7eedb"))

	func _process(_d: float) -> void:
		queue_redraw()


## The gold coin.
class Coin extends Control:
	func _draw() -> void:
		var c := size / 2.0
		var r: float = min(size.x, size.y) / 2.0
		draw_circle(c + Vector2(0, r * 0.1), r, Color("8a5a10"))
		draw_circle(c, r, Color("f2c14a"))
		draw_circle(c, r * 0.74, Color("d99a22"))
		draw_circle(c, r * 0.6, Color("f6d36a"))
		# A small cross stamped on the coin
		draw_rect(Rect2(c.x - r * 0.08, c.y - r * 0.34, r * 0.16, r * 0.68), Color("d99a22"))
		draw_rect(Rect2(c.x - r * 0.25, c.y - r * 0.16, r * 0.5, r * 0.15), Color("d99a22"))
		draw_circle(c + Vector2(-r * 0.36, -r * 0.4), r * 0.16, Color(1, 1, 1, 0.6))


## The gold ring around the speaker's portrait.
class Ring extends Control:
	func _draw() -> void:
		var c := size / 2.0
		var r: float = min(size.x, size.y) / 2.0
		draw_circle(c + Vector2(0, 4), r, Color(0, 0, 0, 0.18))
		draw_circle(c, r, Color("c9963a"))
		draw_circle(c, r - 5, Color("f2d58a"))
		draw_circle(c, r - 8, Color("e8dcc4"))


## A letter in a circle, on quiz buttons.
class Badge extends Control:
	var letter := "A"
	var font: Font
	func _draw() -> void:
		var c := size / 2.0
		draw_circle(c, size.x / 2.0, Color(1, 1, 1, 0.92))
		var s := font.get_string_size(letter, HORIZONTAL_ALIGNMENT_LEFT, -1, 30)
		draw_string(font, Vector2(c.x - s.x / 2.0, c.y + 11), letter, HORIZONTAL_ALIGNMENT_LEFT, -1, 30, Color("3a2a1a"))


## Small pictures: a star, a water jar, a speech bubble, a book (the
## narrator) and rays of light (the voice from heaven).
class Icon extends Control:
	var kind := "star"
	func _draw() -> void:
		var c := size / 2.0
		var r: float = min(size.x, size.y) / 2.0
		match kind:
			"star", "star_off", "done":
				var pts := PackedVector2Array()
				for i in 10:
					var a := -PI / 2.0 + i * PI / 5.0
					var rr := r * (0.98 if i % 2 == 0 else 0.45)
					pts.append(c + Vector2(cos(a), sin(a)) * rr)
				var on := kind != "star_off"
				var shadow := PackedVector2Array()
				for p in pts:
					shadow.append(p + Vector2(0, r * 0.08))
				draw_colored_polygon(shadow, Color("a86a10") if on else Color(0, 0, 0, 0.15))
				draw_colored_polygon(pts, Color("f6c94a") if on else Color("d8ccb4"))
				if on:
					var inner := PackedVector2Array()
					for p in pts:
						inner.append(c + (p - c) * 0.55 + Vector2(-r * 0.05, -r * 0.08))
					draw_colored_polygon(inner, Color("ffe08a"))
			"jar":
				draw_circle(c + Vector2(0, r * 0.15), r * 0.62, Color("c0703c"))
				draw_rect(Rect2(c.x - r * 0.24, c.y - r * 0.8, r * 0.48, r * 0.6), Color("c0703c"))
				draw_rect(Rect2(c.x - r * 0.34, c.y - r * 0.9, r * 0.68, r * 0.18), Color("8a4a26"))
				draw_rect(Rect2(c.x - r * 0.62, c.y + r * 0.05, r * 1.24, r * 0.12), Color("8a4a26"))
				draw_circle(c + Vector2(-r * 0.25, -r * 0.05), r * 0.14, Color(1, 1, 1, 0.35))
			"talk":
				draw_circle(c + Vector2(0, -r * 0.08), r * 0.8, Color("f7eedb"))
				draw_colored_polygon(PackedVector2Array([c + Vector2(-r * 0.5, r * 0.4), c + Vector2(-r * 0.05, r * 0.6), c + Vector2(-r * 0.7, r * 0.95)]), Color("f7eedb"))
				for k in 3:
					draw_circle(c + Vector2((k - 1) * r * 0.36, -r * 0.08), r * 0.12, Color("6b4a2a"))
			"book":
				draw_circle(c, r, Color("6b4a2a"))
				var y := c.y + r * 0.35
				for sx in [-1.0, 1.0]:
					draw_colored_polygon(PackedVector2Array([c + Vector2(0, -r * 0.35), c + Vector2(sx * r * 0.62, -r * 0.48), Vector2(c.x + sx * r * 0.62, y), Vector2(c.x, y + r * 0.12)]), Color("f7eedb"))
					for k in 3:
						var ly := c.y - r * 0.22 + k * r * 0.17
						draw_line(Vector2(c.x + sx * r * 0.12, ly), Vector2(c.x + sx * r * 0.5, ly - r * 0.06), Color("b8a27a"), 2.0)
				draw_line(c + Vector2(0, -r * 0.35), Vector2(c.x, y + r * 0.12), Color("8a6a4a"), 2.0)
			"heaven":
				draw_circle(c, r, Color("fff6d8"))
				for k in 12:
					var a := k * TAU / 12.0
					draw_line(c + Vector2(cos(a), sin(a)) * r * 0.3, c + Vector2(cos(a), sin(a)) * r * 0.85, Color("f2c14a"), 5.0)
				draw_circle(c, r * 0.32, Color("ffe08a"))
