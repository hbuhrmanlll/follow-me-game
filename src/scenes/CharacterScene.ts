import Phaser from 'phaser';
import { COLORS, FONT, makeButton, restartOnResize, whenTapped } from '../ui/common';
import { drawBackdrop } from '../art/backdrops';
import { Person, setPlayerLook } from '../art/people';
import { fill, ui } from '../systems/content';
import { loadSlots, saveSlot, type PlayerLook, type Slot } from '../systems/save';
import { speak } from '../systems/speech';
import { sfx, setMood } from '../systems/audio';
import { makeHud, type Hud } from '../ui/hud';
import { confetti, popText } from '../ui/celebrate';

// The character creator: the player picks how their own character looks.
// Some cloak colors are unlocked with coins earned in the game.

const SKINS = ['#c49a74', '#b08058', '#a8774e', '#8a5a38'];
const TUNICS = ['#ece4d0', '#e4d6b8', '#d6c6a2', '#c9b48f'];
const CLOAKS: [string, number][] = [
  ['#4a7aa8', 0], ['#c0603a', 0], ['#6a8f3a', 0], ['#7a4a8a', 0],
  ['#d9a441', 25], ['#2f8a8a', 50], ['#a8323a', 75], ['#2b2b5a', 100],
];
const HAIRS: Record<string, string> = { '#c49a74': '#4a3020', '#b08058': '#3a2618', '#a8774e': '#2a1a10', '#8a5a38': '#1c1410' };

export class CharacterScene extends Phaser.Scene {
  private slotIndex = 0;
  private slot!: Slot;
  private next = 'Story';
  private preview?: Person;
  private hud?: Hud;
  private redrawPanel?: () => void;

  constructor() {
    super('Character');
  }

  create(data: { slot: number; next?: string }): void {
    this.slotIndex = data.slot;
    this.next = data.next ?? 'Story';
    this.slot = loadSlots()[data.slot]!;
    restartOnResize(this, data);
    const W = this.scale.width;
    const H = this.scale.height;
    drawBackdrop(this, 'village', 'dawn');
    setMood('joy');
    this.add.rectangle(0, 0, W, H, 0x1b1410, 0.35).setOrigin(0);

    // A spotlight and pedestal for the preview
    const px = W * 0.3;
    const g = this.add.graphics();
    for (let i = 6; i >= 1; i--) g.fillStyle(0xfff3c4, 0.05).fillCircle(px, 420, 60 + i * 40);
    g.fillStyle(0x3a2a1c, 1).fillEllipse(px, 640, 300, 70);
    g.fillStyle(0x6a4a2a, 1).fillEllipse(px, 630, 290, 60);
    g.lineStyle(4, 0xd9a441, 1).strokeEllipse(px, 630, 290, 60);
    this.drawPreview();

    // The options card
    const cw = Math.min(620, W * 0.5);
    const cx = W * 0.72;
    const card = this.add.graphics();
    card.fillStyle(0x000000, 0.35).fillRoundedRect(cx - cw / 2 + 6, 28, cw, H - 50, 26);
    card.fillStyle(COLORS.parchment, 1).fillRoundedRect(cx - cw / 2, 20, cw, H - 50, 26);
    card.lineStyle(5, COLORS.goldDark, 1).strokeRoundedRect(cx - cw / 2, 20, cw, H - 50, 26);
    this.add.text(cx, 64, ui.character, { fontFamily: FONT, fontSize: '40px', color: '#2b1d12', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(cx, 104, this.slot.name, { fontFamily: FONT, fontSize: '26px', color: '#7a4f17', fontStyle: 'bold' }).setOrigin(0.5);

    const layer = this.add.container(0, 0);
    const label = (y: number, text: string) => layer.add(this.add.text(cx - cw / 2 + 36, y, text, {
      fontFamily: FONT, fontSize: '26px', color: '#5a3a1c', fontStyle: 'bold',
    }).setOrigin(0, 0.5));
    const redraw = () => {
      layer.removeAll(true);
      const look = this.slot.look;
      // Boy or girl
      label(160, '');
      (['m', 'f'] as const).forEach((sex, i) => {
        const on = look.sex === sex;
        const b = makeButton(this, cx - 95 + i * 190, 160, sex === 'm' ? `👦 ${ui.boy}` : `👧 ${ui.girl}`, () => this.change({ sex }), {
          width: 170, height: 70, fontSize: 28, fill: on ? COLORS.gold : 0xe9dcc0,
        });
        layer.add(b);
      });
      label(250, ui.skin);
      SKINS.forEach((c, i) => layer.add(this.swatch(cx - cw / 2 + 200 + i * 78, 250, c, look.skin === c, 0, () => this.change({ skin: c, hair: HAIRS[c] }))));
      label(345, ui.tunic);
      TUNICS.forEach((c, i) => layer.add(this.swatch(cx - cw / 2 + 200 + i * 78, 345, c, look.tunic === c, 0, () => this.change({ tunic: c }))));
      label(440, ui.cloak);
      CLOAKS.forEach(([c, price], i) => {
        const x = cx - cw / 2 + 200 + (i % 4) * 78;
        const y = 440 + Math.floor(i / 4) * 86;
        const locked = price > 0 && !this.slot.unlocked.includes(c);
        layer.add(this.swatch(x, y, c, look.mantle === c, locked ? price : 0, () => (locked ? this.buy(c, price) : this.change({ mantle: c }))));
      });
      layer.add(makeButton(this, cx, H - 80, `✓ ${ui.done}`, () => this.finish(), { width: 300, height: 86, fontSize: 34 }));
    };
    this.redrawPanel = redraw;
    redraw();
    this.hud = makeHud(this, 160, 54, this.slot, () => saveSlot(this.slotIndex, this.slot));
    speak(ui.character);
  }

  // A round color button; locked ones show a lock and their price.
  private swatch(x: number, y: number, color: string, selected: boolean, price: number, onTap: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const col = Phaser.Display.Color.HexStringToColor(color).color;
    g.fillStyle(0x000000, 0.25).fillCircle(2, 4, 30);
    g.fillStyle(col, 1).fillCircle(0, 0, 30);
    g.lineStyle(selected ? 6 : 3, selected ? 0xd9a441 : 0x8f8270, 1).strokeCircle(0, 0, selected ? 34 : 30);
    c.add(g);
    if (selected) c.add(this.add.text(18, 16, '✓', { fontSize: '24px', color: '#2b8a3a', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 5 }).setOrigin(0.5));
    if (price) {
      g.fillStyle(0x000000, 0.45).fillCircle(0, 0, 30);
      c.add(this.add.text(0, -6, '🔒', { fontSize: '22px' }).setOrigin(0.5));
      c.add(this.add.text(0, 16, `🪙${price}`, { fontFamily: FONT, fontSize: '16px', color: '#ffe08a', fontStyle: 'bold' }).setOrigin(0.5));
    }
    c.setSize(70, 70).setInteractive({ useHandCursor: true });
    whenTapped(c, () => { sfx('tap'); onTap(); });
    return c;
  }

  private change(part: Partial<PlayerLook>): void {
    this.slot.look = { ...this.slot.look, ...part };
    saveSlot(this.slotIndex, this.slot);
    this.drawPreview(true);
    this.redrawPanel?.();
  }

  private buy(color: string, price: number): void {
    if (this.slot.coins < price) {
      const msg = fill(ui.needCoins, { n: price - this.slot.coins });
      speak(msg);
      void popText(this, this.scale.width / 2, 300, `🪙 ${price - this.slot.coins}+`, 50, '#ffd0a0');
      return;
    }
    this.slot.coins -= price;
    this.slot.unlocked.push(color);
    sfx('achievement');
    confetti(this, this.scale.width * 0.3, 380);
    void popText(this, this.scale.width * 0.3, 200, ui.unlocked, 44);
    speak(ui.unlocked);
    this.hud?.container.destroy();
    this.hud = makeHud(this, 160, 54, this.slot, () => saveSlot(this.slotIndex, this.slot));
    this.change({ mantle: color });
  }

  private drawPreview(bounce = false): void {
    this.preview?.destroy();
    setPlayerLook(this.slot.look);
    const p = new Person(this, 'player', this.scale.width * 0.3, 630);
    p.root.setScale(p.root.scaleX * 1.75);
    this.preview = p;
    if (bounce) p.cheer();
  }

  private finish(): void {
    saveSlot(this.slotIndex, this.slot);
    this.scene.start(this.next, { slot: this.slotIndex });
  }
}
