## Little sound effects, made from tones in code (no sound files needed).
extends Node

const RATE := 22050
var sounds := {}
var players: Array[AudioStreamPlayer] = []
var next := 0


func _ready() -> void:
	sounds["tap"] = _tones([[660, 0.05]], 0.25)
	sounds["coin"] = _tones([[988, 0.07], [1319, 0.16]], 0.3)
	sounds["correct"] = _tones([[523, 0.1], [659, 0.1], [784, 0.22]], 0.3)
	sounds["wrong"] = _tones([[220, 0.12], [185, 0.2]], 0.3, true)
	sounds["star"] = _tones([[784, 0.08], [1175, 0.25]], 0.3)
	sounds["talk"] = _tones([[440, 0.04], [554, 0.06]], 0.18)
	sounds["fanfare"] = _tones([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.4]], 0.3)
	for i in 6:
		var p := AudioStreamPlayer.new()
		add_child(p)
		players.append(p)


func play(id: String) -> void:
	if not sounds.has(id):
		return
	var p := players[next]
	next = (next + 1) % players.size()
	p.stream = sounds[id]
	p.play()


func _tones(notes: Array, volume: float, square := false) -> AudioStreamWAV:
	var data := PackedByteArray()
	for n in notes:
		var freq: float = n[0]
		var count := int(RATE * float(n[1]))
		for i in count:
			var t := float(i) / RATE
			var env: float = min(1.0, i / 200.0) * exp(-t * 6.0 / float(n[1]))
			var w := sin(TAU * freq * t)
			if square:
				w = sign(w) * 0.5
			else:
				w += 0.3 * sin(TAU * freq * 2.0 * t)
			var s := int(clamp(w * env * volume, -1.0, 1.0) * 32767.0)
			data.append(s & 0xff)
			data.append((s >> 8) & 0xff)
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = RATE
	wav.data = data
	return wav
