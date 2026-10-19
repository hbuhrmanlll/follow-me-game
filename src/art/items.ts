import Phaser from 'phaser';

// Small objects drawn in the same outlined style as the people: things to find
// on quests, and the markers above villagers. Each is drawn around (0, 0),
// sitting on the ground at y = 0, about 50 units tall.

export type ItemKind = 'egg' | 'jar' | 'flatbread' | 'lamb' | 'fish' | 'bread' | 'grapes' | 'lamp' | 'olive' | 'lily';
export const ITEM_KINDS: ItemKind[] = ['egg', 'jar', 'flatbread', 'lamb', 'fish', 'bread', 'grapes', 'lamp', 'olive', 'lily'];

const INK = 0x2a1a10;

export function drawItem(scene: Phaser.Scene, kind: ItemKind, x: number, y: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics({ x, y });
  const line = (w = 2.5) => g.lineStyle(w, INK, 0.95);
  switch (kind) {
    case 'egg':
      g.fillStyle(0xf4ead2, 1).fillEllipse(0, -18, 26, 34); line().strokeEllipse(0, -18, 26, 34);
      g.fillStyle(0xffffff, 0.7).fillEllipse(-5, -25, 7, 10);
      break;
    case 'jar':
      g.fillStyle(0xb8683a, 1).fillEllipse(0, -22, 40, 42).fillRect(-9, -50, 18, 12); line().strokeEllipse(0, -22, 40, 42).strokeRect(-9, -50, 18, 12);
      g.fillStyle(0x8a4a22, 1).fillRect(-12, -54, 24, 6); line(2).strokeRect(-12, -54, 24, 6);
      g.lineStyle(2, 0xe8b07a, 0.8).lineBetween(-16, -24, 16, -24);
      g.fillStyle(0xffffff, 0.25).fillEllipse(-9, -30, 8, 16);
      break;
    case 'flatbread':
      g.fillStyle(0xe2b56a, 1).fillEllipse(0, -10, 50, 20); line().strokeEllipse(0, -10, 50, 20);
      g.fillStyle(0xa8743a, 1); for (const [dx, dy] of [[-10, -12], [6, -8], [12, -14], [-2, -6]]) g.fillCircle(dx, dy, 2);
      break;
    case 'bread':
      g.fillStyle(0xd09a52, 1).fillEllipse(0, -16, 46, 30); line().strokeEllipse(0, -16, 46, 30);
      g.lineStyle(2, 0x8a5a22, 1).lineBetween(-10, -24, -4, -10).lineBetween(2, -26, 8, -12);
      g.fillStyle(0xffffff, 0.3).fillEllipse(-8, -24, 14, 6);
      break;
    case 'fish':
      g.fillStyle(0x9aa8b4, 1).fillEllipse(0, -14, 46, 20).fillTriangle(-20, -14, -36, -26, -36, -2);
      line().strokeEllipse(0, -14, 46, 20).strokeTriangle(-20, -14, -36, -26, -36, -2);
      g.fillStyle(0xffffff, 0.4).fillEllipse(4, -19, 24, 5);
      g.fillStyle(INK, 1).fillCircle(13, -16, 2.5);
      break;
    case 'lamb':
      g.fillStyle(INK, 1).fillRect(-12, -14, 5, 14).fillRect(8, -14, 5, 14);
      g.fillStyle(0xfaf6ec, 1);
      for (const [dx, dy, r] of [[-12, -24, 11], [0, -28, 12], [12, -24, 11], [0, -18, 11]]) g.fillCircle(dx, dy, r);
      line(2); for (const [dx, dy, r] of [[-12, -24, 11], [0, -28, 12], [12, -24, 11]]) g.strokeCircle(dx, dy, r);
      g.fillStyle(0x4a3a30, 1).fillEllipse(24, -30, 14, 16); line(2).strokeEllipse(24, -30, 14, 16);
      g.fillStyle(0xffffff, 1).fillCircle(26, -32, 2);
      break;
    case 'grapes':
      g.lineStyle(3, 0x5a3a1c, 1).lineBetween(0, -46, 2, -38);
      g.fillStyle(0x4a8a3a, 1).fillEllipse(8, -42, 14, 8);
      g.fillStyle(0x7a3a8a, 1);
      for (const [dx, dy] of [[-8, -34], [0, -34], [8, -34], [-4, -26], [4, -26], [0, -18]]) { g.fillCircle(dx, dy, 6); }
      line(1.5); for (const [dx, dy] of [[-8, -34], [0, -34], [8, -34], [-4, -26], [4, -26], [0, -18]]) g.strokeCircle(dx, dy, 6);
      g.fillStyle(0xffffff, 0.45).fillCircle(-2, -36, 2);
      break;
    case 'lamp':
      g.fillStyle(0xb06a3a, 1).fillEllipse(0, -12, 46, 20).fillTriangle(16, -14, 32, -18, 18, -6); line().strokeEllipse(0, -12, 46, 20);
      g.fillStyle(0x6a3a1a, 1).fillCircle(-2, -15, 5);
      g.fillStyle(0xffd27a, 1).fillEllipse(32, -26, 8, 14);
      g.fillStyle(0xfff3c4, 0.4).fillCircle(32, -26, 12);
      break;
    case 'olive':
      g.lineStyle(2, 0x5a3a1c, 1).lineBetween(-10, -40, 12, -30);
      g.fillStyle(0x6a8a4a, 1).fillEllipse(-2, -44, 16, 6).fillEllipse(10, -40, 14, 5);
      g.fillStyle(0x3a4a22, 1).fillEllipse(0, -20, 18, 24).fillEllipse(12, -18, 14, 20);
      line(2).strokeEllipse(0, -20, 18, 24).strokeEllipse(12, -18, 14, 20);
      g.fillStyle(0xffffff, 0.35).fillEllipse(-3, -25, 5, 8);
      break;
    case 'lily':
      g.lineStyle(3, 0x4a7a32, 1).lineBetween(0, 0, 0, -30);
      g.fillStyle(0x5a8a3a, 1).fillEllipse(-8, -12, 14, 6);
      g.fillStyle(0xfaf6ee, 1);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.fillEllipse(Math.cos(a) * 9, -38 + Math.sin(a) * 9, 14, 10); }
      g.fillStyle(0xf2c94c, 1).fillCircle(0, -38, 5);
      break;
  }
  return g;
}

// A round badge above a villager: "!" for a quest, "?" while you look, "✓" when done.
export function questMark(scene: Phaser.Scene, x: number, y: number): { obj: Phaser.GameObjects.Container; set(state: 'new' | 'looking' | 'done'): void } {
  const g = scene.add.graphics();
  const t = scene.add.text(0, -1, '!', { fontFamily: 'Georgia, serif', fontSize: '34px', color: '#2b1d12', fontStyle: 'bold' }).setOrigin(0.5);
  const c = scene.add.container(x, y, [g, t]);
  const set = (state: 'new' | 'looking' | 'done') => {
    const color = state === 'done' ? 0x7fd06a : state === 'looking' ? 0x9ac8f0 : 0xf2c94c;
    g.clear();
    g.fillStyle(0x000000, 0.3).fillCircle(2, 4, 24);
    g.fillStyle(color, 1).fillCircle(0, 0, 24);
    g.lineStyle(3, INK, 1).strokeCircle(0, 0, 24);
    g.fillStyle(color, 1).fillTriangle(-8, 20, 8, 20, 0, 34);
    g.lineStyle(3, INK, 1).lineBetween(-8, 22, 0, 34).lineBetween(0, 34, 8, 22);
    t.setText(state === 'done' ? '✓' : state === 'looking' ? '?' : '!');
  };
  set('new');
  return { obj: c, set };
}
