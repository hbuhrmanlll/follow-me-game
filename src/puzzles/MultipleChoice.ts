import Phaser from 'phaser';
import { COLORS, makeButton } from '../ui/common';
import type { MultipleChoicePuzzle } from '../systems/content';
import { makePanel, type PuzzleContext } from './panel';

// Multiple-choice question. A wrong answer gives a gentle hint and the verse
// reference, and the player simply tries again. Kids see picture icons.
export function runMultipleChoice(scene: Phaser.Scene, puzzle: MultipleChoicePuzzle, ctx: PuzzleContext): Promise<void> {
  return new Promise((resolve) => {
    const W = scene.scale.width;
    const panel = makePanel(scene, ctx, { prompt: puzzle.prompt });
    let choices = Phaser.Utils.Array.Shuffle([...puzzle.choices]);
    if (panel.kids) {
      const wrong = choices.filter((c) => !c.correct).slice(0, 2);
      choices = Phaser.Utils.Array.Shuffle([...choices.filter((c) => c.correct), ...wrong]);
    }
    const top = panel.kids ? 250 : 220;
    const gap = Math.min(120, 330 / choices.length + 20);
    let solved = false;
    choices.forEach((choice, i) => {
      const label = panel.kids && choice.icon ? `${choice.icon}  ${choice.text}` : choice.text;
      const btn = makeButton(scene, W / 2, top + i * gap, label, () => panel.tap(btn, choice.text, () => {
        if (solved) return;
        if (choice.correct) {
          solved = true;
          btn.setFill(COLORS.green);
          btn.setLabel(`✓ ${label}`);
          panel.solved(resolve);
        } else {
          btn.setFill(COLORS.muted);
          btn.setLabel(`✗ ${label}`);
          btn.disableInteractive();
          panel.wrong(puzzle.hint, puzzle.ref);
        }
      }), { width: Math.min(720, panel.width - 120), height: gap - 22, fontSize: 34, fill: 0xe9dcc0 });
      panel.layer.add(btn);
    });
  });
}
