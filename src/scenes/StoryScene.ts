import Phaser from 'phaser';
import { COLORS, FONT, makeButton, restartOnResize, whenTapped } from '../ui/common';
import { drawBackdrop, driftLayers, type Layer } from '../art/backdrops';
import { DialogueBox } from '../ui/DialogueBox';
import { runPuzzle } from '../puzzles';
import { showPassage, showTalkTogether, type PassageView } from '../ui/dom';
import { speak, stopSpeaking } from '../systems/speech';
import {
  chapterOrder, characters, fill, getChapter, getVerses, lineText, loadTranslation, locations,
  disciples, scenePuzzles, scriptureText, translations, ui, type Chapter, type SceneData, type TranslationId,
} from '../systems/content';
import { addVerse } from '../systems/journal';
import { openMenu } from '../ui/menu';
import { audioForLine } from '../systems/voice';
import { checkAchievements, totalScrolls } from '../systems/achievements';
import { setMood, sfx, type Mood } from '../systems/audio';
import { artTexture, backdropArt, queueArt } from '../systems/art';
import { playCutscene, type CutsceneId } from '../cutscenes';
import { loadSettings, loadSlots, newSlot, saveSettings, saveSlot, type Settings, type Slot, type Speed } from '../systems/save';

const SPEEDS: Speed[] = ['slow', 'normal', 'fast'];
const SPEED_RATE: Record<Speed, number> = { slow: 0.75, normal: 1, fast: 1.25 };
const SPEED_ICON: Record<Speed, string> = { slow: '🐢', normal: '🚶', fast: '🐇' };
const OFFSTAGE = ['narrator', 'voice-from-heaven', 'tempter'];
const FEET_Y = 440;

// Plays a chapter: each scene's dialogue, then its puzzle, saving as it goes
// so the game resumes exactly where the player left off.
export class StoryScene extends Phaser.Scene {
  private slotIndex = 0;
  private leader?: { chapter: string; scene: number }; // Leader Mode: nothing is saved
  private slot!: Slot;
  private settings!: Settings;
  private chapter!: Chapter;
  private layers: Layer[] = [];
  private box?: DialogueBox;
  private figures = new Map<string, Phaser.GameObjects.Container>();
  private heavenLight?: Phaser.GameObjects.Graphics;
  private shadow?: Phaser.GameObjects.Rectangle;
  private backRow = new Map<string, Phaser.GameObjects.Container>();
  private run = 0; // bumps when the scene restarts so old loops stop
  private stormStop?: () => void;

  constructor() {
    super('Story');
  }

  init(data: { slot?: number; leader?: { chapter: string; scene: number } }): void {
    this.leader = data.leader;
    this.slotIndex = data.slot ?? -1;
    if (this.leader) {
      // A temporary player who has met all twelve, so every scene looks complete.
      this.slot = newSlot(ui.leaderBadge, 'family');
      Object.assign(this.slot.progress, { chapter: this.leader.chapter, scene: this.leader.scene, step: 0 });
      this.slot.progress.disciples = disciples.order.filter((d) => this.leaderHasMet(d));
      if (Number(this.leader.chapter.slice(2)) > 21) this.slot.progress.departed = ['judas-iscariot'];
    } else {
      this.slot = loadSlots()[this.slotIndex]!;
    }
    this.settings = loadSettings();
    this.chapter = getChapter(this.slot.progress.chapter);
  }

  // Loads any finished pictures this chapter uses (see ART_GUIDE.md).
  preload(): void {
    const keys: string[] = [];
    for (const sc of this.chapter.scenes) {
      const art = backdropArt(sc.backdrop ?? locations[sc.location]?.backdrop ?? 'jordan', sc.timeOfDay);
      if (art) keys.push(art.key);
      for (const l of sc.lines) keys.push(`portraits/${l.speaker}`, `figures/${l.speaker}`);
    }
    for (const id of [...disciples.order, ...this.chapter.scenes.flatMap((sc) => sc.extras ?? [])]) keys.push(`figures/${id}`);
    queueArt(this, [...new Set(keys)]);
  }

  create(): void {
    restartOnResize(this, this.restartData());
    this.showLeaderBadge();
    const run = ++this.run;
    this.events.once('shutdown', () => { this.run++; stopSpeaking(); });
    // Android: the Back button opens the menu; leaving the app pauses the voice,
    // and coming back reads the current line again.
    const onBack = () => { if (this.box) this.openGameMenu(); };
    const onHidden = () => this.box?.halt();
    const onVisible = () => this.box?.replay();
    this.game.events.on('app-back', onBack);
    this.game.events.on('app-hidden', onHidden);
    this.game.events.on('app-visible', onVisible);
    this.events.once('shutdown', () => {
      this.game.events.off('app-back', onBack);
      this.game.events.off('app-hidden', onHidden);
      this.game.events.off('app-visible', onVisible);
    });
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

  private restartData(): object {
    return this.leader ? { leader: { chapter: this.slot.progress.chapter, scene: this.slot.progress.scene } } : { slot: this.slotIndex };
  }

  // In Leader Mode, disciples appear once the story has reached the chapter where they join.
  private leaderHasMet(id: string): boolean {
    const joinChapter: Record<string, number> = { peter: 3, andrew: 3, philip: 3, nathanael: 3, james: 7, john: 7, matthew: 8 };
    return Number(this.leader!.chapter.slice(2)) > (joinChapter[id] ?? 9);
  }

  private showLeaderBadge(): void {
    document.querySelector('.fm-leader')?.remove();
    if (!this.leader) return;
    const badge = document.createElement('div');
    badge.className = 'fm-leader';
    badge.textContent = `🎓 ${ui.leaderBadge}`;
    (document.fullscreenElement ?? document.body).appendChild(badge);
    this.events.once('shutdown', () => badge.remove());
  }

  private save(): void {
    if (this.leader) return;
    saveSlot(this.slotIndex, this.slot);
  }

  private async playFromSave(run: number): Promise<void> {
    const p = this.slot.progress;
    while (run === this.run && p.scene < this.chapter.scenes.length) {
      const scene = this.chapter.scenes[p.scene];
      if (p.visited[p.visited.length - 1] !== scene.location) p.visited.push(scene.location);
      this.buildStage(scene);
      // Coming back after the storm was stilled: keep it calm.
      if (scene.lines.slice(0, p.step).some((l) => l.cutscene === 'calm')) { this.stormStop?.(); setMood('peace'); }
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
    this.stormStop = undefined;
    const W = this.scale.width;
    const backdrop = scene.backdrop ?? locations[scene.location]?.backdrop ?? 'jordan';
    this.layers = drawBackdrop(this, backdrop, scene.timeOfDay);
    setMood(this.moodFor(scene, backdrop));

    this.heavenLight = this.add.graphics().setAlpha(0);

    // Placeholder figures. Everyone who speaks stands in front with a name;
    // disciples who are just following along stand behind, smaller.
    // Disciples following Jesus right now (Judas leaves at the Last Supper).
    const departed = this.slot.progress.departed;
    const joined = this.slot.progress.disciples.filter((d) => !departed.includes(d));
    const joiners = scene.lines.flatMap((l) => l.joins ?? []);
    const speakers = [...new Set([...scene.lines.map((l) => l.speaker), ...joiners])].filter((id) => !OFFSTAGE.includes(id) && characters[id]);
    // A scene can leave the disciples out (false) or name just the ones who were there.
    const others = Array.isArray(scene.companions) ? scene.companions : scene.companions === false ? [] : joined;
    const companions = others.filter((id) => !speakers.includes(id)).slice(0, 6);
    // People who are there but don't speak, like Moses and Elijah.
    for (const x of scene.extras ?? []) if (characters[x] && !speakers.includes(x)) speakers.push(x);
    this.backRow.clear();
    companions.forEach((id, i) => {
      const x = W * (0.15 + ((i + 0.5) / companions.length) * 0.7);
      this.backRow.set(id, this.makeFigure(x, FEET_Y - 30, id, '').setScale(0.7).setAlpha(0.9));
    });
    // At the cross, Jesus and the criminal beside Him aren't shown as standing figures; the crosses are part of the background.
    if (scene.staging === 'cross') speakers.splice(0, speakers.length, ...speakers.filter((id) => id !== 'jesus' && id !== 'criminal'));
    const scale = Math.min(1, 6 / speakers.length);
    speakers.forEach((id, i) => {
      const x = W * (speakers.length === 1 ? 0.5 : 0.22 + (i / (speakers.length - 1)) * 0.56);
      const fig = this.makeFigure(x, FEET_Y, id, characters[id].name).setScale(scale);
      if (joiners.includes(id) && !joined.includes(id) && !scene.lines.some((l) => l.speaker === id)) fig.setAlpha(0);
      this.figures.set(id, fig);
    });
    this.hideScroll(scene);
    if (scene.effect === 'transfigure') this.transfigure();
    if (scene.weather === 'storm') this.storm();
    this.shadow = this.add.rectangle(0, 0, W, this.scale.height, 0x1a1028, 0.45).setOrigin(0).setAlpha(0);

    // Top bar: menu on the left, dialogue controls and Scripture on the right.
    makeButton(this, 70, 54, '☰', () => this.openGameMenu(), { width: 100, height: 84, fontSize: 44 });
    this.add.text(140, 54, scene.title, {
      fontFamily: FONT, fontSize: '28px', color: '#fff8e6', fontStyle: 'bold', stroke: '#2b1d12', strokeThickness: 6,
    }).setOrigin(0, 0.5);

    const bw = W < 1450 ? 96 : 112;
    let x = W - 20 - bw / 2;
    const opts = { width: bw, height: 84, fontSize: 30 };
    makeButton(this, x, 54, '📜', () => this.openScripture(scene), { ...opts, fontSize: 40 });
    x -= bw + 12;
    if (!this.leader) makeButton(this, x, 54, '🗺', () => this.scene.start('Map', { slot: this.slotIndex, back: 'Story' }), { ...opts, fontSize: 40 });
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

  private openGameMenu(): void {
    stopSpeaking();
    // Coming back from the menu redraws the scene (settings may have changed) and replays the line.
    if (this.leader) { this.scene.start('Parents'); return; }
    openMenu(this, this.slotIndex, () => this.scene.restart({ slot: this.slotIndex }));
  }

  // Each scene hides one small scroll piece somewhere on the stage.
  private hideScroll(scene: SceneData): void {
    if (this.leader || this.slot.progress.scrolls.includes(scene.id)) return;
    let h = 0;
    for (const c of scene.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const W = this.scale.width;
    const x = W * (0.06 + ((h % 1000) / 1000) * 0.88);
    const y = 250 + ((h >> 10) % 170);
    const scroll = this.add.text(x, y, '📜', { fontSize: '38px' }).setOrigin(0.5).setAlpha(0.9).setAngle((h % 40) - 20);
    scroll.setInteractive({ hitArea: new Phaser.Geom.Circle(20, 22, 40), hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true });
    this.tweens.add({ targets: scroll, angle: scroll.angle + 6, yoyo: true, repeat: -1, duration: 1300 });
    whenTapped(scroll, () => {
      scroll.disableInteractive();
      const p = this.slot.progress;
      if (!p.scrolls.includes(scene.id)) p.scrolls.push(scene.id);
      this.tweens.add({ targets: scroll, y: 40, x: this.scale.width / 2, scale: 1.8, alpha: 0, duration: 900, onComplete: () => scroll.destroy() });
      sfx('scroll');
      this.announce(`📜 ${fill(ui.foundScroll, { n: p.scrolls.length, total: totalScrolls() })}`);
      const extra = this.celebrate();
      this.save();
      // The announcement interrupts the voice, so read the current line again afterwards.
      this.time.delayedCall(3200 * (extra + 1), () => this.box?.replay());
    });
  }

  // A message across the top of the screen, read aloud.
  private announce(msg: string, delay = 0): void {
    this.time.delayedCall(delay, () => {
      const t = this.add.text(this.scale.width / 2, 170, msg, {
        fontFamily: FONT, fontSize: '36px', color: '#fff4d6', fontStyle: 'bold', stroke: '#3b2410', strokeThickness: 8,
        align: 'center', wordWrap: { width: this.scale.width - 120 },
      }).setOrigin(0.5).setDepth(60).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 400, hold: 2400, yoyo: true, onComplete: () => t.destroy() });
      speak(msg.replace(/^\W+/, ''), { rate: this.rate });
    });
  }

  // Announce any achievements the player just earned.
  private celebrate(): number {
    if (this.leader) return 0;
    const fresh = checkAchievements(this.slot);
    fresh.forEach((a, i) => {
      this.time.delayedCall(3200 * (i + 1), () => sfx('achievement'));
      this.announce(`🏆 ${fill(ui.newAchievement, { title: a.title })}`, 3200 * (i + 1));
    });
    return fresh.length;
  }

  // Jesus shines with white light, robes as white as light (Matthew 17:2).
  private transfigure(): void {
    const fig = this.figures.get('jesus');
    if (!fig) return;
    const glow = this.add.graphics();
    glow.fillStyle(0xfffbe6, 0.25).fillCircle(0, -90, 150);
    glow.fillStyle(0xffffff, 0.35).fillCircle(0, -90, 100);
    glow.setPosition(fig.x, fig.y);
    this.children.moveBelow(glow as unknown as Phaser.GameObjects.GameObject, fig as unknown as Phaser.GameObjects.GameObject);
    const picture = fig.getData('picture') as Phaser.GameObjects.Image | undefined;
    if (picture) {
      // His clothes became as white as the light: a white glow over the picture.
      const shine = this.add.image(picture.x, picture.y, picture.texture.key).setOrigin(0.5, 1).setScale(picture.scale);
      shine.setTintFill(0xfffbe6).setAlpha(0.55);
      fig.addAt(shine, 2);
    } else {
      const robe = this.add.graphics();
      robe.fillStyle(0xffffff, 1).fillTriangle(-42, 0, 42, 0, 0, -130).fillRoundedRect(-30, -120, 60, 60, 20);
      robe.fillStyle(0xfff3c4, 1).fillCircle(0, -140, 24);
      fig.addAt(robe, 1);
    }
    this.tweens.add({ targets: glow, alpha: 0.6, yoyo: true, repeat: -1, duration: 1400 });
  }

  // Wind, rain and lightning on the sea.
  private storm(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const rain = this.add.graphics();
    const drops = Array.from({ length: 90 }, (_, i) => ({ x: (i * 173) % W, y: (i * 97) % H }));
    const draw = () => {
      rain.clear().lineStyle(2, 0xbfd8f0, 0.5);
      for (const d of drops) {
        d.x = (d.x - 6 + W) % W;
        d.y = (d.y + 22) % H;
        rain.lineBetween(d.x, d.y, d.x - 8, d.y + 22);
      }
    };
    const dark = this.add.rectangle(0, 0, W, H, 0x0a1020, 0.35).setOrigin(0);
    const rainTimer = this.time.addEvent({ delay: 40, loop: true, callback: draw });
    const flash = this.add.rectangle(0, 0, W, H, 0xffffff, 0).setOrigin(0);
    const flashTimer = this.time.addEvent({
      delay: 4500, loop: true,
      callback: () => {
        this.tweens.add({ targets: flash, fillAlpha: 0.35, duration: 80, yoyo: true, repeat: 1 });
        sfx('thunder');
      },
    });
    // The people sway with the boat.
    const sway = [...this.figures.values()].map((fig) =>
      this.tweens.add({ targets: fig, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' }));
    // "And the wind died down, and it was perfectly calm."
    this.stormStop = () => {
      rainTimer.remove();
      flashTimer.remove();
      sway.forEach((t) => t.stop());
      for (const fig of this.figures.values()) fig.angle = 0;
      this.tweens.add({ targets: [rain, dark], alpha: 0, duration: 1500 });
      this.stormStop = undefined;
    };
  }

  // The music for a scene: set in the chapter file, or chosen from the place and time.
  private moodFor(scene: SceneData, backdrop: string): Mood {
    if (scene.mood) return scene.mood;
    if (scene.weather === 'storm') return 'storm';
    if (scene.effect === 'transfigure') return 'wonder';
    if (scene.staging === 'cross' || backdrop === 'golgotha' || (backdrop === 'tomb' && scene.timeOfDay === 'dusk')) return 'sorrow';
    if (backdrop === 'tomb-open') return 'joy';
    if (scene.timeOfDay === 'night') return 'night';
    return scene.timeOfDay === 'midday' ? 'journey' : 'peace';
  }

  private makeFigure(x: number, feetY: number, id: string, name: string): Phaser.GameObjects.Container {
    const picture = artTexture(this, `figures/${id}`);
    if (picture) {
      // A finished picture of the person, standing with their feet on the ground.
      const shadow = this.add.graphics().fillStyle(0x000000, 0.25).fillEllipse(0, 0, 90, 18);
      const img = this.add.image(0, 4, picture).setOrigin(0.5, 1);
      img.setScale(190 / img.height);
      const label = this.add.text(0, -img.displayHeight - 6, name, {
        fontFamily: FONT, fontSize: '22px', color: '#fff8e6', fontStyle: 'bold', stroke: '#2b1d12', strokeThickness: 5,
      }).setOrigin(0.5, 1);
      return this.add.container(x, feetY, [shadow, img, label]).setData('picture', img);
    }
    const c = Phaser.Display.Color.HexStringToColor(characters[id].color).color;
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
    if (line.cutscene) {
      this.box!.setVisible(false);
      await playCutscene(this, line.cutscene as CutsceneId);
      if (line.cutscene === 'calm') this.stormStop?.();
    }
    const fig = this.figures.get(line.speaker);
    const bob = fig && this.tweens.add({ targets: fig, y: fig.y - 10, yoyo: true, repeat: -1, duration: 420 });
    if (line.speaker === 'voice-from-heaven') this.shine(true);
    if (line.speaker === 'tempter') this.tweens.add({ targets: this.shadow, alpha: 1, duration: 600 });

    if (line.action === 'ascend') this.ascend(!!line.cutscene);
    this.box!.setVisible(true);
    await this.box!.play({
      speakerName: who.name,
      color: who.color,
      initials: who.initials,
      portrait: artTexture(this, `portraits/${line.speaker}`),
      text: lineText(line, this.tid),
      kind: line.type,
      refLabel: line.type === 'scripture' ? `${line.ref} · ${short}` : undefined,
      pitch: who.voice.pitch,
      rate: who.voice.rate,
      audio: audioForLine(line.id, line.type === 'scripture', this.tid),
    });

    if (bob) { bob.stop(); if (line.action !== 'ascend') fig!.y = FEET_Y; }
    if (line.speaker === 'voice-from-heaven') this.shine(false);
    if (line.speaker === 'tempter') this.tweens.add({ targets: this.shadow, alpha: 0, duration: 600 });
    this.leave(line.leaves ?? []);
  }

  // A disciple leaves the group (Judas, John 13:30).
  private leave(ids: string[]): void {
    const p = this.slot.progress;
    for (const id of ids) {
      if (!p.departed.includes(id)) p.departed.push(id);
      const fig = this.backRow.get(id) ?? this.figures.get(id);
      if (fig) this.tweens.add({ targets: fig, alpha: 0, x: fig.x - 120, duration: 1500 });
    }
    this.save();
  }

  // Jesus is taken up into heaven and a cloud hides Him (Acts 1:9).
  private ascend(alreadyShown: boolean): void {
    const fig = this.figures.get('jesus');
    if (!fig) return;
    if (alreadyShown) { fig.setAlpha(0); return; } // the cutscene showed it
    const cloud = this.add.graphics().setAlpha(0);
    cloud.fillStyle(0xffffff, 0.9);
    for (const [dx, dy, r] of [[-60, 0, 50], [0, -20, 65], [60, 0, 50], [-20, 20, 45], [30, 22, 45]]) cloud.fillCircle(fig.x + dx, 140 + dy, r);
    this.tweens.add({ targets: fig, y: 170, duration: 3500, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: cloud, alpha: 1, delay: 2000, duration: 1500 });
    this.tweens.add({ targets: fig, alpha: 0, delay: 3000, duration: 1200 });
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
      sfx('join');
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
    setMood('peace');
    sfx('achievement');
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
    this.time.delayedCall(9000, () => { this.celebrate(); this.save(); });
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
    const talk = () => {
      stopSpeaking();
      showTalkTogether(this.chapter.title, this.chapter.discuss ?? [], this.chapter.prayer ?? '', (t) => speak(t, { rate: this.rate }));
    };
    const row: [string, () => void, number][] = [
      ['🔊', readAll, 110],
      [`💬 ${ui.talkTogether}`, talk, 290],
      [ui.backToTitle, () => this.scene.start('Title'), 250],
    ];
    if (!this.leader) row.splice(1, 0, ['🗺', () => this.scene.start('Map', { slot: this.slotIndex, back: 'Story', animate: true }), 110]);
    else row[row.length - 1] = [ui.exitLeader, () => this.scene.start('Parents'), 300];
    if (nextId) row.push([`${ui.nextChapter} ▶`, () => this.scene.restart(this.leader ? { leader: { chapter: nextId, scene: 0 } } : { slot: this.slotIndex }), 260]);
    let bx = W / 2 - (row.reduce((n, [, , w]) => n + w, 0) + 20 * (row.length - 1)) / 2;
    for (const [label, fn, w] of row) {
      makeButton(this, bx + w / 2, 590, label, fn, { width: w, height: 96, fontSize: label.length > 2 ? 32 : 44 });
      bx += w + 20;
    }
    if (!nextId && !this.leader) {
      // The very end of the journey: the Good News.
      makeButton(this, W / 2, 680 - 30, `✝ ${ui.goodNews}`, () => this.scene.start('Ending', { slot: this.slotIndex }), { width: 360, height: 70, fontSize: 30 });
    }
    readAll();
  }
}
