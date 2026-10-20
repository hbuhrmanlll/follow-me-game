# The 3D version (Godot)

This is a test of Follow Me built with a real game engine, **Godot 4.7**
(free and open source). It has Chapter 1 only, *The Baptism of Jesus*, in 3D:

1. Walk along the Jordan River. Tap the ground to walk there.
2. Tap people to talk to them. The person with the **!** has lost 3 water jars. Find them for coins.
3. Walk to the glowing star. The story begins, with the same Bible text and voices as the 2D game.
4. Watch Jesus being baptized, the heavens opening and the dove coming down.
5. Answer the questions and earn up to 3 stars.

## Try it

- **On a computer or phone browser:** https://hbuhrmanlll.github.io/follow-me-game/3d/
  (the first load is about 60 MB, so give it a moment).
- **As an Android app:** https://github.com/hbuhrmanlll/follow-me-game/releases/download/test-build-3d/follow-me-3d-test.apk
  It installs as "Follow Me 3D (test)", next to the regular test app.

Both are rebuilt by GitHub automatically after every change (workflows
`website.yml` and `godot.yml`). Nothing needs installing on your computer.

## How it is made

- Everything in 3D is built from simple shapes in code: the people, palms,
  reeds, river, tents, hills, jars, the dove and the light from heaven.
  No downloaded models, so there are no licenses to worry about.
- It reads the same files as the 2D game (`content/`): Bible text, chapters,
  character looks, villager lines and voice recordings. `tools/godot-content.sh`
  copies them into `godot/content/` before building.
- Fonts: Lilita One (SIL Open Font License) and DejaVu Serif (free license),
  with their licenses in `godot/fonts/`.

| File | What it does |
| --- | --- |
| `godot/scripts/main.gd` | The chapter: walking, villagers, the jar quest, the story and the baptism |
| `godot/scripts/world_jordan.gd` | The Jordan valley: ground, river, plants, tents, hills, sky and sunlight |
| `godot/scripts/person.gd` | 3D people that walk, blink, talk, cheer and wave |
| `godot/scripts/props.gd` | The star, water jars, dove and light from heaven |
| `godot/scripts/game_ui.gd` | Coins, speech bubbles, the story box, questions, title and end screens |
| `godot/scripts/content.gd` | Reads the shared game content and finds the voice recordings |
| `godot/scripts/sound.gd` | Small sound effects made in code |
| `tools/godot-build.sh` | Builds the web version or the Android app |

To check the whole chapter automatically, run Godot with `-- autoplay`. It
plays itself from start to finish.

## If this works well

The plan would be to move chapter by chapter into Godot. The 2D game stays
live the whole time.
