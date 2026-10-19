import Phaser from 'phaser';
import { FONT, makeButton } from '../ui/common';
import { ui, type MiniGamePuzzle } from '../systems/content';
import { speak, stopSpeaking } from '../systems/speech';
import { sfx } from '../systems/audio';
import { Person } from '../art/people';
import { confetti, popText } from '../ui/celebrate';
import type { PuzzleContext } from './panel';

// Action mini-games tied to the stories: quick, tap-only, and impossible to
// lose, so small children can play them. Each one ends by showing the verse.

interface Kit {
  scene: Phaser.Scene;
  layer: Phaser.GameObjects.Container;
  W: number;
  H: number;
  kids: boolean;
  goal: number;
  count(n: number): void;
  done(): void;
  timer(cfg: Phaser.Types.Time.TimerEventConfig): void;
}

const GAMES: Record<MiniGamePuzzle['game'], { goal: [number, number]; play(k: Kit): void }> = {
  fish: { goal: [12, 20], play: fish },
  baskets: { goal: [12, 12], play: baskets },
  climb: { goal: [4, 6], play: climb },
  palms: { goal: [6, 10], play: palms },
};

export function runMiniGame(scene: Phaser.Scene, puzzle: MiniGamePuzzle, ctx: PuzzleContext): Promise<void> {
  return new Promise((resolve) => {
    const W = scene.scale.width;
    const H = scene.scale.height;
    const kids = ctx.difficulty === 'kids';
    const game = GAMES[puzzle.game];
    const goal = kids ? game.goal[0] : game.goal[1];
    const layer = scene.add.container(0, 0).setDepth(50);
    const timers: Phaser.Time.TimerEvent[] = [];
    let finished = false;

    // The game draws itself first; the title bar sits on top.
    const kit: Kit = {
      scene, layer, W, H, kids, goal,
      count: (n) => counter.setText(`${Math.min(n, goal)} / ${goal}`),
      timer: (cfg) => { timers.push(scene.time.addEvent(cfg)); },
      done: () => {
        if (finished) return;
        finished = true;
        for (const t of timers) t.remove();
        sfx('achievement');
        confetti(scene, W * 0.3, H * 0.45, 50, 60);
        confetti(scene, W * 0.7, H * 0.45, 50, 60);
        const msg = `${ui.wellDone} ${puzzle.hint}`;
        speak(`${msg} ${puzzle.ref}.`, { rate: ctx.rate });
        void popText(scene, W / 2, H * 0.36, `⭐ ${ui.wellDone}`, 60, '#fff4d6', 61);
        const verse = scene.add.text(W / 2, H * 0.55, `${puzzle.hint}\n(${puzzle.ref})`, {
          fontFamily: FONT, fontSize: '30px', color: '#fff8e6', fontStyle: 'bold', align: 'center',
          stroke: '#2b1d12', strokeThickness: 7, wordWrap: { width: W - 160 },
        }).setOrigin(0.5).setDepth(61).setAlpha(0);
        const backing = scene.add.graphics().setDepth(61).setAlpha(0);
        backing.fillStyle(0x1b1410, 0.72).fillRoundedRect(W / 2 - verse.width / 2 - 40, verse.y - verse.height / 2 - 24, verse.width + 80, verse.height + 48, 22);
        scene.tweens.add({ targets: [backing, verse], alpha: 1, delay: 900, duration: 500 });
        layer.add([backing, verse]);
        scene.time.delayedCall(1400, () => {
          layer.add(makeButton(scene, W / 2, H - 90, `${ui.continue} ▶`, () => {
            stopSpeaking();
            layer.destroy();
            resolve();
          }, { width: 340, height: 90 }).setDepth(61));
        });
      },
    };
    game.play(kit);
    const bar = scene.add.graphics().fillStyle(0x1b1410, 0.75).fillRoundedRect(20, 16, W - 40, 92, 20);
    const title = scene.add.text(48, 62, puzzle.prompt, {
      fontFamily: FONT, fontSize: '30px', color: '#fff8e6', fontStyle: 'bold', wordWrap: { width: W - 420 },
    }).setOrigin(0, 0.5);
    const counter = scene.add.text(W - 170, 62, `0 / ${goal}`, {
      fontFamily: FONT, fontSize: '36px', color: '#ffe08a', fontStyle: 'bold',
    }).setOrigin(0.5);
    layer.add([bar, title, counter]);
    layer.add(makeButton(scene, W - 70, 62, '🔊', () => speak(puzzle.prompt, { rate: ctx.rate }), { width: 90, height: 76, fontSize: 38 }));
    speak(puzzle.prompt, { rate: ctx.rate });
  });
}

// ---------- Catch the fish (Luke 5:4-7) ----------
function fish(k: Kit): void {
  const { scene, layer, W, H } = k;
  const g = scene.add.graphics();
  g.fillGradientStyle(0xf2b36b, 0xf2b36b, 0x9ec8dc, 0x9ec8dc, 1).fillRect(0, 0, W, H * 0.42);
  g.fillGradientStyle(0x3f8fb8, 0x3f8fb8, 0x1f4a6e, 0x1f4a6e, 1).fillRect(0, H * 0.42, W, H * 0.58);
  g.fillStyle(0xffffff, 0.25);
  for (let i = 0; i < 18; i++) g.fillRect((i * 173) % W, H * 0.46 + ((i * 61) % 260), 60 + (i % 3) * 30, 3);
  layer.add(g);
  // The boat and its net
  const boatX = W / 2;
  const boat = scene.add.graphics();
  boat.fillStyle(0x6a4a2a, 1).fillPoints([{ x: -230, y: -30 }, { x: 230, y: -30 }, { x: 170, y: 40 }, { x: -170, y: 40 }], true);
  boat.lineStyle(8, 0x4a321c, 1).lineBetween(0, -30, 0, -250);
  boat.fillStyle(0xe9dcc0, 1).fillTriangle(8, -240, 8, -60, 150, -80);
  boat.setPosition(boatX, H - 60);
  const net = scene.add.graphics().setPosition(boatX - 150, H - 120);
  let caught = 0;
  const drawNet = () => {
    const bulge = 40 + Math.min(caught, k.goal) * 3;
    net.clear().fillStyle(0xd8c8a0, 0.25).fillEllipse(0, 0, 150, bulge * 1.2);
    net.lineStyle(2, 0xd8c8a0, 0.9).strokeEllipse(0, 0, 150, bulge * 1.2);
    for (let x = -60; x <= 60; x += 20) net.lineBetween(x, -bulge * 0.55, x * 0.7, bulge * 0.55);
    for (let y = -bulge * 0.4; y <= bulge * 0.4; y += 16) net.lineBetween(-70, y, 70, y);
  };
  drawNet();
  layer.add([boat, net]);
  scene.tweens.add({ targets: boat, y: H - 54, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.easeInOut' });

  const jump = () => {
    if (caught >= k.goal) return;
    const x = 80 + Math.random() * (W - 160);
    const f = scene.add.container(x, H * 0.62);
    const body = scene.add.graphics();
    const c = [0x9aa8b0, 0xb8b090, 0x8a9aa8][Math.floor(Math.random() * 3)];
    body.fillStyle(c, 1).fillEllipse(0, 0, 54, 24).fillTriangle(-24, 0, -42, -14, -42, 14);
    body.fillStyle(0xffffff, 0.35).fillEllipse(4, -5, 30, 6);
    body.fillStyle(0x1a1a1a, 1).fillCircle(16, -3, 3);
    f.add(body);
    f.setSize(90, 70).setInteractive({ useHandCursor: true });
    layer.add(f);
    const dir = x < W / 2 ? 1 : -1;
    f.scaleX = dir;
    const peak = H * (0.22 + Math.random() * 0.15);
    const arc = scene.tweens.add({ targets: f, x: x + dir * (160 + Math.random() * 120), duration: 2000, ease: 'Linear' });
    const up = scene.tweens.add({
      targets: f, y: peak, angle: dir * -30, duration: 1000, ease: 'Quad.easeOut', yoyo: true,
      onComplete: () => f.destroy(),
    });
    f.on('pointerdown', () => {
      arc.stop(); up.stop();
      f.disableInteractive();
      caught++;
      k.count(caught);
      sfx(caught % 5 === 0 ? 'chime' : 'tap');
      scene.tweens.add({ targets: f, x: net.x, y: net.y, scale: 0.5, angle: 360, duration: 450, ease: 'Quad.easeIn', onComplete: () => { f.destroy(); drawNet(); } });
      if (caught >= k.goal) {
        // "Their nets began to tear" (Luke 5:6): fish pour in and the net strains.
        scene.time.delayedCall(500, () => {
          scene.tweens.add({ targets: net, x: net.x + 4, yoyo: true, repeat: 8, duration: 60 });
          for (let i = 0; i < 14; i++) scene.time.delayedCall(i * 60, () => { caught++; drawNet(); });
          k.done();
        });
      }
    });
  };
  k.timer({ delay: k.kids ? 900 : 650, loop: true, callback: jump });
  jump();
}

// ---------- Twelve baskets of leftovers (John 6:12-13) ----------
function baskets(k: Kit): void {
  const { scene, layer, W, H } = k;
  const g = scene.add.graphics();
  g.fillGradientStyle(0x7ab0d8, 0x7ab0d8, 0xd8ecf2, 0xd8ecf2, 1).fillRect(0, 0, W, H * 0.4);
  g.fillStyle(0x6f9a4a, 1).fillRect(0, H * 0.4, W, H * 0.6);
  g.fillStyle(0x5f8a3e, 1);
  for (let i = 0; i < 60; i++) g.fillEllipse((i * 97) % W, H * 0.42 + ((i * 53) % (H * 0.55)), 20, 6);
  layer.add(g);
  // Twelve baskets in a row along the bottom
  const per = k.kids ? 1 : 2;
  const full: number[] = Array(12).fill(0);
  const bw = Math.min(90, (W - 80) / 12);
  const basketG = scene.add.graphics();
  const drawBaskets = () => {
    basketG.clear();
    for (let i = 0; i < 12; i++) {
      const x = 40 + bw * (i + 0.5);
      const y = H - 70;
      const done = full[i] >= per;
      basketG.fillStyle(0x9a6a3a, 1).fillRoundedRect(x - bw * 0.4, y - 22, bw * 0.8, 44, { tl: 4, tr: 4, bl: 16, br: 16 });
      basketG.lineStyle(2, 0x6a4422, 1);
      for (let yy = y - 14; yy < y + 20; yy += 9) basketG.lineBetween(x - bw * 0.38, yy, x + bw * 0.38, yy);
      if (full[i] > 0) basketG.fillStyle(0xd9a85a, 1).fillEllipse(x, y - 22, bw * 0.7, done ? 22 : 12);
      if (done) basketG.fillStyle(0xe8c07a, 1).fillCircle(x - 8, y - 30, 7).fillCircle(x + 8, y - 28, 7);
    }
  };
  drawBaskets();
  layer.add(basketG);
  let filled = 0;
  const next = () => full.findIndex((n) => n < per);
  const spawn = () => {
    const isFish = Math.random() < 0.3;
    const p = scene.add.container(60 + Math.random() * (W - 120), H * 0.45 + Math.random() * (H * 0.33));
    const pg = scene.add.graphics();
    if (isFish) {
      pg.fillStyle(0xa89a7a, 1).fillEllipse(0, 0, 44, 18).fillTriangle(-20, 0, -32, -10, -32, 10);
    } else {
      pg.fillStyle(0xd9a85a, 1).fillEllipse(0, 0, 46, 30);
      pg.fillStyle(0xb07a3a, 1).fillEllipse(0, -4, 34, 14);
      pg.fillStyle(0xf2d29a, 0.6).fillEllipse(-6, -8, 14, 5);
    }
    p.add(pg);
    p.setSize(80, 64).setInteractive({ useHandCursor: true }).setScale(0);
    layer.add(p);
    scene.tweens.add({ targets: p, scale: 1, duration: 300, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: p, angle: { from: -6, to: 6 }, yoyo: true, repeat: -1, duration: 700 });
    p.on('pointerdown', () => {
      const i = next();
      if (i === -1) return;
      p.disableInteractive();
      sfx('tap');
      scene.tweens.add({
        targets: p, x: 40 + bw * (i + 0.5), y: H - 90, scale: 0.4, duration: 420, ease: 'Quad.easeIn',
        onComplete: () => {
          p.destroy();
          full[i]++;
          drawBaskets();
          if (full[i] === per) {
            filled++;
            k.count(filled);
            sfx('chime');
            if (filled >= 12) k.done();
          }
        },
      });
    });
  };
  for (let i = 0; i < 5; i++) spawn();
  k.timer({ delay: 700, loop: true, callback: () => { if (layer.list.length < 40 && filled < 12) spawn(); } });
}

// ---------- Zacchaeus climbs the sycamore tree (Luke 19:3-4) ----------
function climb(k: Kit): void {
  const { scene, layer, W, H } = k;
  const g = scene.add.graphics();
  g.fillGradientStyle(0x6aa8d8, 0x6aa8d8, 0xe0eef2, 0xe0eef2, 1).fillRect(0, 0, W, H);
  g.fillStyle(0xc9b48a, 1).fillRect(0, H - 110, W, 110);
  // The sycamore: a thick trunk with branches that alternate sides
  const tx = W * 0.62;
  g.fillStyle(0x7a5a3a, 1).fillRect(tx - 30, 120, 60, H - 210);
  g.fillStyle(0x5a8a3a, 1);
  for (const [dx, dy, r] of [[0, 120, 150], [-120, 170, 110], [120, 170, 110], [-60, 90, 100], [70, 90, 100]]) g.fillCircle(tx + dx, dy, r);
  layer.add(g);
  const steps = k.goal;
  const spots: { x: number; y: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const side = i % 2 ? 1 : -1;
    const y = H - 190 - ((H - 380) * (i + 1)) / steps;
    spots.push({ x: tx + side * 70, y: y + 10 });
    const b = scene.add.graphics();
    b.fillStyle(0x6a4a2a, 1).fillRoundedRect(side > 0 ? 0 : -120, -9, 120, 18, 8);
    b.setPosition(tx, y);
    layer.add(b);
  }
  // The crowd that blocks his view, and Zacchaeus himself (he was short, Luke 19:3)
  for (let i = 0; i < 5; i++) {
    const p = new Person(scene, 'townspeople', W * 0.12 + i * 90, H - 30, i);
    layer.add(p.root);
  }
  const zac = new Person(scene, 'zacchaeus', tx - 140, H - 30);
  layer.add(zac.root);
  const glow = scene.add.circle(0, 0, 46, 0xfff3a0, 0.45);
  layer.add(glow);
  scene.tweens.add({ targets: glow, scale: 1.25, alpha: 0.2, yoyo: true, repeat: -1, duration: 600 });
  let at = 0;
  const target = () => spots[at];
  const showGlow = () => {
    const t = target();
    if (!t) { glow.setVisible(false); return; }
    glow.setPosition(t.x, t.y - 20);
  };
  showGlow();
  glow.setInteractive({ useHandCursor: true });
  glow.on('pointerdown', () => {
    const t = target();
    if (!t) return;
    glow.disableInteractive();
    sfx('tap');
    zac.root.scaleX = t.x > zac.root.x ? Math.abs(zac.root.scaleX) : -Math.abs(zac.root.scaleX);
    scene.tweens.add({ targets: zac.root, x: t.x, duration: 350 });
    scene.tweens.add({
      targets: zac.root, y: t.y + 30, duration: 350, ease: 'Back.easeOut',
      onComplete: () => {
        at++;
        k.count(at);
        if (at >= steps) {
          glow.setVisible(false);
          zac.cheer();
          // Jesus comes along the road below and looks up.
          const jesus = new Person(scene, 'jesus', -60, H - 30);
          layer.add(jesus.root);
          jesus.setWalking(true);
          scene.tweens.add({ targets: jesus.root, x: tx - 160, duration: 2200, onComplete: () => { jesus.setWalking(false); jesus.lookToward(tx); k.done(); } });
        } else {
          showGlow();
          glow.setInteractive({ useHandCursor: true });
        }
      },
    });
  });
}

// ---------- Cloaks and palm branches on the road (Matthew 21:8) ----------
function palms(k: Kit): void {
  const { scene, layer, W, H } = k;
  const g = scene.add.graphics();
  g.fillGradientStyle(0x6aa8d8, 0x6aa8d8, 0xe8f0e8, 0xe8f0e8, 1).fillRect(0, 0, W, H * 0.5);
  g.fillStyle(0x8aa060, 1).fillRect(0, H * 0.5, W, H * 0.5);
  g.fillStyle(0xd8c49a, 1).fillRect(0, H * 0.62, W, 130); // the road
  g.fillStyle(0xc8b48a, 1);
  for (let i = 0; i < 30; i++) g.fillEllipse((i * 131) % W, H * 0.64 + ((i * 37) % 110), 16, 6);
  layer.add(g);
  // Cheering crowds behind the road
  for (let i = 0; i < 7; i++) {
    const p = new Person(scene, i % 2 ? 'townspeople' : 'disciples', 60 + i * ((W - 120) / 6), H * 0.6, i);
    p.root.setScale(p.root.scaleX * 0.75);
    layer.add(p.root);
    scene.time.addEvent({ delay: 1800 + i * 300, loop: true, callback: () => p.cheer() });
  }
  // Jesus riding the donkey, slowly crossing from left to right
  const rider = scene.add.container(-120, H * 0.62 + 100);
  const donkey = scene.add.graphics();
  donkey.fillStyle(0x8a7a6a, 1).fillEllipse(0, -60, 130, 56).fillRect(-50, -40, 12, 44).fillRect(36, -40, 12, 44);
  donkey.fillStyle(0x8a7a6a, 1).fillEllipse(70, -96, 34, 58);
  donkey.fillStyle(0x6a5a4a, 1).fillTriangle(64, -124, 70, -150, 76, -122).fillTriangle(78, -122, 88, -146, 88, -118);
  const jesus = new Person(scene, 'jesus', -6, -70);
  jesus.root.setScale(0.62);
  rider.add([jesus.root, donkey]);
  layer.add(rider);
  scene.tweens.add({ targets: donkey, y: -3, yoyo: true, repeat: -1, duration: 300 });
  // Glowing spots on the road ahead: tap to spread a cloak or a branch
  let placed = 0;
  const spot = () => {
    if (placed >= k.goal) return;
    const x = Math.max(rider.x + 220, 120) + Math.random() * 260;
    if (x > W - 60) return;
    const s = scene.add.ellipse(x, H * 0.62 + 70 + Math.random() * 40, 110, 36, 0xfff3a0, 0.5);
    s.setInteractive({ useHandCursor: true });
    layer.addAt(s, layer.getIndex(rider));
    scene.tweens.add({ targets: s, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
    s.on('pointerdown', () => {
      s.disableInteractive();
      scene.tweens.killTweensOf(s);
      placed++;
      k.count(placed);
      sfx(placed % 3 === 0 ? 'chime' : 'tap');
      const item = scene.add.graphics().setPosition(s.x, s.y);
      if (placed % 2) {
        item.fillStyle([0xa8432f, 0x3a6aa8, 0x7a4a8a, 0x6a8f3a][placed % 4], 1).fillRoundedRect(-50, -12, 100, 24, 8);
      } else {
        item.lineStyle(4, 0x3d6b2c, 1).lineBetween(-50, 0, 50, 0);
        item.fillStyle(0x4a8a3a, 1);
        for (let x = -44; x < 46; x += 10) item.fillTriangle(x, 0, x + 10, -16, x + 6, 0).fillTriangle(x, 0, x + 10, 16, x + 6, 0);
      }
      item.setScale(0);
      layer.addAt(item, layer.getIndex(rider));
      s.destroy();
      scene.tweens.add({ targets: item, scale: 1, duration: 260, ease: 'Back.easeOut' });
      if (placed >= k.goal) {
        speak('Hosanna! Hosanna!');
        scene.tweens.add({ targets: rider, x: W + 160, duration: 3000, onComplete: () => k.done() });
      }
    });
  };
  // The donkey walks on, slowly; it waits near the end until the road is ready.
  k.timer({
    delay: 50, loop: true,
    callback: () => {
      if (placed < k.goal && rider.x < W - 260) rider.x += k.kids ? 0.9 : 1.3;
    },
  });
  jesus.setWalking(false);
  k.timer({ delay: k.kids ? 1300 : 950, loop: true, callback: spot });
  spot();
}
