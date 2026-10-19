import Phaser from 'phaser';
import exploreJson from '../../content/en/explore.json';
import { FONT, makeButton } from '../ui/common';
import { drawBackdrop, drawFloor } from '../art/backdrops';
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
    drawBackdrop(scene, opts.backdrop, opts.sceneData.timeOfDay);
    addAmbientLife(scene, opts.backdrop, opts.sceneData.timeOfDay);
    for (const o of scene.children.list.slice(first)) (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor?.(0);
    drawFloor(scene, opts.backdrop, opts.sceneData.timeOfDay, worldW);
    foreground(scene, worldW, H);

    // The story's people wait at the far end, by a glowing star.
    const storyX = worldW - W * 0.42;
    const speakers = [...new Set(opts.sceneData.lines.map((l) => l.speaker))].filter((id) => !OFFSTAGE.includes(id) && characters[id]).slice(0, 3);
    speakers.forEach((id, i) => {
      const f = new Figure(scene, id, storyX + 60 + i * 120, LANE - 10);
      f.lookToward(storyX - 400);
    });
    const ring = scene.add.ellipse(storyX - 120, LANE + 4, 170, 46, 0xfff3a0, 0.5);
    scene.tweens.add({ targets: ring, scaleX: 1.15, scaleY: 1.15, alpha: 0.25, yoyo: true, repeat: -1, duration: 700 });
    const star = scene.add.star(storyX - 120, LANE - 170, 5, 20, 44, 0xf2c94c).setStrokeStyle(4, 0xa8742a);
    scene.tweens.add({ targets: star, y: LANE - 190, angle: 20, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.easeInOut' });
    const sign = scene.add.text(storyX - 120, LANE - 110, opts.sceneData.title, {
      fontFamily: FONT, fontSize: '24px', color: '#fff8e6', fontStyle: 'bold', backgroundColor: '#5a3a1cdd', padding: { x: 12, y: 6 },
    }).setOrigin(0.5);

    // Villagers along the path; the first one has a quest.
    const lines = place.villagers.slice(0, 3);
    const villagers = lines.map((line, i) => {
      const x = W * 0.55 + (i * (storyX - 380 - W * 0.55)) / Math.max(1, lines.length - 1);
      const p = new Person(scene, 'townspeople', x, LANE, i + 3);
      // A generous invisible area to tap, the size of the person
      const zone = scene.add.zone(x, LANE - 115, 110, 240).setInteractive({ useHandCursor: true });
      return { p, zone, line, talked: false };
    });
    const giver = villagers[0];
    const mark = questMark(scene, giver.p.root.x, LANE - 268);
    scene.tweens.add({ targets: mark.obj, y: LANE - 282, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.easeInOut' });

    // The player
    setPlayerLook(opts.slot.look);
    const player = new Figure(scene, 'player', W * 0.18, LANE + 6);
    const label = scene.add.text(player.root.x, LANE - 214, opts.slot.name, {
      fontFamily: FONT, fontSize: '22px', color: '#fff8e6', fontStyle: 'bold', stroke: '#2b1d12', strokeThickness: 5,
    }).setOrigin(0.5, 1);
    const glowUnder = scene.add.ellipse(player.root.x, LANE + 8, 90, 20, 0x7fd0ff, 0.35);
    scene.children.moveBelow(glowUnder as unknown as Phaser.GameObjects.GameObject, player.root as unknown as Phaser.GameObjects.GameObject);
    cam.setBounds(0, 0, worldW, H);
    cam.startFollow(player.root, true, 0.1, 0);

    // On-screen controls
    const hud = opts.makeHud();
    const menu = makeButton(scene, 70, 54, '☰', opts.onMenu, { width: 100, height: 84, fontSize: 44 }).setScrollFactor(0).setDepth(80);
    const skip = makeButton(scene, W - 150, 54, `${ui.toStory} ⭐`, () => walk(storyX - 120), { width: 260, height: 76, fontSize: 26 }).setScrollFactor(0).setDepth(80);
    const arrow = scene.add.text(W - 60, LANE - 120, '➜', { fontSize: '64px', color: '#fff4d6', stroke: '#3b2410', strokeThickness: 8 }).setOrigin(0.5).setScrollFactor(0).setDepth(79);
    scene.tweens.add({ targets: arrow, x: W - 44, yoyo: true, repeat: -1, duration: 450 });

    // Speech bubbles
    let bubble: Phaser.GameObjects.Container | undefined;
    const say = (x: number, text: string) => {
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
      const b = scene.add.container(Phaser.Math.Clamp(x, cam.scrollX + bw / 2 + 10, cam.scrollX + W - bw / 2 - 10), LANE - 300 - bh / 2, [g, t]).setDepth(60).setScale(0.3);
      scene.tweens.add({ targets: b, scale: 1, duration: 220, ease: 'Back.easeOut' });
      bubble = b;
      speak(text, { rate: opts.rate });
      timers.push(scene.time.delayedCall(Math.max(3500, text.length * 75), () => { if (bubble === b) { b.destroy(); bubble = undefined; } }));
    };

    // Walking: the player walks to a spot, facing the way they're going.
    let arrive: (() => void) | undefined;
    const walk = (x: number, then?: () => void) => {
      const tx = Phaser.Math.Clamp(x, 60, worldW - 60);
      scene.tweens.killTweensOf(player.root);
      const dir = tx >= player.root.x ? 1 : -1;
      for (const p of player.people) p.root.scaleX = Math.abs(p.root.scaleX) * dir;
      arrive = then;
      const dist = Math.abs(tx - player.root.x);
      if (dist < 6) { arrive?.(); return; }
      for (const p of player.people) p.setWalking(true);
      scene.tweens.add({
        targets: player.root, x: tx, duration: (dist / 300) * 1000,
        onComplete: () => {
          for (const p of player.people) p.setWalking(false);
          const a = arrive;
          arrive = undefined;
          a?.();
        },
      });
    };
    const follow = () => {
      label.x = player.root.x;
      glowUnder.x = player.root.x;
      arrow.setVisible(cam.scrollX + W < storyX - 200);
      if (!finished && player.root.x >= storyX - 230) finish();
    };
    scene.events.on('update', follow);

    // Tap the ground to walk there.
    const onTap = (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length || finished) return;
      walk(p.worldX);
    };
    scene.input.on('pointerdown', onTap);

    // Talking to villagers
    let questStarted = false;
    let found = 0;
    villagers.forEach((v) => {
      v.zone.on('pointerdown', () => {
        const side = player.root.x < v.p.root.x ? -1 : 1;
        walk(v.p.root.x + side * 100, () => {
          v.p.lookToward(player.root.x);
          for (const pp of player.people) pp.root.scaleX = Math.abs(pp.root.scaleX) * -side;
          if (v === giver && !questStarted) {
            questStarted = true;
            mark.set('looking');
            say(v.p.root.x, place.quest.ask);
            spawnItems();
          } else if (v === giver && found >= place.quest.count) {
            say(v.p.root.x, data.questDone);
          } else {
            say(v.p.root.x, v.line);
          }
          v.p.talk(true);
          timers.push(scene.time.delayedCall(2200, () => v.p.talk(false)));
          if (!v.talked) {
            v.talked = true;
            hud.earn(1, v.p.root.x, LANE - 200);
          }
        });
      });
    });

    // The quest: find the things the villager lost.
    const spawnItems = () => {
      for (let i = 0; i < place.quest.count; i++) {
        const x = W * 0.3 + Math.random() * (storyX - W * 0.75);
        const item = drawItem(scene, place.quest.item, x, LANE - 10 + Math.random() * 30);
        item.setScale(1.2);
        const shine = scene.add.circle(x, item.y - 24, 40, 0xfff3a0, 0.35);
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
              say(giver.p.root.x, data.questDone);
              giver.p.cheer();
              confetti(scene, giver.p.root.x, LANE - 200, 40, 59);
              sfx('achievement');
              hud.earn(5, giver.p.root.x, LANE - 200);
              opts.save();
            }));
          }
        }));
      }
    };

    timers.push(scene.time.delayedCall(900, () => say(player.root.x, data.hint)));

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
  const front = scene.add.graphics().setScrollFactor(1.25).setDepth(55);
  for (let i = 0; i < worldW / 380; i++) {
    const x = i * 380 + 120;
    front.fillStyle(0x3f6a2a, 1).fillCircle(x, H + 10, 70).fillCircle(x + 60, H + 20, 55).fillCircle(x - 50, H + 25, 50);
    front.fillStyle(0x5a8a3a, 0.7).fillCircle(x - 10, H - 20, 30);
  }
}
