import Phaser from 'phaser';
import { COLORS, FONT, makeButton, whenTapped } from '../ui/common';
import { ui, type CountPuzzle } from '../systems/content';
import { makePanel, type PuzzleContext } from './panel';

// Story puzzle: tap each thing to count it (the number is said aloud),
// then choose how many there are.
export function runCount(scene: Phaser.Scene, puzzle: CountPuzzle, ctx: PuzzleContext): Promise<void> {
  return new Promise((resolve) => {
    const W = scene.scale.width;
    const panel = makePanel(scene, ctx, { prompt: `${puzzle.prompt} ${ui.tapToCount}` });
    const icons = puzzle.items.flatMap((it) => Array.from({ length: it.n }, () => it.icon));
    const perRow = Math.min(icons.length, 7);
    const size = Math.min(110, (panel.width - 80) / perRow);
    let counted = 0;

    icons.forEach((icon, i) => {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, icons.length - row * perRow);
      const x = W / 2 + ((i % perRow) - (inRow - 1) / 2) * size;
      const y = 250 + row * (size + 10);
      const t = scene.add.text(x, y, icon, { fontSize: `${Math.round(size * 0.75)}px` }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      panel.layer.add(t);
      whenTapped(t, () => {
        if (!t.input?.enabled) return;
        t.disableInteractive();
        counted++;
        panel.layer.add(scene.add.text(x + size * 0.3, y - size * 0.3, String(counted), {
          fontFamily: FONT, fontSize: '28px', color: '#fff8e6', fontStyle: 'bold', backgroundColor: '#7a4f17', padding: { x: 8, y: 2 },
        }).setOrigin(0.5));
        panel.say(String(counted));
        if (counted === icons.length) askHowMany();
      });
    });

    function askHowMany(): void {
      panel.say(puzzle.question);
      const a = puzzle.answer;
      const options = Phaser.Utils.Array.Shuffle([a, a + 1, Math.max(1, a - 1) === a ? a + 2 : a - 1]);
      options.forEach((n, i) => {
        const btn = makeButton(scene, W / 2 + (i - 1) * 190, 500, String(n), () => panel.tap(btn, String(n), () => {
          if (n === a) {
            btn.setFill(COLORS.green);
            panel.solved(resolve);
          } else {
            btn.setFill(COLORS.muted);
            btn.disableInteractive();
            panel.wrong(puzzle.hint, puzzle.ref);
          }
        }), { width: 160, height: 100, fontSize: 48, fill: 0xe9dcc0 });
        panel.layer.add(btn);
      });
    }
  });
}
