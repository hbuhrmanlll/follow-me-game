import type Phaser from 'phaser';
import type { Puzzle } from '../systems/content';
import type { PuzzleContext } from './panel';
import { runMultipleChoice } from './MultipleChoice';
import { runFillBlank } from './FillBlank';
import { runMapFind } from './MapFind';
import { runEventOrder, runVerseOrder } from './Order';
import { runDiscipleMatch, runWhoSaid } from './Match';
import { runFindHidden } from './FindHidden';
import { runCount } from './Count';
import { runMiniGame } from './MiniGame';

export type { PuzzleContext } from './panel';

export function runPuzzle(scene: Phaser.Scene, puzzle: Puzzle, ctx: PuzzleContext): Promise<void> {
  switch (puzzle.type) {
    case 'multipleChoice': return runMultipleChoice(scene, puzzle, ctx);
    case 'fillBlank': return runFillBlank(scene, puzzle, ctx);
    case 'mapFind': return runMapFind(scene, puzzle, ctx);
    case 'verseOrder': return runVerseOrder(scene, puzzle, ctx);
    case 'eventOrder': return runEventOrder(scene, puzzle, ctx);
    case 'whoSaid': return runWhoSaid(scene, puzzle, ctx);
    case 'discipleMatch': return runDiscipleMatch(scene, puzzle, ctx);
    case 'findHidden': return runFindHidden(scene, puzzle, ctx);
    case 'count': return runCount(scene, puzzle, ctx);
    case 'minigame': return runMiniGame(scene, puzzle, ctx);
  }
}
