import Phaser from 'phaser';
import type { TimeOfDay } from '../systems/content';

// Placeholder backgrounds drawn with simple shapes. Each one is a stack of
// layers that drift at different speeds (parallax). When final art arrives,
// a backdrop can be swapped for image layers without changing the story files.

interface Palette { skyTop: number; skyBottom: number; sun: number; sunY: number; far: number; mid: number; near: number; water: number }

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: { skyTop: 0x2c3e6b, skyBottom: 0xf2b36b, sun: 0xfff0c0, sunY: 0.52, far: 0x9a7a8c, mid: 0x74805a, near: 0x4a6a3c, water: 0x4f86a8 },
  midday: { skyTop: 0x5b9bd5, skyBottom: 0xcfe6f2, sun: 0xfffbe6, sunY: 0.14, far: 0xa8a27a, mid: 0x7f9a52, near: 0x557d3a, water: 0x3f8fb8 },
  dusk: { skyTop: 0x3a2d5c, skyBottom: 0xe0805a, sun: 0xffc27a, sunY: 0.5, far: 0x6e5470, mid: 0x5a5e44, near: 0x3a4a2e, water: 0x46607a },
  night: { skyTop: 0x0b1028, skyBottom: 0x2a3560, sun: 0xeef2ff, sunY: 0.16, far: 0x2a2f4a, mid: 0x1f2b2a, near: 0x16201a, water: 0x1c3048 },
};

export interface Layer { obj: Phaser.GameObjects.Graphics; speed: number }

export function drawBackdrop(scene: Phaser.Scene, backdrop: string, time: TimeOfDay = 'dawn'): Layer[] {
  // Only the Jordan exists so far; other locations arrive in Phase 3.
  void backdrop;
  return drawJordan(scene, PALETTES[time], time);
}

// Call from a scene's update() to make the layers drift.
export function driftLayers(layers: Layer[], width: number, delta: number): void {
  for (const { obj, speed } of layers) {
    if (!speed) continue;
    obj.x -= (speed * delta) / 1000;
    if (obj.x <= -width) obj.x += width;
  }
}

function drawJordan(scene: Phaser.Scene, p: Palette, time: TimeOfDay): Layer[] {
  const W = scene.scale.width;
  const H = scene.scale.height;

  const sky = scene.add.graphics();
  sky.fillGradientStyle(p.skyTop, p.skyTop, p.skyBottom, p.skyBottom, 1).fillRect(0, 0, W, H);
  if (time === 'night') {
    sky.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 60; i++) sky.fillCircle((i * 977) % W, (i * 331) % (H * 0.5), (i % 3) * 0.6 + 0.8);
  }
  const sunX = W * 0.72;
  const sunY = H * p.sunY;
  sky.fillStyle(p.sun, 0.25).fillCircle(sunX, sunY, 110);
  sky.fillStyle(p.sun, 0.95).fillCircle(sunX, sunY, time === 'night' ? 40 : 60);

  return [
    { obj: hills(scene, 400, p.far, 1), speed: 3 },
    { obj: hills(scene, 470, p.mid, 2), speed: 7 },
    { obj: hills(scene, 560, p.near, 3), speed: 14 },
    { obj: river(scene, p.water), speed: 0 },
    { obj: reeds(scene), speed: 22 },
  ];
}

// Rolling hills drawn twice side by side so the layer can wrap seamlessly.
function hills(scene: Phaser.Scene, baseY: number, color: number, seed: number): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  for (const offset of [0, W]) {
    const pts: Phaser.Types.Math.Vector2Like[] = [{ x: offset, y: H }];
    for (let i = 0; i <= 80; i++) {
      const x = (i / 80) * W;
      const y = baseY
        - 40 * Math.sin((x / W) * Math.PI * 2 * seed + seed)
        - 20 * Math.sin((x / W) * Math.PI * 2 * (seed + 2));
      pts.push({ x: offset + x, y });
    }
    pts.push({ x: offset + W, y: H });
    g.fillPoints(pts, true);
  }
  return g;
}

function river(scene: Phaser.Scene, color: number): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const g = scene.add.graphics();
  const r = (f: number) => f * W;
  g.fillStyle(color, 1);
  g.fillPoints(
    [
      { x: 0, y: 650 }, { x: r(0.3), y: 638 }, { x: r(0.65), y: 646 }, { x: W, y: 632 },
      { x: W, y: 690 }, { x: r(0.65), y: 702 }, { x: r(0.3), y: 694 }, { x: 0, y: 708 },
    ],
    true,
  );
  g.fillStyle(0xbfe2f0, 0.6).fillRect(r(0.25), 660, 120, 4).fillRect(r(0.6), 672, 90, 4);
  return g;
}

function reeds(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const g = scene.add.graphics();
  g.lineStyle(5, 0x2b1d12, 0.85);
  for (const offset of [0, W]) {
    for (let x = 10; x < W - 5; x += 37) {
      const h = 50 + ((x * 7) % 45);
      g.lineBetween(offset + x, H, offset + x + ((x % 3) - 1) * 8, H - h);
    }
  }
  return g;
}
