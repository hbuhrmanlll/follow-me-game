import Phaser from 'phaser';
import { COLORS, FONT, makePortrait, whenTapped } from './common';
import { estimateDuration, speak, stopSpeaking } from '../systems/speech';
import { ui } from '../systems/content';
import type { LineAudio, WordTimings } from '../systems/voice';
import { loadSettings, type Settings } from '../systems/save';
import { duckMusic } from '../systems/audio';

export interface DialogueLine {
  speakerName: string;
  color: string;
  initials: string;
  portrait?: string | null; // a loaded picture of the speaker, if there is one
  text: string;
  kind: 'scripture' | 'narration';
  refLabel?: string; // e.g. "Matthew 3:15 · BSB"
  pitch: number;
  rate: number;
  audio?: LineAudio | null; // a recording; without one the browser voice reads the line
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
  private player?: HTMLAudioElement;
  private timings?: WordTimings;
  private look: Settings = loadSettings();
  private muted?: Phaser.GameObjects.Text;

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
    whenTapped(hit, () => { if (this.state === 'waiting') this.finish(); });
  }

  // Shows and speaks a line. Resolves when the player moves on.
  play(line: DialogueLine): Promise<void> {
    this.line = line;
    this.look = loadSettings(); // text size, contrast and subtitles can change at any time
    this.drawBox(line.kind);
    this.portrait.set(line.color, line.initials, line.portrait);
    this.nameText.setText(line.speakerName);
    this.tag.setText(line.kind === 'narration' ? ui.narration : '').setVisible(line.kind === 'narration');
    this.tag.setX(this.nameText.x + this.nameText.width + 12);
    this.layoutWords(line.text, line.kind === 'narration');
    // Subtitles off: the voice still reads the line, but the words are hidden.
    this.wordLayer.setVisible(this.look.subtitles);
    this.muted?.destroy();
    if (!this.look.subtitles) {
      this.muted = this.scene.add.text(this.scene.scale.width / 2, (TOP + BOTTOM) / 2, '🔊 …', {
        fontFamily: FONT, fontSize: '48px', color: this.look.highContrast ? '#000000' : '#7a4f17',
      }).setOrigin(0.5);
    }
    this.refText.setText(line.refLabel ?? '');
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.speakLine();
    });
  }

  replay(): void {
    if (this.line && this.state !== 'idle') this.speakLine();
  }

  // Stops the voice without moving on (the app went into the background).
  halt(): void {
    this.autoTimer?.remove();
    this.stopPlayer();
    stopSpeaking();
  }

  skip(): void {
    if (this.state !== 'idle') this.finish();
  }

  // Call when the Auto/Tap setting changes.
  refreshMode(): void {
    if (this.state === 'waiting') this.onSpoken();
  }

  setVisible(v: boolean): void {
    for (const o of [this.bg, this.highlight, this.portrait.container, this.nameText, this.tag, this.refText]) {
      o.setVisible(v);
    }
    this.wordLayer.setVisible(v && this.look.subtitles);
    this.muted?.setVisible(v);
    if (!v) this.continueText.setVisible(false);
  }

  update(): void {
    if (this.state !== 'speaking' || !this.line) return;
    if (this.player) {
      // Follow the recording: exact word times if we have them, else estimate.
      const t = this.player.currentTime;
      if (this.timings) {
        const w = this.timings.words.findIndex((x) => t < x.e);
        const c = this.timings.words[w === -1 ? this.timings.words.length - 1 : w]?.c ?? 0;
        this.setCurrent(this.words.findIndex((x) => c < x.end));
      } else if (this.player.duration) {
        const pos = (t / this.player.duration) * this.line.text.length;
        this.setCurrent(this.words.findIndex((x) => pos < x.end));
      }
      return;
    }
    if (this.gotBoundary) return;
    // Without word timing from the browser, estimate where the voice is.
    const msPerChar = estimateDuration('x', this.line.rate * this.speed) - 400;
    const pos = (performance.now() - this.startedAt) / msPerChar;
    const idx = this.words.findIndex((w) => pos < w.end + 1);
    this.setCurrent(idx === -1 ? this.words.length - 1 : idx);
  }

  private stopPlayer(): void {
    if (!this.player) return;
    this.player.onended = null;
    this.player.onerror = null;
    this.player.pause();
    this.player = undefined;
  }

  private speakLine(): void {
    const line = this.line!;
    this.autoTimer?.remove();
    this.stopPlayer();
    duckMusic(true);
    if (line.audio) {
      this.state = 'speaking';
      this.continueText.setVisible(false);
      this.refText.setVisible(true);
      this.setCurrent(0);
      const a = new Audio(line.audio.url);
      a.playbackRate = this.speed;
      a.volume = this.look.voiceVolume;
      a.onended = () => this.onSpoken();
      // If the file can't play, fall back to the browser voice.
      a.onerror = () => { this.stopPlayer(); this.speakWithBrowser(line); };
      this.player = a;
      this.timings = undefined;
      void line.audio.timings?.().then((t) => { if (this.player === a) this.timings = t; });
      a.play().catch(() => { if (this.player === a) { this.stopPlayer(); this.speakWithBrowser(line); } });
      return;
    }
    this.speakWithBrowser(line);
  }

  private speakWithBrowser(line: DialogueLine): void {
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
    duckMusic(false);
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
    this.stopPlayer();
    stopSpeaking();
    duckMusic(false);
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
    this.highlight.fillStyle(this.look.highContrast ? 0xffe600 : COLORS.gold, this.look.highContrast ? 1 : 0.55).fillRoundedRect(w.obj.x - 4, w.obj.y - 2, w.obj.width + 8, w.obj.height + 4, 6);
  }

  private drawBox(kind: DialogueLine['kind']): void {
    const W = this.scene.scale.width;
    const hc = this.look.highContrast;
    const fill = hc ? (kind === 'narration' ? 0xe8e8e8 : 0xffffff) : kind === 'narration' ? 0xe9dcc0 : COLORS.parchment;
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.35).fillRoundedRect(24, TOP + 6, W - 40, BOTTOM - TOP, 22);
    this.bg.fillStyle(fill, 1).fillRoundedRect(20, TOP, W - 40, BOTTOM - TOP, 22);
    this.bg.lineStyle(hc ? 6 : 4, hc ? 0x000000 : kind === 'narration' ? 0x8f8270 : COLORS.goldDark, 1).strokeRoundedRect(20, TOP, W - 40, BOTTOM - TOP, 22);
    this.nameText.setBackgroundColor(hc ? '#000000' : '#5a3a1c').setColor(hc ? '#ffe600' : '#fff8e6');
    this.refText.setColor(hc ? '#000000' : '#7a4f17');
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

    // Start at the chosen text size and shrink only if a long verse won't fit.
    const base = { normal: 34, large: 40, xlarge: 46 }[this.look.textSize];
    const ink = this.look.highContrast ? '#000000' : '#2b1d12';
    for (const size of [base, base - 4, base - 8, base - 12, 24].filter((n, i, a) => n >= 24 && a.indexOf(n) === i)) {
      this.wordLayer.removeAll(true);
      this.words = [];
      const lineH = Math.round(size * 1.35);
      let x = left;
      let y = TOP + 32;
      let lines = 1;
      const style = { fontFamily: FONT, fontSize: `${size}px`, color: ink, fontStyle: italic ? 'italic' : 'normal' };
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
