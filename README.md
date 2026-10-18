# Follow Me: Walk with Jesus

A Bible-based educational game by **Third Heaven Studios**. Players walk with Jesus
and the twelve disciples through His ministry, from His baptism to His ascension.

## How to play the test version

You don't need to install anything. Every time a new version is saved to GitHub,
Netlify rebuilds the game and puts it at your game link (it takes about a minute).

1. Open your Netlify game link on your Android phone in **Chrome** (or on your computer).
2. Turn the phone sideways.
3. Tap **Begin**. On a phone this switches to full screen.

**Tip:** In Chrome, tap the ⋮ menu → **Add to Home screen** to get an icon for the game.

**Not seeing the newest version?** Pull down to refresh the page. The version number is
in the bottom-left corner of the title screen.

## Build phases

1. ✅ Project setup and a title screen you can open
2. Core systems: scenes from data files, dialogue with voice, one puzzle type, saving
3. Chapters 1–3, the map, and 3 puzzle types
4. Remaining puzzle types, difficulty modes, Verse Journal, Disciple Cards
5. The rest of the chapters
6. Art, sound, voices, cutscenes, polish
7. Android app and Google Play

## For programmers (optional)

The game uses Phaser 3, TypeScript and Vite. `npm install`, then `npm run dev`.

## Bible translations

- **Main translation: Berean Standard Bible (BSB).** Public domain since April 2023, so it's free to use, including in the Google Play app.
- **Option: King James Version (KJV).** Public domain.
- Scripture text lives only in data files (`content/scripture/bsb/`, `content/scripture/kjv/`)
  and is never typed into dialogue. That way more translations can be added later
  (for example, the NLT if Tyndale gives written permission).
