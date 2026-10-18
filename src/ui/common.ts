import Phaser from 'phaser';
import { sfx } from '../systems/audio';

export const COLORS = {
  parchment: 0xf3e6c8,
  ink: 0x2b1d12,
  gold: 0xd9a441,
  goldDark: 0x9c6b1f,
  green: 0x7fb069,
  muted: 0xb8ab94,
};

export const FONT = 'Georgia, "Times New Roman", serif';

export interface ButtonOptions { width?: number; height?: number; fontSize?: number; fill?: number }

// A big, touch-friendly button.
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onTap: () => void,
  opts: ButtonOptions = {},
): Phaser.GameObjects.Container & { setLabel(s: string): void; setFill(c: number): void } {
  const width = opts.width ?? 380;
  const height = opts.height ?? 100;
  let fill = opts.fill ?? COLORS.gold;
  const bg = scene.add.graphics();
  const draw = (color: number) => {
    bg.clear();
    bg.fillStyle(0x000000, 0.35).fillRoundedRect(-width / 2 + 4, -height / 2 + 6, width, height, 20);
    bg.fillStyle(color, 1).fillRoundedRect(-width / 2, -height / 2, width, height, 20);
    bg.lineStyle(4, COLORS.goldDark, 1).strokeRoundedRect(-width / 2, -height / 2, width, height, 20);
  };
  draw(fill);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONT, fontSize: `${opts.fontSize ?? 40}px`, color: '#2b1d12', fontStyle: 'bold',
      align: 'center', wordWrap: { width: width - 30 },
    })
    .setOrigin(0.5);
  const box = scene.add.container(x, y, [bg, text]).setSize(width, height) as ReturnType<typeof makeButton>;
  box.setLabel = (s: string) => text.setText(s);
  box.setFill = (c: number) => { fill = c; draw(c); };
  box.setInteractive({ useHandCursor: true });
  box.on('pointerdown', () => { draw(Phaser.Display.Color.ValueToColor(fill).brighten(15).color); box.setScale(0.96); });
  box.on('pointerout', () => { draw(fill); box.setScale(1); });
  box.on('pointerup', () => { draw(fill); box.setScale(1); });
  whenTapped(box, () => { sfx('tap'); onTap(); });
  return box;
}

// Runs `fn` when a tap both starts and ends on `obj`. This ignores taps on
// pop-up windows that happen to end above a game button underneath them.
export function whenTapped(obj: Phaser.GameObjects.GameObject, fn: () => void): void {
  let pressed = false;
  obj.on('pointerdown', () => { pressed = true; });
  obj.on('pointerout', () => { pressed = false; });
  obj.on('pointerup', () => {
    if (!pressed) return;
    pressed = false;
    fn();
  });
}

// A round portrait: the character's picture if there is one (see ART_GUIDE.md),
// otherwise their color with their initials.
export function makePortrait(scene: Phaser.Scene, x: number, y: number, radius: number): {
  container: Phaser.GameObjects.Container;
  set(color: string, initials: string, texture?: string | null): void;
} {
  const g = scene.add.graphics();
  const label = scene.add
    .text(0, 0, '', { fontFamily: FONT, fontSize: `${Math.round(radius * 0.8)}px`, color: '#fff8e6', fontStyle: 'bold' })
    .setOrigin(0.5);
  const picture = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
  // Pictures are cut to a circle. The portrait never moves, so the mask can stay put.
  const shape = scene.make.graphics({}, false).fillStyle(0xffffff).fillCircle(x, y, radius - 3);
  picture.setMask(shape.createGeometryMask());
  const ring = scene.add.graphics();
  const container = scene.add.container(x, y, [g, label, picture, ring]);
  return {
    container,
    set(color, initials, texture) {
      const c = Phaser.Display.Color.HexStringToColor(color).color;
      g.clear();
      g.fillStyle(0x000000, 0.3).fillCircle(4, 6, radius);
      g.fillStyle(c, 1).fillCircle(0, 0, radius);
      ring.clear().lineStyle(6, COLORS.parchment, 1).strokeCircle(0, 0, radius);
      label.setText(texture ? '' : initials);
      picture.setVisible(!!texture);
      if (texture) {
        picture.setTexture(texture);
        picture.setScale((radius * 2) / Math.min(picture.width, picture.height));
      }
    },
  };
}

export function showToast(scene: Phaser.Scene, message: string, y = 640): void {
  const t = scene.add
    .text(scene.scale.width / 2, y, message, {
      fontFamily: FONT, fontSize: '30px', color: '#2b1d12',
      backgroundColor: '#f3e6c8', padding: { x: 24, y: 12 },
      align: 'center', wordWrap: { width: scene.scale.width - 120 },
    })
    .setOrigin(0.5)
    .setDepth(100);
  scene.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 500, onComplete: () => t.destroy() });
}

// Redraw the scene when the screen size changes (rotating, going full screen).
export function restartOnResize(scene: Phaser.Scene, data?: object): void {
  const onResize = () => scene.scene.restart(data);
  scene.scale.on('resize', onResize);
  scene.events.once('shutdown', () => scene.scale.off('resize', onResize));
}
