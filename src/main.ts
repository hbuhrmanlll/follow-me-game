import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';

// The game is designed at 1280x720 (landscape) and scaled to fit any screen.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1b1410',
  scale: {
    mode: Phaser.Scale.EXPAND, // fills wide phone screens, no black bars
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  scene: [TitleScene],
});
