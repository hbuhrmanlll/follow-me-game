import Phaser from 'phaser';
import { COLORS, makeButton } from '../ui/common';
import type { MultipleChoicePuzzle } from '../systems/content';
import { makePanel } from './panel';

// Multiple-choice question. A wrong answer gives a gentle hint and the verse
// reference, and the player simply tries again. Resolves once solved.
export function runMultipleChoice(scene: Phaser.Scene, puzzle: MultipleChoicePuzzle, rate: number): Promise<void> {
  return new Promise((resolve) => {
    const W = scene.scale.width;
    const panel = makePanel(scene, { rate, prompt: puzzle.prompt });
    const choices = Phaser.Utils.Array.Shuffle([...puzzle.choices]);
    const gap = Math.min(120, 330 / choices.length + 20);
    let solved = false;
    choices.forEach((choice, i) => {
      const btn = makeButton(scene, W / 2, 220 + i * gap, choice.text, () => {
        if (solved) return;
        if (choice.correct) {
          solved = true;
          btn.setFill(COLORS.green);
          btn.setLabel(`✓ ${choice.text}`);
          panel.solved(resolve);
        } else {
          btn.setFill(COLORS.muted);
          btn.setLabel(`✗ ${choice.text}`);
          btn.disableInteractive();
          panel.wrong(puzzle.hint, puzzle.ref);
        }
      }, { width: Math.min(720, panel.width - 120), height: gap - 22, fontSize: 34, fill: 0xe9dcc0 });
      panel.layer.add(btn);
    });
  });
}
