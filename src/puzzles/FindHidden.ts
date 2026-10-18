import Phaser from 'phaser';
import { FONT, makePortrait, whenTapped } from '../ui/common';
import { characters, ui, type FindHiddenPuzzle } from '../systems/content';
import { makePanel, type PuzzleContext } from './panel';

// Story puzzle: something (or someone) is hidden behind one of several things.
// Tap a hiding place to look behind it.
export function runFindHidden(scene: Phaser.Scene, puzzle: FindHiddenPuzzle, ctx: PuzzleContext): Promise<void> {
  return new Promise((resolve) => {
    const W = scene.scale.width;
    const panel = makePanel(scene, ctx, { prompt: puzzle.prompt });
    const spots = Phaser.Utils.Array.Shuffle([puzzle.spot, ...puzzle.others.slice(0, panel.kids ? 2 : 3)]);
    const gap = Math.min(240, (panel.width - 80) / spots.length);
    let found = false;

    spots.forEach((icon, i) => {
      const x = W / 2 + (i - (spots.length - 1) / 2) * gap;
      const y = 400;
      // What's behind it: the hidden person or thing, or nothing.
      if (icon === puzzle.spot) {
        const who = characters[puzzle.hide];
        if (who) {
          const p = makePortrait(scene, x, y + 10, 56);
          p.set(who.color, who.initials);
          panel.layer.add(p.container);
        } else {
          panel.layer.add(scene.add.text(x, y + 10, puzzle.hide, { fontSize: '90px' }).setOrigin(0.5));
        }
      }
      const cover = scene.add.text(x, y, icon, { fontFamily: FONT, fontSize: '150px' }).setOrigin(0.5);
      cover.setInteractive({ useHandCursor: true });
      panel.layer.add(cover);
      whenTapped(cover, () => {
        if (found || !cover.input?.enabled) return;
        if (icon === puzzle.spot) {
          found = true;
          scene.tweens.add({ targets: cover, y: y - 150, alpha: 0.35, scale: 0.7, duration: 500, ease: 'Back.easeOut' });
          panel.solved(resolve);
          panel.say(ui.found);
        } else {
          cover.disableInteractive();
          scene.tweens.add({ targets: cover, y: y - 60, duration: 250, yoyo: true, onComplete: () => cover.setAlpha(0.4) });
          panel.wrong(`${ui.notHere} ${puzzle.hint}`, puzzle.ref);
        }
      });
    });
  });
}
