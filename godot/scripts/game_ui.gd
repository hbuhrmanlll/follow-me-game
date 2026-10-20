## Everything drawn on top of the 3D world: the coin counter, hints, the
## story box at the bottom, quiz questions, big pop-up words, and the title
## and chapter-end screens.
class_name GameUI
extends CanvasLayer

signal chosen(index: int)
signal play_pressed

const INK := Color("2a1a10")
const PAPER := Color("f6ecd6")
const GOLD := Color("d9a441")
const DARK := Color("24170e")

var heading: Font = load("res://fonts/lilita_one_regular.ttf")
var body: Font = load("res://fonts/DejaVuSerif.ttf")
var body_bold: Font = load("res://fonts/DejaVuSerif-Bold.ttf")

var root: Control
var coins_label: Label
var coin_icon: Control
var hint_label: Label
var story_box: PanelContainer
var story_name: Label
var story_text: Label
var story_ref: Label
var tap_note: Label
var flash_rect: ColorRect
var quiz: Control


func _ready() -> void:
	layer = 10
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	flash_rect = ColorRect.new()
	flash_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	flash_rect.color = Color(1, 1, 1, 0)
	flash_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(flash_rect)
	_build_hud()
	_build_story_box()


static func panel_style(bg: Color, border: Color, radius := 22, border_w := 4) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(border_w)
	s.set_corner_radius_all(radius)
	s.shadow_color = Color(0, 0, 0, 0.35)
	s.shadow_size = 8
	s.shadow_offset = Vector2(0, 4)
	s.content_margin_left = 26
	s.content_margin_right = 26
	s.content_margin_top = 16
	s.content_margin_bottom = 16
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


func button(text: String, size := 40) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_override("font", heading)
	b.add_theme_font_size_override("font_size", size)
	b.add_theme_color_override("font_color", Color.WHITE)
	b.add_theme_color_override("font_hover_color", Color.WHITE)
	b.add_theme_color_override("font_pressed_color", Color("ffe6a8"))
	b.add_theme_constant_override("outline_size", 8)
	b.add_theme_color_override("font_outline_color", Color("5a3a12"))
	var normal := panel_style(Color("e0952e"), Color("8a5212"), 28, 4)
	normal.content_margin_left = 48
	normal.content_margin_right = 48
	var hover := normal.duplicate()
	hover.bg_color = Color("f0a83c")
	var pressed := normal.duplicate()
	pressed.bg_color = Color("c47a1e")
	b.add_theme_stylebox_override("normal", normal)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", pressed)
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	b.pivot_offset = Vector2(120, 40)
	b.button_down.connect(func(): Sound.play("tap"))
	return b


func _build_hud() -> void:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", panel_style(Color(DARK, 0.88), GOLD, 30, 3))
	p.position = Vector2(20, 18)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	coin_icon = Coin.new()
	coin_icon.custom_minimum_size = Vector2(40, 40)
	row.add_child(coin_icon)
	coins_label = label("0", heading, 36, Color("ffe08a"))
	coins_label.custom_minimum_size.x = 70
	row.add_child(coins_label)
	p.add_child(row)
	p.name = "Hud"
	p.visible = false
	root.add_child(p)
	hint_label = label("", heading, 30, Color.WHITE, 10)
	hint_label.set_anchors_preset(Control.PRESET_CENTER_TOP)
	hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint_label.position = Vector2(-500, 26)
	hint_label.size = Vector2(1000, 50)
	root.add_child(hint_label)


func show_hud(on: bool) -> void:
	root.get_node("Hud").visible = on


func set_coins(n: int, pop := true) -> void:
	coins_label.text = str(n)
	if pop:
		coin_icon.pivot_offset = Vector2(20, 20)
		var t := create_tween()
		t.tween_property(coin_icon, "scale", Vector2(1.35, 1.35), 0.08)
		t.tween_property(coin_icon, "scale", Vector2.ONE, 0.12)


func hint(text: String) -> void:
	hint_label.text = text
	hint_label.modulate.a = 0
	create_tween().tween_property(hint_label, "modulate:a", 1.0, 0.4)


func _build_story_box() -> void:
	story_box = PanelContainer.new()
	story_box.add_theme_stylebox_override("panel", panel_style(Color(PAPER, 0.97), Color("6b4a2a"), 24, 4))
	story_box.anchor_left = 0.5
	story_box.anchor_right = 0.5
	story_box.anchor_top = 1.0
	story_box.anchor_bottom = 1.0
	story_box.offset_left = -540
	story_box.offset_right = 540
	story_box.offset_bottom = -20
	story_box.offset_top = -20
	story_box.grow_horizontal = Control.GROW_DIRECTION_BOTH
	story_box.grow_vertical = Control.GROW_DIRECTION_BEGIN
	story_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 6)
	var top := HBoxContainer.new()
	story_name = label("", heading, 30, Color("8a4a1a"))
	story_name.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	story_ref = label("", body_bold, 20, Color("7a6a5a"))
	top.add_child(story_name)
	top.add_child(story_ref)
	col.add_child(top)
	story_text = label("", body, 28, INK)
	story_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	story_text.custom_minimum_size.x = 1020
	story_text.add_theme_constant_override("line_spacing", 4)
	col.add_child(story_text)
	tap_note = label("Tap to continue ▶", heading, 20, Color("a07a4a"))
	tap_note.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	col.add_child(tap_note)
	story_box.add_child(col)
	story_box.visible = false
	root.add_child(story_box)


func show_line(who: String, text: String, ref: String, color: Color) -> void:
	story_name.text = who
	story_name.add_theme_color_override("font_color", color.darkened(0.25))
	story_ref.text = ref
	story_text.text = text
	story_text.visible_ratio = 0.0
	story_box.visible = true
	story_box.offset_top = story_box.offset_bottom # shrink to fit; it grows upward
	await get_tree().process_frame
	create_tween().tween_property(story_text, "visible_ratio", 1.0, clamp(text.length() * 0.012, 0.3, 1.6))


func hide_line() -> void:
	story_box.visible = false


## A speech bubble. The game moves it to follow the speaker's head.
func bubble(text: String) -> Control:
	var p := PanelContainer.new()
	var st := panel_style(Color(PAPER, 0.97), Color("6b4a2a"), 20, 3)
	st.content_margin_left = 18
	st.content_margin_right = 18
	st.content_margin_top = 10
	st.content_margin_bottom = 10
	p.add_theme_stylebox_override("panel", st)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var l := label(text, body_bold, 22, INK)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size.x = 340
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	p.add_child(l)
	var tail := Tail.new()
	tail.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.add_child(tail)
	root.add_child(p)
	root.move_child(p, 1)
	p.scale = Vector2(0.3, 0.3)
	create_tween().tween_property(p, "scale", Vector2.ONE, 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	return p


## A big word that pops up in the middle of the screen and floats away.
func pop(text: String, color := Color("ffe08a"), size := 64) -> void:
	var l := label(text, heading, size, color, 16)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var vp := get_viewport().get_visible_rect().size
	l.size = Vector2(vp.x, size * 1.4)
	l.position = Vector2(0, vp.y * 0.32)
	l.pivot_offset = Vector2(vp.x / 2, size * 0.7)
	l.scale = Vector2(0.3, 0.3)
	root.add_child(l)
	var t := create_tween()
	t.tween_property(l, "scale", Vector2.ONE, 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	t.tween_interval(0.9)
	t.tween_property(l, "position:y", l.position.y - 60, 0.5)
	t.parallel().tween_property(l, "modulate:a", 0.0, 0.5)
	t.tween_callback(l.queue_free)


func flash(color: Color, peak := 0.8, time := 1.2) -> void:
	flash_rect.color = Color(color, 0)
	var t := create_tween()
	t.tween_property(flash_rect, "color:a", peak, time * 0.3)
	t.tween_property(flash_rect, "color:a", 0.0, time * 0.7)


## A multiple-choice question. Wrong answers fade out until the right one is
## picked. Returns how many wrong tries it took.
func ask(prompt: String, choices: Array, hint_text: String, ref: String) -> int:
	quiz = Control.new()
	quiz.set_anchors_preset(Control.PRESET_FULL_RECT)
	var shade := ColorRect.new()
	shade.color = Color(0, 0, 0, 0.45)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	quiz.add_child(shade)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	quiz.add_child(center)
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", panel_style(PAPER, Color("6b4a2a"), 28, 5))
	center.add_child(p)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 16)
	col.custom_minimum_size.x = 820
	p.add_child(col)
	var q := label(prompt, heading, 40, Color("6b3a14"))
	q.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	q.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	col.add_child(q)
	var note := label("", body, 24, Color("8a3a1a"))
	note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var buttons: Array[Button] = []
	for i in choices.size():
		var c: Dictionary = choices[i]
		var b := button(c.get("text", ""), 32)
		b.custom_minimum_size = Vector2(760, 76)
		b.pressed.connect(func(): chosen.emit(i))
		col.add_child(b)
		buttons.append(b)
	col.add_child(note)
	root.add_child(quiz)
	quiz.modulate.a = 0
	create_tween().tween_property(quiz, "modulate:a", 1.0, 0.3)
	var wrong := 0
	while true:
		var i: int = await chosen
		if choices[i].get("correct", false):
			Sound.play("correct")
			var t := create_tween().set_loops(3)
			t.tween_property(buttons[i], "modulate", Color(0.7, 1.4, 0.7), 0.12)
			t.tween_property(buttons[i], "modulate", Color.WHITE, 0.12)
			await t.finished
			break
		wrong += 1
		Sound.play("wrong")
		buttons[i].disabled = true
		buttons[i].modulate.a = 0.35
		var shake := create_tween()
		for k in 4:
			shake.tween_property(buttons[i], "position:x", buttons[i].position.x + (12 if k % 2 == 0 else -12), 0.04)
		shake.tween_property(buttons[i], "position:x", buttons[i].position.x, 0.04)
		note.text = "Not quite. %s You can read about it in %s." % [hint_text, ref]
	quiz.queue_free()
	return wrong


func title_screen(title: String, chapter: String) -> void:
	var c := CenterContainer.new()
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	var col := VBoxContainer.new()
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 10)
	var t := label(title, heading, 120, Color("ffe08a"), 28)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(t)
	var sub := label("Walk with Jesus · 3D test", heading, 40, Color.WHITE, 14)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(sub)
	var ch := label(chapter, body_bold, 30, Color.WHITE, 10)
	ch.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(ch)
	var spacer := Control.new()
	spacer.custom_minimum_size.y = 30
	col.add_child(spacer)
	var b := button("▶  Play", 54)
	b.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	b.pressed.connect(func(): play_pressed.emit())
	col.add_child(b)
	c.add_child(col)
	var by := label("Third Heaven Studios", heading, 24, Color(1, 1, 1, 0.85), 8)
	by.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	by.position = Vector2(-300, -50)
	root.add_child(c)
	c.add_child(by)
	by.top_level = true
	by.position = get_viewport().get_visible_rect().size - Vector2(300, 50)
	var pulse := create_tween().set_loops()
	pulse.tween_property(b, "scale", Vector2(1.06, 1.06), 0.6)
	pulse.tween_property(b, "scale", Vector2.ONE, 0.6)
	await play_pressed
	pulse.kill()
	var out := create_tween()
	out.tween_property(c, "modulate:a", 0.0, 0.4)
	out.tween_callback(c.queue_free)


func end_screen(chapter_line: String, stars: int, coins: int, verse: String, verse_ref: String) -> void:
	var shade := ColorRect.new()
	shade.color = Color(0, 0, 0, 0.5)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(shade)
	var c := CenterContainer.new()
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.add_child(c)
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", panel_style(PAPER, GOLD, 30, 6))
	c.add_child(p)
	var col := VBoxContainer.new()
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 14)
	col.custom_minimum_size.x = 760
	p.add_child(col)
	var t := label(chapter_line, heading, 54, Color("6b3a14"))
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(t)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 18)
	col.add_child(row)
	var star_nodes: Array[Label] = []
	for i in 3:
		var s := label("★", heading, 96, Color("f2c14a") if i < stars else Color(0.55, 0.5, 0.42, 0.5), 10)
		s.pivot_offset = Vector2(40, 60)
		s.scale = Vector2.ZERO
		row.add_child(s)
		star_nodes.append(s)
	var won := label("You earned %d of 3 stars!   Coins: %d" % [stars, coins], body_bold, 26, INK)
	won.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(won)
	var mv := label("Memory Verse", heading, 30, Color("8a4a1a"))
	mv.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(mv)
	var v := label("“%s”\n— %s" % [verse, verse_ref], body, 28, INK)
	v.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	col.add_child(v)
	var b := button("↻  Play Again", 40)
	b.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	b.pressed.connect(func(): play_pressed.emit())
	col.add_child(b)
	shade.modulate.a = 0
	create_tween().tween_property(shade, "modulate:a", 1.0, 0.4)
	await get_tree().create_timer(0.5).timeout
	for i in 3:
		var tw := create_tween()
		tw.tween_property(star_nodes[i], "scale", Vector2.ONE, 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		if i < stars:
			Sound.play("star")
		await tw.finished
	await play_pressed


## The little pointer under a speech bubble.
class Tail extends Control:
	func _draw() -> void:
		var bottom := get_parent_control().size.y
		var mid := get_parent_control().size.x / 2.0
		draw_colored_polygon(PackedVector2Array([Vector2(mid - 14, bottom - 4), Vector2(mid + 14, bottom - 4), Vector2(mid, bottom + 18)]), Color("6b4a2a"))
		draw_colored_polygon(PackedVector2Array([Vector2(mid - 10, bottom - 5), Vector2(mid + 10, bottom - 5), Vector2(mid, bottom + 12)]), Color("f6ecd6"))

	func _process(_d: float) -> void:
		queue_redraw()


## The gold coin icon.
class Coin extends Control:
	func _draw() -> void:
		var c := size / 2.0
		var r: float = min(size.x, size.y) / 2.0
		draw_circle(c + Vector2(1.5, 2), r, Color("8a5a10"))
		draw_circle(c, r, Color("f2c14a"))
		draw_circle(c, r * 0.72, Color("d99a22"))
		draw_circle(c, r * 0.58, Color("f6d36a"))
		draw_circle(c + Vector2(-r * 0.3, -r * 0.35), r * 0.2, Color(1, 1, 1, 0.55))
