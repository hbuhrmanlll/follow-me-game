import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { SlotScene } from './scenes/SlotScene';
import { StoryScene } from './scenes/StoryScene';
import { MapScene } from './scenes/MapScene';
import { JournalScene } from './scenes/JournalScene';
import { PracticeScene } from './scenes/PracticeScene';
import { DisciplesScene } from './scenes/DisciplesScene';
import { EndingScene } from './scenes/EndingScene';
import { ParentScene } from './scenes/ParentScene';
import { ProgressScene } from './scenes/ProgressScene';
import { unlockAudioOnFirstTouch } from './systems/audio';
import { isApp, setUpDevice } from './systems/native';
import { registerSW } from 'virtual:pwa-register';

// The game is designed at 1280x720 (landscape) and scaled to fit any screen.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1b1410',
  scale: {
    mode: Phaser.Scale.EXPAND, // fills wide phone screens, no black bars
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
    // Full screen covers the whole page, so pop-up windows (like typing a name) stay visible.
    fullscreenTarget: document.body,
  },
  // Only listen for taps on the game itself, so taps on pop-up windows never
  // reach game buttons underneath them.
  input: { windowEvents: false },
  scene: [TitleScene, SlotScene, StoryScene, MapScene, JournalScene, PracticeScene, DisciplesScene, EndingScene, ParentScene, ProgressScene],
});

unlockAudioOnFirstTouch();
setUpDevice(game);
// The web version saves itself for offline play. The Android app already has
// everything inside it, so it doesn't need this.
if (!isApp) registerSW({ immediate: true });

// Lets automated tests look at the game's state.
(window as unknown as { __followMe: Phaser.Game }).__followMe = game;
