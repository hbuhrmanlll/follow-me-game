import Phaser from 'phaser';
import { FONT } from './common';

const COLORS = [0xf2c94c, 0xe8834a, 0x6fb3e0, 0x7fb069, 0xd96aa8, 0xffffff];

// A burst of confetti that falls and fades.
export function confetti(scene: Phaser.Scene, x: number, y: number, count = 46, depth = 70): void {
  for (let i = 0; i < count; i++) {
    const piece = scene.add.rectangle(x, y, 8 + Math.random() * 6, 5 + Math.random() * 4, COLORS[i % COLORS.length]).setDepth(depth);
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const v = 260 + Math.random() * 320;
    const tx = x + Math.cos(a) * v;
    const peak = y + Math.sin(a) * v;
    scene.tweens.add({ targets: piece, x: tx, duration: 1600 + Math.random() * 600, ease: 'Sine.easeOut' });
    scene.tweens.add({
      targets: piece, y: peak, duration: 450, ease: 'Quad.easeOut',
      onComplete: () => scene.tweens.add({ targets: piece, y: peak + 380 + Math.random() * 200, alpha: 0, duration: 1300 + Math.random() * 600, ease: 'Quad.easeIn', onComplete: () => piece.destroy() }),
    });
    scene.tweens.add({ targets: piece, angle: (Math.random() - 0.5) * 900, duration: 2200 });
  }
}

// Big words that pop in, wobble and float away (e.g. "⭐ +1" or "🔥 3 in a row!").
export function popText(scene: Phaser.Scene, x: number, y: number, text: string, size = 56, color = '#fff4d6', depth = 72): Promise<void> {
  return new Promise((done) => {
    const t = scene.add.text(x, y, text, {
      fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: 'bold', stroke: '#3b2410', strokeThickness: 10, align: 'center',
    }).setOrigin(0.5).setDepth(depth).setScale(0.2).setAlpha(0);
    scene.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: t, angle: { from: -4, to: 4 }, yoyo: true, repeat: 2, duration: 160, delay: 380 });
    scene.tweens.add({ targets: t, y: y - 70, alpha: 0, delay: 1500, duration: 600, onComplete: () => { t.destroy(); done(); } });
  });
}

// Stars that drop in one at a time, filled for the ones earned.
export function starRow(scene: Phaser.Scene, x: number, y: number, earned: number, onStar?: (i: number) => void): Phaser.GameObjects.Container {
  const row = scene.add.container(x, y);
  for (let i = 0; i < 3; i++) {
    const on = i < earned;
    const star = scene.add.star((i - 1) * 78, 0, 5, 14, 32, on ? 0xf2c94c : 0xd8ccb0, 1).setStrokeStyle(4, on ? 0xa8742a : 0xb8ab94).setScale(0);
    row.add(star);
    scene.tweens.add({
      targets: star, scale: 1, angle: on ? 360 : 0, duration: 520, delay: 400 + i * 380, ease: 'Back.easeOut',
      onStart: () => onStar?.(i),
    });
  }
  return row;
}
