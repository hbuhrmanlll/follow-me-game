# Music and sound effects

## What's in the game now

The game **makes its own music and sound effects** while it plays, using the phone's sound
chip. There are no music files, so nothing needs a license, and it works offline.

Each scene picks a **mood** from where it happens and the time of day:

| Mood | Used for |
|---|---|
| `peace` | mornings and evenings, the title screen, the end of each chapter |
| `journey` | the middle of the day, traveling and teaching |
| `night` | scenes at night |
| `storm` | the storms on the Sea of Galilee |
| `wonder` | the Transfiguration, the cutscenes, and the Good News ending |
| `sorrow` | the cross and the burial |
| `joy` | the empty tomb |

A chapter file can choose a different mood for a scene with `"mood": "joy"` (for example).

Sound effects play when you:
- tap a button
- answer a puzzle right (a bright chime) or wrong (a soft, gentle tone)
- find a scroll piece
- see a disciple join
- earn an achievement

The cutscenes have thunder, wind, an earthquake rumble, and chimes.

The music gets quieter while someone is speaking. The **Music** and **Sound effects** sliders
are in ⚙ Settings.

## Using real recordings instead (optional)

You can replace any mood or sound with a recording:

1. Get an `.mp3` with a license that allows use in an app you'll sell or give away (see below).
2. Name it after the mood or sound.
   - Music moods: `peace`, `journey`, `night`, `storm`, `wonder`, `sorrow`, `joy`.
   - Sounds: `tap`, `correct`, `wrong`, `scroll`, `join`, `achievement`, `thunder`, `rumble`,
     `wind`, `chime`.
   - For example, `peace.mp3`. Music loops, so a 1–3 minute piece that loops smoothly is best.
     Keep each file under 3 MB.
3. On GitHub, open `content/audio/music` (or `content/audio/sfx`), click **Add file → Upload
   files**, drop it in, and click **Commit changes**.
4. Add a line to `CREDITS.md` with the title, the composer, where you got it, and the license.

If the name is wrong, the checker stops the update and tells you the right names.

## Where to find music you're allowed to use

**Always read the license on the page you download from**, and keep a copy or screenshot of it.
These are the safe kinds:

- **Public domain / CC0:** anyone may use it for anything, with no credit needed.
  Musopen.org has public-domain recordings of classical music and hymns.
- **CC BY:** free to use, but you **must credit** the creator in the game's credits.
  Kevin MacLeod's music at incompetech.com is a well-known example.
- **Royalty-free with a commercial license:** music you pay for once.

**Hymns:** many old hymn *melodies* are public domain, such as "Be Thou My Vision" and
"Come Thou Fount". A *recording* of a hymn still belongs to whoever recorded it. Use a
public-domain recording, or record one yourself (for example, at church). Then it's yours.

**Avoid:**
- songs from streaming services, YouTube or worship albums. These are copyrighted, even if
  they're easy to download.
- any license marked **NC** (non-commercial), if you might ever charge for the app.
