import Phaser from 'phaser';
import type { TimeOfDay } from '../systems/content';

// Small living things that make a place feel alive: birds crossing the sky,
// butterflies, grazing sheep, glinting water, fireflies and twinkling stars.
// They are few and simple, so they cost almost nothing on a cheap phone.

const OUTDOOR_GREEN = ['jordan', 'galilee', 'mountain', 'village', 'olives', 'lake', 'well', 'cliff', 'tomb-open'];
const WATER: Record<string, [number, number]> = { lake: [300, 420], galilee: [420, 520], jordan: [640, 700] };

export function addAmbientLife(scene: Phaser.Scene, backdrop: string, time: TimeOfDay, calm = true): void {
  const W = scene.scale.width;
  const night = time === 'night';
  const day = time === 'midday' || time === 'dawn';
  if (!calm) return; // storms and the cross stay still and serious

  if (!night && backdrop !== 'room' && backdrop !== 'courtyard' && backdrop !== 'golgotha') birds(scene, W);
  if (day && OUTDOOR_GREEN.includes(backdrop)) butterflies(scene, W, 2 + (backdrop === 'galilee' || backdrop === 'mountain' ? 1 : 0));
  if (!night && (backdrop === 'galilee' || backdrop === 'mountain')) sheep(scene, W);
  const water = WATER[backdrop];
  if (water) glints(scene, W, water[0], water[1], night);
  if (night && backdrop !== 'room') { fireflies(scene, W); twinkle(scene, W); }
  if (backdrop === 'wilderness' && day) dust(scene, W);
}

// A small flock in a loose V, flapping as it crosses the sky now and then.
function birds(scene: Phaser.Scene, W: number): void {
  const fly = () => {
    if (!scene.sys.isActive()) return;
    const flock = scene.add.container(-60, 120 + Math.random() * 110).setDepth(1);
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const b = scene.add.graphics();
      b.lineStyle(2.5, 0x2b2a30, 0.85);
      b.beginPath().moveTo(-8, 0).lineTo(0, 3).lineTo(8, 0).strokePath();
      b.setPosition(-i * 22, (i % 2 ? 1 : -1) * i * 7);
      scene.tweens.add({ targets: b, scaleY: { from: 1, to: -0.6 }, yoyo: true, repeat: -1, duration: 220 + i * 15 });
      flock.add(b);
    }
    scene.tweens.add({
      targets: flock, x: W + 200, y: flock.y - 40 + Math.random() * 80, duration: 14000 + Math.random() * 6000,
      onComplete: () => flock.destroy(),
    });
  };
  scene.time.delayedCall(1500 + Math.random() * 3000, fly);
  scene.time.addEvent({ delay: 16000, loop: true, callback: fly });
}

function butterflies(scene: Phaser.Scene, W: number, n: number): void {
  const colors = [0xf2c94c, 0xffffff, 0xe8834a, 0x8ab4f8];
  for (let i = 0; i < n; i++) {
    const c = colors[i % colors.length];
    const bf = scene.add.container(W * (0.1 + Math.random() * 0.8), 330 + Math.random() * 90).setDepth(1);
    const wings = scene.add.graphics();
    wings.fillStyle(c, 1).fillEllipse(-5, -2, 10, 8).fillEllipse(5, -2, 10, 8).fillEllipse(-4, 4, 7, 6).fillEllipse(4, 4, 7, 6);
    wings.fillStyle(0x2b1d12, 1).fillRect(-1, -5, 2, 11);
    bf.add(wings);
    scene.tweens.add({ targets: wings, scaleX: 0.25, yoyo: true, repeat: -1, duration: 130 + i * 20 });
    const wander = () => {
      if (!bf.scene) return;
      scene.tweens.add({
        targets: bf, x: Phaser.Math.Clamp(bf.x + (Math.random() - 0.5) * 260, 20, W - 20), y: 300 + Math.random() * 130,
        duration: 2200 + Math.random() * 1800, ease: 'Sine.easeInOut', onComplete: wander,
      });
    };
    wander();
  }
}

// Sheep grazing on the hillside, now and then taking a few steps.
function sheep(scene: Phaser.Scene, W: number): void {
  for (let i = 0; i < 4; i++) {
    const s = scene.add.container(W * (0.08 + i * 0.27 + Math.random() * 0.08), 420 - Math.random() * 30).setScale(0.55 + Math.random() * 0.2);
    const g = scene.add.graphics();
    g.fillStyle(0x3a2e26, 1).fillRect(-12, 6, 4, 12).fillRect(8, 6, 4, 12);
    g.fillStyle(0xf2eee4, 1);
    for (const [dx, dy, r] of [[-10, 0, 10], [0, -4, 11], [10, 0, 10], [0, 4, 10]]) g.fillCircle(dx, dy, r);
    const head = scene.add.graphics();
    head.fillStyle(0x3a2e26, 1).fillEllipse(0, 0, 12, 15);
    head.fillStyle(0xf2eee4, 1).fillEllipse(-6, -4, 7, 4).fillEllipse(6, -4, 7, 4);
    head.setPosition(19, 2);
    s.add([g, head]);
    if (Math.random() < 0.5) s.scaleX *= -1;
    // Grazing: the head dips to the grass and back up.
    scene.tweens.add({ targets: head, y: 10, angle: 25, yoyo: true, repeat: -1, hold: 1200, repeatDelay: 1500 + Math.random() * 2500, duration: 600 });
    scene.time.addEvent({
      delay: 6000 + Math.random() * 6000, loop: true,
      callback: () => scene.tweens.add({ targets: s, x: s.x + (s.scaleX > 0 ? 18 : -18), duration: 1200, ease: 'Sine.easeInOut' }),
    });
  }
}

// Sunlight (or moonlight) glinting on the water.
function glints(scene: Phaser.Scene, W: number, top: number, bottom: number, night: boolean): void {
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * W;
    const y = top + 8 + Math.random() * (bottom - top - 16);
    const g = scene.add.rectangle(x, y, 18 + Math.random() * 30, 2.5, night ? 0xdfe6ff : 0xffffff, 0.8).setAlpha(0);
    scene.tweens.add({ targets: g, alpha: 0.9, x: x + 12, yoyo: true, repeat: -1, duration: 900 + Math.random() * 900, delay: Math.random() * 2000, repeatDelay: Math.random() * 2000 });
  }
}

function fireflies(scene: Phaser.Scene, W: number): void {
  for (let i = 0; i < 10; i++) {
    const f = scene.add.circle(Math.random() * W, 300 + Math.random() * 150, 2.5, 0xfff3a0, 1).setAlpha(0).setDepth(1);
    const glow = () => {
      if (!f.scene) return;
      scene.tweens.add({
        targets: f, alpha: { from: 0, to: 1 }, x: f.x + (Math.random() - 0.5) * 80, y: f.y + (Math.random() - 0.5) * 40,
        yoyo: true, duration: 1200 + Math.random() * 1000, delay: Math.random() * 3000, onComplete: glow,
      });
    };
    glow();
  }
}

function twinkle(scene: Phaser.Scene, W: number): void {
  for (let i = 0; i < 12; i++) {
    const s = scene.add.star(Math.random() * W, 20 + Math.random() * 200, 4, 1, 4, 0xffffff, 1).setAlpha(0.2);
    scene.tweens.add({ targets: s, alpha: 1, scale: 1.4, yoyo: true, repeat: -1, duration: 700 + Math.random() * 900, delay: Math.random() * 3000 });
  }
}

// Dust blowing across the desert.
function dust(scene: Phaser.Scene, W: number): void {
  scene.time.addEvent({
    delay: 900, loop: true,
    callback: () => {
      const d = scene.add.circle(-20, 360 + Math.random() * 100, 2 + Math.random() * 3, 0xe8d4a8, 0.6).setDepth(1);
      scene.tweens.add({ targets: d, x: W + 40, y: d.y - 30 + Math.random() * 60, alpha: 0, duration: 5000 + Math.random() * 3000, onComplete: () => d.destroy() });
    },
  });
}
