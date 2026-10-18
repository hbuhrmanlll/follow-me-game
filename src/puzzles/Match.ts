import Phaser from 'phaser';
import { makeButton } from '../ui/common';
import {
  characters, scriptureText, type DiscipleMatchPuzzle, type WhoSaidPuzzle,
} from '../systems/content';
import { makePanel, shake, shuffled, type PuzzleContext } from './panel';

const PAIR_COLORS = [0xa8d5a2, 0xa8c8e8, 0xf0c8a0, 0xd8b8e8];

// Matching: tap a person on the left, then what goes with them on the right.
function runMatch(
  scene: Phaser.Scene,
  ctx: PuzzleContext,
  opts: { prompt: string; hint: string; ref: string; left: string[]; right: string[] },
): Promise<void> {
  return new Promise((resolve) => {
    const panel = makePanel(scene, ctx, { prompt: opts.prompt });
    const n = Math.min(opts.left.length, ctx.difficulty === 'kids' ? 3 : 4);
    const order = shuffled(opts.left.map((_, i) => i).slice(0, n));
    const rightOrder = shuffled(order);
    const top = 200;
    const rowH = Math.min(120, 360 / n);
    const lw = 280;
    const rw = panel.width - lw - 110;
    const lx = panel.left + 40 + lw / 2;
    const rx = panel.left + panel.width - 40 - rw / 2;
    let chosen: number | null = null;
    let matched = 0;
    const leftBtns = new Map<number, ReturnType<typeof makeButton>>();

    order.forEach((idx, k) => {
      const btn = makeButton(scene, lx, top + k * rowH + rowH / 2, opts.left[idx], () => {
        if (!btn.input?.enabled) return;
        if (chosen !== null) leftBtns.get(chosen)?.setFill(0xe9dcc0);
        chosen = idx;
        btn.setFill(0xf5d77a);
        if (panel.kids) panel.say(opts.left[idx]);
      }, { width: lw, height: rowH - 14, fontSize: 26, fill: 0xe9dcc0 });
      leftBtns.set(idx, btn);
      panel.layer.add(btn);
    });

    rightOrder.forEach((idx, k) => {
      const btn = makeButton(scene, rx, top + k * rowH + rowH / 2, opts.right[idx], () => panel.tap(btn, opts.right[idx], () => {
        if (chosen === null) {
          shake(scene, btn);
          return;
        }
        if (chosen === idx) {
          const color = PAIR_COLORS[matched % PAIR_COLORS.length];
          btn.setFill(color);
          btn.disableInteractive();
          const lb = leftBtns.get(idx);
          lb?.setFill(color);
          lb?.disableInteractive();
          chosen = null;
          matched++;
          if (matched === n) panel.solved(resolve);
        } else {
          shake(scene, btn);
          btn.setFill(0xe9dcc0);
          panel.wrong(opts.hint, opts.ref);
        }
      }), { width: rw, height: rowH - 14, fontSize: n > 3 ? 22 : 24, fill: 0xe9dcc0 });
      panel.layer.add(btn);
    });
  });
}

export function runWhoSaid(scene: Phaser.Scene, puzzle: WhoSaidPuzzle, ctx: PuzzleContext): Promise<void> {
  return runMatch(scene, ctx, {
    prompt: puzzle.prompt, hint: puzzle.hint, ref: puzzle.ref,
    left: puzzle.pairs.map((p) => characters[p.speaker]?.name ?? p.speaker),
    right: puzzle.pairs.map((p) => `“${scriptureText(p.ref, p.quote, ctx.tid)}”`),
  });
}

export function runDiscipleMatch(scene: Phaser.Scene, puzzle: DiscipleMatchPuzzle, ctx: PuzzleContext): Promise<void> {
  return runMatch(scene, ctx, {
    prompt: puzzle.prompt, hint: puzzle.hint, ref: puzzle.ref,
    left: puzzle.pairs.map((p) => `${characters[p.disciple]?.emblem ?? ''} ${characters[p.disciple]?.name ?? p.disciple}`.trim()),
    right: puzzle.pairs.map((p) => p.fact),
  });
}
