import Phaser from 'phaser';

export const COLORS = {
  parchment: 0xf3e6c8,
  ink: 0x2b1d12,
  gold: 0xd9a441,
  goldDark: 0x9c6b1f,
};

export const FONT = 'Georgia, "Times New Roman", serif';

// A big, touch-friendly button (at least 96px tall on the 720px-high design).
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onTap: () => void,
  width = 380,
  height = 100,
): Phaser.GameObjects.Container {
  const bg = scene.add.graphics();
  const draw = (fill: number) => {
    bg.clear();
    bg.fillStyle(0x000000, 0.35).fillRoundedRect(-width / 2 + 4, -height / 2 + 6, width, height, 22);
    bg.fillStyle(fill, 1).fillRoundedRect(-width / 2, -height / 2, width, height, 22);
    bg.lineStyle(4, COLORS.goldDark, 1).strokeRoundedRect(-width / 2, -height / 2, width, height, 22);
  };
  draw(COLORS.gold);
  const text = scene.add
    .text(0, 0, label, { fontFamily: FONT, fontSize: '40px', color: '#2b1d12', fontStyle: 'bold' })
    .setOrigin(0.5);
  const box = scene.add.container(x, y, [bg, text]).setSize(width, height);
  box.setInteractive({ useHandCursor: true });
  box.on('pointerdown', () => { draw(0xf0c060); box.setScale(0.96); });
  box.on('pointerout', () => { draw(COLORS.gold); box.setScale(1); });
  box.on('pointerup', () => { draw(COLORS.gold); box.setScale(1); onTap(); });
  return box;
}
