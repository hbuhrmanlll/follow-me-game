import type Phaser from 'phaser';
import type { Puzzle, TranslationId } from '../systems/content';
import { runMultipleChoice } from './MultipleChoice';
import { runFillBlank } from './FillBlank';
import { runMapFind } from './MapFind';

export function runPuzzle(scene: Phaser.Scene, puzzle: Puzzle, tid: TranslationId, rate: number): Promise<void> {
  switch (puzzle.type) {
    case 'multipleChoice': return runMultipleChoice(scene, puzzle, rate);
    case 'fillBlank': return runFillBlank(scene, puzzle, tid, rate);
    case 'mapFind': return runMapFind(scene, puzzle, rate);
  }
}
