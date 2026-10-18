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

// Colors for each place, blended with the time of day.
const LAND: Record<string, { far: number; mid: number; near: number }> = {
  wilderness: { far: 0xc9a77a, mid: 0xb08455, near: 0x8f6a42 },
  jerusalem: { far: 0xa9a07a, mid: 0x8f9a5e, near: 0x6f7f45 },
  galilee: { far: 0x7fa07a, mid: 0x5f8f4a, near: 0x447a36 },
};

export function drawBackdrop(scene: Phaser.Scene, backdrop: string, time: TimeOfDay = 'dawn'): Layer[] {
  const p = PALETTES[time];
  if (backdrop === 'jordan' || !LAND[backdrop]) return drawJordan(scene, p, time);

  // Shade the place's own colors darker at dusk and night.
  const dim = time === 'night' ? 0.35 : time === 'dusk' ? 0.7 : 1;
  const tint = (c: number) => Phaser.Display.Color.ValueToColor(c).darken((1 - dim) * 60).color;
  const land = LAND[backdrop];
  drawSky(scene, p, time);
  const layers: Layer[] = [{ obj: hills(scene, 380, tint(land.far), 1, 2), speed: 3 }];
  if (backdrop === 'jerusalem') {
    layers.push({ obj: hills(scene, 470, tint(land.mid), 2, 1), speed: 0 });
    layers.push({ obj: city(scene, tint(0xd8c8a0)), speed: 0 });
  } else if (backdrop === 'galilee') {
    layers.push({ obj: lake(scene, p.water), speed: 0 });
    layers.push({ obj: hills(scene, 540, tint(land.mid), 2, 3), speed: 7 });
    layers.push({ obj: figTree(scene, tint(0x3d6b2c)), speed: 0 });
  } else {
    layers.push({ obj: hills(scene, 470, tint(land.mid), 3, 1.5), speed: 7 });
    layers.push({ obj: rocks(scene, tint(0x7a5c3a)), speed: 14 });
  }
  layers.push({ obj: hills(scene, 600, tint(land.near), 3, 4), speed: 16 });
  return layers;
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
  drawSky(scene, p, time);
  return [
    { obj: hills(scene, 400, p.far, 1), speed: 3 },
    { obj: hills(scene, 470, p.mid, 2), speed: 7 },
    { obj: hills(scene, 560, p.near, 3), speed: 14 },
    { obj: river(scene, p.water), speed: 0 },
    { obj: reeds(scene), speed: 22 },
  ];
}

function drawSky(scene: Phaser.Scene, p: Palette, time: TimeOfDay): void {
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
}

// Scattered stones for the wilderness (drawn twice so the layer can wrap).
function rocks(scene: Phaser.Scene, color: number): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const g = scene.add.graphics();
  for (const offset of [0, W]) {
    for (let i = 0; i < 14; i++) {
      const x = offset + ((i * 131) % W);
      const y = 560 + ((i * 47) % 70);
      const r = 10 + ((i * 13) % 18);
      g.fillStyle(color, 1).fillEllipse(x, y, r * 2.2, r * 1.3);
      g.fillStyle(0xffffff, 0.12).fillEllipse(x - r * 0.3, y - r * 0.3, r, r * 0.5);
    }
  }
  return g;
}

// Jerusalem on its hill: a wall, flat-roofed houses and the temple.
function city(scene: Phaser.Scene, stone: number): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const g = scene.add.graphics();
  const cx = W * 0.62;
  const shade = Phaser.Display.Color.ValueToColor(stone).darken(18).color;
  for (let i = 0; i < 16; i++) {
    const x = cx - 520 + i * 62 + ((i * 17) % 20);
    const h = 40 + ((i * 29) % 40);
    g.fillStyle(i % 2 ? stone : shade, 1).fillRect(x, 440 - h, 54, h);
    g.fillStyle(0x3a2a1a, 0.6).fillRect(x + 20, 440 - h + 14, 12, 14);
  }
  g.fillStyle(shade, 1).fillRect(cx - 560, 420, 1100, 50);
  for (let x = cx - 560; x < cx + 540; x += 36) g.fillRect(x, 408, 20, 14);
  g.fillStyle(stone, 1).fillRect(cx - 120, 290, 240, 130);
  g.fillStyle(0xe8d9b0, 1).fillRect(cx - 70, 230, 140, 70);
  g.fillStyle(0xe2b84a, 1).fillRect(cx - 74, 222, 148, 10);
  g.fillStyle(0x3a2a1a, 0.7).fillRect(cx - 18, 250, 36, 50);
  g.fillStyle(stone, 1).fillRect(cx + 120, 250, 50, 170);
  return g;
}

function lake(scene: Phaser.Scene, color: number): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const g = scene.add.graphics();
  g.fillStyle(color, 1).fillRect(0, 420, W, 120);
  g.fillStyle(0xffffff, 0.35).fillRect(W * 0.2, 445, 90, 3).fillRect(W * 0.55, 470, 120, 3).fillRect(W * 0.8, 455, 70, 3);
  return g;
}

function figTree(scene: Phaser.Scene, leaf: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const x = scene.scale.width * 0.14;
  g.fillStyle(0x5a3d22, 1).fillRect(x - 12, 330, 24, 160);
  g.fillStyle(leaf, 1);
  for (const [dx, dy, r] of [[0, 300, 80], [-60, 330, 60], [60, 330, 60], [-30, 260, 55], [35, 265, 55]]) g.fillCircle(x + dx, dy, r);
  return g;
}

// Rolling hills drawn twice side by side so the layer can wrap seamlessly.
// seed must be a whole number so the two copies join without a seam; phase shifts the shape.
function hills(scene: Phaser.Scene, baseY: number, color: number, seed: number, phase = 0): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  for (const offset of [0, W]) {
    const pts: Phaser.Types.Math.Vector2Like[] = [{ x: offset, y: H }];
    for (let i = 0; i <= 80; i++) {
      const x = (i / 80) * W;
      const y = baseY
        - 40 * Math.sin((x / W) * Math.PI * 2 * seed + seed + phase)
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
