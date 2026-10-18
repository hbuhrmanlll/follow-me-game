import Phaser from 'phaser';
import { COLORS, FONT, makeButton } from '../ui/common';
import { speak, stopSpeaking } from '../systems/speech';
import { fill, ui, type Puzzle } from '../systems/content';

// Multiple-choice question. A wrong answer gives a gentle hint and the verse
// reference, and the player simply tries again. Resolves once solved.
export function runMultipleChoice(scene: Phaser.Scene, puzzle: Puzzle, rate: number): Promise<void> {
  return new Promise((resolve) => {
    const W = scene.scale.width;
    const H = scene.scale.height;
    const layer = scene.add.container(0, 0).setDepth(50);
    const say = (text: string) => speak(text, { rate });

    layer.add(scene.add.rectangle(0, 0, W, H, 0x1b1410, 0.55).setOrigin(0).setInteractive());
    const panelW = Math.min(1000, W - 60);
    const panel = scene.add.graphics();
    panel.fillStyle(COLORS.parchment, 1).fillRoundedRect(W / 2 - panelW / 2, 30, panelW, H - 60, 24);
    panel.lineStyle(5, COLORS.goldDark, 1).strokeRoundedRect(W / 2 - panelW / 2, 30, panelW, H - 60, 24);
    layer.add(panel);

    const prompt = scene.add.text(W / 2, 110, puzzle.prompt, {
      fontFamily: FONT, fontSize: '40px', color: '#2b1d12', fontStyle: 'bold', align: 'center',
      wordWrap: { width: panelW - 220 },
    }).setOrigin(0.5);
    layer.add(prompt);
    layer.add(makeButton(scene, W / 2 + panelW / 2 - 70, 100, '🔊', () => say(puzzle.prompt), { width: 100, height: 90, fontSize: 44 }));

    const feedback = scene.add.text(W / 2, H - 110, '', {
      fontFamily: FONT, fontSize: '28px', color: '#5a3a1c', align: 'center', wordWrap: { width: panelW - 80 },
    }).setOrigin(0.5);
    layer.add(feedback);

    const choices = Phaser.Utils.Array.Shuffle([...puzzle.choices]);
    const top = 220;
    const gap = Math.min(120, 330 / choices.length + 20);
    let solved = false;
    choices.forEach((choice, i) => {
      const btn = makeButton(scene, W / 2, top + i * gap, choice.text, () => {
        if (solved || !btn.input?.enabled) return;
        if (choice.correct) {
          solved = true;
          btn.setFill(COLORS.green);
          btn.setLabel(`✓ ${choice.text}`);
          feedback.setText(ui.correct);
          say(ui.correct);
          layer.add(makeButton(scene, W / 2, H - 110, `${ui.continue} ▶`, () => {
            stopSpeaking();
            layer.destroy();
            resolve();
          }, { width: 340, height: 90 }));
          feedback.setY(H - 190);
        } else {
          btn.setFill(COLORS.muted);
          btn.setLabel(`✗ ${choice.text}`);
          btn.disableInteractive();
          const msg = fill(ui.tryAgain, { hint: puzzle.hint, ref: puzzle.ref });
          feedback.setText(msg);
          say(msg);
        }
      }, { width: Math.min(720, panelW - 120), height: gap - 22, fontSize: 34, fill: 0xe9dcc0 });
      layer.add(btn);
    });

    say(puzzle.prompt);
  });
}
