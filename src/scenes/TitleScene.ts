import Phaser from 'phaser';
import { FONT, makeButton, restartOnResize } from '../ui/common';
import { drawBackdrop, driftLayers, type Layer } from '../art/backdrops';
import { ui } from '../systems/content';
import { showSettings } from '../ui/dom';
import { askParent } from '../ui/parent';
import { setMood } from '../systems/audio';
import { isApp } from '../systems/native';

export const VERSION = 'Phase 7 · v0.7.2';

export class TitleScene extends Phaser.Scene {
  private layers: Layer[] = [];

  constructor() {
    super('Title');
  }

  create(): void {
    restartOnResize(this);
    const W = this.scale.width;
    const H = this.scale.height;
    this.layers = drawBackdrop(this, 'jordan', 'dawn');
    setMood('peace');

    this.add
      .text(W / 2, 170, ui.title, {
        fontFamily: FONT, fontSize: '120px', color: '#fff4d6', fontStyle: 'bold',
        stroke: '#3b2410', strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setShadow(0, 6, '#000000', 12, true, true);
    this.add
      .text(W / 2, 270, ui.subtitle, {
        fontFamily: FONT, fontSize: '46px', color: '#ffe7b0', stroke: '#3b2410', strokeThickness: 6,
      })
      .setOrigin(0.5);

    makeButton(this, W / 2, 440, ui.begin, () => this.begin(), { width: 420, height: 120, fontSize: 50 });
    makeButton(this, W - 110, 60, '⚙', () => void showSettings(), { width: 110, height: 90, fontSize: 44 });
    makeButton(this, W - 250, 60, `👪`, () => void askParent().then((ok) => ok && this.scene.start('Parents')), { width: 110, height: 90, fontSize: 44 });

    this.add
      .text(W / 2, H - 36, ui.studio, { fontFamily: FONT, fontSize: '28px', color: '#f3e6c8' })
      .setOrigin(0.5);
    this.add.text(16, H - 30, VERSION, { fontFamily: FONT, fontSize: '18px', color: '#e8d9b5' });
  }

  update(_time: number, delta: number): void {
    driftLayers(this.layers, this.scale.width, delta);
  }

  private begin(): void {
    // The Android app is always full screen.
    if (!isApp && !this.scale.isFullscreen && this.sys.game.device.input.touch) {
      this.scale.startFullscreen();
    }
    this.scene.start('Slots');
  }
}
