# Content Guide: changing the story without touching code

All of the story lives in the **`content/`** folder. You can edit these files right on
GitHub: open the file, click the ✏️ pencil, make your change, and click **Commit changes**.
About a minute later your Netlify link shows the new version.

If you make a mistake (a typo in a reference, a missing comma), Netlify **won't publish**
the broken version. Your game link keeps showing the last good one. See
"If something goes wrong" at the bottom.

## Where things are

| File | What's in it |
|---|---|
| `content/en/chapters/index.json` | The list of chapters, in order |
| `content/en/chapters/ch01.json` | Chapter 1: its scenes, lines, puzzles and memory verse |
| `content/en/characters.json` | Each character's name, color, initials and voice pitch/speed |
| `content/en/locations.json` | Each place: its name, region, a short summary (read aloud on the map) and which background to draw |
| `content/map.json` | Where each place sits on the map (latitude, longitude). No language in it |
| `content/en/map-labels.json` | Region and water names printed on the map |
| `content/en/ui.json` | Every button label and menu word |
| `content/scripture/bsb/`, `kjv/` | The Bible text. **Don't edit these.** |

`en` means English. A Spanish version will go in an `es` folder later.

## The two kinds of lines

**1. Scripture lines.** The words come straight from the Bible files, so they are always
word for word. You write only the reference, never the words:

```json
{ "id": "ch01-s2-04", "speaker": "narrator", "type": "scripture", "ref": "Matthew 3:16" }
```

To use **only part** of a verse (for example, just Jesus' words without "Jesus replied"),
add a `quote` with the exact words copied from **both** translations. If a piece leaves
words out, the game shows "…" between the pieces:

```json
{
  "id": "ch01-s2-03", "speaker": "jesus", "type": "scripture", "ref": "Matthew 3:15",
  "quote": {
    "bsb": ["Let it be so now", "It is fitting for us to fulfill all righteousness in this way."],
    "kjv": ["Suffer it to be so now: for thus it becometh us to fulfil all righteousness."]
  }
}
```

The checker makes sure every quoted word really is in that verse.

**2. Narration lines.** These are short bridging lines you write yourself. The game shows
them in a different color with a **"Narration"** tag, so players know it isn't Scripture.
Keep them short and faithful to the passage. **Jesus can never have a narration line.**

```json
{ "id": "ch01-s1-01", "speaker": "narrator", "type": "narration", "text": "Long ago, crowds walked out to the Jordan River to hear a man named John." }
```

## Rules for every line

- **`id`** must be unique. Use the pattern `ch01-s2-05` (chapter 1, scene 2, line 5).
  Later, each line's voice recording will be named after its id (`ch01-s2-05.ogg`).
  So if you change a line's words, keep its id. If you add a new line, give it a new id.
- **`speaker`** must match a name in `characters.json` (for example `jesus`, `narrator`, `john-baptist`).
- **References** are written like `Matthew 3:16`, `Matthew 3:13-17` or `Mark 4:35-5:20`.
  Use the full book name with a capital letter: Matthew, Mark, Luke, John or Acts.

## How to add a scene

Copy an existing scene inside `"scenes": [ ... ]`, paste it after the last one, put a comma
between them, then change it:

```json
{
  "id": "ch01-s3",
  "title": "A Short Title",
  "location": "jordan",
  "timeOfDay": "dawn",
  "passage": "Matthew 3:13-17",
  "lines": [ ... ],
  "puzzle": { ... }
}
```

- `timeOfDay` can be `dawn`, `midday`, `dusk` or `night`.
- `passage` is what the 📜 Scripture button shows.
- **Every scene must end with a puzzle.**

## The puzzle (multiple choice)

```json
"puzzle": {
  "type": "multipleChoice",
  "prompt": "What did John eat in the wilderness?",
  "choices": [
    { "text": "Locusts and wild honey", "correct": true },
    { "text": "Bread and fish" },
    { "text": "Figs and grapes" }
  ],
  "hint": "Think about how John lived out in the wilderness.",
  "ref": "Matthew 3:4"
}
```

Exactly one choice gets `"correct": true`. The game mixes up the order each time. A wrong
answer shows the hint plus "You can read about it in Matthew 3:4."

## The puzzle (fill in the missing word)

```json
"puzzle": {
  "type": "fillBlank",
  "prompt": "Fill in the missing word.",
  "ref": "Matthew 4:4",
  "quote": {
    "bsb": ["Man shall not live on bread alone, but on every word that comes from the mouth of God."],
    "kjv": ["Man shall not live by bread alone, but by every word that proceedeth out of the mouth of God."]
  },
  "blank": { "bsb": "word", "kjv": "word" },
  "decoys": ["meal", "coin", "song"],
  "hint": "We live on everything God says."
}
```

- `quote` is optional. Leave it out to use the whole verse.
- `blank` is the word to hide, for each translation. It must really be in that verse.
- `decoys` are the wrong words to choose from (2 or 3 work best).

## The puzzle (find the place on the map)

```json
"puzzle": {
  "type": "mapFind",
  "prompt": "Tap Jerusalem on the map.",
  "target": "jerusalem",
  "choices": ["jerusalem", "jordan", "nazareth", "bethsaida"],
  "hint": "Jerusalem is in Judea, in the hills west of the Dead Sea.",
  "ref": "Matthew 4:5"
}
```

The `choices` show as unlabeled dots. Tapping a wrong dot names that place, so the player still
learns it. Every place must be in both `locations.json` and `map.json`.

More puzzle types arrive in Phase 4.

## Notes ("ⓘ Note" cards)

Add `"note": "..."` to a scene to show a short note before it starts. Use notes where the
Gospels tell events in a different order, or where the Bible doesn't say something directly
(for example, who the unnamed disciple was).

## Disciples joining

Add `"joins": ["andrew"]` to the line after which a disciple starts following Jesus. They then
appear in every later scene. Each disciple needs `"disciple": true` in `characters.json`.

## Adding a new place

1. In `content/en/locations.json`, add the name, region and summary. Add `"backdrop"` only if a
   scene happens there. Backgrounds so far: `jordan`, `wilderness`, `jerusalem`, `galilee`.
2. In `content/map.json`, under `"places"`, add `[latitude, longitude]`. You can look these up on
   any online map; for example Capernaum is `[32.88, 35.575]`.

## Chapter ending

Each chapter has a `memoryVerse` (same format as a Scripture line: `ref`, plus `quote` if
you want only part of the verse) and a one-line `reflect` thought.

## If something goes wrong

On Netlify, open your project, click **Deploys**, and click the failed one (marked in red). Scroll the log to the bottom.
The checker lists each problem in plain words, for example:

```
✗ Found 1 problem(s):
  - ch01 line ch01-s2-03: "Let it be so" is not word-for-word in KJV Matthew 3:15
```

Fix that line and commit again. If you get stuck, paste the message to Claude.
