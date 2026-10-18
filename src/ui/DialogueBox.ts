import Phaser from 'phaser';
import { COLORS, FONT, makePortrait } from './common';
import { estimateDuration, speak, stopSpeaking } from '../systems/speech';
import { ui } from '../systems/content';

export interface DialogueLine {
  speakerName: string;
  color: string;
  initials: string;
  text: string;
  kind: 'scripture' | 'narration';
  refLabel?: string; // e.g. "Matthew 3:15 · BSB"
  pitch: number;
  rate: number;
}

interface Word { obj: Phaser.GameObjects.Text; start: number; end: number }

const TOP = 470; // the box sits at the bottom of the 720-high screen
const BOTTOM = 708;

// The dialogue box: portrait, speaker name, the words (highlighted as they are
// spoken), and the Scripture reference. Call play() for each line.
export class DialogueBox {
  autoAdvance = true;
  speed = 1; // multiplies each character's own speaking rate

  private bg: Phaser.GameObjects.Graphics;
  private portrait: ReturnType<typeof makePortrait>;
  private nameText: Phaser.GameObjects.Text;
  private tag: Phaser.GameObjects.Text;
  private refText: Phaser.GameObjects.Text;
  private continueText: Phaser.GameObjects.Text;
  private highlight: Phaser.GameObjects.Graphics;
  private words: Word[] = [];
  private wordLayer: Phaser.GameObjects.Container;
  private line?: DialogueLine;
  private resolve?: () => void;
  private state: 'idle' | 'speaking' | 'waiting' = 'idle';
  private startedAt = 0;
  private gotBoundary = false;
  private current = -1;
  private autoTimer?: Phaser.Time.TimerEvent;

  constructor(private scene: Phaser.Scene) {
    const W = scene.scale.width;
    this.bg = scene.add.graphics();
    this.highlight = scene.add.graphics();
    this.wordLayer = scene.add.container(0, 0);
    this.portrait = makePortrait(scene, 105, TOP + 10, 72);
    this.nameText = scene.add.text(196, TOP - 22, '', {
      fontFamily: FONT, fontSize: '32px', color: '#fff8e6', fontStyle: 'bold',
      backgroundColor: '#5a3a1c', padding: { x: 16, y: 6 },
    }).setOrigin(0, 0.5);
    this.tag = scene.add.text(0, TOP - 22, '', {
      fontFamily: FONT, fontSize: '22px', color: '#2b1d12', fontStyle: 'italic',
      backgroundColor: '#e2d3b0', padding: { x: 12, y: 4 },
    }).setOrigin(0, 0.5);
    this.refText = scene.add.text(W - 44, BOTTOM - 14, '', {
      fontFamily: FONT, fontSize: '22px', color: '#7a4f17', fontStyle: 'bold',
    }).setOrigin(1, 1);
    this.continueText = scene.add.text(W - 44, BOTTOM - 14, ui.tapToContinue, {
      fontFamily: FONT, fontSize: '24px', color: '#7a4f17', fontStyle: 'bold',
    }).setOrigin(1, 1).setVisible(false);
    scene.tweens.add({ targets: this.continueText, alpha: 0.35, yoyo: true, repeat: -1, duration: 700 });

    // Tapping the box moves on once the line has finished.
    const hit = scene.add.zone(20, TOP, W - 40, BOTTOM - TOP).setOrigin(0).setInteractive();
    hit.on('pointerup', () => this.state === 'waiting' && this.finish());
  }

  // Shows and speaks a line. Resolves when the player moves on.
  play(line: DialogueLine): Promise<void> {
    this.line = line;
    this.drawBox(line.kind);
    this.portrait.set(line.color, line.initials);
    this.nameText.setText(line.speakerName);
    this.tag.setText(line.kind === 'narration' ? ui.narration : '').setVisible(line.kind === 'narration');
    this.tag.setX(this.nameText.x + this.nameText.width + 12);
    this.layoutWords(line.text, line.kind === 'narration');
    this.refText.setText(line.refLabel ?? '');
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.speakLine();
    });
  }

  replay(): void {
    if (this.line && this.state !== 'idle') this.speakLine();
  }

  skip(): void {
    if (this.state !== 'idle') this.finish();
  }

  // Call when the Auto/Tap setting changes.
  refreshMode(): void {
    if (this.state === 'waiting') this.onSpoken();
  }

  setVisible(v: boolean): void {
    for (const o of [this.bg, this.highlight, this.wordLayer, this.portrait.container, this.nameText, this.tag, this.refText]) {
      o.setVisible(v);
    }
    if (!v) this.continueText.setVisible(false);
  }

  update(): void {
    if (this.state !== 'speaking' || this.gotBoundary || !this.line) return;
    // Without word timing from the browser, estimate where the voice is.
    const msPerChar = estimateDuration('x', this.line.rate * this.speed) - 400;
    const pos = (performance.now() - this.startedAt) / msPerChar;
    const idx = this.words.findIndex((w) => pos < w.end + 1);
    this.setCurrent(idx === -1 ? this.words.length - 1 : idx);
  }

  private speakLine(): void {
    const line = this.line!;
    this.autoTimer?.remove();
    this.state = 'speaking';
    this.continueText.setVisible(false);
    this.refText.setVisible(true);
    this.gotBoundary = false;
    this.startedAt = performance.now();
    this.setCurrent(0);
    speak(line.text, {
      pitch: line.pitch,
      rate: line.rate * this.speed,
      onWord: (charIndex) => {
        this.gotBoundary = true;
        const idx = this.words.findIndex((w) => charIndex < w.end);
        if (idx !== -1) this.setCurrent(idx);
      },
      onEnd: () => this.onSpoken(),
    });
  }

  private onSpoken(): void {
    if (this.state === 'idle') return;
    this.state = 'waiting';
    this.setCurrent(-1);
    this.autoTimer?.remove();
    if (this.autoAdvance) {
      this.continueText.setVisible(false);
      this.refText.setVisible(true);
      this.autoTimer = this.scene.time.delayedCall(900, () => this.finish());
    } else {
      this.refText.setVisible(false);
      this.continueText.setVisible(true);
    }
  }

  private finish(): void {
    this.autoTimer?.remove();
    stopSpeaking();
    this.state = 'idle';
    this.setCurrent(-1);
    this.continueText.setVisible(false);
    const r = this.resolve;
    this.resolve = undefined;
    r?.();
  }

  private setCurrent(idx: number): void {
    if (idx === this.current) return;
    this.current = idx;
    this.highlight.clear();
    const w = this.words[idx];
    if (!w) return;
    this.highlight.fillStyle(COLORS.gold, 0.55).fillRoundedRect(w.obj.x - 4, w.obj.y - 2, w.obj.width + 8, w.obj.height + 4, 6);
  }

  private drawBox(kind: DialogueLine['kind']): void {
    const W = this.scene.scale.width;
    const fill = kind === 'narration' ? 0xe9dcc0 : COLORS.parchment;
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.35).fillRoundedRect(24, TOP + 6, W - 40, BOTTOM - TOP, 22);
    this.bg.fillStyle(fill, 1).fillRoundedRect(20, TOP, W - 40, BOTTOM - TOP, 22);
    this.bg.lineStyle(4, kind === 'narration' ? 0x8f8270 : COLORS.goldDark, 1).strokeRoundedRect(20, TOP, W - 40, BOTTOM - TOP, 22);
  }

  // Each word is its own text object so it can be highlighted while spoken.
  private layoutWords(text: string, italic: boolean): void {
    this.wordLayer.removeAll(true);
    this.words = [];
    const left = 200;
    const right = this.scene.scale.width - 50;
    const maxLines = 4;
    const tokens: { word: string; start: number; end: number }[] = [];
    const re = /\S+/g;
    for (let m = re.exec(text); m; m = re.exec(text)) tokens.push({ word: m[0], start: m.index, end: m.index + m[0].length });

    for (const size of [34, 30, 27, 24]) {
      this.wordLayer.removeAll(true);
      this.words = [];
      const lineH = Math.round(size * 1.35);
      let x = left;
      let y = TOP + 32;
      let lines = 1;
      const style = { fontFamily: FONT, fontSize: `${size}px`, color: '#2b1d12', fontStyle: italic ? 'italic' : 'normal' };
      const space = size * 0.3;
      for (const t of tokens) {
        const obj = this.scene.add.text(0, 0, t.word, style);
        if (x + obj.width > right && x > left) {
          x = left;
          y += lineH;
          lines++;
        }
        obj.setPosition(x, y);
        x += obj.width + space;
        this.wordLayer.add(obj);
        this.words.push({ obj, start: t.start, end: t.end });
      }
      if (lines <= maxLines) break;
    }
  }
}
