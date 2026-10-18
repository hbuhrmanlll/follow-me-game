import Phaser from 'phaser';
import endingJson from '../../content/en/ending.json';
import { drawBackdrop } from '../art/backdrops';
import { COLORS, FONT, makeButton, restartOnResize } from '../ui/common';
import { loadTranslation, scriptureText, translations, ui, type Quote } from '../systems/content';
import { loadSettings, loadSlots, saveSlot, newSlot } from '../systems/save';
import { speak, stopSpeaking } from '../systems/speech';
import { setMood } from '../systems/audio';

interface Slide { text: string; ref: string; quote?: Quote }
const ending = endingJson as { title: string; slides: Slide[]; invite: string; prayer: string };

// The end of the journey: the Gospel explained simply, with Scripture, and an
// invitation to talk with a parent or pastor.
export class EndingScene extends Phaser.Scene {
  private index = 0;
  private slot = 0;
  private layer?: Phaser.GameObjects.Container;

  constructor() {
    super('Ending');
  }

  create(data: { slot: number }): void {
    this.slot = data.slot;
    this.index = 0;
    restartOnResize(this, data);
    this.events.once('shutdown', () => stopSpeaking());
    drawBackdrop(this, 'jordan', 'dawn');
    setMood('wonder');
    const tid = loadSlots()[data.slot]?.translation ?? 'bsb';
    void loadTranslation(tid).then(() => this.show());
  }

  private get rate(): number {
    return { slow: 0.75, normal: 1, fast: 1.25 }[loadSettings().speed];
  }

  private show(): void {
    this.layer?.destroy();
    const W = this.scale.width;
    const H = this.scale.height;
    const tid = loadSlots()[this.slot]?.translation ?? 'bsb';
    const short = translations.find((t) => t.id === tid)?.short ?? '';
    const layer = this.add.container(0, 0);
    this.layer = layer;
    const pw = Math.min(1060, W - 60);
    const g = this.add.graphics();
    g.fillStyle(COLORS.parchment, 0.97).fillRoundedRect(W / 2 - pw / 2, 30, pw, H - 60, 24);
    g.lineStyle(5, COLORS.goldDark, 1).strokeRoundedRect(W / 2 - pw / 2, 30, pw, H - 60, 24);
    layer.add(g);
    layer.add(this.add.text(W / 2, 80, `✝ ${ending.title}`, { fontFamily: FONT, fontSize: '44px', color: '#2b1d12', fontStyle: 'bold' }).setOrigin(0.5));
    const text = (y: number, s: string, size: number, color = '#2b1d12', style = 'normal') => {
      const t = this.add.text(W / 2, y, s, {
        fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: style, align: 'center', wordWrap: { width: pw - 100 }, lineSpacing: 6,
      }).setOrigin(0.5, 0);
      layer.add(t);
      return t;
    };

    const last = this.index >= ending.slides.length;
    let spoken: string;
    if (!last) {
      const slide = ending.slides[this.index];
      const verse = scriptureText(slide.ref, slide.quote, tid);
      const t1 = text(140, slide.text, 32);
      const t2 = text(t1.y + t1.height + 30, `“${verse}”`, 30, '#5a3a1c', 'italic');
      text(t2.y + t2.height + 12, `${slide.ref} · ${short}`, 24, '#7a4f17', 'bold');
      spoken = `${slide.text} ${slide.ref}. ${verse}`;
    } else {
      const t1 = text(140, ending.invite, 32);
      const t2 = text(t1.y + t1.height + 30, `🙏 ${ending.prayer}`, 28, '#5a3a1c', 'italic');
      void t2;
      spoken = `${ending.invite} ${ui.prayTogether} ${ending.prayer}`;
    }

    const row: [string, () => void, number][] = [];
    if (this.index > 0) row.push([ui.back, () => { this.index--; this.show(); }, 200]);
    row.push(['🔊', () => speak(spoken, { rate: this.rate }), 110]);
    if (!last) row.push([ui.next, () => { this.index++; this.show(); }, 220]);
    else {
      row.push([ui.backToTitle, () => this.scene.start('Title'), 280]);
      row.push([ui.startAgain, () => this.startAgain(), 380]);
    }
    let bx = W / 2 - (row.reduce((n, [, , w]) => n + w, 0) + 20 * (row.length - 1)) / 2;
    for (const [label, fn, w] of row) {
      layer.add(makeButton(this, bx + w / 2, H - 100, label, fn, { width: w, height: 90, fontSize: label.length > 2 ? 28 : 42 }));
      bx += w + 20;
    }
    speak(spoken, { rate: this.rate });
  }

  // Start a new journey for the same player, keeping their Journal and Cards.
  private startAgain(): void {
    const old = loadSlots()[this.slot];
    if (!old) return;
    const fresh = newSlot(old.name, old.difficulty);
    saveSlot(this.slot, {
      ...fresh, translation: old.translation, journal: old.journal,
      progress: { ...fresh.progress, completed: old.progress.completed, disciples: old.progress.disciples },
    });
    this.scene.start('Story', { slot: this.slot });
  }
}
