import Phaser from 'phaser';
import exploreJson from '../../content/en/explore.json';
import { FONT, makeButton } from '../ui/common';
import { drawBackdrop, drawFloor, FLOOR_Y, skyTopColor } from '../art/backdrops';
import { addAmbientLife } from '../art/ambient';
import { Figure, Person, setPlayerLook } from '../art/people';
import { characters, ui, type SceneData } from '../systems/content';
import { speak } from '../systems/speech';
import { sfx } from '../systems/audio';
import { confetti } from '../ui/celebrate';
import { drawItem, questMark, type ItemKind } from '../art/items';
import type { Hud } from '../ui/hud';
import type { Slot } from '../systems/save';

// Walk-around mode. Before a story moment, the player walks their own
// character through the place: tapping the ground walks there, tapping a
// person talks to them, and tapping a found thing picks it up. One villager
// has a small quest. Reaching the glowing star starts the story.

interface Place { villagers: string[]; quest: { ask: string; item: ItemKind; count: number } }
const data = exploreJson as unknown as { hint: string; storySign: string; questDone: string; places: Record<string, Place> };

export function canExplore(backdrop: string): boolean {
  return !!data.places[backdrop];
}

const LANE = 610; // where everyone's feet are while walking around
const DROP = 80; // how much lower the scenery sits than in story scenes
// The ground you can walk on runs from far away (higher up, smaller) to near
// (lower down, bigger), so the place has depth like a 3D scene.
const NEAR = 690;
const FAR = FLOOR_Y + DROP + 40;
const depthScale = (y: number) => 0.62 + (0.5 * (y - FAR)) / (NEAR - FAR);
const PARALLAX = 0.06; // the scenery slides past slower than the ground
const OFFSTAGE = ['narrator', 'voice-from-heaven', 'tempter'];

export function explore(scene: Phaser.Scene, opts: {
  sceneData: SceneData; backdrop: string; slot: Slot; rate: number;
  makeHud: () => Hud; onMenu: () => void; save: () => void;
}): Promise<void> {
  return new Promise((resolve) => {
    const W = scene.scale.width;
    const H = scene.scale.height;
    const worldW = Math.round(W * 2.3);
    const place = data.places[opts.backdrop];
    const cam = scene.cameras.main;
    const timers: Phaser.Time.TimerEvent[] = [];
    let finished = false;

    // The place's picture stays put while the path and people scroll past it.
    const first = scene.children.list.length;
    // The scenery sits a little lower here, so the ground in front isn't too tall.
    scene.add.rectangle(0, 0, W, DROP + 4, skyTopColor(opts.sceneData.timeOfDay)).setOrigin(0);
    drawBackdrop(scene, opts.backdrop, opts.sceneData.timeOfDay);
    addAmbientLife(scene, opts.backdrop, opts.sceneData.timeOfDay);
    scene.children.list.slice(first).forEach((o, i) => {
      // Far away things move slowly as you walk (parallax). Full-width pictures
      // are a little wider so their edges never show.
      (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor?.(PARALLAX);
      const t = o as unknown as Phaser.GameObjects.Components.Transform;
      if (o instanceof Phaser.GameObjects.RenderTexture || o instanceof Phaser.GameObjects.Rectangle) t.scaleX *= 1.12;
      if (i > 0 && typeof t.y === 'number') t.y += DROP;
    });
    drawFloor(scene, opts.backdrop, opts.sceneData.timeOfDay, worldW, FLOOR_Y + DROP);
    foreground(scene, worldW, H);

    // The story's people wait at the far end, by a glowing star.
    const storyX = worldW - W * 0.42;
    const speakers = [...new Set(opts.sceneData.lines.map((l) => l.speaker))].filter((id) => !OFFSTAGE.includes(id) && characters[id]).slice(0, 3);
    speakers.forEach((id, i) => {
      const y = 560 + (i % 2) * 50;
      const f = new Figure(scene, id, storyX + 60 + i * 120, y);
      f.root.setScale(depthScale(y)).setDepth(y);
      f.lookToward(storyX - 400);
    });
    const ring = scene.add.ellipse(storyX - 120, LANE + 4, 170, 46, 0xfff3a0, 0.5).setDepth(LANE - 5);
    scene.tweens.add({ targets: ring, scaleX: 1.15, scaleY: 1.15, alpha: 0.25, yoyo: true, repeat: -1, duration: 700 });
    const star = scene.add.star(storyX - 120, LANE - 170, 5, 20, 44, 0xf2c94c).setStrokeStyle(4, 0xa8742a).setDepth(LANE);
    scene.tweens.add({ targets: star, y: LANE - 190, angle: 20, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.easeInOut' });
    const sign = scene.add.text(storyX - 120, LANE - 110, opts.sceneData.title, {
      fontFamily: FONT, fontSize: '24px', color: '#fff8e6', fontStyle: 'bold', backgroundColor: '#5a3a1cdd', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(LANE);

    // Villagers along the path; the first one has a quest.
    const lines = place.villagers.slice(0, 3);
    const villagers = lines.map((line, i) => {
      const x = W * 0.55 + (i * (storyX - 380 - W * 0.55)) / Math.max(1, lines.length - 1);
      const y = [580, 660, 545][i % 3];
      const sc = depthScale(y);
      const p = new Person(scene, 'townspeople', x, y, i + 3);
      p.root.setScale(p.root.scaleX * sc).setDepth(y);
      // A generous invisible area to tap, the size of the person
      const zone = scene.add.zone(x, y - 115 * sc, 110 * sc, 240 * sc).setInteractive({ useHandCursor: true }).setDepth(y + 1);
      return { p, zone, line, talked: false, y, sc };
    });
    const giver = villagers[0];
    const mark = questMark(scene, giver.p.root.x, giver.y - 268 * giver.sc);
    mark.obj.setDepth(giver.y + 2);
    scene.tweens.add({ targets: mark.obj, y: mark.obj.y - 14, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.easeInOut' });

    // The player
    setPlayerLook(opts.slot.look);
    const player = new Figure(scene, 'player', W * 0.18, 620);
    const label = scene.add.text(player.root.x, LANE - 214, opts.slot.name, {
      fontFamily: FONT, fontSize: '22px', color: '#fff8e6', fontStyle: 'bold', stroke: '#2b1d12', strokeThickness: 5,
    }).setOrigin(0.5, 1);
    const glowUnder = scene.add.ellipse(player.root.x, LANE + 8, 90, 20, 0x7fd0ff, 0.35);
    scene.children.moveBelow(glowUnder as unknown as Phaser.GameObjects.GameObject, player.root as unknown as Phaser.GameObjects.GameObject);
    cam.setBounds(0, 0, worldW, H);
    cam.startFollow(player.root, true, 0.1, 0);

    // On-screen controls
    const hud = opts.makeHud();
    const menu = makeButton(scene, 70, 54, '☰', opts.onMenu, { width: 100, height: 84, fontSize: 44 }).setScrollFactor(0).setDepth(3000);
    const skip = makeButton(scene, W - 150, 54, `${ui.toStory} ⭐`, () => walk(storyX - 120), { width: 260, height: 76, fontSize: 26 }).setScrollFactor(0).setDepth(3000);
    const arrow = scene.add.text(W - 60, LANE - 120, '➜', { fontSize: '64px', color: '#fff4d6', stroke: '#3b2410', strokeThickness: 8 }).setOrigin(0.5).setScrollFactor(0).setDepth(3000);
    scene.tweens.add({ targets: arrow, x: W - 44, yoyo: true, repeat: -1, duration: 450 });

    // Speech bubbles
    let bubble: Phaser.GameObjects.Container | undefined;
    const say = (x: number, text: string, headY = LANE - 240) => {
      bubble?.destroy();
      const t = scene.add.text(0, 0, text, {
        fontFamily: FONT, fontSize: '26px', color: '#2b1d12', align: 'center', wordWrap: { width: 360 },
      }).setOrigin(0.5);
      const bw = t.width + 44;
      const bh = t.height + 30;
      const g = scene.add.graphics();
      g.fillStyle(0x000000, 0.25).fillRoundedRect(-bw / 2 + 4, -bh / 2 + 5, bw, bh, 18);
      g.fillStyle(0xfffbf0, 1).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 18);
      g.lineStyle(3, 0x5a3a1c, 1).strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 18);
      g.fillStyle(0xfffbf0, 1).fillTriangle(-14, bh / 2 - 2, 14, bh / 2 - 2, 0, bh / 2 + 22);
      g.lineStyle(3, 0x5a3a1c, 1).lineBetween(-14, bh / 2, 0, bh / 2 + 22).lineBetween(0, bh / 2 + 22, 14, bh / 2);
      const b = scene.add.container(Phaser.Math.Clamp(x, cam.scrollX + bw / 2 + 10, cam.scrollX + W - bw / 2 - 10), Math.max(130 + bh / 2, headY - 40 - bh / 2), [g, t]).setDepth(2000).setScale(0.3);
      scene.tweens.add({ targets: b, scale: 1, duration: 220, ease: 'Back.easeOut' });
      bubble = b;
      speak(text, { rate: opts.rate });
      timers.push(scene.time.delayedCall(Math.max(3500, text.length * 75), () => { if (bubble === b) { b.destroy(); bubble = undefined; } }));
    };

    // Walking: the player walks to a spot, facing the way they're going.
    let arrive: (() => void) | undefined;
    const walk = (x: number, then?: () => void, y = player.root.y) => {
      const tx = Phaser.Math.Clamp(x, 60, worldW - 60);
      const ty = Phaser.Math.Clamp(y, FAR, NEAR);
      scene.tweens.killTweensOf(player.root);
      const dir = tx >= player.root.x ? 1 : -1;
      if (Math.abs(tx - player.root.x) > 4) for (const p of player.people) p.root.scaleX = Math.abs(p.root.scaleX) * dir;
      arrive = then;
      const dist = Math.hypot(tx - player.root.x, (ty - player.root.y) * 1.6);
      if (dist < 6) { arrive?.(); return; }
      for (const p of player.people) p.setWalking(true);
      scene.tweens.add({
        targets: player.root, x: tx, y: ty, duration: (dist / 300) * 1000,
        onComplete: () => {
          for (const p of player.people) p.setWalking(false);
          const a = arrive;
          arrive = undefined;
          a?.();
        },
      });
    };
    const follow = () => {
      // Nearer is bigger, and nearer things are drawn in front.
      const sc = depthScale(player.root.y);
      player.root.setScale(sc).setDepth(player.root.y);
      label.setPosition(player.root.x, player.root.y - 222 * sc).setDepth(player.root.y + 1);
      glowUnder.setPosition(player.root.x, player.root.y + 2).setScale(sc).setDepth(player.root.y - 1);
      arrow.setVisible(cam.scrollX + W < storyX - 200);
      if (!finished && player.root.x >= storyX - 230) finish();
    };
    scene.events.on('update', follow);

    // Tap the ground to walk there.
    const onTap = (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length || finished) return;
      walk(p.worldX, undefined, p.worldY);
    };
    scene.input.on('pointerdown', onTap);

    // Talking to villagers
    let questStarted = false;
    let found = 0;
    villagers.forEach((v) => {
      v.zone.on('pointerdown', () => {
        const side = player.root.x < v.p.root.x ? -1 : 1;
        walk(v.p.root.x + side * 100 * v.sc, () => {
          v.p.lookToward(player.root.x);
          for (const pp of player.people) pp.root.scaleX = Math.abs(pp.root.scaleX) * -side;
          if (v === giver && !questStarted) {
            questStarted = true;
            mark.set('looking');
            say(v.p.root.x, place.quest.ask, v.y - 250 * v.sc);
            spawnItems();
          } else if (v === giver && found >= place.quest.count) {
            say(v.p.root.x, data.questDone, v.y - 250 * v.sc);
          } else {
            say(v.p.root.x, v.line, v.y - 250 * v.sc);
          }
          v.p.talk(true);
          timers.push(scene.time.delayedCall(2200, () => v.p.talk(false)));
          if (!v.talked) {
            v.talked = true;
            hud.earn(1, v.p.root.x, v.y - 200);
          }
        }, v.y + 4);
      });
    });

    // The quest: find the things the villager lost.
    const spawnItems = () => {
      for (let i = 0; i < place.quest.count; i++) {
        const x = W * 0.3 + Math.random() * (storyX - W * 0.75);
        const iy = FAR + 30 + Math.random() * (NEAR - FAR - 50);
        const item = drawItem(scene, place.quest.item, x, iy);
        item.setScale(1.25 * depthScale(iy)).setDepth(iy);
        const shine = scene.add.circle(x, item.y - 24 * depthScale(iy), 40 * depthScale(iy), 0xfff3a0, 0.35).setDepth(iy - 1);
        scene.children.moveBelow(shine as unknown as Phaser.GameObjects.GameObject, item as unknown as Phaser.GameObjects.GameObject);
        scene.tweens.add({ targets: shine, scale: 1.3, alpha: 0.1, yoyo: true, repeat: -1, duration: 600 });
        scene.tweens.add({ targets: item, y: item.y - 8, yoyo: true, repeat: -1, duration: 700 + i * 90 });
        item.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Circle(0, -22, 42), hitAreaCallback: Phaser.Geom.Circle.Contains });
        item.on('pointerdown', () => walk(x, () => {
          if (!item.active) return;
          item.disableInteractive();
          shine.destroy();
          sfx('scroll');
          found++;
          hud.earn(2, x, item.y - 40);
          scene.tweens.add({ targets: item, y: item.y - 120, scale: 1.5, alpha: 0, duration: 600, onComplete: () => item.destroy() });
          if (found === place.quest.count) {
            mark.set('done');
            timers.push(scene.time.delayedCall(700, () => {
              say(giver.p.root.x, data.questDone, giver.y - 250 * giver.sc);
              giver.p.cheer();
              confetti(scene, giver.p.root.x, LANE - 200, 40, 59);
              sfx('achievement');
              hud.earn(5, giver.p.root.x, LANE - 200);
              opts.save();
            }));
          }
        }, iy + 4));
      }
    };

    timers.push(scene.time.delayedCall(900, () => say(player.root.x, data.hint, player.root.y - 240 * depthScale(player.root.y))));

    const finish = () => {
      finished = true;
      opts.save();
      scene.input.off('pointerdown', onTap);
      scene.events.off('update', follow);
      sfx('chime');
      menu.disableInteractive();
      skip.disableInteractive();
      cam.fadeOut(500, 0, 0, 0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        for (const t of timers) t.remove();
        cam.stopFollow();
        cam.removeBounds();
        cam.setScroll(0, 0);
        cam.fadeIn(400);
        resolve();
      });
    };
    scene.events.once('shutdown', () => {
      scene.input.off('pointerdown', onTap);
      scene.events.off('update', follow);
      cam.stopFollow();
      cam.removeBounds();
      cam.setScroll(0, 0);
    });
  });
}

// Bushes in the very front, which slide past a little faster for depth.
function foreground(scene: Phaser.Scene, worldW: number, H: number): void {
  const front = scene.add.graphics().setScrollFactor(1.25).setDepth(1000);
  for (let i = 0; i < worldW / 380; i++) {
    const x = i * 380 + 120;
    front.fillStyle(0x3f6a2a, 1).fillCircle(x, H + 10, 70).fillCircle(x + 60, H + 20, 55).fillCircle(x - 50, H + 25, 50);
    front.fillStyle(0x5a8a3a, 0.7).fillCircle(x - 10, H - 20, 30);
  }
}
