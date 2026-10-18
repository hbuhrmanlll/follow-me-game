import Phaser from 'phaser';
import { COLORS, FONT, makeButton } from '../ui/common';
import { scriptureText, translations, ui, type FillBlankPuzzle, type TranslationId } from '../systems/content';
import { makePanel } from './panel';

const BLANK = '______';

// "Fill in the missing word" of a verse. The word buttons are big so small
// fingers can tap them.
export function runFillBlank(scene: Phaser.Scene, puzzle: FillBlankPuzzle, tid: TranslationId, rate: number): Promise<void> {
  return new Promise((resolve) => {
    const W = scene.scale.width;
    const verse = scriptureText(puzzle.ref, puzzle.quote, tid);
    const answer = puzzle.blank[tid] ?? '';
    const re = new RegExp(`\\b${answer}\\b`);
    const withBlank = verse.replace(re, BLANK);
    const panel = makePanel(scene, {
      rate, prompt: puzzle.prompt || ui.fillPrompt, spoken: `${puzzle.prompt} ${withBlank.replace(BLANK, '...')}`,
    });
    const short = translations.find((t) => t.id === tid)?.short ?? '';

    const text = scene.add.text(W / 2, 235, `“${withBlank}”`, {
      fontFamily: FONT, fontSize: '36px', color: '#2b1d12', fontStyle: 'italic', align: 'center',
      wordWrap: { width: panel.width - 120 }, lineSpacing: 8,
    }).setOrigin(0.5);
    const refText = scene.add.text(W / 2, text.y + text.height / 2 + 26, `${puzzle.ref} · ${short}`, {
      fontFamily: FONT, fontSize: '24px', color: '#7a4f17', fontStyle: 'bold',
    }).setOrigin(0.5);
    panel.layer.add([text, refText]);

    const words = Phaser.Utils.Array.Shuffle([answer, ...puzzle.decoys]);
    const bw = Math.min(220, (panel.width - 80) / words.length - 20);
    let solved = false;
    words.forEach((word, i) => {
      const x = W / 2 + (i - (words.length - 1) / 2) * (bw + 20);
      const btn = makeButton(scene, x, 420, word, () => {
        if (solved) return;
        if (word === answer) {
          solved = true;
          btn.setFill(COLORS.green);
          text.setText(`“${verse}”`);
          panel.solved(resolve);
          panel.say(`${ui.correct} ${verse}`);
        } else {
          btn.setFill(COLORS.muted);
          btn.setLabel(`✗ ${word}`);
          btn.disableInteractive();
          panel.wrong(puzzle.hint, puzzle.ref);
        }
      }, { width: bw, height: 96, fontSize: 34, fill: 0xe9dcc0 });
      panel.layer.add(btn);
    });
  });
}
