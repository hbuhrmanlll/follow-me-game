## Sound effects made from tones and noise in code, plus gentle music and the
## sound of the river (made by tools/make-3d-music.py), and birdsong.
extends Node

const RATE := 22050
var sounds := {}
var players: Array[AudioStreamPlayer] = []
var next := 0
var music: AudioStreamPlayer
var river: AudioStreamPlayer
var _duck := false
var _bird_timer := 4.0
var _wants_music := false


func _ready() -> void:
	sounds["tap"] = _tones([[700, 0.04]], 0.18)
	sounds["coin"] = _tones([[988, 0.06], [1319, 0.18]], 0.26)
	sounds["correct"] = _tones([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.3]], 0.26)
	sounds["wrong"] = _tones([[247, 0.14], [208, 0.24]], 0.22, true)
	sounds["star"] = _tones([[784, 0.08], [1175, 0.3]], 0.26)
	sounds["talk"] = _tones([[523, 0.04], [659, 0.07]], 0.14)
	sounds["fanfare"] = _tones([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.5]], 0.26)
	sounds["whoosh"] = _noise(0.5, 0.12, true)
	for i in 3:
		sounds["step%d" % i] = _noise(0.07, 0.07, false, 900 + i * 250)
	sounds["bird0"] = _chirp([2600, 3400, 2900], 0.07)
	sounds["bird1"] = _chirp([3100, 2500, 3300, 2700], 0.055)
	for i in 8:
		var p := AudioStreamPlayer.new()
		add_child(p)
		players.append(p)
	music = AudioStreamPlayer.new()
	music.volume_db = -11.0
	add_child(music)
	river = AudioStreamPlayer.new()
	river.volume_db = -20.0
	add_child(river)
	var m: AudioStreamOggVorbis = load("res://audio/music_jordan.ogg")
	m.loop = true
	music.stream = m
	var rv: AudioStreamOggVorbis = load("res://audio/river.ogg")
	rv.loop = true
	river.stream = rv


func play(id: String, volume_db := 0.0) -> void:
	if not sounds.has(id):
		return
	var p := players[next]
	next = (next + 1) % players.size()
	p.stream = sounds[id]
	p.volume_db = volume_db
	p.pitch_scale = 1.0
	p.play()


func step() -> void:
	play("step%d" % (randi() % 3), -8.0)


## Starts the music and the river.
func start_music() -> void:
	_wants_music = true
	if not music.playing:
		music.play()
		river.play()


## Lowers the music while someone is speaking.
func duck(on: bool) -> void:
	_duck = on


func _process(delta: float) -> void:
	var want := -19.0 if _duck else -11.0
	music.volume_db = lerp(music.volume_db, want, min(1.0, delta * 3.0))
	if _wants_music:
		_bird_timer -= delta
		if _bird_timer < 0.0:
			_bird_timer = randf_range(3.0, 9.0)
			var p := players[next]
			next = (next + 1) % players.size()
			p.stream = sounds["bird%d" % (randi() % 2)]
			p.volume_db = randf_range(-22.0, -15.0)
			p.pitch_scale = randf_range(0.85, 1.2)
			p.play()


# ------------------------------------------------------------ making sounds

func _tones(notes: Array, volume: float, square := false) -> AudioStreamWAV:
	var data := PackedByteArray()
	for n in notes:
		var freq: float = n[0]
		var count := int(RATE * float(n[1]))
		for i in count:
			var t := float(i) / RATE
			var env: float = min(1.0, i / 150.0) * exp(-t * 5.0 / float(n[1]))
			var w := sin(TAU * freq * t)
			if square:
				w = sign(w) * 0.4 + sin(TAU * freq * 0.5 * t) * 0.3
			else:
				w += 0.25 * sin(TAU * freq * 2.0 * t) + 0.1 * sin(TAU * freq * 3.0 * t)
			_put(data, w * env * volume)
	return _wav(data, RATE)


func _noise(length: float, volume: float, sweep: bool, cutoff := 1200.0) -> AudioStreamWAV:
	var data := PackedByteArray()
	var count := int(RATE * length)
	var lp := 0.0
	for i in count:
		var t := float(i) / count
		var k: float = (cutoff if not sweep else lerp(300.0, 2400.0, sin(t * PI))) / RATE * TAU
		lp += (randf() * 2.0 - 1.0 - lp) * min(1.0, k)
		var env: float = sin(t * PI) if sweep else exp(-t * 8.0) * min(1.0, i / 40.0)
		_put(data, lp * env * volume * 3.0)
	return _wav(data, RATE)


func _chirp(freqs: Array, each: float) -> AudioStreamWAV:
	var data := PackedByteArray()
	var phase := 0.0
	for k in freqs.size():
		var f0: float = freqs[k]
		var f1: float = freqs[(k + 1) % freqs.size()]
		var count := int(RATE * each)
		for i in count:
			var t := float(i) / count
			phase += TAU * lerp(f0, f1, t) / RATE
			_put(data, sin(phase) * sin(t * PI) * 0.25)
		for i in int(RATE * 0.03):
			_put(data, 0.0)
	return _wav(data, RATE)


func _put(data: PackedByteArray, v: float) -> void:
	var s := int(clamp(v, -1.0, 1.0) * 32767.0)
	data.append(s & 0xff)
	data.append((s >> 8) & 0xff)


func _wav(data: PackedByteArray, rate: int, loop_samples := 0) -> AudioStreamWAV:
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = rate
	wav.data = data
	if loop_samples > 0:
		wav.loop_mode = AudioStreamWAV.LOOP_FORWARD
		wav.loop_begin = 0
		wav.loop_end = loop_samples
	return wav
