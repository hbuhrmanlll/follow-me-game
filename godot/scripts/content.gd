## Loads the shared game content: Bible text, chapters, characters, looks,
## interface words and voice recordings. It's the same data the 2D game uses
## (copied in by tools/godot-content.sh), so both versions always match.
extends Node

var characters := {}
var looks := {}
var ui := {}
var explore := {}
var scripture := {} # translation -> book -> chapters
var translation := "bsb"

const BOOKS := ["matthew", "mark", "luke", "john", "acts"]
const SKINS := ["#a8774e", "#9a6844", "#b08058", "#946442", "#a26f4a"]
const HAIRS := ["#1e1610", "#2e2014", "#3a2618", "#241a12", "#4a3020"]
const TUNICS := ["#d6c6a2", "#c9b48f", "#cdbd9b", "#c2ac86", "#ddd0b2"]
const MANTLES := ["#5a6a7a", "#7a5a3a", "#4a6a5a", "#8a6a4a", "#6a5a7a", "#7a4a3a"]
const STYLES := ["short", "curly", "wavy", "short", "curly"]
const BEARDS := ["full", "short", "full", "long", "short"]


func _ready() -> void:
	characters = read("res://content/en/characters.json")
	looks = read("res://content/looks.json")
	ui = read("res://content/en/ui.json")
	explore = read("res://content/en/explore.json")
	for t in ["bsb", "kjv"]:
		scripture[t] = {}
		for b in BOOKS:
			var data = read("res://content/scripture/%s/%s.json" % [t, b])
			scripture[t][b] = data.get("chapters", {}) if data is Dictionary else {}


func read(path: String):
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		push_warning("Missing content file: " + path)
		return {}
	return JSON.parse_string(f.get_as_text())


func chapter(id: String) -> Dictionary:
	return read("res://content/en/chapters/%s.json" % id)


## How a character looks: their own entry in looks.json, or a varied everyday
## look for villagers and crowds. Mirrors the 2D game's rules.
func look_for(id: String, variant := 0) -> Dictionary:
	var raw: Dictionary = looks.get(id, {}).duplicate()
	var seed := 7
	for ch in id:
		seed = (seed * 31 + ch.unicode_at(0)) % 1000003
	seed += variant * 7
	var crowd: bool = id == "townspeople" or id == "disciples" or raw.get("group", 1) > 1 or variant > 0
	var pick = func(list: Array, k := 0): return list[(seed + k) % list.size()]
	var out := raw
	var sex: String = raw.get("sex", "f" if (crowd and variant % 3 == 1 and id == "townspeople") else "m")
	out["sex"] = sex
	if crowd or not raw.has("skin"): out["skin"] = raw.get("skin", pick.call(SKINS))
	if crowd and not raw.has("hair"): out["hair"] = pick.call(HAIRS, 1)
	if not out.has("hairStyle"): out["hairStyle"] = pick.call(STYLES, 2) if crowd else "short"
	if sex == "f": out["beard"] = "none"
	elif not out.has("beard"): out["beard"] = pick.call(BEARDS, 3) if crowd else "short"
	if not out.has("tunic"): out["tunic"] = pick.call(TUNICS, 4)
	if not out.has("mantle"):
		out["mantle"] = pick.call(MANTLES, 5) if crowd else characters.get(id, {}).get("color", "#7a6a5a")
	if not out.has("head") and sex == "f": out["head"] = "scarf"
	if not out.has("headColor"): out["headColor"] = out["mantle"] if out["mantle"] != null else pick.call(MANTLES, 6)
	return out


func name_of(id: String) -> String:
	return characters.get(id, {}).get("name", id)


## The words of a story line: Scripture from the Bible file (or the quoted part), or narration.
func line_text(line: Dictionary) -> String:
	if line.get("type") == "scripture":
		return verse_text(line.get("ref", ""), line.get("quote", {}))
	return line.get("text", "")


func verse_text(ref: String, quote) -> String:
	if quote is Dictionary and quote.has(translation) and quote[translation].size() > 0:
		return " … ".join(quote[translation])
	var re := RegEx.create_from_string("^(Matthew|Mark|Luke|John|Acts) (\\d+):(\\d+)(?:-(?:(\\d+):)?(\\d+))?$")
	var m := re.search(ref)
	if m == null:
		return ""
	var book: Dictionary = scripture[translation].get(m.get_string(1).to_lower(), {})
	var c1 := int(m.get_string(2))
	var v1 := int(m.get_string(3))
	var c2 := int(m.get_string(4)) if m.get_string(4) != "" else c1
	var v2 := int(m.get_string(5)) if m.get_string(5) != "" else v1
	var out: Array[String] = []
	for c in range(c1, c2 + 1):
		var chap: Dictionary = book.get(str(c), {})
		var first := v1 if c == c1 else 1
		var last := v2 if c == c2 else 200
		for v in range(first, last + 1):
			if chap.has(str(v)):
				out.append(chap[str(v)])
	return " ".join(out)


## The recording of a story line, if there is one.
func line_audio(line: Dictionary) -> AudioStream:
	var id: String = line.get("id", "")
	var path := "res://content/audio/en/%s/%s.mp3" % [translation, id] if line.get("type") == "scripture" else "res://content/audio/en/%s.mp3" % id
	return load(path) if ResourceLoader.exists(path) else null


## Recorded sentences for everything outside the story lines. They are split
## and named exactly as in tools/phrases.mjs, so each sentence finds its file.
func phrase_streams(text: String) -> Array:
	var out := []
	for s in sentences(text):
		var path := "res://content/audio/en/phrases/%s.mp3" % phrase_key(s)
		if ResourceLoader.exists(path):
			out.append(load(path))
	return out


func sentences(text: String) -> Array[String]:
	var t := RegEx.create_from_string("\\s+").sub(text, " ", true)
	var parts: Array[String] = []
	var start := 0
	for i in t.length():
		if i < t.length() - 1 and t[i] in ".!?…:" and t[i + 1] == " ":
			parts.append(t.substr(start, i + 1 - start))
			start = i + 2
	parts.append(t.substr(start))
	var out: Array[String] = []
	for p in parts:
		var c := _clean(p)
		if RegEx.create_from_string("[A-Za-z0-9]").search(c):
			out.append(c)
	return out


func _clean(s: String) -> String:
	var i := 0
	while i < s.length() and not RegEx.create_from_string("[A-Za-z0-9“\"‘'(]").search(s[i]):
		i += 1
	return s.substr(i).strip_edges()


## FNV-1a of the lower-cased sentence (the same as the 2D game). JavaScript
## works on UTF-16 code units, so this does too.
func phrase_key(s: String) -> String:
	var h := 0x811c9dc5
	var t := _clean(s).to_lower()
	var units := t.to_utf16_buffer()
	for i in range(0, units.size(), 2):
		var cu := units[i] | (units[i + 1] << 8)
		h = h ^ cu
		h = (h * 0x01000193) & 0xffffffff
	return "%08x" % h
