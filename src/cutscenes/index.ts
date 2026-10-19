import Phaser from 'phaser';
import cutscenesJson from '../../content/en/cutscenes.json';
import { FONT, makeButton } from '../ui/common';
import { characters, ui } from '../systems/content';
import { Person } from '../art/people';
import { currentMood, setMood, sfx, type Mood } from '../systems/audio';

// Short wordless moments for the biggest events: the picture tells it, and the
// story's own lines (with their Scripture) follow straight after.
export type CutsceneId = keyof typeof cutscenesJson;
export const cutscenes: Record<string, { title: string; ref: string }> = cutscenesJson;

const ELEVEN = ['peter', 'andrew', 'james', 'john', 'philip', 'nathanael', 'matthew', 'thomas', 'james-alphaeus', 'thaddaeus', 'simon-zealot'];

// Jesus wears the same color as on the stage.
const JESUS = Phaser.Display.Color.HexStringToColor(characters.jesus.color).color;

interface Kit {
  scene: Phaser.Scene;
  layer: Phaser.GameObjects.Container;
  W: number;
  H: number;
  at(ms: number, fn: () => void): void;
  every(ms: number, fn: () => void): void;
  tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig): void;
  g(): Phaser.GameObjects.Graphics;
}

interface Script { length: number; mood: Mood; after?: Mood; draw(k: Kit): void }

const SCRIPTS: Record<CutsceneId, Script> = {
  baptism: { length: 10000, mood: 'wonder', draw: baptism },
  storm: { length: 8000, mood: 'storm', draw: (k) => sea(k, false) },
  calm: { length: 9000, mood: 'storm', after: 'peace', draw: (k) => sea(k, true) },
  transfiguration: { length: 10500, mood: 'wonder', draw: transfiguration },
  'empty-tomb': { length: 11000, mood: 'wonder', after: 'joy', draw: emptyTomb },
  ascension: { length: 11500, mood: 'wonder', draw: ascension },
};

export function playCutscene(scene: Phaser.Scene, id: CutsceneId): Promise<void> {
  return new Promise((resolve) => {
    const W = scene.scale.width;
    const H = scene.scale.height;
    const script = SCRIPTS[id];
    const before = currentMood();
    setMood(script.mood);
    const timers: Phaser.Time.TimerEvent[] = [];
    const tweens: Phaser.Tweens.Tween[] = [];
    const root = scene.add.container(0, 0).setDepth(90);
    const layer = scene.add.container(0, 0);
    root.add(layer);
    const kit: Kit = {
      scene, layer, W, H,
      at: (ms, fn) => { timers.push(scene.time.delayedCall(ms, fn)); },
      every: (ms, fn) => { timers.push(scene.time.addEvent({ delay: ms, loop: true, callback: fn })); },
      tween: (cfg) => { tweens.push(scene.tweens.add(cfg)); },
      g: () => { const g = scene.add.graphics(); layer.add(g); return g; },
    };
    script.draw(kit);

    // Wide-screen bars with the title and the Bible reference.
    const bars = scene.add.graphics();
    bars.fillStyle(0x000000, 1).fillRect(0, 0, W, 64).fillRect(0, H - 64, W, 64);
    const info = cutscenes[id];
    const title = scene.add.text(W / 2, 32, info.title, {
      fontFamily: FONT, fontSize: '30px', color: '#fff4d6', fontStyle: 'bold',
    }).setOrigin(0.5);
    const ref = scene.add.text(32, H - 32, info.ref.replace('-', '–'), {
      fontFamily: FONT, fontSize: '26px', color: '#e2c27a', fontStyle: 'italic',
    }).setOrigin(0, 0.5);
    const fader = scene.add.rectangle(0, 0, W, H, 0x000000, 1).setOrigin(0);
    root.add([bars, title, ref, fader]);
    tweens.push(scene.tweens.add({ targets: fader, alpha: 0, duration: 800 }));

    let finished = false;
    const end = () => {
      if (finished) return;
      finished = true;
      skip.disableInteractive();
      scene.tweens.add({
        targets: fader, alpha: 1, duration: 600,
        onComplete: () => {
          for (const t of timers) t.remove();
          for (const t of tweens) t.stop();
          root.destroy();
          setMood(script.after ?? before ?? 'peace');
          resolve();
        },
      });
    };
    const skip = makeButton(scene, W - 110, H - 32, `${ui.skip} ⏭`, end, { width: 180, height: 56, fontSize: 26 });
    root.add(skip);
    timers.push(scene.time.delayedCall(script.length, end));
  });
}

// ---------- drawing helpers ----------

function sky(k: Kit, top: number, bottom: number): Phaser.GameObjects.Graphics {
  const g = k.g();
  g.fillGradientStyle(top, top, bottom, bottom, 1).fillRect(0, 0, k.W, k.H);
  return g;
}

// A simple robed figure standing with its feet at (0, 0).
// A person, drawn the same way as on the stage (see src/art/people.ts).
function person(k: Kit, x: number, y: number, who: string, scale = 1): Phaser.GameObjects.Container {
  const p = new Person(k.scene, who, x, y);
  p.root.setScale(p.root.scaleX * scale * 0.56);
  k.layer.add(p.root);
  return p.root.setData('person', p);
}

function cloud(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, color = 0xffffff, alpha = 1): void {
  g.fillStyle(color, alpha);
  for (const [dx, dy, r] of [[-70, 8, 45], [-25, -14, 60], [30, -6, 55], [75, 10, 40], [0, 18, 50]]) g.fillCircle(x + dx * s, y + dy * s, r * s);
}

// Soft light: a stack of see-through circles.
function glow(k: Kit, x: number, y: number, r: number, color = 0xfff6d8): Phaser.GameObjects.Graphics {
  const g = k.g();
  for (let i = 4; i >= 1; i--) g.fillStyle(color, 0.13).fillCircle(x, y, (r * i) / 4);
  return g;
}

function rays(k: Kit, x: number, y: number, len: number, count = 12): Phaser.GameObjects.Graphics {
  const g = k.scene.add.graphics({ x, y });
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    g.fillStyle(0xfff3c4, 0.16).fillTriangle(0, 0, Math.cos(a - 0.08) * len, Math.sin(a - 0.08) * len, Math.cos(a + 0.08) * len, Math.sin(a + 0.08) * len);
  }
  k.layer.add(g);
  return g;
}

function hillsLine(g: Phaser.GameObjects.Graphics, W: number, H: number, base: number, color: number, bumps: number, height: number, phase = 0): void {
  const pts: Phaser.Types.Math.Vector2Like[] = [{ x: 0, y: H }];
  for (let x = 0; x <= W; x += 20) pts.push({ x, y: base - Math.sin((x / W) * Math.PI * bumps + phase) * height - Math.sin((x / W) * 17 + phase) * height * 0.2 });
  pts.push({ x: W, y: H });
  g.fillStyle(color, 1).fillPoints(pts, true);
}

function dove(k: Kit, x: number, y: number): Phaser.GameObjects.Container {
  const body = k.scene.add.graphics();
  body.fillStyle(0xffffff, 1).fillEllipse(0, 0, 46, 20).fillCircle(22, -6, 9);
  body.fillStyle(0xe2a72e, 1).fillTriangle(30, -7, 38, -4, 30, -2);
  body.fillStyle(0xffffff, 1).fillTriangle(-22, 0, -40, -8, -40, 8);
  const wings = k.scene.add.graphics();
  wings.fillStyle(0xf4f4f4, 1).fillTriangle(-12, -2, 14, -2, -4, -48);
  const c = k.scene.add.container(x, y, [wings, body]);
  k.layer.add(c);
  k.tween({ targets: wings, scaleY: -0.6, yoyo: true, repeat: -1, duration: 260, ease: 'Sine.easeInOut' });
  return c;
}

// ---------- the cutscenes ----------

// Jesus comes up out of the water, heaven opens, and the Spirit descends like a dove.
function baptism(k: Kit): void {
  const { W, H } = k;
  sky(k, 0x5b9bd5, 0xe6f0f2);
  const land = k.g();
  hillsLine(land, W, H, 360, 0xb5a27a, 2, 40, 1);
  hillsLine(land, W, H, 420, 0x7f9a52, 3, 25, 2);
  const cx = W / 2;
  // The heavens open: light appears behind the clouds as they part.
  const light = glow(k, cx, 60, 260).setAlpha(0);
  const beam = k.g().setAlpha(0);
  beam.fillStyle(0xfff3c4, 0.3).fillTriangle(cx - 160, 0, cx + 160, 0, cx, 470);
  beam.fillStyle(0xffffff, 0.25).fillTriangle(cx - 60, 0, cx + 60, 0, cx, 470);
  const left = k.g();
  cloud(left, cx - 90, 90, 1.3);
  const right = k.g();
  cloud(right, cx + 90, 90, 1.3);

  const john = person(k, cx - 150, 560, 'john-baptist', 1.4);
  const jesus = person(k, cx + 40, 560, 'jesus', 1.4);
  // The river is drawn over the people so they stand in it up to the waist.
  const water = k.g();
  water.fillStyle(0x3f8fb8, 1).fillRect(0, 500, W, H - 500);
  water.fillStyle(0x6fb0d0, 0.6);
  for (let i = 0; i < 9; i++) water.fillRect((i * 173) % W, 520 + ((i * 37) % 120), 120, 4);
  const ripples = k.g();

  k.tween({ targets: jesus, y: 650, duration: 900, delay: 900, ease: 'Sine.easeIn' });
  k.at(2400, () => {
    k.tween({ targets: jesus, y: 560, duration: 900, ease: 'Sine.easeOut' });
    const r = { t: 0 };
    k.tween({
      targets: r, t: 1, duration: 1600,
      onUpdate: () => {
        ripples.clear();
        for (const d of [0, 0.3, 0.6]) {
          const p = Math.max(0, r.t - d);
          ripples.lineStyle(4, 0xffffff, 0.6 * (1 - p)).strokeEllipse(jesus.x, 505, 80 + 260 * p, 18 + 50 * p);
        }
      },
    });
  });
  k.at(3800, () => {
    sfx('chime');
    k.tween({ targets: left, x: -260, duration: 1800, ease: 'Sine.easeInOut' });
    k.tween({ targets: right, x: 260, duration: 1800, ease: 'Sine.easeInOut' });
    k.tween({ targets: [light, beam], alpha: 1, duration: 1600 });
  });
  k.at(5200, () => {
    const d = dove(k, cx, 40);
    const halo = glow(k, 0, 0, 70).setAlpha(0);
    k.tween({ targets: d, x: jesus.x, y: 330, duration: 3200, ease: 'Sine.easeInOut' });
    k.tween({ targets: halo, alpha: 1, x: jesus.x, y: 330, duration: 3200 });
  });
  void john;
}

// A storm on the Sea of Galilee. With `calm`, Jesus stands and the sea grows still.
function sea(k: Kit, calm: boolean): void {
  const { W, H } = k;
  const skyG = sky(k, 0x0e1424, 0x2a3550);
  const stars = k.g().setAlpha(0);
  for (let i = 0; i < 60; i++) stars.fillStyle(0xffffff, 0.8).fillCircle((i * 211) % W, 70 + ((i * 89) % 260), (i % 3) + 1);
  stars.fillStyle(0xf4f1dc, 1).fillCircle(W * 0.78, 140, 34);
  const clouds = k.g();
  for (let i = 0; i < 6; i++) cloud(clouds, (i + 0.5) * (W / 6), 110 + (i % 2) * 40, 1.6, 0x3a4256, 0.95);
  const waves = k.g();
  const boat = k.scene.add.container(W / 2, 470);
  const hull = k.scene.add.graphics();
  hull.fillStyle(0x6a4a2a, 1).fillPoints([{ x: -170, y: -40 }, { x: 170, y: -40 }, { x: 120, y: 20 }, { x: -120, y: 20 }], true);
  hull.lineStyle(6, 0x4a321c, 1).lineBetween(0, -40, 0, -240);
  hull.fillStyle(0xd8ccb0, 1).fillTriangle(6, -230, 6, -70, 120, -90);
  boat.add(hull);
  const crew = [-120, -70, 60, 110].map((x) => {
    const p = k.scene.add.graphics();
    p.fillStyle(0x5a4a3a, 1).fillTriangle(-16, -40, 16, -40, 0, -95).fillCircle(0, -100, 11);
    p.x = x;
    return p;
  });
  boat.add(crew);
  const jesus = k.scene.add.graphics();
  jesus.fillStyle(JESUS, 1).fillTriangle(-18, -40, 18, -40, 0, calm ? -115 : -70).fillCircle(calm ? 0 : -18, calm ? -120 : -62, 12);
  jesus.x = -20;
  boat.add(jesus);
  k.layer.add(boat);
  const front = k.g();
  const rain = k.g();
  const flash = k.scene.add.rectangle(0, 0, W, H, 0xffffff, 0).setOrigin(0);
  k.layer.add(flash);

  const st = { amp: 1, t: 0, rain: 1 };
  const drops = Array.from({ length: 110 }, (_, i) => ({ x: (i * 173) % W, y: (i * 97) % H }));
  const wave = (g: Phaser.GameObjects.Graphics, base: number, color: number, speed: number, height: number) => {
    const pts: Phaser.Types.Math.Vector2Like[] = [{ x: 0, y: H }];
    for (let x = 0; x <= W; x += 16) {
      const y = base + st.amp * (Math.sin(x / 90 + st.t * speed) * height + Math.sin(x / 37 - st.t * speed * 1.7) * height * 0.35);
      pts.push({ x, y });
    }
    pts.push({ x: W, y: H });
    g.fillStyle(color, 1).fillPoints(pts, true);
  };
  k.every(33, () => {
    st.t += 0.05;
    waves.clear();
    wave(waves, 430, 0x1f3a52, 1, 40);
    front.clear();
    wave(front, 500, 0x274a68, 1.4, 34);
    if (st.amp < 0.15) {
      // Moonlight on still water.
      front.fillStyle(0xf4f1dc, 0.35).fillRect(W * 0.78 - 30, 520, 60, 6).fillRect(W * 0.78 - 50, 560, 100, 5).fillRect(W * 0.78 - 20, 600, 40, 4);
    }
    boat.y = 470 + Math.sin(st.t * 1.3) * 26 * st.amp;
    boat.angle = Math.sin(st.t * 1.1) * 11 * st.amp;
    rain.clear();
    if (st.rain > 0.02) {
      rain.lineStyle(2, 0xbfd8f0, 0.55 * st.rain);
      for (const d of drops) {
        d.x = (d.x - 7 + W) % W;
        d.y = (d.y + 24) % H;
        rain.lineBetween(d.x, d.y, d.x - 9, d.y + 24);
      }
    }
  });
  const lightning = () => {
    if (st.rain < 0.5) return;
    sfx('thunder');
    k.tween({ targets: flash, fillAlpha: 0.45, duration: 70, yoyo: true, repeat: 1 });
  };
  k.at(700, () => sfx('wind'));
  k.at(1200, lightning);
  k.every(2600, lightning);
  if (!calm) return;
  // Jesus rebukes the wind; the storm stops and the clouds clear.
  k.at(2600, () => {
    const g = glow(k, 0, 0, 120).setAlpha(0);
    k.every(33, () => g.setPosition(boat.x + jesus.x, boat.y - 80));
    k.tween({ targets: g, alpha: 1, duration: 800 });
    k.tween({ targets: st, amp: 0.03, rain: 0, duration: 3200, ease: 'Sine.easeOut' });
    k.tween({ targets: clouds, alpha: 0, y: -120, duration: 3500 });
    k.tween({ targets: stars, alpha: 1, duration: 3500 });
    k.tween({ targets: skyG, alpha: 0.85, duration: 3000 });
  });
  k.at(6200, () => setMood('peace'));
}

// On the mountain Jesus shines like the sun; Moses and Elijah appear; a bright cloud covers them.
function transfiguration(k: Kit): void {
  const { W, H } = k;
  sky(k, 0x3a2d5c, 0xe0805a);
  const g = k.g();
  hillsLine(g, W, H, 470, 0x6e5470, 2, 30, 0.5);
  g.fillStyle(0x4a5a38, 1).fillPoints([{ x: 0, y: H }, { x: W * 0.2, y: 560 }, { x: W / 2 - 120, y: 450 }, { x: W / 2 + 120, y: 450 }, { x: W * 0.8, y: 560 }, { x: W, y: H }], true);
  const cx = W / 2;
  const light = glow(k, cx, 340, 340).setAlpha(0);
  const beams = rays(k, cx, 340, 700, 16).setAlpha(0);
  [cx - 330, cx - 260, cx + 280].forEach((x, i) => {
    const p = person(k, x, 600, ['peter', 'james', 'john'][i], 0.8);
    p.angle = i === 2 ? 12 : -10;
  });
  const jesus = person(k, cx, 455, 'jesus', 1.2);
  const white = person(k, cx, 455, 'jesus', 1.2).setAlpha(0);
  (white.getData('person') as Person).shine();
  const moses = person(k, cx - 190, 470, 'moses', 1.05).setAlpha(0);
  const elijah = person(k, cx + 190, 470, 'elijah', 1.05).setAlpha(0);
  k.at(1200, () => {
    sfx('chime');
    k.tween({ targets: [light, white], alpha: 1, duration: 2200 });
    k.tween({ targets: beams, alpha: 1, duration: 2500 });
    k.tween({ targets: beams, angle: 30, duration: 9000 });
  });
  k.at(4200, () => k.tween({ targets: [moses, elijah], alpha: 0.95, duration: 1800 }));
  const fog = k.g().setAlpha(0);
  for (let i = 0; i < 7; i++) cloud(fog, cx + (i - 3) * 180, 380 + (i % 2) * 60, 2.2, 0xfffdf4, 0.85);
  k.at(7000, () => {
    sfx('chime');
    k.tween({ targets: fog, alpha: 1, duration: 2200 });
  });
  void jesus;
}

// At dawn an earthquake: an angel rolls back the stone, and the tomb is empty.
function emptyTomb(k: Kit): void {
  const { W, H } = k;
  sky(k, 0x2c3e6b, 0xf2b36b);
  const ground = k.g();
  hillsLine(ground, W, H, 520, 0x5f7a3e, 2, 20, 2);
  const shake = k.scene.add.container(0, 0);
  k.layer.add(shake);
  const rock = k.scene.add.graphics();
  const cx = W / 2 + 60;
  rock.fillStyle(0x9a8a6a, 1).fillRoundedRect(cx - 330, 210, 660, 380, 60);
  rock.fillStyle(0x8a7a5a, 1).fillRoundedRect(cx - 300, 240, 200, 120, 40);
  // Inside the tomb: the linen cloths lying there (John 20:6-7).
  rock.fillStyle(0x221a12, 1).fillRoundedRect(cx - 80, 340, 160, 220, { tl: 70, tr: 70, bl: 0, br: 0 });
  const inside = k.scene.add.graphics().setAlpha(0);
  inside.fillStyle(0xfff4d6, 0.5).fillRoundedRect(cx - 80, 340, 160, 220, { tl: 70, tr: 70, bl: 0, br: 0 });
  inside.fillStyle(0xf2ead6, 1).fillRoundedRect(cx - 60, 520, 120, 20, 6).fillRoundedRect(cx + 10, 505, 40, 14, 5);
  const stone = k.scene.add.container(cx, 455);
  const s = k.scene.add.graphics();
  s.fillStyle(0x7a6a52, 1).fillCircle(0, 0, 125);
  s.lineStyle(6, 0x5a4a3a, 1).strokeCircle(0, 0, 125).lineBetween(-60, -60, 60, 60).lineBetween(-60, 60, 60, -60);
  stone.add(s);
  shake.add([rock, inside, stone]);
  const dark = k.scene.add.rectangle(0, 0, W, H, 0x0b1028, 0.55).setOrigin(0);
  k.layer.add(dark);
  k.tween({ targets: dark, alpha: 0, duration: 4000 });

  k.at(1800, () => {
    sfx('rumble');
    k.tween({ targets: shake, x: { from: -10, to: 10 }, yoyo: true, repeat: 12, duration: 70, onComplete: () => { shake.x = 0; } });
  });
  const angel = person(k, cx + 230, 120, 'angel', 1.2).setAlpha(0);
  const aura = glow(k, 0, 0, 150).setAlpha(0);
  k.at(2800, () => {
    sfx('chime');
    k.tween({ targets: [angel, aura], alpha: 1, duration: 1000 });
    k.tween({ targets: angel, y: 400, duration: 2000, ease: 'Sine.easeOut', onUpdate: () => aura.setPosition(angel.x, angel.y - 70) });
  });
  k.at(4600, () => {
    // The stone rolls aside.
    k.tween({ targets: stone, x: cx + 330, angle: 140, duration: 2400, ease: 'Sine.easeInOut' });
    k.tween({ targets: inside, alpha: 1, duration: 2000, delay: 1200 });
  });
  k.at(7300, () => {
    // The angel sits on the stone (Matthew 28:2).
    k.tween({ targets: angel, x: cx + 330, y: 360, duration: 1400, onUpdate: () => aura.setPosition(angel.x, angel.y - 70) });
    sfx('achievement');
  });
}

// Jesus is taken up into heaven and a cloud hides Him; two men in white appear.
function ascension(k: Kit): void {
  const { W, H } = k;
  sky(k, 0x4f8fd0, 0xd8ecf6);
  const g = k.g();
  hillsLine(g, W, H, 590, 0x6a8a4a, 1, 40, 0.3);
  const cx = W / 2;
  const beams = rays(k, cx, -40, 900, 14).setAlpha(0.5);
  k.tween({ targets: beams, angle: 15, duration: 11000 });
  const jesus = person(k, cx, 560, 'jesus', 1.1);
  const aura = glow(k, cx, 500, 110);
  // Eleven disciples watching, looking up.
  for (let i = 0; i < 11; i++) {
    const x = cx + (i < 6 ? -1 : 1) * (160 + (i % 6) * 70);
    const p = person(k, x, 640 + (i % 2) * 18, ELEVEN[i], 0.75);
    p.angle = x < cx ? 6 : -6;
  }
  const veil = k.g().setAlpha(0);
  cloud(veil, cx, 150, 1.6);
  k.at(1000, () => {
    sfx('chime');
    k.tween({ targets: jesus, y: 190, duration: 5200, ease: 'Sine.easeInOut', onUpdate: () => aura.setPosition(0, jesus.y - 560) });
  });
  k.at(4200, () => k.tween({ targets: veil, alpha: 1, duration: 1800 }));
  k.at(5600, () => k.tween({ targets: [jesus, aura], alpha: 0, duration: 1000 }));
  const men = [cx - 110, cx + 110].map((x) => person(k, x, 600, 'angel', 0.95).setAlpha(0));
  k.at(8000, () => {
    sfx('chime');
    k.tween({ targets: men, alpha: 1, duration: 1400 });
  });
}
