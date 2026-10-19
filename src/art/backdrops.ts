import Phaser from 'phaser';
import type { TimeOfDay } from '../systems/content';
import { artTexture, backdropArt, loadArt } from '../systems/art';

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

export interface Layer { obj: Phaser.GameObjects.Graphics | Phaser.GameObjects.RenderTexture; speed: number }

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

// Draws a backdrop. If a finished picture exists for it (see ART_GUIDE.md),
// the picture is used instead; the first time, the drawn version shows while it loads.
export function drawBackdrop(scene: Phaser.Scene, backdrop: string, time: TimeOfDay = 'dawn'): Layer[] {
  const art = backdropArt(backdrop, time);
  const ready = art && artTexture(scene, art.key);
  if (art && ready) {
    void loadArt(scene, [art.key]); // keeps it among the recently used pictures
    drawPicture(scene, ready, art.exact ? 'midday' : time);
    return [];
  }
  const first = scene.children.list.length;
  const layers = flatten(scene, first, drawShapes(scene, backdrop, time));
  if (art) {
    const drawn = scene.children.list.slice(first);
    void loadArt(scene, [art.key]).then(() => {
      const tex = artTexture(scene, art.key);
      // Skip it if the player has already moved on to another scene.
      if (!tex || !scene.sys.isActive() || drawn.some((o) => !o.scene)) return;
      for (const o of drawn) o.destroy();
      layers.length = 0;
      scene.children.sendToBack(drawPicture(scene, tex, art.exact ? 'midday' : time));
    });
  }
  return layers;
}

// The drawn backdrop is made of many shapes. Redrawing them every frame is slow
// on cheap phones, so they are painted once into a few flat pictures. Only the
// clouds keep drifting, and anything that flickers (like lamps) stays as it is.
function flatten(scene: Phaser.Scene, first: number, layers: Layer[]): Layer[] {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const drifting = new Set(layers.filter((l) => l.obj.getData('drift')).map((l) => l.obj));
  const drawn = scene.children.list.slice(first);
  let run: Phaser.GameObjects.Graphics[] = [];
  const bakeRun = () => {
    if (!run.length) return;
    const rt = scene.add.renderTexture(0, 0, W, H).setOrigin(0);
    for (const g of run) rt.draw(g);
    // Put the picture exactly where the shapes were in the drawing order.
    scene.children.moveTo(rt, scene.children.getIndex(run[0]));
    for (const g of run) g.destroy();
    run = [];
  };
  for (const obj of drawn) {
    const still = obj instanceof Phaser.GameObjects.Graphics && !drifting.has(obj) && scene.tweens.getTweensOf(obj).length === 0;
    if (still) run.push(obj as Phaser.GameObjects.Graphics);
    else bakeRun();
  }
  bakeRun();
  return layers.filter((l) => drifting.has(l.obj));
}

// Tints for a picture that was painted for daytime but used at another time.
const TINTS: Record<TimeOfDay, number> = { dawn: 0xffe2c8, midday: 0xffffff, dusk: 0xf0b890, night: 0x5a6690 };

function drawPicture(scene: Phaser.Scene, texture: string, time: TimeOfDay): Phaser.GameObjects.Image {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const img = scene.add.image(W / 2, H / 2, texture);
  const s = Math.max(W / img.width, H / img.height) * 1.04;
  img.setScale(s).setTint(TINTS[time]);
  // A very slow zoom keeps the picture feeling alive.
  scene.tweens.add({ targets: img, scale: s * 1.06, duration: 40000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return img;
}

function drawShapes(scene: Phaser.Scene, backdrop: string, time: TimeOfDay): Layer[] {
  const p = PALETTES[time];
  if (backdrop === 'room') return drawRoom(scene);
  if (backdrop === 'jordan' || !LAND[backdrop]) return drawJordan(scene, p, time);

  // Shade the place's own colors darker at dusk and night.
  const dim = time === 'night' ? 0.35 : time === 'dusk' ? 0.7 : 1;
  const tint = (c: number) => Phaser.Display.Color.ValueToColor(c).darken((1 - dim) * 60).color;
  const land = LAND[backdrop];
  const sky = drawSky(scene, p, time);
  const layers: Layer[] = [sky, { obj: hills(scene, 380, tint(land.far), 1, 2, 'trees'), speed: 3 }];
  haze(scene, p.skyBottom, 370, 0.18);
  if (backdrop === 'jerusalem') {
    layers.push({ obj: hills(scene, 470, tint(land.mid), 2, 1, 'trees'), speed: 0 });
    layers.push({ obj: city(scene, tint(0xd8c8a0)), speed: 0 });
  } else if (backdrop === 'village') {
    layers.push({ obj: hills(scene, 470, tint(land.mid), 2, 1, 'trees'), speed: 4 });
    layers.push({ obj: houses(scene, tint(0xd9c9a0)), speed: 0 });
  } else if (backdrop === 'well') {
    layers.push({ obj: hills(scene, 470, tint(land.mid), 3, 2, 'trees'), speed: 6 });
    layers.push({ obj: well(scene, tint(0xb9a37a)), speed: 0 });
  } else if (backdrop === 'lake') {
    layers.push({ obj: lake(scene, p.water, 300, 140), speed: 0 });
    layers.push({ obj: boats(scene, tint(0x6a4a2a)), speed: 0 });
    layers.push({ obj: shore(scene, tint(land.near)), speed: 0 });
    return layers;
  } else if (backdrop === 'olives') {
    layers.push({ obj: hills(scene, 470, tint(land.mid), 2, 2, 'trees'), speed: 0 });
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
    layers.push({ obj: hills(scene, 540, tint(land.mid), 2, 3, 'trees'), speed: 7 });
    layers.push({ obj: figTree(scene, tint(0x3d6b2c)), speed: 0 });
  } else {
    layers.push({ obj: hills(scene, 470, tint(land.mid), 3, 1.5, 'rocks'), speed: 7 });
    layers.push({ obj: rocks(scene, tint(0x7a5c3a)), speed: 14 });
  }
  layers.push({ obj: hills(scene, 600, tint(land.near), 3, 4, 'grass'), speed: 16 });
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
  const sky = drawSky(scene, p, time);
  const far = hills(scene, 400, p.far, 1, 0, 'trees');
  haze(scene, p.skyBottom, 380, 0.18);
  const mid = hills(scene, 470, p.mid, 2, 0, 'trees');
  haze(scene, p.skyBottom, 470, 0.08);
  // The Jordan, flowing behind the people on its bank
  const water = scene.add.graphics();
  const W = scene.scale.width;
  water.fillStyle(p.water, 1).fillRect(0, 352, W, 42);
  water.fillStyle(0xffffff, 0.3).fillRect(W * 0.12, 362, 110, 3).fillRect(W * 0.48, 374, 140, 3).fillRect(W * 0.8, 366, 90, 3);
  water.fillStyle(Phaser.Display.Color.ValueToColor(p.near).darken(10).color, 1).fillRect(0, 348, W, 5);
  return [
    sky,
    { obj: far, speed: 3 },
    { obj: mid, speed: 7 },
    { obj: hills(scene, 560, p.near, 3, 0, 'grass'), speed: 14 },
    { obj: river(scene, p.water), speed: 0 },
    { obj: reeds(scene), speed: 22 },
  ];
}

// Sky: a gradient, a glowing sun or moon, stars at night, and drifting clouds.
function drawSky(scene: Phaser.Scene, p: Palette, time: TimeOfDay): Layer {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const sky = scene.add.graphics();
  sky.fillGradientStyle(p.skyTop, p.skyTop, p.skyBottom, p.skyBottom, 1).fillRect(0, 0, W, H);
  if (time === 'night') {
    for (let i = 0; i < 120; i++) {
      sky.fillStyle(0xffffff, 0.35 + ((i * 37) % 60) / 100).fillCircle((i * 977) % W, (i * 331) % (H * 0.55), (i % 4) * 0.45 + 0.6);
    }
  }
  const sunX = W * 0.72;
  const sunY = H * p.sunY;
  for (let i = 7; i >= 1; i--) sky.fillStyle(p.sun, time === 'night' ? 0.035 : 0.06).fillCircle(sunX, sunY, 50 + i * 34);
  sky.fillStyle(p.sun, 1).fillCircle(sunX, sunY, time === 'night' ? 34 : 54);
  if (time === 'night') {
    sky.fillStyle(0xd8dcea, 0.6).fillCircle(sunX - 10, sunY - 6, 7).fillCircle(sunX + 9, sunY + 8, 5).fillCircle(sunX + 4, sunY - 14, 4);
  }
  return { obj: clouds(scene, time), speed: 4 };
}

const CLOUD_COLORS: Record<TimeOfDay, [number, number, number]> = {
  dawn: [0xffe2cc, 0xd9a3a0, 0.85], midday: [0xffffff, 0xd6e2ec, 0.95], dusk: [0xf6b08c, 0x9a6070, 0.85], night: [0x3c4670, 0x262c4a, 0.7],
};

// Soft clouds, drawn twice side by side so the layer can drift and wrap.
function clouds(scene: Phaser.Scene, time: TimeOfDay): Phaser.GameObjects.RenderTexture {
  const W = scene.scale.width;
  const g = scene.add.graphics();
  const [light, shade, alpha] = CLOUD_COLORS[time];
  for (const offset of [0, W]) {
    for (let i = 0; i < 5; i++) {
      const x = offset + ((i * 0.21 + 0.05) % 1) * W;
      const y = 70 + ((i * 53) % 110);
      const s = 0.6 + ((i * 29) % 50) / 100;
      const puffs: [number, number, number][] = [[-80, 10, 38], [-40, -12, 50], [10, -22, 60], [60, -6, 46], [100, 12, 32], [-10, 14, 44], [40, 16, 40]];
      g.fillStyle(shade, alpha);
      for (const [dx, dy, r] of puffs) g.fillEllipse(x + dx * s, y + (dy + 8) * s, r * 2.2 * s, r * 1.5 * s);
      g.fillStyle(light, alpha);
      for (const [dx, dy, r] of puffs) g.fillEllipse(x + dx * s, y + dy * s, r * 2 * s, r * 1.3 * s);
      g.fillStyle(0xffffff, alpha * 0.35);
      for (const [dx, dy, r] of puffs.slice(1, 4)) g.fillEllipse(x + dx * s - 6, y + (dy - 10) * s, r * 1.1 * s, r * 0.6 * s);
    }
  }
  // Painted once into a picture twice the screen's width, which then drifts.
  const rt = scene.add.renderTexture(0, 0, W * 2, 300).setOrigin(0);
  rt.draw(g);
  g.destroy();
  return rt.setData('drift', true);
}

// Distance haze between hill layers: far things fade into the sky color.
function haze(scene: Phaser.Scene, color: number, y: number, strength = 0.4): void {
  const W = scene.scale.width;
  const g = scene.add.graphics();
  g.fillGradientStyle(color, color, color, color, 0, 0, strength, strength).fillRect(0, y - 160, W, 160);
  g.fillStyle(color, strength).fillRect(0, y, W, 40);
  g.fillGradientStyle(color, color, color, color, strength, strength, 0, 0).fillRect(0, y + 40, W, 60);
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

// A flat-roofed stone house with depth: front, shaded side, roof, beam ends, door and window.
function house(g: Phaser.GameObjects.Graphics, x: number, base: number, w: number, h: number, stone: number, k: number): void {
  const C = Phaser.Display.Color;
  const side = C.ValueToColor(stone).darken(22).color;
  const d = Math.min(26, w * 0.22); // depth of the side wall
  g.fillStyle(side, 1).fillPoints([{ x: x + w, y: base }, { x: x + w, y: base - h }, { x: x + w + d, y: base - h - d * 0.45 }, { x: x + w + d, y: base - d * 0.45 }], true);
  g.fillStyle(stone, 1).fillRect(x, base - h, w, h);
  // Stone courses
  g.lineStyle(1, C.ValueToColor(stone).darken(12).color, 0.5);
  for (let yy = base - h + 14; yy < base; yy += 14) g.lineBetween(x, yy, x + w, yy);
  // Roof of beams and packed earth, with a low parapet
  g.fillStyle(C.ValueToColor(stone).lighten(8).color, 1).fillPoints([{ x: x - 3, y: base - h }, { x: x + w + 3, y: base - h }, { x: x + w + d + 3, y: base - h - d * 0.45 }, { x: x + d - 3, y: base - h - d * 0.45 }], true);
  g.fillStyle(0x4a3424, 1);
  for (let bx = x + 8; bx < x + w - 4; bx += 16) g.fillRect(bx, base - h + 5, 5, 5); // beam ends
  // Arched doorway and a small window
  const dx = x + w * (0.3 + (k % 3) * 0.15);
  g.fillStyle(0x2a1c12, 1).fillRoundedRect(dx - 12, base - 40, 24, 40, { tl: 12, tr: 12, bl: 0, br: 0 });
  g.fillStyle(0x6a4a2a, 1).fillRect(dx - 12, base - 4, 24, 4);
  if (w > 90) g.fillStyle(0x2a1c12, 0.85).fillRoundedRect(x + w - 34, base - h + 18, 14, 16, { tl: 7, tr: 7, bl: 0, br: 0 });
  // Outside stairs up to the roof on some houses
  if (k % 3 === 1) {
    g.fillStyle(C.ValueToColor(stone).darken(8).color, 1);
    for (let st = 0; st < 6; st++) g.fillRect(x - 10 - st * 7, base - h + 4 + st * (h / 6), 10 + st * 7, h / 6);
  }
  // Shadow at the foot of the wall, and a clean outline like an illustration
  g.fillStyle(0x000000, 0.18).fillRect(x, base - 3, w + d, 6);
  g.lineStyle(2, 0x3a2a1c, 0.55).strokeRect(x, base - h, w, h);
  g.strokePoints([{ x: x + w, y: base }, { x: x + w + d, y: base - d * 0.45 }, { x: x + w + d, y: base - h - d * 0.45 }, { x: x + d - 3, y: base - h - d * 0.45 }, { x: x - 3, y: base - h }], false);
  // A clay jar or two by the door
  if (k % 2 === 0) {
    g.fillStyle(0xa8643a, 1).fillEllipse(dx + 26, base - 10, 14, 18).fillRect(dx + 22, base - 22, 8, 5);
  }
}

// Jerusalem on its hill: walls and towers, packed houses, and the gleaming Temple.
function city(scene: Phaser.Scene, stone: number): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const g = scene.add.graphics();
  const C = Phaser.Display.Color;
  const cx = W * 0.62;
  const shade = C.ValueToColor(stone).darken(18).color;
  // Houses climbing the hill behind the wall
  for (let i = 0; i < 22; i++) {
    const x = cx - 560 + i * 52 + ((i * 17) % 20);
    const h = 34 + ((i * 29) % 34);
    const base = 410 - Math.max(0, 110 - Math.abs(x - cx) / 4) * 0.5;
    house(g, x, base, 46 + ((i * 7) % 14), h, i % 2 ? stone : C.ValueToColor(stone).darken(8).color, i);
  }
  // The Temple: a great platform, colonnades, and the sanctuary faced with white stone and gold
  const ty = 330;
  g.fillStyle(shade, 1).fillRect(cx - 230, ty, 460, 90);
  g.fillStyle(C.ValueToColor(stone).lighten(6).color, 1).fillRect(cx - 230, ty - 8, 460, 10);
  g.fillStyle(0xe8dcc0, 1).fillRect(cx - 200, ty - 40, 400, 32);
  g.fillStyle(0xb8a888, 1);
  for (let x = cx - 196; x < cx + 200; x += 14) g.fillRect(x, ty - 36, 5, 26); // columns
  g.fillStyle(0xf4ecd8, 1).fillRect(cx - 70, ty - 140, 140, 100);
  g.fillStyle(0xf4ecd8, 1).fillRect(cx - 100, ty - 140, 200, 40);
  g.fillStyle(0xd9b04a, 1).fillRect(cx - 104, ty - 146, 208, 8);
  g.fillStyle(0xe8c45a, 1);
  for (let x = cx - 100; x <= cx + 100; x += 10) g.fillTriangle(x - 2, ty - 146, x + 2, ty - 146, x, ty - 156); // golden spikes on the roof
  g.fillStyle(0x3a2a1a, 0.85).fillRoundedRect(cx - 22, ty - 96, 44, 56, { tl: 6, tr: 6, bl: 0, br: 0 });
  g.fillStyle(0xd9b04a, 0.9).fillRect(cx - 26, ty - 100, 52, 5);
  // Smoke rising from the altar
  g.fillStyle(0xdedad2, 0.35).fillEllipse(cx + 130, ty - 70, 20, 40).fillEllipse(cx + 138, ty - 110, 26, 40);
  // The city wall with towers
  const wy = 420;
  g.fillStyle(shade, 1).fillRect(cx - 640, wy, 1280, 50);
  g.lineStyle(1, C.ValueToColor(shade).darken(15).color, 0.6);
  for (let yy = wy + 12; yy < wy + 50; yy += 12) g.lineBetween(cx - 640, yy, cx + 640, yy);
  g.fillStyle(shade, 1);
  for (let x = cx - 640; x < cx + 640; x += 30) g.fillRect(x, wy - 12, 16, 12);
  for (const tx of [cx - 420, cx - 150, cx + 260, cx + 520]) {
    g.fillStyle(C.ValueToColor(shade).lighten(5).color, 1).fillRect(tx - 28, wy - 60, 56, 110);
    g.fillStyle(C.ValueToColor(shade).darken(20).color, 1).fillRect(tx + 18, wy - 60, 10, 110);
    g.fillStyle(C.ValueToColor(shade).lighten(5).color, 1);
    for (let x = tx - 28; x < tx + 28; x += 14) g.fillRect(x, wy - 70, 9, 10);
    g.fillStyle(0x2a1c12, 0.8).fillRect(tx - 4, wy - 44, 8, 14);
  }
  g.y = -78; // stands behind the floor where people walk (see drawFloor)
  return g;
}

function lake(scene: Phaser.Scene, color: number, top = 330, height = 64): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const g = scene.add.graphics();
  g.fillStyle(color, 1).fillRect(0, top, W, height);
  g.fillStyle(0xffffff, 0.35).fillRect(W * 0.2, top + height * 0.25, 90, 3).fillRect(W * 0.55, top + height * 0.6, 120, 3).fillRect(W * 0.8, top + height * 0.4, 70, 3);
  return g;
}

function figTree(scene: Phaser.Scene, leaf: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const x = scene.scale.width * 0.14;
  g.fillStyle(0x5a3d22, 1).fillRect(x - 12, 330, 24, 160);
  g.fillStyle(leaf, 1);
  for (const [dx, dy, r] of [[0, 300, 80], [-60, 330, 60], [60, 330, 60], [-30, 260, 55], [35, 265, 55]]) g.fillCircle(x + dx, dy, r);
  g.y = -90; // stands behind the floor where people walk (see drawFloor)
  return g;
}

// Rolling hills drawn twice side by side so the layer can wrap seamlessly.
// seed must be a whole number so the two copies join without a seam; phase shifts the shape.
// Hills can carry olive trees and cypresses, grass and flowers, or rocks along the top.
function hills(scene: Phaser.Scene, baseY: number, color: number, seed: number, phase = 0, detail?: 'trees' | 'grass' | 'rocks'): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const g = scene.add.graphics();
  const ridge = (x: number) => baseY
    - 40 * Math.sin((x / W) * Math.PI * 2 * seed + seed + phase)
    - 20 * Math.sin((x / W) * Math.PI * 2 * (seed + 2));
  const near = Phaser.Math.Clamp((baseY - 360) / 260, 0, 1); // 0 far away … 1 close
  const dark = Phaser.Display.Color.ValueToColor(color).darken(14).color;
  const light = Phaser.Display.Color.ValueToColor(color).lighten(10).color;
  for (const offset of [0, W]) {
    const pts: Phaser.Types.Math.Vector2Like[] = [{ x: offset, y: H }];
    for (let i = 0; i <= 80; i++) {
      const x = (i / 80) * W;
      pts.push({ x: offset + x, y: ridge(x) });
    }
    pts.push({ x: offset + W, y: H });
    g.fillStyle(color, 1).fillPoints(pts, true);
    g.lineStyle(2.5, Phaser.Display.Color.ValueToColor(color).darken(28).color, 0.55).strokePoints(pts.slice(1, -1), false);
    // Slopes: lighter where the sun catches them, darker further down.
    const n = 200;
    for (let i = 0; i < n; i++) {
      const x0 = (i / n) * W;
      const x1 = ((i + 1) / n) * W;
      const slope = (ridge(x1) - ridge(x0)) * (80 / n);
      const depth = 50 + near * 50;
      g.fillStyle(slope > 0 ? dark : light, Math.min(0.35, Math.abs(slope) / 10));
      g.fillPoints([{ x: offset + x0, y: ridge(x0) + 1 }, { x: offset + x1, y: ridge(x1) + 1 }, { x: offset + x1, y: ridge(x1) + depth }, { x: offset + x0, y: ridge(x0) + depth }], true);
    }
    g.fillGradientStyle(dark, dark, dark, dark, 0, 0, 0.7, 0.7).fillRect(offset, baseY + 30, W, 120);
    if (!detail) continue;
    const step = detail === 'grass' ? 26 : 46 - near * 10;
    for (let x = 10, k = 0; x < W - 10; x += step + ((k * 37) % 23), k++) {
      const y = ridge(x) + 2;
      const r = (k * 53) % 100 / 100;
      const sz = 0.45 + near * 0.9;
      if (detail === 'trees') {
        if (r < 0.28) {
          // A cypress
          g.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(32).color, 1).fillEllipse(offset + x, y - 26 * sz, 12 * sz, 56 * sz);
        } else if (r < 0.62) {
          // An olive tree: grey-green, rounded, on a short trunk
          g.fillStyle(0x4a3a2a, 1).fillRect(offset + x - 2 * sz, y - 14 * sz, 4 * sz, 14 * sz);
          g.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(22).color, 1).fillEllipse(offset + x, y - 20 * sz, 34 * sz, 20 * sz).fillEllipse(offset + x - 8 * sz, y - 26 * sz, 20 * sz, 14 * sz);
          g.lineStyle(1.5, Phaser.Display.Color.ValueToColor(color).darken(40).color, 0.6).strokeEllipse(offset + x, y - 20 * sz, 34 * sz, 20 * sz);
          g.fillStyle(0xb8c2a0, 0.22).fillEllipse(offset + x + 4 * sz, y - 26 * sz, 14 * sz, 7 * sz);
        }
      } else if (detail === 'rocks') {
        if (r < 0.5) {
          g.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(20).color, 1).fillEllipse(offset + x, y + 4, 26 * sz, 14 * sz);
          g.fillStyle(0xffffff, 0.1).fillEllipse(offset + x - 4, y, 12 * sz, 5 * sz);
        }
      } else {
        // Grass tufts and a few wildflowers (red anemones, white and yellow daisies)
        g.lineStyle(2, Phaser.Display.Color.ValueToColor(color).darken(25).color, 1);
        for (let b = -2; b <= 2; b++) g.lineBetween(offset + x + b * 3, y + 6, offset + x + b * 5, y - 8 - (b % 2 ? 4 : 8));
        if (r < 0.35) g.fillStyle([0xc8323a, 0xf2eee0, 0xe8c84a][k % 3], 1).fillCircle(offset + x + 8, y - 4, 3);
      }
    }
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

// A Galilean village: stone houses with flat roofs, a palm and a fig tree.
function houses(scene: Phaser.Scene, stone: number): Phaser.GameObjects.Graphics {
  const W = scene.scale.width;
  const g = scene.add.graphics();
  const C = Phaser.Display.Color;
  // A row further back, smaller, then the nearer houses
  for (let i = 0; i < 12; i++) {
    const x = (i * W) / 12 + ((i * 41) % 30) - 20;
    house(g, x, 400, 60 + ((i * 13) % 30), 34 + ((i * 11) % 20), C.ValueToColor(stone).darken(10).color, i + 1);
  }
  for (let i = 0; i < 7; i++) {
    const x = (i * W) / 7 + ((i * 37) % 40) - 10;
    const w = 110 + ((i * 53) % 60);
    const h = 70 + ((i * 31) % 45);
    house(g, x, 470 + ((i * 17) % 20), w, h, i % 2 ? stone : C.ValueToColor(stone).darken(6).color, i);
  }
  // A date palm
  const px = W * 0.86;
  g.fillStyle(0x6a4a2a, 1);
  for (let k = 0; k < 12; k++) g.fillEllipse(px + Math.sin(k / 3) * 4, 470 - k * 15, 18 - k * 0.4, 12);
  g.fillStyle(0x3d6b2c, 1);
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * (1.05 + (k / 8) * 0.9);
    const ex = px + Math.cos(a) * 95;
    const ey = 300 + Math.sin(a) * 30 + 34;
    g.fillTriangle(px, 296, ex, ey, (px + ex) / 2, (296 + ey) / 2 + 14);
  }
  g.fillStyle(0x8a5a1a, 1).fillCircle(px - 6, 304, 6).fillCircle(px + 6, 306, 6); // dates
  g.y = -82; // stands behind the floor where people walk (see drawFloor)
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
  g.y = -78; // stands behind the floor where people walk (see drawFloor)
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
  g.y = -50; // stands behind the floor where people walk (see drawFloor)
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
  g.y = -115; // stands behind the floor where people walk (see drawFloor)
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
  g.y = -80; // stands behind the floor where people walk (see drawFloor)
  return g;
}

// The upper room: stone walls, a low table, and oil lamps.
function drawRoom(scene: Phaser.Scene): Layer[] {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const g = scene.add.graphics();
  g.fillGradientStyle(0x3a2a1c, 0x3a2a1c, 0x5a4430, 0x5a4430, 1).fillRect(0, 0, W, H);
  g.lineStyle(2, 0x2a1c12, 0.6);
  for (let y = 40; y < 392; y += 46) for (let x = (y / 46) % 2 ? 0 : 60; x < W; x += 120) g.strokeRect(x, y, 120, 46);
  g.fillStyle(0x2a1c12, 1).fillRect(W * 0.62, 150, 120, 150); // window
  g.fillStyle(0x0b1028, 1).fillRect(W * 0.62 + 10, 160, 100, 130);
  g.fillStyle(0xeef2ff, 0.9).fillCircle(W * 0.62 + 70, 190, 14);
  g.fillStyle(0x4a3424, 1).fillRect(0, 392, W, H - 392); // floor
  g.fillStyle(0x6a4a2a, 1).fillRoundedRect(W * 0.2, 352, W * 0.6, 28, 8); // low table, behind the people
  g.fillStyle(0x4a321c, 1).fillRect(W * 0.22, 380, 16, 14).fillRect(W * 0.78 - 16, 380, 16, 14);
  g.lineStyle(2, 0x2a1c12, 0.7).strokeRoundedRect(W * 0.2, 352, W * 0.6, 28, 8);
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
  g.y = -88; // stands behind the floor where people walk (see drawFloor)
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
  g.y = -100; // stands behind the floor where people walk (see drawFloor)
  return g;
}

// The ground in front of the scenery, where everyone stands. Everything in a
// backdrop sits behind its top edge, so people never seem to stand on roofs.
export const FLOOR_Y = 392;
type FloorKind = 'stone' | 'wood' | 'sand' | 'grass' | 'rock' | 'shore';
const FLOORS: Record<string, FloorKind> = {
  village: 'stone', jerusalem: 'stone', courtyard: 'stone', well: 'stone', room: 'wood',
  wilderness: 'sand', jordan: 'sand', lake: 'shore', golgotha: 'rock',
  galilee: 'grass', mountain: 'grass', olives: 'grass', cliff: 'grass', tomb: 'grass', 'tomb-open': 'grass',
};
const FLOOR_COLORS: Record<FloorKind, [number, number]> = {
  stone: [0xc2ae8a, 0x9a8668], wood: [0x6a4a2e, 0x4a3220], sand: [0xd8c08e, 0xb89e6e],
  grass: [0x7a9a4e, 0x5a7a38], rock: [0x6a5a4a, 0x4a3e32], shore: [0xc8b48e, 0xa8946e],
};

export function drawFloor(scene: Phaser.Scene, backdrop: string, time: TimeOfDay, width = scene.scale.width, top = FLOOR_Y): Phaser.GameObjects.RenderTexture | null {
  if (backdropArt(backdrop, time)) return null; // a finished picture has its own ground
  const H = scene.scale.height;
  const kind = FLOORS[backdrop] ?? 'grass';
  const dim = time === 'night' ? 45 : time === 'dusk' ? 18 : 0;
  const shade = (c: number) => Phaser.Display.Color.ValueToColor(c).darken(dim).color;
  const [a, b] = FLOOR_COLORS[kind].map(shade);
  const g = scene.add.graphics();
  g.fillGradientStyle(a, a, b, b, 1).fillRect(0, top, width, H - top);
  g.fillStyle(0x000000, 0.18).fillRect(0, top, width, 5); // a soft line where the ground meets the scenery
  const dark = Phaser.Display.Color.ValueToColor(b).darken(12).color;
  const light = Phaser.Display.Color.ValueToColor(a).lighten(8).color;
  if (kind === 'stone') {
    // Paving stones in rows, smaller toward the back
    for (let row = 0, y = top + 6; y < H; row++) {
      const h = 16 + row * 6;
      const w = 54 + row * 18;
      for (let x = (row % 2) * -w / 2; x < width; x += w) {
        g.fillStyle(row % 3 === 1 ? light : a, 0.45).fillRoundedRect(x + 2, y + 2, w - 4, h - 4, 4);
        g.lineStyle(2, dark, 0.5).strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 4);
      }
      y += h;
    }
  } else if (kind === 'wood') {
    for (let y = top + 8, k = 0; y < H; y += 22 + k * 4, k++) {
      g.lineStyle(2, dark, 0.7).lineBetween(0, y, width, y);
      for (let x = (k * 97) % 160; x < width; x += 240) g.lineBetween(x, y, x, y + 22 + k * 4);
    }
  } else {
    // Pebbles, grass tufts and flowers scattered over the ground
    for (let i = 0; i < width / 18; i++) {
      const x = (i * 137) % width;
      const y = top + 10 + ((i * 53) % (H - top - 10));
      const near = (y - top) / (H - top);
      if (kind === 'grass') {
        g.lineStyle(2, dark, 0.8);
        g.lineBetween(x, y, x - 3, y - 8 - near * 6).lineBetween(x + 4, y, x + 6, y - 7 - near * 6);
        if (i % 7 === 0) g.fillStyle([0xc8323a, 0xf2eee0, 0xe8c84a][i % 3], 1).fillCircle(x + 8, y - 4, 2.5 + near * 2);
      } else {
        g.fillStyle(i % 3 ? dark : light, 0.55).fillEllipse(x, y, 6 + near * 10, 3 + near * 5);
        if (kind === 'rock' && i % 4 === 0) g.fillStyle(dark, 1).fillEllipse(x, y, 20 + near * 20, 10 + near * 10);
      }
    }
  }
  // Painted once into a flat picture, so it costs nothing to show.
  const rt = scene.add.renderTexture(0, top, width, H - top).setOrigin(0);
  rt.draw(g, 0, -top);
  g.destroy();
  return rt;
}
