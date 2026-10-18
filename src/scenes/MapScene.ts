import Phaser from 'phaser';
import { COLORS, FONT, makeButton, restartOnResize } from '../ui/common';
import { MapView } from '../ui/MapView';
import { locations, mapPlace, ui } from '../systems/content';
import { loadSlots } from '../systems/save';
import { speak, stopSpeaking } from '../systems/speech';

interface MapSceneData { slot: number; back: 'Story' | 'Slots'; animate?: boolean }

// The journey map: the route so far, and a summary of each place visited.
export class MapScene extends Phaser.Scene {
  private info!: Phaser.GameObjects.Text;
  private place!: Phaser.GameObjects.Text;

  constructor() {
    super('Map');
  }

  create(data: MapSceneData): void {
    restartOnResize(this, { ...data, animate: false });
    this.events.once('shutdown', () => stopSpeaking());
    const W = this.scale.width;
    const H = this.scale.height;
    this.add.rectangle(0, 0, W, H, 0x2b1d12).setOrigin(0);

    const mapW = Math.min(780, W * 0.52);
    const map = new MapView(this, 20, 20, mapW, H - 40);
    // Places inside Jerusalem share one dot; drop repeats in a row.
    const visited = (loadSlots()[data.slot]?.progress.visited ?? []).map(mapPlace).filter((id, i, a) => id !== a[i - 1]);
    const unique = [...new Set(visited)];
    const current = visited[visited.length - 1];
    for (const id of unique) map.setMarker(id, id === current ? 'current' : 'visited', locations[id]?.name);
    void map.drawRoute(visited, data.animate);
    if (current) map.centerOn(current);
    map.onTap((id) => id && this.show(id));

    // Right-hand panel
    const px = mapW + 50;
    const pw = W - px - 30;
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.parchment, 1).fillRoundedRect(px - 10, 20, pw + 20, H - 40, 22);
    panel.lineStyle(4, COLORS.goldDark, 1).strokeRoundedRect(px - 10, 20, pw + 20, H - 40, 22);
    this.add.text(px + pw / 2, 70, `🗺 ${ui.mapTitle}`, {
      fontFamily: FONT, fontSize: '36px', color: '#2b1d12', fontStyle: 'bold', align: 'center', wordWrap: { width: pw },
    }).setOrigin(0.5);
    this.place = this.add.text(px + pw / 2, 150, '', {
      fontFamily: FONT, fontSize: '34px', color: '#7a4f17', fontStyle: 'bold', align: 'center', wordWrap: { width: pw - 20 },
    }).setOrigin(0.5);
    this.info = this.add.text(px + 10, 200, unique.length ? `${ui.mapTapHint}\n\n${ui.mapDrag}` : ui.mapDrag, {
      fontFamily: FONT, fontSize: '27px', color: '#2b1d12', wordWrap: { width: pw - 20 }, lineSpacing: 6,
    });

    makeButton(this, px + pw / 2 - 90, H - 90, '🔊', () => speak(`${this.place.text}. ${this.info.text}`), {
      width: 120, height: 90, fontSize: 40,
    });
    makeButton(this, px + pw / 2 + 80, H - 90, '←', () => this.scene.start(data.back, { slot: data.slot }), {
      width: 160, height: 90, fontSize: 44,
    });

    if (current) this.show(current, false);
  }

  private show(id: string, read = true): void {
    const loc = locations[id];
    if (!loc) return;
    this.place.setText(loc.name);
    this.info.setText(loc.region === loc.name ? loc.summary : `${loc.region}\n\n${loc.summary}`);
    if (read) speak(`${loc.name}. ${loc.summary}`);
  }
}
