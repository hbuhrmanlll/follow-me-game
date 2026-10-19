import Phaser from 'phaser';
import looksJson from '../../content/looks.json';
import { characters } from '../systems/content';

// People on the stage: drawn once per character (body, arms, head and face are
// each saved as a small picture, so the game stays fast on cheap phones), then
// brought to life: they breathe, blink, look at whoever is speaking, move their
// mouth and hands when they talk, and walk in and out of scenes.
// How each character looks is set in content/looks.json.

type HairStyle = 'short' | 'curly' | 'wavy' | 'long' | 'wild' | 'bald';
type Beard = 'none' | 'stubble' | 'short' | 'full' | 'long';
type HeadWear = 'scarf' | 'cloth' | 'turban' | 'helmet' | 'headband';

interface LookJson {
  sex?: 'm' | 'f'; age?: 'young' | 'adult' | 'old'; build?: 'slim' | 'normal' | 'broad'; height?: number;
  skin?: string; hair?: string; hairStyle?: HairStyle; beard?: Beard; beardColor?: string;
  tunic?: string; mantle?: string | null; head?: HeadWear; headColor?: string;
  tassels?: boolean; extra?: string; group?: number; mixed?: boolean;
}

interface Look {
  sex: 'm' | 'f'; age: 'young' | 'adult' | 'old'; build: 'slim' | 'normal' | 'broad'; height: number;
  skin: number; hair: number; hairStyle: HairStyle; beard: Beard; beardColor: number;
  tunic: number; mantle: number | null; head?: HeadWear; headColor: number;
  tassels: boolean; extra?: string;
}

const looks = looksJson as unknown as Record<string, LookJson>;

// A short tag for how someone looks, so a changed look gets freshly drawn pictures.
function lookSig(id: string): string {
  const t = JSON.stringify(looks[id] ?? {});
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (Math.imul(h, 31) + t.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// The player's own character: a young follower whose look the player chooses.
export function setPlayerLook(l: { sex: 'm' | 'f'; skin: string; hair: string; tunic: string; mantle: string }): void {
  looks.player = { sex: l.sex, age: 'young', height: 0.86, build: 'slim', skin: l.skin, hair: l.hair, hairStyle: l.sex === 'f' ? undefined : 'wavy', beard: 'none', tunic: l.tunic, mantle: l.mantle, tassels: l.sex === 'm' };
}
const hex = (s: string) => Phaser.Display.Color.HexStringToColor(s).color;
const darker = (c: number, n: number) => Phaser.Display.Color.ValueToColor(c).darken(n).color;
const lighter = (c: number, n: number) => Phaser.Display.Color.ValueToColor(c).lighten(n).color;

// Varied people for crowds and groups.
const SKINS = ['#a8774e', '#9a6844', '#b08058', '#946442', '#a26f4a'];
const HAIRS = ['#1e1610', '#2e2014', '#3a2618', '#241a12', '#4a3020'];
const TUNICS = ['#d6c6a2', '#c9b48f', '#cdbd9b', '#c2ac86', '#ddd0b2'];
const MANTLES = ['#5a6a7a', '#7a5a3a', '#4a6a5a', '#8a6a4a', '#6a5a7a', '#7a4a3a'];
const STYLES: HairStyle[] = ['short', 'curly', 'wavy', 'short', 'curly'];
const BEARDS: Beard[] = ['full', 'short', 'full', 'long', 'short'];

function resolveLook(id: string, member = 0): Look {
  const raw: LookJson = { ...(looks[id] ?? {}) };
  const seed = [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) + member * 7;
  const pick = <T>(list: T[], k = 0) => list[(seed + k) % list.length];
  const group = (raw.group ?? 1) > 1;
  const sex = raw.sex ?? (raw.mixed && member === 1 ? 'f' : 'm');
  const colorOf = characters[id]?.color ?? '#7a6a5a';
  return {
    sex,
    age: raw.age ?? (raw.mixed && member === 2 ? 'old' : 'adult'),
    build: raw.build ?? 'normal',
    height: raw.height ?? (group ? 0.97 + (member % 2) * 0.04 : 1),
    skin: hex(raw.skin && !group ? raw.skin : raw.skin ?? pick(SKINS)),
    hair: hex(raw.hair && !group ? raw.hair : raw.hair ?? pick(HAIRS, 1)),
    hairStyle: raw.hairStyle ?? (group ? pick(STYLES, 2) : 'short'),
    beard: sex === 'f' ? 'none' : raw.beard ?? (group ? pick(BEARDS, 3) : 'short'),
    beardColor: hex(raw.beardColor ?? raw.hair ?? pick(HAIRS, 1)),
    tunic: hex(raw.tunic ?? pick(TUNICS, 4)),
    mantle: raw.mantle === null ? null : hex(raw.mantle ?? (group ? pick(MANTLES, 5) : colorOf)),
    head: raw.head ?? (sex === 'f' ? 'scarf' : undefined),
    headColor: hex(raw.headColor ?? raw.mantle ?? (group ? pick(MANTLES, 6) : colorOf)),
    tassels: raw.tassels ?? false,
    extra: raw.extra,
  };
}

// Shapes are drawn with the feet at (0, 0). An adult is about 215 units tall.
const NECK = -168; // where the head joins the body
const SHOULDER_Y = -160;
const RES = 2; // pictures are saved at double size so they stay sharp
const INK = 0x2a1a10; // the outline around every shape, like a cartoon

function outline(g: Phaser.GameObjects.Graphics, pts: Phaser.Types.Math.Vector2Like[], width = 2.4): void {
  g.lineStyle(width, INK, 0.9).strokePoints(pts, true, true);
}

function bake(scene: Phaser.Scene, key: string, x: number, y: number, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): Phaser.GameObjects.Image {
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    g.scaleCanvas(RES, RES);
    g.translateCanvas(-x, -y);
    draw(g);
    g.generateTexture(key, w * RES, h * RES);
    g.destroy();
  }
  return scene.add.image(0, 0, key).setOrigin(-x / w, -y / h).setScale(1 / RES);
}

function widths(l: Look) {
  const k = l.build === 'broad' ? 1.12 : l.build === 'slim' ? 0.92 : 1;
  const f = l.sex === 'f' ? 0.9 : 1;
  return { shoulder: 28 * k * f, waist: 21 * k * f, hem: 34 * k * (l.sex === 'f' ? 1.05 : 1) };
}

// ---------- drawing ----------

function drawBody(g: Phaser.GameObjects.Graphics, l: Look): void {
  const { shoulder: s, waist: w, hem: h } = widths(l);
  const hemY = l.sex === 'f' ? -4 : -12;
  const tunic = l.tunic;
  // The tunic (robe), with a shadowed side and a few folds.
  const robe = [
    { x: -s, y: SHOULDER_Y - 4 }, { x: -8, y: NECK + 2 }, { x: 8, y: NECK + 2 }, { x: s, y: SHOULDER_Y - 4 },
    { x: s + 3, y: SHOULDER_Y + 10 }, { x: w + 2, y: -110 }, { x: h, y: hemY }, { x: -h, y: hemY }, { x: -w - 2, y: -110 },
    { x: -s - 3, y: SHOULDER_Y + 10 },
  ];
  g.fillStyle(tunic, 1).fillPoints(robe, true);
  outline(g, robe);
  g.fillStyle(darker(tunic, 18), 0.55).fillPoints([{ x: -s - 3, y: SHOULDER_Y + 10 }, { x: -w - 2, y: -110 }, { x: -h, y: hemY }, { x: -h * 0.45, y: hemY }, { x: -w * 0.5, y: -110 }, { x: -s * 0.55, y: SHOULDER_Y }], true);
  g.lineStyle(1.6, darker(tunic, 26), 0.6);
  for (const fx of [-0.55, -0.15, 0.25, 0.6]) g.lineBetween(w * fx, -100, h * fx * 1.15, hemY - 2);
  g.fillStyle(darker(tunic, 30), 1).fillRect(-h, hemY - 3, h * 2, 3); // hem
  // Neckline
  g.fillStyle(darker(l.skin, 10), 1).fillTriangle(-7, NECK + 2, 7, NECK + 2, 0, NECK + 14);

  if (l.extra === 'camelhair') {
    // John's rough garment of camel's hair (Matthew 3:4)
    g.fillStyle(darker(tunic, 25), 0.7);
    for (let i = 0; i < 70; i++) {
      const yy = SHOULDER_Y + ((i * 37) % 150);
      const ww = w + ((h - w) * (yy + 110)) / 100;
      const xx = (((i * 53) % 100) / 100 - 0.5) * 2 * Math.max(w, Math.min(h, ww));
      g.fillTriangle(xx, yy, xx + 3, yy + 7, xx - 3, yy + 7);
    }
  }
  if (l.extra === 'armor') {
    g.fillStyle(0x9a8a6a, 1).fillRoundedRect(-s + 2, SHOULDER_Y - 2, (s - 2) * 2, 64, 10);
    g.fillStyle(0xbfae84, 1).fillRoundedRect(-s + 6, SHOULDER_Y + 2, (s - 6) * 2, 24, 8);
    g.lineStyle(2, 0x6a5a3a, 1);
    for (let yy = SHOULDER_Y + 32; yy < SHOULDER_Y + 62; yy += 8) g.lineBetween(-s + 4, yy, s - 4, yy);
    g.fillStyle(0x6a4a2a, 1);
    for (let xx = -w; xx <= w; xx += 9) g.fillRect(xx - 3, -98, 6, 30); // leather strips
  }

  // Belt or sash
  if (l.extra !== 'toga') {
    g.fillStyle(l.extra === 'camelhair' ? 0x4a3018 : darker(l.mantle ?? tunic, 20), 1).fillRect(-w - 2, -114, (w + 2) * 2, 8);
  }
  if (l.extra === 'priest') {
    // The high priest's breastpiece of twelve stones (Exodus 28:15-21)
    g.fillStyle(0xd8b04a, 1).fillRect(-12, SHOULDER_Y + 10, 24, 30);
    const stones = [0xc04040, 0x40a060, 0x4060c0, 0xe0c040];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) g.fillStyle(stones[(r + c) % 4], 1).fillRect(-9 + c * 7, SHOULDER_Y + 13 + r * 7, 5, 5);
  }
  if (l.extra === 'moneybag') {
    g.fillStyle(0x6a4a2a, 1).fillCircle(w - 2, -96, 8);
    g.fillStyle(0x4a3018, 1).fillRect(w - 5, -108, 6, 6);
  }

  // The mantle: an outer cloak over the left shoulder, wrapped across the body.
  if (l.mantle !== null) {
    const m = l.mantle;
    if (l.sex === 'f') {
      // Women's mantle falls from the shoulders like a long shawl.
      const left = [{ x: -s - 3, y: SHOULDER_Y - 2 }, { x: -10, y: NECK + 4 }, { x: -w * 0.2, y: -60 }, { x: -h * 0.6, y: -24 }, { x: -h - 2, y: -40 }];
      const right = [{ x: s + 3, y: SHOULDER_Y - 2 }, { x: 10, y: NECK + 4 }, { x: w * 0.25, y: -70 }, { x: h * 0.65, y: -30 }, { x: h + 2, y: -46 }];
      g.fillStyle(m, 1).fillPoints(left, true).fillPoints(right, true);
      outline(g, left);
      outline(g, right);
      g.fillStyle(darker(m, 20), 0.6).fillPoints([{ x: -s - 3, y: SHOULDER_Y + 4 }, { x: -h - 2, y: -40 }, { x: -h * 0.8, y: -32 }], true);
    } else if (l.extra === 'toga') {
      const toga = [{ x: -s - 3, y: SHOULDER_Y - 2 }, { x: -6, y: NECK + 4 }, { x: w + 4, y: -96 }, { x: h - 4, y: -30 }, { x: -h, y: -24 }, { x: -h - 1, y: -60 }];
      g.fillStyle(0xf6f2e8, 1).fillPoints(toga, true);
      outline(g, toga);
      g.lineStyle(5, m, 1).lineBetween(-6, NECK + 6, w + 4, -96).lineBetween(w + 4, -96, h - 4, -30);
      g.lineStyle(1.5, 0xd8d0c0, 1);
      for (const fx of [-0.6, -0.2, 0.2]) g.lineBetween(-s * 0.6 + fx * 20, SHOULDER_Y + 10, h * fx, -30);
    } else {
      const drape = [
        { x: -s - 4, y: SHOULDER_Y - 4 }, { x: -9, y: NECK + 1 }, { x: 4, y: SHOULDER_Y + 18 },
        { x: w + 4, y: -100 }, { x: h - 2, y: -44 }, { x: h * 0.4, y: -26 }, { x: -h - 3, y: -32 }, { x: -s - 6, y: SHOULDER_Y + 30 },
      ];
      g.fillStyle(m, 1).fillPoints(drape, true);
      outline(g, drape);
      g.fillStyle(darker(m, 22), 0.75).fillPoints([{ x: -s - 6, y: SHOULDER_Y + 30 }, { x: -h - 3, y: -32 }, { x: -h * 0.5, y: -30 }, { x: -s * 0.4, y: SHOULDER_Y + 20 }], true);
      g.fillStyle(lighter(m, 10), 0.35).fillPoints([{ x: -9, y: NECK + 1 }, { x: 4, y: SHOULDER_Y + 18 }, { x: w - 2, y: -100 }, { x: -6, y: SHOULDER_Y + 14 }], true);
      g.lineStyle(1.6, darker(m, 30), 0.7);
      g.lineBetween(-s * 0.6, SHOULDER_Y + 8, -h * 0.7, -36).lineBetween(-4, SHOULDER_Y + 26, h * 0.1, -30).lineBetween(w * 0.5, -96, h * 0.6, -40);
      // A woven stripe along the edge
      g.lineStyle(3, darker(m, 35), 0.8).lineBetween(-9, NECK + 1, 4, SHOULDER_Y + 18).lineBetween(4, SHOULDER_Y + 18, w + 4, -100);
      if (l.tassels) {
        // Tassels on the corners (Numbers 15:38)
        g.lineStyle(1.5, 0xf2ecdc, 1);
        for (const [tx, ty] of [[-h - 3, -32], [h - 2, -44]]) {
          g.lineBetween(tx, ty, tx - 1, ty + 12).lineBetween(tx + 2, ty, tx + 2, ty + 13);
          g.fillStyle(0x3a5aa8, 1).fillCircle(tx + 1, ty + 1, 2);
        }
      }
    }
  }
}

function drawArm(g: Phaser.GameObjects.Graphics, l: Look, cloth: number): void {
  // Drawn hanging down from the shoulder joint at (0, 0).
  const big = l.build === 'broad' ? 1.12 : 1;
  const sleeve = [{ x: -9 * big, y: -4 }, { x: 9 * big, y: -4 }, { x: 10 * big, y: 40 }, { x: 8, y: 66 }, { x: -8, y: 66 }, { x: -10 * big, y: 40 }];
  g.fillStyle(cloth, 1).fillPoints(sleeve, true);
  outline(g, sleeve, 2.2);
  g.fillStyle(darker(cloth, 20), 0.5).fillPoints([{ x: -9 * big, y: -4 }, { x: -2, y: -4 }, { x: -2, y: 66 }, { x: -8, y: 66 }, { x: -10 * big, y: 40 }], true);
  g.fillStyle(darker(cloth, 30), 1).fillRect(-8, 62, 16, 4);
  g.fillStyle(l.skin, 1).fillEllipse(0, 74, 13, 16); // hand
  g.lineStyle(2, INK, 0.85).strokeEllipse(0, 74, 13, 16);
  g.fillStyle(darker(l.skin, 15), 1).fillEllipse(-3, 76, 5, 9);
}

function drawHead(g: Phaser.GameObjects.Graphics, l: Look): void {
  // Head center is at (0, -22) above the neck joint at (0, 0).
  const skin = l.skin;
  const hair = l.age === 'old' && l.hairStyle !== 'bald' ? lighter(l.hair, 0) : l.hair;
  const cy = -24;
  // Behind the head: long hair, or the back of a head covering.
  if (l.head === 'scarf' || l.head === 'cloth') {
    g.fillStyle(darker(l.headColor, 12), 1).fillPoints([{ x: -24, y: cy - 6 }, { x: 24, y: cy - 6 }, { x: 31, y: 14 }, { x: -31, y: 14 }], true);
  } else if (l.hairStyle === 'long' || (l.hairStyle === 'wild' && l.head !== 'helmet')) {
    g.fillStyle(darker(hair, 8), 1).fillRoundedRect(-21, cy - 12, 42, 44, 14);
  }
  // Neck and head
  g.fillStyle(darker(skin, 12), 1).fillRect(-7, -6, 14, 10);
  g.fillStyle(skin, 1).fillEllipse(-17, cy + 1, 7, 11).fillEllipse(17, cy + 1, 7, 11); // ears
  g.lineStyle(2, INK, 0.85).strokeEllipse(-17, cy + 1, 7, 11).strokeEllipse(17, cy + 1, 7, 11);
  g.fillStyle(skin, 1).fillEllipse(0, cy, 34, 42);
  g.lineStyle(2.4, INK, 0.9).strokeEllipse(0, cy, 34, 42);
  g.fillStyle(darker(skin, 14), 0.5).fillEllipse(-10, cy + 4, 12, 22); // shade on one cheek
  g.fillStyle(0xd0605a, l.sex === 'f' ? 0.22 : 0.12).fillCircle(-9, cy + 7, 5).fillCircle(9, cy + 7, 5); // rosy cheeks
  g.fillStyle(lighter(skin, 10), 0.35).fillEllipse(4, cy - 12, 14, 6); // light on the forehead
  // Nose
  g.fillStyle(darker(skin, 18), 1).fillTriangle(1, cy - 1, 4, cy + 8, -1, cy + 9);
  g.fillStyle(darker(skin, 30), 1).fillCircle(-1, cy + 9, 1.3).fillCircle(3, cy + 9, 1.3);
  // Age lines
  if (l.age === 'old') {
    g.lineStyle(1, darker(skin, 25), 0.7).lineBetween(-7, cy - 13, 7, cy - 13).lineBetween(-12, cy + 1, -10, cy + 4).lineBetween(12, cy + 1, 10, cy + 4);
  }
  // Eyebrows
  g.lineStyle(2.4, darker(l.age === 'old' ? l.beardColor : hair, 5), 1).lineBetween(-11, cy - 7, -4, cy - 8).lineBetween(4, cy - 8, 11, cy - 7);

  // Beard and moustache (the mouth is drawn over them while speaking)
  const bc = l.beardColor;
  if (l.beard === 'stubble') {
    g.fillStyle(darker(skin, 22), 0.45).fillEllipse(0, cy + 13, 26, 16);
  } else if (l.beard !== 'none') {
    const len = l.beard === 'long' ? 26 : l.beard === 'full' ? 16 : 9;
    const beard = [{ x: -16, y: cy + 1 }, { x: -14, y: cy + 12 }, { x: -8, y: cy + 17 + len * 0.6 }, { x: 0, y: cy + 18 + len }, { x: 8, y: cy + 17 + len * 0.6 }, { x: 14, y: cy + 12 }, { x: 16, y: cy + 1 }, { x: 12, y: cy + 8 }, { x: 6, y: cy + 15 }, { x: -6, y: cy + 15 }, { x: -12, y: cy + 8 }];
    g.fillStyle(bc, 1).fillPoints(beard, true);
    outline(g, beard, 2);
    g.fillStyle(bc, 1).fillEllipse(-4, cy + 13, 11, 4).fillEllipse(4, cy + 13, 11, 4); // moustache
    g.lineStyle(1, darker(bc, 20), 0.6).lineBetween(-4, cy + 20, -3, cy + 18 + len).lineBetween(4, cy + 20, 3, cy + 18 + len);
  }

  // Hair on top, or a head covering
  if (l.head === 'helmet') {
    g.fillStyle(0x8a7a5a, 1).fillEllipse(0, cy - 10, 40, 30);
    g.fillStyle(0xa8986e, 1).fillRect(-20, cy - 8, 40, 6);
    g.fillStyle(0x8a7a5a, 1).fillRect(-19, cy - 4, 6, 18).fillRect(13, cy - 4, 6, 18); // cheek guards
    g.fillStyle(0xa8302a, 1).fillEllipse(0, cy - 30, 34, 12); // crest
    return;
  }
  if (l.head === 'turban') {
    g.fillStyle(l.headColor, 1).fillEllipse(0, cy - 18, 40, 26);
    g.lineStyle(2, darker(l.headColor, 15), 1).lineBetween(-18, cy - 18, 18, cy - 14).lineBetween(-18, cy - 12, 18, cy - 9);
    g.fillStyle(0xd8b04a, 1).fillRect(-7, cy - 16, 14, 4); // gold band
    return;
  }
  if (l.head === 'scarf' || l.head === 'cloth') {
    const c = l.headColor;
    if (l.sex === 'f') {
      g.fillStyle(hair, 1).fillEllipse(0, cy - 14, 28, 10); // a little hair at the front
    } else {
      g.fillStyle(hair, 1).fillEllipse(0, cy - 15, 30, 10);
    }
    const cover = [{ x: -22, y: cy - 6 }, { x: -18, y: cy - 22 }, { x: 0, y: cy - 30 }, { x: 18, y: cy - 22 }, { x: 22, y: cy - 6 }, { x: 25, y: cy + 16 }, { x: 18, y: cy + 16 }, { x: 15, y: cy - 10 }, { x: 0, y: cy - 18 }, { x: -15, y: cy - 10 }, { x: -18, y: cy + 16 }, { x: -25, y: cy + 16 }];
    g.fillStyle(c, 1).fillPoints(cover, true);
    outline(g, cover);
    g.fillStyle(darker(c, 18), 0.6).fillPoints([{ x: -22, y: cy - 6 }, { x: -15, y: cy - 10 }, { x: -18, y: cy + 16 }, { x: -25, y: cy + 16 }], true);
    if (l.sex === 'm') g.fillStyle(darker(c, 40), 1).fillRect(-17, cy - 21, 34, 3); // cord
    return;
  }
  if (l.hairStyle === 'bald') {
    g.fillStyle(hair, 1).fillEllipse(-15, cy - 4, 6, 12).fillEllipse(15, cy - 4, 6, 12);
    return;
  }
  const top = [{ x: -17, y: cy + 1 }, { x: -18, y: cy - 14 }, { x: -8, y: cy - 23 }, { x: 8, y: cy - 23 }, { x: 18, y: cy - 14 }, { x: 17, y: cy + 1 }, { x: 14, y: cy - 8 }, { x: 4, y: cy - 13 }, { x: -6, y: cy - 12 }, { x: -14, y: cy - 7 }];
  g.fillStyle(hair, 1).fillPoints(top, true);
  if (l.hairStyle !== 'curly' && l.hairStyle !== 'wild') outline(g, top, 2);
  if (l.hairStyle === 'curly' || l.hairStyle === 'wild') {
    const r = l.hairStyle === 'wild' ? 7 : 5;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1.05 + (i / 8) * 0.9);
      g.fillCircle(Math.cos(a) * 17, cy - 6 + Math.sin(a) * 18, r + (i % 2));
    }
  } else if (l.hairStyle === 'wavy' || l.hairStyle === 'long') {
    g.fillEllipse(-11, cy - 15, 16, 10).fillEllipse(9, cy - 16, 18, 10);
    if (l.hairStyle === 'long') g.fillRoundedRect(-21, cy - 10, 7, 30, 3).fillRoundedRect(14, cy - 10, 7, 30, 3);
  }
  g.fillStyle(lighter(hair, 12), 0.35).fillEllipse(5, cy - 18, 12, 4); // shine
  if (l.head === 'headband') g.fillStyle(l.headColor, 1).fillRect(-17, cy - 12, 34, 4);
}

// ---------- the living person ----------

export class Person {
  readonly root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Container;
  private head: Phaser.GameObjects.Container;
  private front: Phaser.GameObjects.Container;
  private back: Phaser.GameObjects.Container;
  private eyes: Phaser.GameObjects.Graphics;
  private mouth: Phaser.GameObjects.Graphics;
  private feet: Phaser.GameObjects.Graphics;
  private look: Look;
  private gaze = 0;
  private talkTimer?: Phaser.Time.TimerEvent;
  private gestureTween?: Phaser.Tweens.Tween;
  private timers: Phaser.Time.TimerEvent[] = [];
  private walking = false;
  private glow?: Phaser.GameObjects.Graphics;

  constructor(readonly scene: Phaser.Scene, readonly id: string, x: number, y: number, member = 0) {
    const l = (this.look = resolveLook(id, member));
    const key = `person:${id}:${member}:${lookSig(id)}`;
    const scale = l.height * (l.age === 'young' ? 0.97 : 1);
    this.root = scene.add.container(x, y).setScale(scale);

    if (l.extra === 'shine') {
      // Heavenly visitors shine (Matthew 17:2-3, 28:3)
      this.glow = scene.add.graphics();
      for (let i = 5; i >= 1; i--) this.glow.fillStyle(0xfff6d8, 0.1).fillEllipse(0, -110, 70 * i * 0.5, 130 * i * 0.42);
      this.root.add(this.glow);
      scene.tweens.add({ targets: this.glow, alpha: 0.6, yoyo: true, repeat: -1, duration: 1600 });
    }
    const shadow = scene.add.graphics().fillStyle(0x000000, 0.28).fillEllipse(0, 0, 86, 16);
    this.feet = scene.add.graphics();
    this.drawFeet(0);
    this.body = scene.add.container(0, 0);
    const { shoulder } = widths(l);
    const cloth = l.mantle !== null && l.sex !== 'f' && l.extra !== 'toga' ? l.mantle : l.tunic;
    this.back = scene.add.container(-shoulder - 1, SHOULDER_Y + 2, [bake(scene, `${key}:armB`, -14, -6, 28, 92, (g) => drawArm(g, l, l.sex === 'f' && l.mantle !== null ? l.mantle : cloth))]);
    this.front = scene.add.container(shoulder + 1, SHOULDER_Y + 2, [bake(scene, `${key}:armF`, -14, -6, 28, 92, (g) => drawArm(g, l, l.sex === 'f' && l.mantle !== null ? l.mantle : l.tunic))]);
    const torso = bake(scene, `${key}:body`, -46, -176, 92, 178, (g) => drawBody(g, l));
    this.head = scene.add.container(0, NECK);
    this.head.add(bake(scene, `${key}:head`, -34, -64, 68, 90, (g) => drawHead(g, l)));
    this.eyes = scene.add.graphics();
    this.mouth = scene.add.graphics();
    this.head.add([this.eyes, this.mouth]);
    this.drawEyes();
    this.drawMouth(0);
    // Both arms hang in front of the body, so everyone clearly has two arms.
    this.back.setAngle(5);
    this.front.setAngle(-5);
    this.head.setScale(1.14);
    this.body.add([torso, this.back, this.front, this.head]);
    this.root.add([shadow, this.feet, this.body]);
    if (l.extra === 'jar') {
      const jar = scene.add.graphics();
      jar.fillStyle(0xb06a3a, 1).fillEllipse(0, 0, 26, 32).fillRect(-6, -22, 12, 8);
      jar.fillStyle(0x8a4a22, 1).fillRect(-8, -24, 16, 4);
      jar.setPosition(0, 62);
      this.front.add(jar);
    }
    this.idle();
    // Stop blinking and talking once the person is removed from the screen.
    this.root.once(Phaser.GameObjects.Events.DESTROY, () => this.stopTimers());
  }

  // Small, slow movements so nobody stands perfectly still.
  private idle(): void {
    const s = this.scene;
    const r = Math.random();
    s.tweens.add({ targets: this.body, scaleY: 1.012, yoyo: true, repeat: -1, duration: 1700 + r * 600, ease: 'Sine.easeInOut', delay: r * 800 });
    s.tweens.add({ targets: this.head, angle: { from: -1.5, to: 1.5 }, yoyo: true, repeat: -1, duration: 2600 + r * 1500, ease: 'Sine.easeInOut' });
    s.tweens.add({ targets: [this.front, this.back], angle: { from: -1.5, to: 1.5 }, yoyo: true, repeat: -1, duration: 2200 + r * 900, ease: 'Sine.easeInOut' });
    const blink = () => {
      this.eyes.setScale(1, 0.12);
      this.timers.push(s.time.delayedCall(110, () => this.eyes.setScale(1, 1)));
      this.timers.push(s.time.delayedCall(2200 + Math.random() * 3500, blink));
    };
    this.timers.push(s.time.delayedCall(800 + Math.random() * 2500, blink));
  }

  private drawEyes(): void {
    const cy = -24 - 1;
    const g = this.eyes.clear();
    g.y = cy;
    const dx = this.gaze * 2;
    for (const ex of [-7, 7]) {
      g.fillStyle(0xf6f1e8, 1).fillEllipse(ex, 0, 10.5, 6.2);
      g.fillStyle(0x5a3a22, 1).fillCircle(ex + dx, 0.4, 2.9); // brown iris
      g.fillStyle(0x1a0f08, 1).fillCircle(ex + dx, 0.4, 1.5);
      g.fillStyle(0xffffff, 0.95).fillCircle(ex + dx + 1, -0.7, 0.9); // sparkle
      g.lineStyle(1.6, 0x2a1a10, 1).lineBetween(ex - 5.4, -2.4, ex + 5.4, -2.4); // eyelid
      if (this.look.sex === 'f') g.lineBetween(ex + 5 * Math.sign(ex), -2.4, ex + 6.8 * Math.sign(ex), -3.8); // lashes
    }
  }

  private drawMouth(open: number): void {
    const g = this.mouth.clear();
    const y = -24 + 14 + (this.look.beard === 'none' || this.look.beard === 'stubble' ? 0 : 1);
    if (open < 0.15) {
      g.fillStyle(darker(this.look.skin, 22), 1).fillEllipse(0, y + 1, 9, 3); // lips
      g.lineStyle(1.6, darker(this.look.skin, 50), 1).lineBetween(-4.5, y, 4.5, y);
    } else {
      g.fillStyle(0x4a1e18, 1).fillEllipse(0, y + open * 1.5, 8, 2 + open * 5);
      g.fillStyle(0xf4efe6, 0.8).fillRect(-3, y + open * 1.5 - (1 + open * 2.5), 6, 1.2);
    }
  }

  private drawFeet(step: number): void {
    const g = this.feet.clear();
    const skin = this.look.skin;
    for (const side of [-1, 1]) {
      const lift = Math.max(0, Math.sin(step + (side > 0 ? Math.PI : 0))) * 4;
      const fx = side * 10 + (this.walking ? Math.cos(step + (side > 0 ? Math.PI : 0)) * 7 : 0);
      g.fillStyle(0x5a3a1c, 1).fillEllipse(fx + side * 2, -2 - lift, 20, 7);
      g.fillStyle(skin, 1).fillEllipse(fx + side * 2, -5 - lift, 16, 6);
      g.lineStyle(1.5, 0x4a2a10, 1).lineBetween(fx + side * 2 - 4, -7 - lift, fx + side * 2 + 4, -4 - lift);
    }
  }

  // Which way to look: -1 left, 0 ahead, 1 right.
  lookToward(x: number | null): void {
    const g = x === null ? 0 : Phaser.Math.Clamp((x - this.root.x) / 150, -1, 1);
    if (Math.abs(g - this.gaze) < 0.05) return;
    this.gaze = g;
    this.drawEyes();
  }

  // Speaking: the mouth moves, the head nods a little, and the hands gesture.
  talk(on: boolean): void {
    this.talkTimer?.remove();
    this.talkTimer = undefined;
    if (!on) {
      this.drawMouth(0);
      this.gestureTween?.stop();
      this.scene.tweens.add({ targets: this.front, rotation: 0, duration: 400 });
      return;
    }
    let n = 0;
    this.talkTimer = this.scene.time.addEvent({
      delay: 95, loop: true,
      callback: () => {
        n++;
        this.drawMouth(n % 5 === 0 ? 0 : 0.3 + Math.random() * 0.7);
        if (n % 26 === 5) this.gesture();
        if (n % 11 === 0) this.scene.tweens.add({ targets: this.head, y: NECK + 1.5, yoyo: true, duration: 180 });
      },
    });
  }

  private gesture(): void {
    if (this.walking) return;
    this.gestureTween?.stop();
    const lift = -0.5 - Math.random() * 0.7;
    this.gestureTween = this.scene.tweens.add({ targets: this.front, rotation: lift, duration: 450, yoyo: true, hold: 700 + Math.random() * 600, ease: 'Sine.easeInOut' });
  }

  // Joy: a little jump with both hands raised and a big smile.
  cheer(delay = 0): void {
    const s = this.scene;
    s.time.delayedCall(delay, () => {
      if (!this.root.scene || this.walking) return;
      this.gestureTween?.stop();
      this.drawMouth(1);
      s.tweens.add({ targets: this.front, rotation: -2.5, duration: 220, yoyo: true, hold: 700, ease: 'Back.easeOut' });
      s.tweens.add({ targets: this.back, rotation: 2.5, duration: 220, yoyo: true, hold: 700, ease: 'Back.easeOut' });
      s.tweens.add({ targets: this.body, y: -26, duration: 200, yoyo: true, repeat: 1, ease: 'Quad.easeOut', onComplete: () => { this.body.y = 0; this.drawMouth(0); } });
    });
  }

  // Thinking it over: head tilted, hand on chin.
  ponder(): void {
    if (this.walking) return;
    const s = this.scene;
    this.gestureTween?.stop();
    s.tweens.add({ targets: this.head, angle: 9, duration: 300, yoyo: true, hold: 1100 });
    s.tweens.add({ targets: this.front, rotation: -2.3, duration: 350, yoyo: true, hold: 1000 });
  }

  // Surprise: a quick hop back, eyebrows up, mouth open.
  amazed(): void {
    if (this.walking) return;
    const s = this.scene;
    this.drawMouth(1);
    s.tweens.add({ targets: this.body, y: -10, scaleY: 1.04, duration: 160, yoyo: true, onComplete: () => this.drawMouth(0) });
    s.tweens.add({ targets: [this.front], rotation: -1.4, duration: 200, yoyo: true, hold: 600 });
    s.tweens.add({ targets: [this.back], rotation: 1.4, duration: 200, yoyo: true, hold: 600 });
  }

  private stepTimer?: Phaser.Time.TimerEvent;

  // Legs, arms and body move in a walking rhythm (the figure itself is moved by Figure.walkTo).
  setWalking(on: boolean): void {
    this.stepTimer?.remove();
    this.stepTimer = undefined;
    this.walking = on;
    if (!on) {
      this.body.y = 0;
      this.front.rotation = 0;
      this.back.rotation = 0;
      this.drawFeet(0);
      return;
    }
    this.gestureTween?.stop();
    let t = Math.random() * 3;
    this.stepTimer = this.scene.time.addEvent({
      delay: 33, loop: true,
      callback: () => {
        t += 0.24;
        this.drawFeet(t);
        this.body.y = -Math.abs(Math.sin(t)) * 3;
        this.front.rotation = Math.sin(t) * 0.28;
        this.back.rotation = -Math.sin(t) * 0.28;
      },
    });
  }

  // "His clothes became as white as the light" (Matthew 17:2)
  shine(): void {
    const s = this.scene;
    for (const part of [this.back, this.front, this.head]) {
      const img = part.list[0] as Phaser.GameObjects.Image;
      const w = s.add.image(img.x, img.y, img.texture.key).setOrigin(img.originX, img.originY).setScale(img.scaleX).setTintFill(0xfffdf4).setAlpha(part === this.head ? 0 : 0.8);
      part.addAt(w, 1);
    }
    const torso = this.body.list[0] as Phaser.GameObjects.Image;
    const w = s.add.image(torso.x, torso.y, torso.texture.key).setOrigin(torso.originX, torso.originY).setScale(torso.scaleX).setTintFill(0xfffdf4).setAlpha(0.85);
    this.body.addAt(w, 1);
    const glow = s.add.graphics();
    for (let i = 5; i >= 1; i--) glow.fillStyle(0xfff6d8, 0.12).fillEllipse(0, -110, 90 * i * 0.5, 150 * i * 0.42);
    this.root.addAt(glow, 0);
    s.tweens.add({ targets: glow, alpha: 0.6, yoyo: true, repeat: -1, duration: 1400 });
  }

  destroy(): void {
    this.root.destroy();
  }

  private stopTimers(): void {
    for (const t of this.timers) t.remove();
    this.talkTimer?.remove();
    this.stepTimer?.remove();
  }
}

// A character on the stage: one person, or a small group for crowds.
export class Figure {
  readonly root: Phaser.GameObjects.Container;
  readonly people: Person[] = [];

  constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
    this.root = scene.add.container(x, y);
    const n = Math.max(1, looks[id]?.group ?? 1);
    // Groups stand slightly staggered, the middle one in front.
    const order = n === 3 ? [0, 2, 1] : [...Array(n).keys()];
    for (const i of order) {
      const p = new Person(scene, id, (i - (n - 1) / 2) * 44, n > 1 && i !== Math.floor(n / 2) ? -6 : 0, i);
      if (n > 1) p.root.setScale(p.root.scaleX * 0.92);
      this.people.push(p);
      this.root.add(p.root);
    }
  }

  talk(on: boolean): void {
    // In a group, take turns so it looks like several voices.
    this.people.forEach((p, i) => (i === 0 || !on ? p.talk(on) : p.scene.time.delayedCall(300 * i, () => p.talk(on))));
  }

  lookToward(x: number | null): void {
    for (const p of this.people) p.lookToward(x === null ? null : x - this.root.x + p.root.x + this.root.x);
  }

  // Walk to a spot at about walking pace. Resolves on arrival.
  walkTo(x: number, speed = 120): Promise<void> {
    const dist = Math.abs(x - this.root.x);
    if (dist < 2) return Promise.resolve();
    for (const p of this.people) p.setWalking(true);
    return new Promise((done) => {
      this.root.scene.tweens.add({
        targets: this.root, x, duration: (dist / speed) * 1000,
        onComplete: () => {
          for (const p of this.people) p.setWalking(false);
          done();
        },
      });
    });
  }

  shine(): void {
    for (const p of this.people) p.shine();
  }

  cheer(): void {
    this.people.forEach((p, i) => p.cheer(i * 120 + Math.random() * 150));
  }

  ponder(): void {
    for (const p of this.people) p.ponder();
  }

  amazed(): void {
    for (const p of this.people) p.amazed();
  }
}

// A head-and-shoulders picture for the dialogue box, made from the same drawing.
export function bustTexture(scene: Phaser.Scene, id: string): string | null {
  if (!looks[id] && !characters[id]?.disciple) return null;
  const key = `person:${id}:bust:${lookSig(id)}`;
  if (!scene.textures.exists(key)) {
    const l = resolveLook(id, 0);
    const g = scene.make.graphics({}, false);
    const R = 3;
    g.scaleCanvas(R, R);
    g.translateCanvas(50, 250);
    drawBody(g, l);
    g.translateCanvas(0, NECK);
    drawHead(g, l);
    // Eyes and a calm mouth
    for (const ex of [-7, 7]) {
      g.fillStyle(0xf4efe6, 1).fillEllipse(ex, -25, 9, 5);
      g.fillStyle(0x2a1a10, 1).fillCircle(ex, -24.7, 2.2);
      g.lineStyle(1.2, darker(l.skin, 35), 1).lineBetween(ex - 5, -27.2, ex + 5, -27.2);
    }
    const my = -24 + 14 + (l.beard === 'none' || l.beard === 'stubble' ? 0 : 1);
    g.lineStyle(1.8, darker(l.skin, 45), 1).lineBetween(-4, my, 4, my);
    g.generateTexture(key, 100 * R, 110 * R);
    g.destroy();
  }
  return key;
}

// People in Person form are part of the stage for these ids.
export function hasLook(id: string): boolean {
  return !!looks[id] || !!characters[id]?.disciple;
}
