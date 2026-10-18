import Phaser from 'phaser';
import { COLORS, FONT, makeButton } from '../ui/common';
import { speak, stopSpeaking } from '../systems/speech';
import { fill, ui } from '../systems/content';

// The parchment panel every puzzle sits on, with a feedback line, a 🔊 button
// for the instructions, and a Continue button once the puzzle is solved.
export interface PuzzlePanel {
  layer: Phaser.GameObjects.Container;
  left: number; // panel's left edge
  width: number;
  say(text: string): void;
  wrong(hint: string, ref: string): void;
  solved(onDone: () => void): void;
  setFeedbackPosition(x: number, y: number, width: number): void;
}

export function makePanel(
  scene: Phaser.Scene, opts: { rate: number; prompt: string; spoken?: string; left?: number; width?: number },
): PuzzlePanel {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const layer = scene.add.container(0, 0).setDepth(50);
  const say = (text: string) => speak(text, { rate: opts.rate });

  layer.add(scene.add.rectangle(0, 0, W, H, 0x1b1410, 0.55).setOrigin(0).setInteractive());
  const width = opts.width ?? Math.min(1000, W - 60);
  const left = opts.left ?? W / 2 - width / 2;
  const g = scene.add.graphics();
  g.fillStyle(COLORS.parchment, 1).fillRoundedRect(left, 30, width, H - 60, 24);
  g.lineStyle(5, COLORS.goldDark, 1).strokeRoundedRect(left, 30, width, H - 60, 24);
  layer.add(g);

  const cx = left + width / 2;
  layer.add(scene.add.text(cx - 50, 110, opts.prompt, {
    fontFamily: FONT, fontSize: '36px', color: '#2b1d12', fontStyle: 'bold', align: 'center',
    wordWrap: { width: width - 200 },
  }).setOrigin(0.5));
  const spoken = opts.spoken ?? opts.prompt;
  layer.add(makeButton(scene, left + width - 70, 100, '🔊', () => say(spoken), { width: 100, height: 90, fontSize: 44 }));

  const feedback = scene.add.text(cx, H - 110, '', {
    fontFamily: FONT, fontSize: '28px', color: '#5a3a1c', align: 'center', wordWrap: { width: width - 80 },
  }).setOrigin(0.5);
  layer.add(feedback);
  let done = false;

  say(spoken);
  return {
    layer, left, width, say,
    wrong(hint, ref) {
      const msg = fill(ui.tryAgain, { hint, ref });
      feedback.setText(msg);
      say(msg);
    },
    solved(onDone) {
      if (done) return;
      done = true;
      feedback.setText(ui.correct).setY(feedback.y - 80);
      say(ui.correct);
      layer.add(makeButton(scene, feedback.x, H - 110, `${ui.continue} ▶`, () => {
        stopSpeaking();
        layer.destroy();
        onDone();
      }, { width: 340, height: 90 }));
    },
    setFeedbackPosition(x, y, w) {
      feedback.setPosition(x, y).setWordWrapWidth(w);
    },
  };
}
