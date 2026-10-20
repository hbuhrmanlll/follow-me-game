## Plays through the chapter by itself, for testing (run with: -- autoplay).
extends Node

var game: Node


func _ready() -> void:
	await _wait(1.5)
	game.ui.play_pressed.emit()
	await _wait(1.0)
	# Talk to the first villager, then the quest giver
	await _walk_to(game.villagers[0].p.position + Vector3(-1.1, 0, 0.3))
	game._talk(game.villagers[0])
	await _wait(2.5)
	await _walk_to(game.giver.p.position + Vector3(-1.1, 0, 0.3))
	game._talk(game.giver)
	await _wait(3.0)
	for j in game.jars.duplicate():
		await _walk_to(j.position)
		await _wait(0.8)
	await _wait(2.5)
	await _walk_to(game.star.position)
	# The story: tap through lines, answer the quiz (one wrong try first)
	while game.mode == "story":
		await _wait(0.3)
		if game.ui.quiz and is_instance_valid(game.ui.quiz):
			await _wait(1.2)
			var pz_choices: Array = []
			for b in _buttons(game.ui.quiz):
				pz_choices.append(b)
			for i in pz_choices.size():
				if not pz_choices[i].disabled and not _is_correct(pz_choices[i].text):
					pz_choices[i].pressed.emit()
					break
			await _wait(1.2)
			for i in pz_choices.size():
				if _is_correct(pz_choices[i].text):
					pz_choices[i].pressed.emit()
			await _wait(2.0)
	await _wait(4.0)
	print("AUTOPLAY DONE coins=", game.coins, " mistakes=", game.mistakes)
	get_tree().quit()


func _is_correct(text: String) -> bool:
	for s in game.chapter.scenes:
		for pz in [s.get("puzzle", {})] + s.get("puzzles", []):
			for c in pz.get("choices", []):
				if c.get("correct", false) and text.ends_with(c.text):
					return true
	return false


func _buttons(n: Node) -> Array:
	var out := []
	for c in n.get_children():
		if c is Button:
			out.append(c)
		out.append_array(_buttons(c))
	return out


func _walk_to(p: Vector3) -> void:
	game._walk_to(p)
	while game.walking and game.mode == "explore":
		await get_tree().process_frame


func _wait(s: float) -> void:
	await get_tree().create_timer(s).timeout
