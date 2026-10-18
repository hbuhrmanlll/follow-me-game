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
  village: { far: 0x9aa07a, mid: 0x7f8f52, near: 0x5f7a3e },
  well: { far: 0xb0a07a, mid: 0x8f8a52, near: 0x6f7a42 },
  lake: { far: 0x7f9a8a, mid: 0x5f8a5a, near: 0x8a7a5a },
  mountain: { far: 0x8aa07a, mid: 0x6a9050, near: 0x4f7a3a },
  cliff: { far: 0x9a9a8a, mid: 0x6f8a52, near: 0x4f7a3a },
  olives: { far: 0x8a9a7a, mid: 0x6a7a4a, near: 0x4a5a32 },
  courtyard: { far: 0x8a7a6a, mid: 0x7a6a5a, near: 0x6a5a4a },
  golgotha: { far: 0x7a6a5a, mid: 0x6a5a48, near: 0x5a4a3a },
  tomb: { far: 0x8a9a7a, mid: 0x6a8a52, near: 0x4f7a3a },
  'tomb-open': { far: 0x8a9a7a, mid: 0x6a8a52, near: 0x4f7a3a },
};

export function drawBackdrop(scene: Phaser.Scene, backdrop: string, time: TimeOfDay = 'dawn'): Layer[] {
  const p = PALETTES[time];
  if (backdrop === 'room') return drawRoom(scene);
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
  } else if (backdrop === 'village') {
    layers.push({ obj: hills(scene, 470, tint(land.mid), 2, 1), speed: 4 });
    layers.push({ obj: houses(scene, tint(0xd9c9a0)), speed: 0 });
  } else if (backdrop === 'well') {
    layers.push({ obj: hills(scene, 470, tint(land.mid), 3, 2), speed: 6 });
    layers.push({ obj: well(scene, tint(0xb9a37a)), speed: 0 });
  } else if (backdrop === 'lake') {
    layers.push({ obj: lake(scene, p.water, 300, 140), speed: 0 });
    layers.push({ obj: boats(scene, tint(0x6a4a2a)), speed: 0 });
    layers.push({ obj: shore(scene, tint(land.near)), speed: 0 });
    return layers;
  } else if (backdrop === 'olives') {
    layers.push({ obj: hills(scene, 470, tint(land.mid), 2, 2), speed: 0 });
    layers.push({ obj: oliveTrees(scene, tint(0x5a6a3a), tint(0x4a3a2a)), speed: 0 });
  } else if (backdrop === 'courtyard') {
    layers.push({ obj: courtyard(scene, tint(0xb9a98a), time === 'night'), speed: 0 });
    return layers;
  } else if (backdrop === 'golgotha') {
    layers.push({ obj: crosses(scene, tint(land.mid)), speed: 0 });
  } else if (backdrop === 'tomb' || backdrop === 'tomb-open') {
    layers.push({ obj: tomb(scene, tint(0xa8987a), backdrop === 'tomb-open', time === 'dawn'), speed: 0 });
  } else if (backdrop === 'cliff') {
    layers.push({ obj: cliff(scene, tint(0x9a8a7a)), speed: 0 });
  } else if (backdrop === 'mountain') {
    layers.push({ obj: bigHill(scene, tint(land.mid)), speed: 0 });
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

function lake(scene: Phaser.Scene, color: number, top = 420, height = 120): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const g = scene.add.graphics();
  g.fillStyle(color, 1).fillRect(0, top, W, height);
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

// Flat-roofed stone houses, like a Galilean village.
function houses(scene: Phaser.Scene, stone: number): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const g = scene.add.graphics();
  const shade = Phaser.Display.Color.ValueToColor(stone).darken(15).color;
  for (let i = 0; i < 9; i++) {
    const x = (i * W) / 9 + ((i * 37) % 40) - 20;
    const w = 120 + ((i * 53) % 60);
    const h = 70 + ((i * 31) % 50);
    const base = 470 + ((i * 17) % 30);
    g.fillStyle(i % 2 ? stone : shade, 1).fillRect(x, base - h, w, h);
    g.fillStyle(0x6a4a2a, 1).fillRect(x - 6, base - h - 8, w + 12, 10); // flat roof
    g.fillStyle(0x3a2a1a, 0.75).fillRect(x + w / 2 - 14, base - 46, 28, 46); // door
    g.fillStyle(0x3a2a1a, 0.6).fillRect(x + 14, base - h + 18, 16, 14); // window
  }
  // A palm tree
  const px = W * 0.86;
  g.fillStyle(0x6a4a2a, 1).fillRect(px - 8, 300, 16, 180);
  g.fillStyle(0x3d6b2c, 1);
  for (const a of [-2.4, -1.9, -1.2, -0.7]) g.fillTriangle(px, 300, px + Math.cos(a) * 90, 300 + Math.sin(a) * 40 + 40, px + Math.cos(a) * 70, 300 + Math.sin(a) * 40 + 55);
  for (const a of [-2.4, -1.9, -1.2, -0.7]) g.fillTriangle(px, 300, px - Math.cos(a) * 90, 300 + Math.sin(a) * 40 + 40, px - Math.cos(a) * 70, 300 + Math.sin(a) * 40 + 55);
  return g;
}

// A stone well, like Jacob's well.
function well(scene: Phaser.Scene, stone: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const x = scene.scale.width * 0.18;
  g.fillStyle(Phaser.Display.Color.ValueToColor(stone).darken(20).color, 1).fillEllipse(x, 470, 220, 50);
  g.fillStyle(stone, 1).fillRect(x - 100, 390, 200, 80);
  g.fillStyle(0x2a2a3a, 1).fillEllipse(x, 392, 190, 34);
  g.fillStyle(0x6a4a2a, 1).fillRect(x - 90, 300, 12, 95).fillRect(x + 78, 300, 12, 95).fillRect(x - 95, 296, 190, 12);
  g.fillStyle(0xb06a3a, 1).fillRoundedRect(x + 20, 330, 40, 50, 12); // a water jar
  return g;
}

// Fishing boats with nets.
function boats(scene: Phaser.Scene, wood: number): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const g = scene.add.graphics();
  for (const [fx, y, s] of [[0.1, 370, 0.8], [0.58, 340, 0.55], [0.88, 380, 0.7]] as const) {
    const x = W * fx;
    g.fillStyle(wood, 1).fillPoints([{ x: x - 110 * s, y }, { x: x + 110 * s, y }, { x: x + 80 * s, y: y + 40 * s }, { x: x - 80 * s, y: y + 40 * s }], true);
    g.fillStyle(0x5a3a1a, 1).fillRect(x - 4 * s, y - 130 * s, 8 * s, 130 * s);
    g.fillStyle(0xe9dcc0, 0.95).fillTriangle(x + 6 * s, y - 125 * s, x + 6 * s, y - 20 * s, x + 80 * s, y - 20 * s);
    g.lineStyle(2, 0xd8c8a0, 0.7);
    for (let k = 0; k < 5; k++) g.lineBetween(x - 100 * s + k * 12 * s, y + 4, x - 130 * s + k * 10 * s, y + 50 * s);
  }
  return g;
}

function shore(scene: Phaser.Scene, sand: number): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const g = scene.add.graphics();
  g.fillStyle(sand, 1).fillPoints([{ x: 0, y: 425 }, { x: W * 0.4, y: 412 }, { x: W, y: 430 }, { x: W, y: H }, { x: 0, y: H }], true);
  return g;
}

// One broad hillside where crowds can sit.
function bigHill(scene: Phaser.Scene, grass: number): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const g = scene.add.graphics();
  const pts: Phaser.Types.Math.Vector2Like[] = [{ x: 0, y: H }];
  for (let i = 0; i <= 40; i++) {
    const x = (i / 40) * W;
    pts.push({ x, y: 300 + 220 * Math.pow((x - W * 0.55) / W, 2) * 2.2 });
  }
  pts.push({ x: W, y: H });
  g.fillStyle(grass, 1).fillPoints(pts, true);
  // People sitting on the slope, far away
  for (let i = 0; i < 40; i++) {
    const x = W * 0.1 + ((i * 97) % (W * 0.8));
    const y = 420 + ((i * 29) % 70);
    g.fillStyle([0xb5432f, 0x3a6aa8, 0xd9c9a0, 0x7a4a8a][i % 4], 0.8).fillCircle(x, y, 5);
  }
  return g;
}

// A tall rock cliff with a cave, like the one at Caesarea Philippi.
function cliff(scene: Phaser.Scene, rock: number): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const g = scene.add.graphics();
  const dark = Phaser.Display.Color.ValueToColor(rock).darken(20).color;
  g.fillStyle(rock, 1).fillPoints([
    { x: W * 0.45, y: 520 }, { x: W * 0.48, y: 200 }, { x: W * 0.58, y: 150 }, { x: W * 0.75, y: 170 },
    { x: W * 0.9, y: 140 }, { x: W, y: 180 }, { x: W, y: 520 },
  ], true);
  g.fillStyle(dark, 1).fillEllipse(W * 0.68, 380, 160, 200); // the cave
  g.lineStyle(3, dark, 0.6);
  for (let i = 0; i < 8; i++) g.lineBetween(W * (0.5 + i * 0.06), 180 + (i % 3) * 20, W * (0.52 + i * 0.06), 480);
  g.fillStyle(0x6fa6c2, 1).fillEllipse(W * 0.66, 510, 260, 30); // the spring below
  return g;
}

// Olive trees with twisted trunks, like the garden of Gethsemane.
function oliveTrees(scene: Phaser.Scene, leaf: number, bark: number): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const g = scene.add.graphics();
  for (const [fx, base, s] of [[0.08, 470, 1], [0.3, 440, 0.7], [0.72, 445, 0.75], [0.93, 475, 1.05]] as const) {
    const x = W * fx;
    g.fillStyle(bark, 1).fillTriangle(x - 18 * s, base, x + 18 * s, base, x + 6 * s, base - 110 * s);
    g.fillStyle(bark, 1).fillTriangle(x - 4 * s, base - 70 * s, x - 40 * s, base - 120 * s, x - 26 * s, base - 128 * s);
    g.fillStyle(leaf, 0.95);
    for (const [dx, dy, r] of [[0, -140, 60], [-50, -125, 45], [50, -120, 48], [-20, -175, 40], [30, -170, 42]]) g.fillCircle(x + dx * s, base + dy * s, r * s);
    g.fillStyle(0xb8c0a0, 0.25).fillCircle(x - 15 * s, base - 160 * s, 20 * s); // silvery leaves
  }
  return g;
}

// The upper room: stone walls, a low table, and oil lamps.
function drawRoom(scene: Phaser.Scene): Layer[] {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const g = scene.add.graphics();
  g.fillGradientStyle(0x3a2a1c, 0x3a2a1c, 0x5a4430, 0x5a4430, 1).fillRect(0, 0, W, H);
  g.lineStyle(2, 0x2a1c12, 0.6);
  for (let y = 40; y < 470; y += 46) for (let x = (y / 46) % 2 ? 0 : 60; x < W; x += 120) g.strokeRect(x, y, 120, 46);
  g.fillStyle(0x2a1c12, 1).fillRect(W * 0.62, 150, 120, 150); // window
  g.fillStyle(0x0b1028, 1).fillRect(W * 0.62 + 10, 160, 100, 130);
  g.fillStyle(0xeef2ff, 0.9).fillCircle(W * 0.62 + 70, 190, 14);
  g.fillStyle(0x4a3424, 1).fillRect(0, 470, W, H - 470); // floor
  g.fillStyle(0x6a4a2a, 1).fillRoundedRect(W * 0.2, 440, W * 0.6, 30, 8); // low table
  for (const fx of [0.12, 0.88]) {
    const x = W * fx;
    const lamp = scene.add.graphics();
    lamp.fillStyle(0xffd27a, 0.18).fillCircle(x, 320, 90);
    lamp.fillStyle(0xb06a3a, 1).fillEllipse(x, 350, 50, 20);
    lamp.fillStyle(0xffd27a, 1).fillEllipse(x + 18, 334, 10, 18);
    scene.tweens.add({ targets: lamp, alpha: 0.8, yoyo: true, repeat: -1, duration: 900 + fx * 400 });
  }
  return [];
}

// A walled courtyard with a charcoal fire.
function courtyard(scene: Phaser.Scene, stone: number, night: boolean): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const g = scene.add.graphics();
  const shade = Phaser.Display.Color.ValueToColor(stone).darken(20).color;
  g.fillStyle(stone, 1).fillRect(0, 200, W, 280);
  g.lineStyle(2, shade, 0.7);
  for (let y = 200; y < 480; y += 40) g.lineBetween(0, y, W, y);
  g.fillStyle(shade, 1).fillRoundedRect(W * 0.42, 260, 160, 220, { tl: 80, tr: 80, bl: 0, br: 0 }); // gateway
  g.fillStyle(0x6a5a48, 1).fillRect(0, 480, W, H - 480);
  if (night) {
    const x = W * 0.8;
    g.fillStyle(0xff9a3a, 0.2).fillCircle(x, 450, 110);
    g.fillStyle(0x3a2a1a, 1).fillEllipse(x, 470, 90, 20);
    g.fillStyle(0xffb04a, 1).fillTriangle(x - 26, 468, x + 26, 468, x, 420);
    g.fillStyle(0xffe08a, 1).fillTriangle(x - 12, 466, x + 12, 466, x, 436);
  }
  return g;
}

// Golgotha: a bare hill with three crosses far away, under a darkened sky.
function crosses(scene: Phaser.Scene, ground: number): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35).fillRect(0, 0, W, H); // "darkness came over all the land"
  const pts: Phaser.Types.Math.Vector2Like[] = [{ x: 0, y: H }];
  for (let i = 0; i <= 40; i++) {
    const x = (i / 40) * W;
    pts.push({ x, y: 330 + 160 * Math.pow((x - W * 0.5) / (W * 0.5), 2) });
  }
  pts.push({ x: W, y: H });
  g.fillStyle(ground, 1).fillPoints(pts, true);
  g.fillStyle(0x2a1c12, 1);
  for (const [fx, s] of [[0.42, 0.75], [0.5, 1], [0.58, 0.75]] as const) {
    const x = W * fx;
    const top = 330 - 150 * s;
    g.fillRect(x - 5 * s, top, 10 * s, 160 * s);
    g.fillRect(x - 42 * s, top + 30 * s, 84 * s, 9 * s);
  }
  return g;
}

// A tomb cut into the rock, with a large round stone.
function tomb(scene: Phaser.Scene, rock: number, open: boolean, dawn: boolean): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const g = scene.add.graphics();
  const dark = Phaser.Display.Color.ValueToColor(rock).darken(25).color;
  g.fillStyle(rock, 1).fillPoints([{ x: W * 0.35, y: 500 }, { x: W * 0.4, y: 220 }, { x: W * 0.62, y: 190 }, { x: W * 0.85, y: 230 }, { x: W * 0.9, y: 500 }], true);
  const dx = W * 0.62;
  g.fillStyle(0x1a140e, 1).fillEllipse(dx, 400, 130, 170); // doorway
  if (open) {
    if (dawn) g.fillStyle(0xfff3c4, 0.25).fillEllipse(dx, 400, 220, 260); // light streaming out
    g.fillStyle(dark, 1).fillCircle(dx + 150, 430, 80); // the stone, rolled aside
    g.lineStyle(4, Phaser.Display.Color.ValueToColor(dark).darken(15).color, 1).strokeCircle(dx + 150, 430, 80);
  } else {
    g.fillStyle(dark, 1).fillCircle(dx, 410, 85);
    g.lineStyle(4, Phaser.Display.Color.ValueToColor(dark).darken(15).color, 1).strokeCircle(dx, 410, 85);
  }
  g.fillStyle(0x7f9a52, 1);
  for (let i = 0; i < 6; i++) g.fillCircle(W * (0.12 + i * 0.05), 470 - (i % 2) * 20, 30); // garden bushes
  return g;
}
