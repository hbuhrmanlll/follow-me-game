import Phaser from 'phaser';
import { COLORS, FONT, makeButton, restartOnResize } from '../ui/common';
import { drawBackdrop, driftLayers, type Layer } from '../art/backdrops';
import { DialogueBox } from '../ui/DialogueBox';
import { runPuzzle } from '../puzzles';
import { showPassage, type PassageView } from '../ui/dom';
import { speak, stopSpeaking } from '../systems/speech';
import {
  chapterOrder, characters, fill, getChapter, getVerses, lineText, loadTranslation, locations,
  scenePuzzles, scriptureText, translations, ui, type Chapter, type SceneData, type TranslationId,
} from '../systems/content';
import { addVerse } from '../systems/journal';
import { openMenu } from '../ui/menu';
import { audioForLine } from '../systems/voice';
import { loadSettings, loadSlots, saveSettings, saveSlot, type Settings, type Slot, type Speed } from '../systems/save';

const SPEEDS: Speed[] = ['slow', 'normal', 'fast'];
const SPEED_RATE: Record<Speed, number> = { slow: 0.75, normal: 1, fast: 1.25 };
const SPEED_ICON: Record<Speed, string> = { slow: '🐢', normal: '🚶', fast: '🐇' };
const OFFSTAGE = ['narrator', 'voice-from-heaven', 'tempter'];
const FEET_Y = 440;

// Plays a chapter: each scene's dialogue, then its puzzle, saving as it goes
// so the game resumes exactly where the player left off.
export class StoryScene extends Phaser.Scene {
  private slotIndex = 0;
  private slot!: Slot;
  private settings!: Settings;
  private chapter!: Chapter;
  private layers: Layer[] = [];
  private box?: DialogueBox;
  private figures = new Map<string, Phaser.GameObjects.Container>();
  private heavenLight?: Phaser.GameObjects.Graphics;
  private shadow?: Phaser.GameObjects.Rectangle;
  private run = 0; // bumps when the scene restarts so old loops stop

  constructor() {
    super('Story');
  }

  init(data: { slot: number }): void {
    this.slotIndex = data.slot;
    this.slot = loadSlots()[data.slot]!;
    this.settings = loadSettings();
    this.chapter = getChapter(this.slot.progress.chapter);
  }

  create(): void {
    restartOnResize(this, { slot: this.slotIndex });
    const run = ++this.run;
    this.events.once('shutdown', () => { this.run++; stopSpeaking(); });
    loadTranslation(this.slot.translation).then(() => {
      if (run === this.run) void this.playFromSave(run);
    });
  }

  update(_t: number, delta: number): void {
    driftLayers(this.layers, this.scale.width, delta * 0.5);
    this.box?.update();
  }

  private get tid(): TranslationId {
    return this.slot.translation;
  }

  private get rate(): number {
    return SPEED_RATE[this.settings.speed];
  }

  private save(): void {
    saveSlot(this.slotIndex, this.slot);
  }

  private async playFromSave(run: number): Promise<void> {
    const p = this.slot.progress;
    while (run === this.run && p.scene < this.chapter.scenes.length) {
      const scene = this.chapter.scenes[p.scene];
      if (p.visited[p.visited.length - 1] !== scene.location) p.visited.push(scene.location);
      this.buildStage(scene);
      if (p.step === 0) {
        await this.banner(scene);
        if (scene.note && run === this.run) await this.showNote(scene.note);
      }
      while (run === this.run && p.step < scene.lines.length) {
        this.save();
        await this.playLine(scene, p.step);
        if (run !== this.run) return;
        await this.welcome(scene.lines[p.step].joins ?? []);
        if (run !== this.run) return;
        p.step++;
      }
      // Puzzles come after the lines; step counts on past the last line.
      const puzzles = scenePuzzles(scene);
      while (run === this.run && p.step < scene.lines.length + puzzles.length) {
        this.save();
        this.box?.setVisible(false);
        const pz = puzzles[p.step - scene.lines.length];
        await runPuzzle(this, pz, { tid: this.tid, rate: this.rate, difficulty: this.slot.difficulty });
        if (run !== this.run) return;
        if (pz.type === 'fillBlank' || pz.type === 'verseOrder') addVerse(this.slot, pz.ref, pz.quote);
        p.step++;
      }
      if (run !== this.run) return;
      p.scene++;
      p.step = 0;
      this.save();
    }
    if (run === this.run) this.chapterEnd();
  }

  private buildStage(scene: SceneData): void {
    this.tweens.killAll();
    this.children.removeAll(true);
    this.figures.clear();
    const W = this.scale.width;
    this.layers = drawBackdrop(this, locations[scene.location]?.backdrop ?? 'jordan', scene.timeOfDay);

    this.heavenLight = this.add.graphics().setAlpha(0);

    // Placeholder figures for everyone who speaks, plus the disciples already
    // following Jesus. Disciples who join during this scene appear when they join.
    const joined = this.slot.progress.disciples;
    const joiners = scene.lines.flatMap((l) => l.joins ?? []);
    const cast = [...new Set([...scene.lines.map((l) => l.speaker), ...joined, ...joiners])]
      .filter((id) => !OFFSTAGE.includes(id) && characters[id]);
    const scale = Math.min(1, 6 / cast.length);
    cast.forEach((id, i) => {
      const x = W * (cast.length === 1 ? 0.5 : 0.2 + (i / (cast.length - 1)) * 0.6);
      const fig = this.makeFigure(x, FEET_Y, characters[id].color, characters[id].name).setScale(scale);
      if (joiners.includes(id) && !joined.includes(id) && !scene.lines.some((l) => l.speaker === id)) fig.setAlpha(0);
      this.figures.set(id, fig);
    });
    this.shadow = this.add.rectangle(0, 0, W, this.scale.height, 0x1a1028, 0.45).setOrigin(0).setAlpha(0);

    // Top bar: menu on the left, dialogue controls and Scripture on the right.
    makeButton(this, 70, 54, '☰', () => {
      stopSpeaking();
      openMenu(this, this.slotIndex, () => this.box?.replay());
    }, { width: 100, height: 84, fontSize: 44 });
    this.add.text(140, 54, scene.title, {
      fontFamily: FONT, fontSize: '28px', color: '#fff8e6', fontStyle: 'bold', stroke: '#2b1d12', strokeThickness: 6,
    }).setOrigin(0, 0.5);

    const bw = W < 1450 ? 96 : 112;
    let x = W - 20 - bw / 2;
    const opts = { width: bw, height: 84, fontSize: 30 };
    makeButton(this, x, 54, '📜', () => this.openScripture(scene), { ...opts, fontSize: 40 });
    x -= bw + 12;
    makeButton(this, x, 54, '🗺', () => this.scene.start('Map', { slot: this.slotIndex, back: 'Story' }), { ...opts, fontSize: 40 });
    x -= bw + 12;
    const auto = makeButton(this, x, 54, this.settings.autoAdvance ? ui.auto : ui.tap, () => {
      this.settings.autoAdvance = !this.settings.autoAdvance;
      saveSettings(this.settings);
      auto.setLabel(this.settings.autoAdvance ? ui.auto : ui.tap);
      if (this.box) { this.box.autoAdvance = this.settings.autoAdvance; this.box.refreshMode(); }
    }, opts);
    x -= bw + 12;
    const speed = makeButton(this, x, 54, SPEED_ICON[this.settings.speed], () => {
      this.settings.speed = SPEEDS[(SPEEDS.indexOf(this.settings.speed) + 1) % SPEEDS.length];
      saveSettings(this.settings);
      speed.setLabel(SPEED_ICON[this.settings.speed]);
      if (this.box) this.box.speed = this.rate;
    }, { ...opts, fontSize: 40 });
    x -= bw + 12;
    makeButton(this, x, 54, '⏭', () => this.box?.skip(), { ...opts, fontSize: 40 });
    x -= bw + 12;
    makeButton(this, x, 54, '⟲', () => this.box?.replay(), { ...opts, fontSize: 44 });

    this.box = new DialogueBox(this);
    this.box.autoAdvance = this.settings.autoAdvance;
    this.box.speed = this.rate;
    this.box.setVisible(false);
  }

  private makeFigure(x: number, feetY: number, color: string, name: string): Phaser.GameObjects.Container {
    const c = Phaser.Display.Color.HexStringToColor(color).color;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25).fillEllipse(0, 0, 90, 18);
    g.fillStyle(c, 1).fillTriangle(-42, 0, 42, 0, 0, -130);
    g.fillStyle(c, 1).fillRoundedRect(-30, -120, 60, 60, 20);
    g.fillStyle(0xc99a6e, 1).fillCircle(0, -140, 24);
    const label = this.add.text(0, -172, name, {
      fontFamily: FONT, fontSize: '22px', color: '#fff8e6', fontStyle: 'bold', stroke: '#2b1d12', strokeThickness: 5,
    }).setOrigin(0.5, 1);
    return this.add.container(x, feetY, [g, label]);
  }

  private async banner(scene: SceneData): Promise<void> {
    const W = this.scale.width;
    const loc = locations[scene.location];
    const t = this.add.text(W / 2, 260, `${fill(ui.continueFrom, { n: this.chapter.number })}: ${this.chapter.title}\n${loc?.name ?? ''}`, {
      fontFamily: FONT, fontSize: '42px', color: '#fff8e6', fontStyle: 'bold', align: 'center',
      stroke: '#2b1d12', strokeThickness: 8, lineSpacing: 10,
    }).setOrigin(0.5).setDepth(40).setAlpha(0);
    await new Promise<void>((done) =>
      this.tweens.add({ targets: t, alpha: 1, duration: 600, hold: 1600, yoyo: true, onComplete: () => { t.destroy(); done(); } }),
    );
  }

  private async playLine(scene: SceneData, index: number): Promise<void> {
    const line = scene.lines[index];
    const who = characters[line.speaker];
    const short = translations.find((t) => t.id === this.tid)?.short ?? '';

    // The speaker gently bobs; the voice from heaven shines a light.
    const fig = this.figures.get(line.speaker);
    const bob = fig && this.tweens.add({ targets: fig, y: fig.y - 10, yoyo: true, repeat: -1, duration: 420 });
    if (line.speaker === 'voice-from-heaven') this.shine(true);
    if (line.speaker === 'tempter') this.tweens.add({ targets: this.shadow, alpha: 1, duration: 600 });

    this.box!.setVisible(true);
    await this.box!.play({
      speakerName: who.name,
      color: who.color,
      initials: who.initials,
      text: lineText(line, this.tid),
      kind: line.type,
      refLabel: line.type === 'scripture' ? `${line.ref} · ${short}` : undefined,
      pitch: who.voice.pitch,
      rate: who.voice.rate,
      audio: audioForLine(line.id, line.type === 'scripture', this.tid),
    });

    if (bob) { bob.stop(); fig!.y = FEET_Y; }
    if (line.speaker === 'voice-from-heaven') this.shine(false);
    if (line.speaker === 'tempter') this.tweens.add({ targets: this.shadow, alpha: 0, duration: 600 });
  }

  // A disciple starts following Jesus: show them and announce it.
  private async welcome(ids: string[]): Promise<void> {
    const p = this.slot.progress;
    for (const id of ids) {
      if (p.disciples.includes(id)) continue;
      p.disciples.push(id);
      this.save();
      const fig = this.figures.get(id);
      if (fig) this.tweens.add({ targets: fig, alpha: 1, duration: 700 });
      const msg = fill(ui.joined, { name: characters[id].name });
      const t = this.add.text(this.scale.width / 2, 200, `✦ ${msg} ✦`, {
        fontFamily: FONT, fontSize: '40px', color: '#fff4d6', fontStyle: 'bold', stroke: '#3b2410', strokeThickness: 8,
        align: 'center', wordWrap: { width: this.scale.width - 100 },
      }).setOrigin(0.5).setDepth(40).setAlpha(0);
      speak(msg, { rate: this.rate });
      await new Promise<void>((done) =>
        this.tweens.add({ targets: t, alpha: 1, duration: 500, hold: 2000, yoyo: true, onComplete: () => { t.destroy(); done(); } }),
      );
    }
  }

  // A short note, e.g. where the Gospels tell events in a different order.
  private showNote(note: string): Promise<void> {
    return new Promise((resolve) => {
      const W = this.scale.width;
      const layer = this.add.container(0, 0).setDepth(45);
      const w = Math.min(900, W - 80);
      const body = this.add.text(W / 2, 250, note, {
        fontFamily: FONT, fontSize: '30px', color: '#2b1d12', align: 'center', wordWrap: { width: w - 80 }, lineSpacing: 6,
      }).setOrigin(0.5, 0);
      const h = body.height + 230;
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.35).fillRoundedRect(W / 2 - w / 2 + 5, 160 + 7, w, h, 22);
      g.fillStyle(0xe9dcc0, 1).fillRoundedRect(W / 2 - w / 2, 160, w, h, 22);
      g.lineStyle(4, 0x8f8270, 1).strokeRoundedRect(W / 2 - w / 2, 160, w, h, 22);
      const title = this.add.text(W / 2, 205, `ⓘ ${ui.note}`, {
        fontFamily: FONT, fontSize: '32px', color: '#5a3a1c', fontStyle: 'bold',
      }).setOrigin(0.5);
      const ok = makeButton(this, W / 2, 160 + h - 65, ui.ok, () => { stopSpeaking(); layer.destroy(); resolve(); }, {
        width: 200, height: 84,
      });
      layer.add([g, title, body, ok]);
      speak(`${ui.note}. ${note}`, { rate: this.rate });
    });
  }

  private shine(on: boolean): void {
    const g = this.heavenLight!;
    const W = this.scale.width;
    const target = this.figures.get('jesus');
    const x = target?.x ?? W / 2;
    g.clear();
    g.fillStyle(0xfff3c4, 0.35).fillTriangle(x - 120, 0, x + 120, 0, x, 460);
    g.fillStyle(0xffffff, 0.25).fillTriangle(x - 50, 0, x + 50, 0, x, 460);
    this.tweens.add({ targets: g, alpha: on ? 1 : 0, duration: 800 });
  }

  private async openScripture(scene: SceneData): Promise<void> {
    stopSpeaking();
    const view = (tid: TranslationId): PassageView => ({
      title: scene.passage,
      verses: getVerses(scene.passage, tid),
      notice: translations.find((t) => t.id === tid)?.notice ?? '',
      translations,
      current: tid,
      onSwitch: async (id) => {
        const next = id as TranslationId;
        await loadTranslation(next);
        this.slot.translation = next;
        this.save();
        return view(next);
      },
    });
    await showPassage(view(this.tid));
    this.box?.replay();
  }

  private chapterEnd(): void {
    const p = this.slot.progress;
    if (!p.completed.includes(this.chapter.id)) p.completed.push(this.chapter.id);
    const nextId = chapterOrder[chapterOrder.indexOf(this.chapter.id) + 1];
    if (nextId) {
      p.chapter = nextId;
      p.scene = 0;
      p.step = 0;
    }
    this.save();

    this.tweens.killAll();
    this.children.removeAll(true);
    this.box = undefined;
    const W = this.scale.width;
    const H = this.scale.height;
    this.layers = drawBackdrop(this, 'jordan', 'dusk');
    const panelW = Math.min(1000, W - 60);
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.parchment, 1).fillRoundedRect(W / 2 - panelW / 2, 30, panelW, H - 60, 24);
    panel.lineStyle(5, COLORS.goldDark, 1).strokeRoundedRect(W / 2 - panelW / 2, 30, panelW, H - 60, 24);

    const mv = this.chapter.memoryVerse;
    // Kids learn a shorter part of the verse when one is given.
    const mvQuote = this.slot.difficulty === 'kids' && mv.kids ? mv.kids.quote : mv.quote;
    const verse = scriptureText(mv.ref, mvQuote, this.tid);
    addVerse(this.slot, mv.ref, mvQuote);
    this.save();
    const short = translations.find((t) => t.id === this.tid)?.short ?? '';
    const done = fill(ui.chapterComplete, { n: this.chapter.number });
    const text = (y: number, s: string, size: number, color = '#2b1d12', style = 'normal') =>
      this.add.text(W / 2, y, s, {
        fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: style, align: 'center', wordWrap: { width: panelW - 100 },
      }).setOrigin(0.5);

    text(90, `✦ ${done} ✦`, 46, '#2b1d12', 'bold');
    text(160, ui.memoryVerse, 28, '#7a4f17', 'bold');
    text(240, `“${verse}”`, 38, '#2b1d12', 'italic');
    text(315, `${mv.ref} · ${short}`, 26, '#7a4f17', 'bold');
    text(380, ui.reflect, 26, '#7a4f17', 'bold');
    text(440, this.chapter.reflect, 28);

    const readAll = () => speak(`${done} ${ui.memoryVerse}. ${mv.ref}. ${verse} ${ui.reflect}. ${this.chapter.reflect}`, { rate: this.rate });
    // A row of buttons along the bottom, centered.
    const row: [string, () => void, number][] = [
      ['🔊', readAll, 110],
      ['🗺', () => this.scene.start('Map', { slot: this.slotIndex, back: 'Story', animate: true }), 110],
      [ui.backToTitle, () => this.scene.start('Title'), 320],
    ];
    if (nextId) row.push([`${ui.nextChapter} ▶`, () => this.scene.restart({ slot: this.slotIndex }), 290]);
    let bx = W / 2 - (row.reduce((n, [, , w]) => n + w, 0) + 20 * (row.length - 1)) / 2;
    for (const [label, fn, w] of row) {
      makeButton(this, bx + w / 2, 590, label, fn, { width: w, height: 96, fontSize: label.length > 2 ? 32 : 44 });
      bx += w + 20;
    }
    if (!nextId) text(670, ui.comingSoon, 24, '#5a3a1c', 'italic');
    readAll();
  }
}
