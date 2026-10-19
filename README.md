# Follow Me: Walk with Jesus

A Bible-based educational game by **Third Heaven Studios**. Players walk with Jesus
and the twelve disciples through His ministry, from His baptism to His ascension.

## How to play the test version

**Game link: https://hbuhrmanlll.github.io/follow-me-game/**

You don't need to install anything. Every time a new version is saved to GitHub, GitHub
rebuilds the game and puts it at the game link. It takes about 3 minutes, and you can watch
it under the **Actions** tab ("Website").

**One-time setup:** on GitHub, open the project's **Settings → Pages**. Under **Build and
deployment → Source**, choose **GitHub Actions**. Then, under the **Actions** tab, click
**Website** and **Run workflow** once.

The old link, https://followmegame.netlify.app, only updates while Netlify's free monthly
allowance lasts, so use the GitHub link for testing.

1. Open the game link on your Android phone in **Chrome** (or on your computer).
2. Turn the phone sideways.
3. Tap **Begin**. On a phone this switches to full screen.

**Put it on your home screen (works offline):** in Chrome, tap the ⋮ menu → **Add to Home screen**
(or **Install app**). It gets its own icon and opens full screen. After it has been opened once
with internet, it works with no internet at all, which is good for car rides.

**Not seeing the newest version?** Pull down to refresh the page. The version number is
in the bottom-left corner of the title screen.

## Build phases

1. ✅ Project setup and a title screen you can open
2. ✅ Core systems: scenes from data files, dialogue with voice, one puzzle type, saving
3. ✅ Chapters 1–3, the map, and 3 puzzle types
4. ✅ Remaining puzzle types, difficulty modes, Verse Journal, Disciple Cards, voice script
5. ✅ The rest of the chapters (all 28, plus The Good News ending)
6. ✅ Art, sound, voices, cutscenes, polish
7. Android app (✅ test app) and Google Play

## Voices

See **VOICES.md** to make real voices with ElevenLabs, or to use recordings of real people.

## The Android app

See **ANDROID.md** to install the test app on your phone. GitHub builds a new one after every change.

## Pictures, music and credits

- **ART_GUIDE.md**: how to make finished pictures with AI tools (style text and a prompt for every background and main character) and drop them in.
- **SOUND.md**: the built-in music and sound effects, and how to use licensed recordings instead.
- **CREDITS.md**: who made what. Add a line whenever you add a picture, a song or a voice.

## Changing the story

See **CONTENT_GUIDE.md**. Everything is in the `content/` folder, and no code is needed.

## For programmers (optional)

The game uses Phaser 3, TypeScript and Vite. `npm install`, then `npm run dev`.
`npm run check` runs the content checker (it also runs before every build).

## Bible translations

- **Main translation: Berean Standard Bible (BSB).** Public domain since April 2023, so it's free to use, including in the Google Play app.
- **Option: King James Version (KJV).** Public domain.
- Scripture text lives only in data files (`content/scripture/bsb/`, `content/scripture/kjv/`)
  and is never typed into dialogue. That way more translations can be added later
  (for example, the NLT if Tyndale gives written permission).
