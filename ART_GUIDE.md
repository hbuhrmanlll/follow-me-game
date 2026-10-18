# Art guide: replacing the drawn placeholders with finished pictures

The game draws simple placeholder art by itself. You can replace any part of it with a
finished picture: a whole background, a character's round portrait, or the person standing
on the stage. **Do one picture at a time.** Anything without a picture keeps its drawn
version, so the game always works.

There are three kinds of picture:

| Kind | Folder | File name | Size |
|---|---|---|---|
| Background | `content/art/backdrops/` | the backdrop's name, e.g. `jordan.jpg` | 1600 × 900, under 600 KB |
| Portrait (round picture in the dialogue box) | `content/art/portraits/` | the character's id, e.g. `jesus.png` | 512 × 512, under 250 KB |
| Figure (person standing on the stage) | `content/art/figures/` | the character's id, e.g. `peter.png` | about 400 × 900, **see-through background**, under 250 KB |

- Use `.jpg` or `.webp` for backgrounds, and `.png` or `.webp` for portraits and figures.
  Write the ending in lowercase letters.
- **One background for several times of day:** the game tints it for dawn, dusk and night.
  To make a separate night version, add `-night` to the name, e.g. `jordan-night.jpg`
  (also `-dawn`, `-midday` or `-dusk`).
- When you upload a picture, the checker confirms the name is right. If the name is wrong,
  Netlify won't publish, and the checker says what to fix.

## Step by step (all in your web browser)

1. **Make the picture** with an AI image tool, using the style text and a prompt below.
2. **Shrink it** at **squoosh.app**. This is a free Google tool, and the picture stays on your computer.
   1. Drop the picture in.
   2. On the right, choose **WebP** or **MozJPEG** with quality about 75.
   3. Under **Resize**, set the size from the table above.
   4. Download it.
3. **Figures only: remove the background.** The person must stand on a see-through background.
   Use any free "background remover" website, then save the result as a PNG.
4. **Name the file** exactly as in the table, for example `galilee.webp` or `peter.png`.
5. **Upload it on GitHub:**
   1. Open the project and click into `content` → `art` → the right folder.
   2. Click **Add file → Upload files**, drag the picture in, and click **Commit changes**.
6. Netlify updates the game in about 2 minutes. Open the game and go to a scene that uses
   the picture. Close and reopen the app if it still shows the old version.

**Not happy with a picture?** Open it on GitHub, click **⋯ → Delete file**, then **Commit changes**.
The drawn version comes back.

## Rules for every picture

- **Licensing.** Use an AI tool whose terms allow **commercial use** of what you make, and
  check its terms before you start. Don't ask for the style of a living artist, a film or a
  TV show (for example, "in the style of *The Chosen*"). Write down which tool made each
  picture in `CREDITS.md`.
- **No words or letters** in pictures. The game adds its own text, which can be translated.
- **No people in backgrounds.** The game places the characters itself.
- **Leave room for the game.** The bottom third of the screen is covered by the dialogue box,
  and the characters stand about 60% of the way down. Make the ground there simple and level.
- **Historically accurate.**
  - Show first-century Judea and Galilee: flat-roofed limestone and basalt houses, olive trees,
    fishing boats with one square sail, simple pottery, and dusty paths.
  - Leave out castles, church buildings, crosses on buildings, glass windows, and anything modern.
- **People look like they lived there.**
  - Jesus and His disciples were first-century Jewish men. Give them olive-brown skin, dark hair
    and beards, and simple wool or linen tunics with a mantle, and tassels at the corners for Jesus.
  - Don't give anyone a halo, glowing eyes, or a Renaissance-painting look.
  - Women wear long tunics and head coverings.
- **Reverent.**
  - Don't make any picture of God the Father.
  - The Holy Spirit appears as a dove only at the baptism, and the cutscene already shows that.
  - The cross is only ever seen **from a distance, as silhouettes against a dark sky**:
    no wounds, no blood, no close-ups. The same goes for any painful scene.
  - Angels look like men in dazzling white, not cartoon cherubs.

## Style text: paste this at the start of every prompt

> Warm hand-painted storybook illustration, soft gouache and watercolor textures, gentle
> golden light, muted earthy colors, simple clean shapes, calm and reverent mood, suitable for
> children and families, historically accurate first-century Judea, no text, no letters,
> no watermark, 16:9 wide landscape.

Use the same style text every time, so all the pictures look like one game. For portraits,
change "16:9 wide landscape" to "square portrait, head and shoulders, plain soft background".

## Background prompts

After the style text, add one of these. The first word in **bold** is the file name.

- **jordan:** The Jordan River winding through a green valley, tall reeds along the near bank,
  shallow water, sandy shore in the foreground, dry hills in the distance, morning light.
- **wilderness:** The Judean wilderness, bare rocky desert hills, scattered stones and dry
  brush, a lonely path, hot pale sky.
- **jerusalem:** First-century Jerusalem seen from a hillside across a valley. Stone city walls,
  flat-roofed houses, and the great white-and-gold Temple rising above the city.
  A dirt path and olive trees in the foreground.
- **galilee:** Rolling green hills above the Sea of Galilee, wildflowers, a fig tree, the blue
  lake shining below, gentle spring light.
- **village:** A small first-century Galilean village street, simple flat-roofed houses of dark
  basalt and limestone, outside stairs to the roofs, clay jars, a dusty open square.
- **well:** A stone well beside a dusty road outside a Samaritan town, Mount Gerizim behind,
  wheat fields, bright midday sun.
- **lake:** The shore of the Sea of Galilee, wooden fishing boats pulled onto pebbles, fishing
  nets drying, calm water, hills on the far side.
- **mountain:** A grassy hillside above the Sea of Galilee, gentle slope, wildflowers, open sky,
  room for a crowd to sit.
- **cliff:** Near Caesarea Philippi at the foot of Mount Hermon, a large rock cliff with a cave,
  springs and green trees.
- **olives:** An ancient olive grove on the Mount of Olives, twisted grey trunks, silver-green
  leaves, a stone olive press. Jerusalem's walls are faint in the distance.
- **room:** A large first-century upper room, plain plastered walls, wooden beams, oil lamps in
  wall niches, a low table with cushions on the floor, warm lamplight.
- **courtyard:** A stone courtyard of a wealthy first-century house in Jerusalem, columns, a
  charcoal fire in a brazier, night, torchlight.
- **golgotha:** A rocky hill outside Jerusalem's walls under a dark, stormy sky, three crosses
  far away on the hilltop seen only as small dark silhouettes, solemn and quiet, not graphic.
  This one is used in Chapter 24.
- **tomb:** A garden with a tomb cut into a rock face, a large round stone rolled across the
  doorway, olive trees and flowers, evening light.
- **tomb-open:** The same garden tomb at sunrise, the round stone rolled away from the open
  doorway, golden light, hopeful and joyful.

## Portrait prompts

After the portrait version of the style text, add a description. The **bold** word is the file
name. Only the main characters are listed here. Any id in `content/en/characters.json` works,
and every other character keeps a colored circle with initials.

- **jesus:** a kind, strong first-century Jewish man about thirty, olive-brown skin, dark
  shoulder-length hair and short beard, warm eyes, cream tunic with a deep red mantle.
- **john-baptist:** a lean, weathered man, wild dark hair and beard, rough camel-hair garment
  with a leather belt.
- **peter:** a sturdy fisherman in his thirties, broad shoulders, curly dark hair and full beard,
  blue tunic, sun-worn face.
- **andrew:** Peter's younger brother, slimmer, short beard, friendly face, green tunic.
- **james:** a fisherman, strong and serious, dark beard, brown tunic.
- **john:** the youngest disciple, about eighteen, light beard, gentle face, orange-brown tunic.
- **philip:** a thoughtful man, neat beard, purple-grey tunic.
- **nathanael:** a man with a short beard sitting in the shade of a fig tree, honest face.
- **matthew:** a former tax collector, tidy beard, finer clothes than the fishermen, a wax tablet.
- **thomas:** a serious man with a searching look, dark beard, grey-blue tunic.
- **james-alphaeus**, **thaddaeus**, **simon-zealot:** ordinary Galilean men with different
  beards and tunic colors.
- **judas-iscariot:** an ordinary Galilean man with a money bag at his belt. Show him plainly,
  not as a cartoon villain.
- **mary:** Jesus' mother, a woman in her late forties, blue head covering, kind face.
- **mary-magdalene:** a woman in her twenties or thirties, rose-colored head covering, hopeful face.
- **narrator:** an old rolled scroll and an oil lamp on a wooden table (no person).

## Figure prompts

Use the same descriptions as the portraits, but ask for **"full body, standing, facing
slightly toward the viewer, feet visible, plain white background"**. Then remove the background
(step 3). The game sizes every figure to the same height and puts the name above it.

## Cutscenes

The five cutscenes are the baptism, the storm and calm, the Transfiguration, the empty tomb
and the Ascension. They are drawn by the game itself. Finished cutscene art is a bigger job,
best done when the backgrounds are finished, and it can follow in a later update.
