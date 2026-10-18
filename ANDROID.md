# The Android app

The game is wrapped as a real Android app with **Capacitor**. GitHub builds the app on its own
computers every time something changes, so you never need to install anything.

## Install the test app on your phone

1. On your Android phone, open this link in Chrome:
   **https://github.com/hbuhrmanlll/follow-me-game/releases/download/test-build/follow-me-test.apk**
2. Chrome downloads `follow-me-test.apk`. If it warns that "this type of file can harm your
   device", tap **Download anyway**. The file is your own game.
3. Tap **Open** when the download finishes, or find it in the **Files** app under Downloads.
4. The first time, Android says installing unknown apps isn't allowed. Tap **Settings**, turn on
   **Allow from this source** for Chrome, then go back and tap **Install**.
5. **Google Play Protect** may say it doesn't recognize the app, because it isn't in the Play
   Store yet. Tap **More details → Install anyway**. If it offers to **scan** the app, that's
   fine too.
6. Open **Follow Me (test)** from your app drawer.

**Getting a newer version.** About 5–10 minutes after any change is uploaded to GitHub, a new
test app is ready at the **same link**. Download it and install it over the old one, and the
player's progress is kept. To see whether a build has finished, open the project on GitHub
and click the **Actions** tab: a green ✓ next to "Android app" means it's ready.

## How the app differs from the website

- It is always **landscape and full screen**. Swipe in from the edge to see the phone's
  buttons for a moment.
- The **Back button**:
  - during the story, it opens the game menu
  - on other screens, it returns to the title screen
  - on the title screen, it closes the game
- The **voice** is the phone's own **text-to-speech engine** (in Android's web view, the game
  can't use the browser voice). If no voice is heard:
  1. Open the phone's **Settings → System → Languages → Text-to-speech output** (the name
     differs a little between phones).
  2. Choose **Speech Services by Google** and download the **English (US)** voice.
- The screen **stays on** while the game is open, so children can listen without touching it.
- Leaving the app **pauses** the voice and music. Coming back reads the current line again.
- **Progress is kept separately** from the website, because the app and the browser each have
  their own saves. Progress is not copied to Google backups. It stays on the phone, as the
  privacy policy promises.
- The test app is called **Follow Me (test)**, and the Play Store version will be **Follow Me**.
  They can both be on one phone.

## The privacy policy

Google Play needs a web address for the privacy policy. It's part of the website:
**https://followmegame.netlify.app/privacy.html**

## For a developer

These details aren't needed for testing.

- The Android project is in `android/`, and `capacitor.config.ts` holds the app id
  `com.thirdheavenstudios.followme`. **Never change the app id after publishing.**
- To build: run `npm run build`, then `npx cap sync android`, then `./gradlew assembleDebug`
  inside `android/`.
- The workflow is `.github/workflows/android.yml`.
- The version name comes from `package.json`, and the build number from the GitHub run number.
- Test builds share the (not secret) key in `android/test-signing.keystore`, so updates install
  over each other.
- Play Store builds use a private upload key instead (Phase 7, part B).
