import Phaser from 'phaser';
import { drawBackdrop } from '../art/backdrops';
import { FONT, makeButton, restartOnResize } from '../ui/common';
import { runPuzzle } from '../puzzles';
import { loadTranslation, scriptureText, ui, type Puzzle } from '../systems/content';
import { loadSettings, loadSlots, saveSlot, type JournalEntry, type Slot } from '../systems/save';
import { dueVerses, recordPractice } from '../systems/journal';
import { checkAchievements } from '../systems/achievements';
import { fill } from '../systems/content';
import { speak } from '../systems/speech';

const PER_SESSION = 5;
const SPARE_WORDS = ['light', 'bread', 'water', 'heaven', 'heart', 'peace', 'king', 'stone', 'mountain', 'river'];

// Verse Journal practice: the verses that are due, as quick puzzles.
export class PracticeScene extends Phaser.Scene {
  constructor() {
    super('Practice');
  }

  create(data: { slot: number }): void {
    restartOnResize(this, data);
    drawBackdrop(this, 'galilee', 'dawn');
    const slot = loadSlots()[data.slot]!;
    const rate = { slow: 0.75, normal: 1, fast: 1.25 }[loadSettings().speed];
    void loadTranslation(slot.translation).then(async () => {
      const due = dueVerses(slot).slice(0, PER_SESSION);
      for (let i = 0; i < due.length; i++) {
        if (!this.scene.isActive()) return;
        let mistakes = 0;
        await runPuzzle(this, this.puzzleFor(slot, due[i], i), {
          tid: slot.translation, rate, difficulty: slot.difficulty, onMistake: () => mistakes++,
        });
        recordPractice(due[i], mistakes === 0);
        saveSlot(data.slot, slot);
      }
      const fresh = checkAchievements(slot);
      saveSlot(data.slot, slot);
      this.finish(data, fresh.map((a) => `🏆 ${fill(ui.newAchievement, { title: a.title })}`));
    });
  }

  // Alternate between "fill in the word" and "put it in order".
  private puzzleFor(slot: Slot, e: JournalEntry, i: number): Puzzle {
    const text = scriptureText(e.ref, e.quote, slot.translation);
    if (i % 2 === 1) return { type: 'verseOrder', prompt: ui.orderPrompt, hint: e.ref, ref: e.ref, quote: e.quote };
    const words = text.split(/\s+/)
      .map((w) => w.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, ''))
      .filter((w) => /^[A-Za-z]{4,}$/.test(w));
    const longest = [...new Set(words)].sort((a, b) => b.length - a.length).slice(0, 3);
    const blank = longest[Math.floor(Math.random() * longest.length)] ?? words[0] ?? text.split(' ')[0];
    const decoys = Phaser.Utils.Array.Shuffle(SPARE_WORDS.filter((w) => !text.toLowerCase().includes(w))).slice(0, 3);
    return {
      type: 'fillBlank', prompt: ui.fillPrompt, hint: e.ref, ref: e.ref, quote: e.quote,
      blank: { [slot.translation]: blank }, decoys,
    };
  }

  private finish(data: { slot: number }, news: string[] = []): void {
    const W = this.scale.width;
    this.add.text(W / 2, 220, [`✦ ${ui.practiceDone} ✦`, ...news].join('\n'), {
      fontFamily: FONT, fontSize: '44px', color: '#fff4d6', fontStyle: 'bold', stroke: '#3b2410', strokeThickness: 8, align: 'center',
    }).setOrigin(0.5);
    speak([ui.practiceDone, ...news.map((n) => n.replace(/^\W+/, ''))].join(' '));
    makeButton(this, W / 2, 420, `📖 ${ui.journal}`, () => this.scene.start('Journal', data), { width: 420 });
  }
}
