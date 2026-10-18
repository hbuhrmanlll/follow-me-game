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
| `content/en/locations.json` | Each place: its name, region and a short summary |
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

More puzzle types arrive in Phases 3 and 4.

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
