import Phaser from 'phaser';
import { COLORS, FONT, makeButton, restartOnResize } from '../ui/common';
import { MapView } from '../ui/MapView';
import { chapterOrder, getChapter, ui } from '../systems/content';
import { loadSlots } from '../systems/save';
import { achievements, KNOWN_BOX, totalScrolls } from '../systems/achievements';
import { speak, stopSpeaking } from '../systems/speech';

// My Progress: chapters, verses, disciples, scroll pieces, and achievements.
// The scroll pieces uncover a map picture of the whole journey.
export class ProgressScene extends Phaser.Scene {
  constructor() {
    super('Progress');
  }

  create(data: { slot: number }): void {
    restartOnResize(this, data);
    this.events.once('shutdown', () => stopSpeaking());
    const W = this.scale.width;
    const H = this.scale.height;
    this.add.rectangle(0, 0, W, H, 0x2b1d12).setOrigin(0);
    const slot = loadSlots()[data.slot]!;
    const p = slot.progress;

    // The journey picture: a map covered by tiles, one per scene, in story order.
    const mapW = Math.min(620, W * 0.42);
    const map = new MapView(this, 20, 20, mapW, H - 40);
    const sceneIds = chapterOrder.flatMap((id) => getChapter(id).scenes.map((s) => s.id));
    const cols = 6;
    const rows = Math.ceil(sceneIds.length / cols);
    const tw = mapW / cols;
    const th = map.mapHeight / rows;
    const tiles = this.add.graphics();
    sceneIds.forEach((id, i) => {
      if (p.scrolls.includes(id)) return;
      const x = (i % cols) * tw;
      const y = Math.floor(i / cols) * th;
      tiles.fillStyle(0x6b5a45, 1).fillRect(x, y, tw, th);
      tiles.lineStyle(2, 0x4a3c2c, 1).strokeRect(x, y, tw, th);
      tiles.fillStyle(0x9a8a72, 1).fillCircle(x + tw / 2, y + th / 2, 6);
    });
    map.container.add(tiles);

    // Right-hand panel
    const px = mapW + 50;
    const pw = W - px - 30;
    const g = this.add.graphics();
    g.fillStyle(COLORS.parchment, 1).fillRoundedRect(px - 10, 20, pw + 20, H - 40, 22);
    g.lineStyle(4, COLORS.goldDark, 1).strokeRoundedRect(px - 10, 20, pw + 20, H - 40, 22);
    this.add.text(px + pw / 2, 62, `📊 ${ui.progress}: ${slot.name}`, {
      fontFamily: FONT, fontSize: '32px', color: '#2b1d12', fontStyle: 'bold',
    }).setOrigin(0.5);

    const known = slot.journal.filter((e) => e.box >= KNOWN_BOX).length;
    const stats: [string, string][] = [
      ['📖', `${ui.chaptersDone}: ${p.completed.length}/${chapterOrder.length}`],
      ['⭐', `${ui.versesKnown}: ${known}`],
      ['👥', `${ui.disciplesMet}: ${p.disciples.length}/12`],
      ['📜', `${ui.scrollsFound}: ${p.scrolls.length}/${totalScrolls()}`],
    ];
    stats.forEach(([icon, label], i) => {
      const x = px + (i % 2) * (pw / 2) + 10;
      const y = 110 + Math.floor(i / 2) * 44;
      this.add.text(x, y, `${icon} ${label}`, { fontFamily: FONT, fontSize: '25px', color: '#2b1d12', fontStyle: 'bold' });
    });
    this.add.text(px + 10, 210, ui.pictureHelp, { fontFamily: FONT, fontSize: '20px', color: '#6b5a45', fontStyle: 'italic', wordWrap: { width: pw - 20 } });

    this.add.text(px + 10, 255, `🏆 ${ui.achievements}`, { fontFamily: FONT, fontSize: '26px', color: '#7a4f17', fontStyle: 'bold' });
    const colW = pw / 2;
    achievements.forEach((a, i) => {
      const got = slot.achievements.includes(a.id);
      const x = px + (i % 2) * colW + 10;
      const y = 295 + Math.floor(i / 2) * 50;
      const t = this.add.text(x, y, `${got ? a.icon : '🔒'} ${a.title}`, {
        fontFamily: FONT, fontSize: '21px', color: got ? '#2b1d12' : '#9a8a72', fontStyle: got ? 'bold' : 'normal',
        wordWrap: { width: colW - 20 },
      }).setInteractive({ useHandCursor: true });
      t.on('pointerup', () => speak(`${a.title}. ${a.description}`));
    });

    makeButton(this, px + pw - 60, H - 70, '←', () => this.scene.start('Story', data), { width: 110, height: 80, fontSize: 40 });
  }
}
