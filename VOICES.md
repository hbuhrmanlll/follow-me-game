# Voices: how the game gets its spoken lines

## Free AI voices (in use now)

Every line is recorded with **Kokoro**, a free AI voice. Its license (Apache 2.0) allows use in
an app you sell or give away. GitHub's computers make the recordings, so nothing is paid and
nothing needs installing:

- **When you change a line** in a chapter file, the **"Generate voices (free)"** action
  re-records just that line. It takes a few minutes. Then the website and the Android test
  app rebuild themselves with the new recording.
- **To change a character's voice**, edit `tools/voices-free.json` on GitHub.
  - Each character has a `voice`. Names starting with `am_` or `bm_` are American or British
    men, and `af_` or `bf_` are women.
  - A voice can be a mix of two voices, like `["am_onyx", 0.6, "bm_george", 0.4]`, which gives
    a character their own sound.
  - Each character also has a `speed`, where 1 is normal.
- **Kokoro voices to try:** `am_michael`, `am_onyx`, `am_eric`, `am_liam`, `am_fenrir`,
  `am_puck`, `am_echo`, `am_adam`, `bm_george`, `bm_lewis`, `bm_daniel`, `bm_fable`;
  `af_heart`, `af_bella`, `af_sarah`, `af_nicole`, `af_sky`, `af_jessica`, `af_river`, `af_kore`,
  `bf_emma`, `bf_isabella`.
- Short pop-up messages, puzzle questions and buttons are still read by the phone's built-in
  voice.

ElevenLabs (below) is still an option later for even more expressive voices. Its recordings
simply replace the free ones.

## ElevenLabs (optional, paid)

Right now every line is read by your phone's **built-in voice**. That works offline, but it
sounds robotic and the same for everyone. This guide explains how to make real voices
with **ElevenLabs** when you're ready (a future release), and how to use recordings from
real people instead.

The game always checks for a recording first. If a line has none, the built-in voice reads it.
You can switch over one line, one character or one chapter at a time.

## What it costs (checked October 2026; confirm on elevenlabs.io/pricing)

- **Free plan:** for testing only. It doesn't allow commercial use and requires crediting ElevenLabs.
- **Starter plan (about $5–6 a month):** includes a **commercial license** and about 30,000 characters a month.
- **Creator plan ($22 a month):** about 100,000 characters a month.

Chapters 1–3 are about **8,000 characters** (Scripture lines are recorded once for BSB and once
for KJV). All 28 chapters will likely come to **75,000–100,000 characters** including re-dos.
So one month of Creator, or two or three months of Starter, should cover the whole game.
You can cancel afterwards: recordings you've already made are yours to keep using.

Before paying, read ElevenLabs' current terms for commercial use. Put a line in the game's
credits saying the voices were made with ElevenLabs.

## One-time setup (about 20 minutes, all in your web browser)

1. **Make an ElevenLabs account** at elevenlabs.io and choose a paid plan (see above).
2. **Pick a voice for each character.** In ElevenLabs, open **Voices → Voice Library**, listen,
   and add voices you like to **My Voices**. Suggestions:
   - **Jesus:** warm, calm, unhurried, mature male voice. Avoid dramatic "movie trailer" voices.
   - **Narrator:** clear, friendly storyteller.
   - **Disciples:** a different voice each. Peter a little bolder, John and Andrew younger-sounding.
   - **The tempter:** smooth and quiet, not scary.
   - **Voice from heaven:** deep and gentle.
3. **Copy each Voice ID.** In **My Voices**, click a voice's **⋯ → Copy voice ID**.
4. **Paste the IDs into the game.** On GitHub, open `tools/voices.json`, click ✏️, and replace
   each `PASTE-VOICE-ID` with the ID for that character. Click **Commit changes**.
5. **Give GitHub your ElevenLabs key.** In ElevenLabs, open **Profile → API Keys → Create**,
   and copy the key. On GitHub, open the project's **Settings → Secrets and variables →
   Actions → New repository secret**. Name it `ELEVENLABS_API_KEY`, paste the key, and click **Add secret**.
   (The key stays secret. It never appears in the game or the project files.)

## Making the voices

1. On GitHub, open the **Actions** tab, then click **Generate voices** on the left.
2. Click **Run workflow**.
   - Leave **"Only count the cost"** ticked the first time. It shows how many characters
     it would use, and spends nothing.
   - Then run it again with the box unticked to actually make the recordings.
   - To do one chapter at a time, type it in the chapter box (for example `ch01`).
3. When it finishes (a few minutes), the recordings are saved into the project, and
   Netlify updates the game a minute later.

Run it again whenever you change a line: **only new or changed lines are re-made**, so you
only pay for what changed.

## Using a real person's voice

Have someone record a line, as an .mp3 file, and name it after the line's `id`:

- A narration line, `ch01-s1-01`, goes in `content/audio/en/` as `ch01-s1-01.mp3`.
- A Scripture line, `ch01-s2-03`, goes in `content/audio/en/bsb/ch01-s2-03.mp3`
  (and `content/audio/en/kjv/` for the KJV wording).

Upload it on GitHub: open the folder, then **Add file → Upload files**. The game uses it right away
(after Netlify updates). The voice generator will **never overwrite** a recording you added.

Tips for recordings: a quiet room, phone held about a hand's width away, and a short silence
at the start and end. The word highlight will be estimated for hand-made recordings.

## What gets a recording

- Every story line, and the ⓘ notes.
- Not yet: puzzle questions, hints, button text and Disciple Cards. Those still use the
  built-in voice. They'll be added in Phase 6.
