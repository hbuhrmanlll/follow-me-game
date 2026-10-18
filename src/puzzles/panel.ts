import Phaser from 'phaser';
import { COLORS, FONT, makeButton } from '../ui/common';
import { speak, stopSpeaking } from '../systems/speech';
import { sfx } from '../systems/audio';
import { fill, ui, type TranslationId } from '../systems/content';
import type { Difficulty } from '../systems/save';

// What every puzzle needs to know about the player.
export interface PuzzleContext {
  tid: TranslationId; rate: number; difficulty: Difficulty;
  onMistake?: () => void; // lets Verse Journal practice know about misses
}

type Button = ReturnType<typeof makeButton>;
const SELECTED = 0xf5d77a;

// The parchment panel every puzzle sits on, with a feedback line, a 🔊 button
// for the instructions, and a Continue button once the puzzle is solved.
export interface PuzzlePanel {
  layer: Phaser.GameObjects.Container;
  left: number; // panel's left edge
  width: number;
  kids: boolean;
  say(text: string): void;
  // Kids mode: the first tap reads the choice aloud, a second tap chooses it.
  // Other modes: one tap chooses.
  tap(btn: Button, spoken: string, choose: () => void, baseFill?: number): void;
  wrong(hint: string, ref: string): void;
  solved(onDone: () => void): void;
  setFeedbackPosition(x: number, y: number, width: number): void;
}

export function makePanel(
  scene: Phaser.Scene,
  ctx: PuzzleContext,
  opts: { prompt: string; spoken?: string; left?: number; width?: number },
): PuzzlePanel {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const kids = ctx.difficulty === 'kids';
  const layer = scene.add.container(0, 0).setDepth(50);
  const say = (text: string) => speak(text, { rate: ctx.rate });

  layer.add(scene.add.rectangle(0, 0, W, H, 0x1b1410, 0.55).setOrigin(0).setInteractive());
  const width = opts.width ?? Math.min(1060, W - 60);
  const left = opts.left ?? W / 2 - width / 2;
  const g = scene.add.graphics();
  g.fillStyle(COLORS.parchment, 1).fillRoundedRect(left, 30, width, H - 60, 24);
  g.lineStyle(5, COLORS.goldDark, 1).strokeRoundedRect(left, 30, width, H - 60, 24);
  layer.add(g);

  const cx = left + width / 2;
  const prompt = kids ? `${opts.prompt}\n${ui.kidsTapTwice}` : opts.prompt;
  layer.add(scene.add.text(cx - 50, 100, prompt, {
    fontFamily: FONT, fontSize: '34px', color: '#2b1d12', fontStyle: 'bold', align: 'center',
    wordWrap: { width: width - 200 },
  }).setOrigin(0.5));
  const spoken = opts.spoken ?? opts.prompt;
  layer.add(makeButton(scene, left + width - 70, 100, '🔊', () => say(spoken), { width: 100, height: 90, fontSize: 44 }));

  const feedback = scene.add.text(cx, H - 110, '', {
    fontFamily: FONT, fontSize: '28px', color: '#5a3a1c', align: 'center', wordWrap: { width: width - 80 },
  }).setOrigin(0.5);
  layer.add(feedback);
  let done = false;
  let selected: { btn: Button; fill: number } | null = null;

  say(kids ? `${spoken} ${ui.kidsTapTwice}` : spoken);
  return {
    layer, left, width, kids, say,
    tap(btn, text, choose, baseFill = 0xe9dcc0) {
      if (done) return;
      if (!kids || selected?.btn === btn) {
        if (selected) selected.btn.setFill(selected.fill);
        selected = null;
        choose();
        return;
      }
      if (selected) selected.btn.setFill(selected.fill);
      selected = { btn, fill: baseFill };
      btn.setFill(SELECTED);
      say(text);
    },
    wrong(hint, ref) {
      ctx.onMistake?.();
      sfx('wrong');
      const msg = fill(ui.tryAgain, { hint, ref });
      feedback.setText(msg);
      say(msg);
    },
    solved(onDone) {
      if (done) return;
      done = true;
      sfx('correct');
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

// Shake a button a little to show "not that one".
export function shake(scene: Phaser.Scene, obj: Phaser.GameObjects.Container): void {
  const x = obj.x;
  scene.tweens.add({ targets: obj, x: x + 10, duration: 50, yoyo: true, repeat: 3, onComplete: () => { obj.x = x; } });
}

// Split a verse into pieces for "put it back in order". Kids get fewer, bigger pieces.
export function splitVerse(text: string, difficulty: Difficulty): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const target = { kids: 3, family: 5, adult: 8 }[difficulty];
  const pieces = Math.min(target, words.length);
  const out: string[] = [];
  let start = 0;
  for (let i = 1; i <= pieces; i++) {
    let end = Math.round((words.length * i) / pieces);
    // Prefer to break just after punctuation if it's nearby.
    for (const d of [0, 1, -1]) {
      const e = end + d;
      if (i < pieces && e > start && e < words.length && /[,;:.!?’”]$/.test(words[e - 1])) { end = e; break; }
    }
    if (end > start) out.push(words.slice(start, end).join(' '));
    start = end;
  }
  return out;
}

// Shuffle, but never leave the pieces already in the right order.
export function shuffled<T>(items: T[]): T[] {
  if (items.length < 2) return [...items];
  for (;;) {
    const s = Phaser.Utils.Array.Shuffle([...items]);
    if (s.some((v, i) => v !== items[i])) return s;
  }
}
