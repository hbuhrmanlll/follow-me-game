import Phaser from 'phaser';
import { COLORS, FONT, makeButton } from '../ui/common';
import { scriptureText, translations, ui, type EventOrderPuzzle, type VerseOrderPuzzle } from '../systems/content';
import { makePanel, shake, shuffled, splitVerse, type PuzzleContext } from './panel';

// Shared by "put the verse back in order" and "put the events in order":
// the player taps the pieces in the right order. After two misses in a row,
// the right piece glows so nobody gets stuck.
function runOrder(
  scene: Phaser.Scene,
  ctx: PuzzleContext,
  opts: {
    prompt: string; hint: string; ref: string;
    pieces: { label: string; spoken: string }[];
    preplaced: number; // how many pieces start already in place (Kids help)
    showLine: boolean; // build the verse in a line at the top
    finalSpoken: string;
    cardHeight: number; perRow: number; fontSize: number;
  },
): Promise<void> {
  return new Promise((resolve) => {
    const W = scene.scale.width;
    const panel = makePanel(scene, ctx, { prompt: opts.prompt });
    let next = opts.preplaced;
    let misses = 0;
    const placed: string[] = opts.pieces.slice(0, next).map((p) => p.label);

    const line = scene.add.text(W / 2, 215, '', {
      fontFamily: FONT, fontSize: '30px', color: '#2b1d12', fontStyle: 'italic', align: 'center',
      wordWrap: { width: panel.width - 100 }, lineSpacing: 6,
    }).setOrigin(0.5);
    panel.layer.add(line);
    const showLine = () => line.setText(opts.showLine ? `“${placed.join(' ')}${next < opts.pieces.length ? ' …' : ''}”` : '');
    showLine();

    // Pieces already in place (Kids help) come first and are shown done.
    const order = [...opts.pieces.map((_, i) => i).slice(0, opts.preplaced), ...shuffled(opts.pieces.map((_, i) => i).slice(opts.preplaced))];
    const rows = Math.ceil(order.length / opts.perRow);
    const cw = (panel.width - 80) / opts.perRow - 16;
    const top = opts.showLine ? 320 : 230;
    const buttons = new Map<number, ReturnType<typeof makeButton>>();
    order.forEach((idx, k) => {
      const row = Math.floor(k / opts.perRow);
      const inRow = Math.min(opts.perRow, order.length - row * opts.perRow);
      const col = k % opts.perRow;
      const x = W / 2 + (col - (inRow - 1) / 2) * (cw + 16);
      const y = top + row * (opts.cardHeight + 16) + (rows === 1 ? 30 : 0);
      const piece = opts.pieces[idx];
      const btn = makeButton(scene, x, y, piece.label, () => panel.tap(btn, piece.spoken, () => {
        if (idx === next) {
          misses = 0;
          placed.push(piece.label);
          next++;
          btn.setFill(COLORS.green);
          btn.setLabel(opts.showLine ? piece.label : `${next}.  ${piece.label}`);
          btn.disableInteractive();
          if (opts.showLine) btn.setAlpha(0.35);
          showLine();
          if (next === opts.pieces.length) {
            panel.solved(resolve);
            panel.say(`${ui.correct} ${opts.finalSpoken}`);
          } else if (!panel.kids) {
            panel.say(piece.spoken);
          }
        } else {
          misses++;
          shake(scene, btn);
          btn.setFill(0xe9dcc0);
          panel.wrong(opts.hint, opts.ref);
          if (misses >= 2) buttons.get(next)?.setFill(0xf5d77a);
        }
      }), { width: cw, height: opts.cardHeight, fontSize: opts.fontSize, fill: 0xe9dcc0 });
      buttons.set(idx, btn);
      panel.layer.add(btn);
      if (idx < opts.preplaced) {
        btn.setFill(COLORS.green);
        btn.setLabel(opts.showLine ? piece.label : `${idx + 1}.  ${piece.label}`);
        btn.disableInteractive();
        if (opts.showLine) btn.setAlpha(0.35);
      }
    });
  });
}

export function runVerseOrder(scene: Phaser.Scene, puzzle: VerseOrderPuzzle, ctx: PuzzleContext): Promise<void> {
  const verse = scriptureText(puzzle.ref, puzzle.quote, ctx.tid);
  const short = translations.find((t) => t.id === ctx.tid)?.short ?? '';
  const pieces = splitVerse(verse, ctx.difficulty).map((p) => ({ label: p, spoken: p }));
  return runOrder(scene, ctx, {
    prompt: `${puzzle.prompt}  (${puzzle.ref} · ${short})`, hint: puzzle.hint, ref: puzzle.ref,
    pieces, preplaced: 0, showLine: true, finalSpoken: verse,
    cardHeight: 96, perRow: pieces.length <= 3 ? 3 : 4, fontSize: pieces.length <= 3 ? 26 : 28,
  });
}

export function runEventOrder(scene: Phaser.Scene, puzzle: EventOrderPuzzle, ctx: PuzzleContext): Promise<void> {
  const pieces = puzzle.events.map((e) => ({ label: e.icon ? `${e.icon}\n${e.text}` : e.text, spoken: e.text }));
  return runOrder(scene, ctx, {
    prompt: puzzle.prompt, hint: puzzle.hint, ref: puzzle.ref,
    pieces, preplaced: ctx.difficulty === 'kids' ? 1 : 0, showLine: false,
    finalSpoken: puzzle.events.map((e) => e.text).join('. '),
    cardHeight: 170, perRow: Math.min(4, pieces.length), fontSize: 26,
  });
}
