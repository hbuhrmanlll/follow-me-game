import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { SlotScene } from './scenes/SlotScene';
import { StoryScene } from './scenes/StoryScene';
import { MapScene } from './scenes/MapScene';

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
  scene: [TitleScene, SlotScene, StoryScene, MapScene],
});

// Lets automated tests look at the game's state.
(window as unknown as { __followMe: Phaser.Game }).__followMe = game;
