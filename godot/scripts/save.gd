## Players and their progress, saved only on this device (no accounts, nothing
## sent anywhere). Three player slots, like the 2D game, plus shared settings.
extends Node

const PATH := "user://followme3d.json"
const SLOT_COUNT := 3
const DEFAULT_LOOKS := [
	{"sex": "m", "skin": "#b08058", "hair": "#3a2618", "tunic": "#e0d2b2", "mantle": "#4a7aa8"},
	{"sex": "f", "skin": "#a8774e", "hair": "#2a1a10", "tunic": "#e4d6b8", "mantle": "#c0603a"},
]

var slots: Array = [null, null, null]
var current := -1
var settings := {
	"autoAdvance": true, # lines move on by themselves after they are read
	"shortStory": true, # Kids and Family: skip the narrator's in-between lines
	"voiceVolume": 1.0,
	"musicVolume": 0.6,
	"sfxVolume": 0.8,
}


func _ready() -> void:
	load_all()


func load_all() -> void:
	if not FileAccess.file_exists(PATH):
		return
	var f := FileAccess.open(PATH, FileAccess.READ)
	if f == null:
		return
	var data = JSON.parse_string(f.get_as_text())
	if not data is Dictionary:
		return
	var s: Array = data.get("slots", [])
	for i in SLOT_COUNT:
		slots[i] = _fix(s[i]) if i < s.size() and s[i] is Dictionary else null
	var st: Dictionary = data.get("settings", {})
	for k in st:
		settings[k] = st[k]


func save() -> void:
	var f := FileAccess.open(PATH, FileAccess.WRITE)
	if f == null:
		return # storage blocked: the game still plays, it just won't remember
	f.store_string(JSON.stringify({"slots": slots, "settings": settings}))


func slot() -> Dictionary:
	return slots[current] if current >= 0 and slots[current] != null else {}


func progress() -> Dictionary:
	return slot().get("progress", {})


func new_slot(index: int, player_name: String, difficulty: String) -> Dictionary:
	var s := {
		"name": player_name,
		"difficulty": difficulty, # kids | family | adult
		"translation": "bsb",
		"coins": 0,
		"xp": 0,
		"look": DEFAULT_LOOKS[player_name.length() % 2].duplicate(),
		"unlocked": [],
		"journal": [],
		"progress": {
			"chapter": "ch01", "scene": 0, "step": 0, "completed": [], "visited": [],
			"disciples": [], "departed": [], "mistakes": 0, "streak": 0, "stars": {},
		},
		"updated": Time.get_unix_time_from_system(),
	}
	slots[index] = s
	current = index
	save()
	return s


func delete_slot(index: int) -> void:
	slots[index] = null
	if current == index:
		current = -1
	save()


func earn(n: int) -> void:
	var s := slot()
	if s.is_empty():
		return
	s["coins"] = int(s.get("coins", 0)) + n
	s["xp"] = int(s.get("xp", 0)) + n


func level() -> int:
	return 1 + int(slot().get("xp", 0)) / 40


## Adds a verse to the player's Verse Journal (once).
func add_verse(ref: String, quote) -> void:
	var s := slot()
	if s.is_empty() or ref == "":
		return
	for e in s["journal"]:
		if e.get("ref") == ref:
			return
	var entry := {"ref": ref, "box": 1, "due": 0}
	if quote is Dictionary:
		entry["quote"] = quote
	s["journal"].append(entry)


# Older or partial saves get any missing fields.
func _fix(s: Dictionary) -> Dictionary:
	for k in ["coins", "xp"]:
		s[k] = int(s.get(k, 0))
	if not s.has("difficulty"): s["difficulty"] = "family"
	if not s.has("translation"): s["translation"] = "bsb"
	if not s.has("look"): s["look"] = DEFAULT_LOOKS[0].duplicate()
	if not s.has("unlocked"): s["unlocked"] = []
	if not s.has("journal"): s["journal"] = []
	var p: Dictionary = s.get("progress", {})
	for k in ["completed", "visited", "disciples", "departed"]:
		if not p.has(k): p[k] = []
	if not p.has("stars"): p["stars"] = {}
	for k in ["scene", "step", "mistakes", "streak"]:
		p[k] = int(p.get(k, 0))
	if not p.has("chapter"): p["chapter"] = "ch01"
	s["progress"] = p
	return s
