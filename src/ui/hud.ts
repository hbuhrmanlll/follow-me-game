import Phaser from 'phaser';
import { FONT } from './common';
import { sfx } from '../systems/audio';
import { levelOf, type Slot } from '../systems/save';
import { popText } from './celebrate';
import { fill, ui } from '../systems/content';

// The coin and level display at the top of the screen. Coins fly into it when
// earned, the number counts up, and a level-up gets its own celebration.

export function drawCoin(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  g.fillStyle(0x8a5a10, 1).fillCircle(x + 1.5, y + 2, r);
  g.fillStyle(0xf2c14a, 1).fillCircle(x, y, r);
  g.fillStyle(0xd99a22, 1).fillCircle(x, y, r * 0.72);
  g.fillStyle(0xf6d36a, 1).fillCircle(x, y, r * 0.58);
  g.fillStyle(0xffffff, 0.55).fillEllipse(x - r * 0.35, y - r * 0.4, r * 0.6, r * 0.35);
}

export interface Hud {
  container: Phaser.GameObjects.Container;
  earn(n: number, fromX?: number, fromY?: number): void;
}

export function makeHud(scene: Phaser.Scene, x: number, y: number, slot: Slot, onChange: () => void): Hud {
  const c = scene.add.container(x, y).setDepth(80).setScrollFactor(0);
  const w = 250;
  const h = 60;
  const bg = scene.add.graphics();
  bg.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, h / 2);
  bg.fillStyle(0x24170e, 0.88).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  bg.lineStyle(3, 0xd9a441, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  const icon = scene.add.graphics();
  drawCoin(icon, -w / 2 + 32, 0, 19);
  const coins = scene.add.text(-w / 2 + 60, -1, String(slot.coins), {
    fontFamily: FONT, fontSize: '30px', color: '#ffe08a', fontStyle: 'bold',
  }).setOrigin(0, 0.5);
  // Level badge with a progress bar for the next level
  const badge = scene.add.graphics();
  const bx = w / 2 - 34;
  badge.fillStyle(0x4a7aa8, 1).fillCircle(bx, 0, 24);
  badge.lineStyle(3, 0xffffff, 0.9).strokeCircle(bx, 0, 24);
  const lvl = scene.add.text(bx, 0, '', { fontFamily: FONT, fontSize: '22px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
  const bar = scene.add.graphics();
  c.add([bg, icon, coins, bar, badge, lvl]);

  let shown = slot.coins;
  const drawLevel = () => {
    const { level, into, need } = levelOf(slot.xp);
    lvl.setText(String(level));
    bar.clear();
    bar.fillStyle(0x000000, 0.5).fillRoundedRect(-10, 10, 120, 10, 5);
    bar.fillStyle(0x7fd06a, 1).fillRoundedRect(-10, 10, Math.max(10, (120 * into) / need), 10, 5);
  };
  drawLevel();

  return {
    container: c,
    earn(n, fromX, fromY) {
      const before = levelOf(slot.xp).level;
      slot.coins += n;
      slot.xp += n;
      onChange();
      // Coins fly up from where they were earned, then the number counts up.
      const cam = scene.cameras.main;
      const sx = (fromX ?? x) - cam.scrollX;
      const sy = (fromY ?? y + 80) - cam.scrollY;
      for (let i = 0; i < Math.min(n, 6); i++) {
        const g = scene.add.graphics().setDepth(85).setScrollFactor(0);
        drawCoin(g, 0, 0, 13);
        g.setPosition(sx + (Math.random() - 0.5) * 30, sy);
        scene.tweens.add({
          targets: g, x: x - w / 2 + 32, y, duration: 650, delay: i * 80, ease: 'Cubic.easeIn',
          onComplete: () => {
            g.destroy();
            sfx('tap');
            scene.tweens.add({ targets: icon, scale: 1.25, yoyo: true, duration: 90 });
          },
        });
      }
      const target = slot.coins;
      scene.tweens.addCounter({
        from: shown, to: target, duration: 600, delay: 500,
        onUpdate: (t) => coins.setText(String(Math.round(t.getValue() ?? target))),
        onComplete: () => { shown = target; drawLevel(); },
      });
      const after = levelOf(slot.xp).level;
      if (after > before) {
        scene.time.delayedCall(1200, () => {
          sfx('achievement');
          scene.tweens.add({ targets: badge, scale: 1.4, yoyo: true, repeat: 2, duration: 160 });
          void popText(scene, scene.scale.width / 2, 200, `⬆ ${fill(ui.levelUp, { n: after })}`, 58, '#bff0a8', 90).then(() => undefined);
        });
      }
    },
  };
}
