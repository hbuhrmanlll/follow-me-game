import Phaser from 'phaser';
import { FONT } from './common';
import { locations, mapData, mapLabels, type LatLon } from '../systems/content';

export type MarkerStyle = 'visited' | 'current' | 'choice' | 'right' | 'wrong';

const MARKER_COLORS: Record<MarkerStyle, number> = {
  visited: 0xb5432f, current: 0xe2a72e, choice: 0x5a3a1c, right: 0x4f9a3a, wrong: 0x9b8f7a,
};

// A drawn map of first-century Israel. It is taller than the screen, so the
// player drags it up and down. Places are given by id from content/map.json.
export class MapView {
  readonly container: Phaser.GameObjects.Container;
  readonly mapHeight: number;
  private pxLon: number;
  private pxLat: number;
  private markers = new Map<string, { g: Phaser.GameObjects.Graphics; label?: Phaser.GameObjects.Text }>();
  private routeG: Phaser.GameObjects.Graphics;
  private tapHandler?: (id: string | null) => void;

  constructor(
    private scene: Phaser.Scene,
    private x: number,
    private top: number,
    readonly width: number,
    private viewHeight: number,
  ) {
    const b = mapData.bounds;
    // A degree of longitude is shorter than a degree of latitude this far north.
    this.pxLon = width / (b.east - b.west);
    this.pxLat = this.pxLon / Math.cos((32.3 * Math.PI) / 180);
    this.mapHeight = (b.north - b.south) * this.pxLat;
    this.container = scene.add.container(x, top);
    // Only show the part of the map inside the view window.
    const shape = scene.make.graphics({}, false).fillStyle(0xffffff).fillRect(x, top, width, viewHeight);
    this.container.setMask(shape.createGeometryMask());
    this.drawBase();
    this.routeG = scene.add.graphics();
    this.container.add(this.routeG);
    this.enableDrag();
  }

  project([lat, lon]: LatLon): { x: number; y: number } {
    const b = mapData.bounds;
    return { x: (lon - b.west) * this.pxLon, y: (b.north - lat) * this.pxLat };
  }

  point(id: string): { x: number; y: number } {
    return this.project(mapData.places[id]);
  }

  onTap(handler: (id: string | null) => void): void {
    this.tapHandler = handler;
  }

  // Scroll so a place is in the middle of the view.
  centerOn(id: string): void {
    const p = this.point(id);
    this.setScroll(this.viewHeight / 2 - p.y);
  }

  setMarker(id: string, style: MarkerStyle, label?: string): void {
    const old = this.markers.get(id);
    old?.g.destroy();
    old?.label?.destroy();
    const p = this.point(id);
    const g = this.scene.add.graphics();
    const r = style === 'current' ? 17 : 14;
    g.fillStyle(0x000000, 0.3).fillCircle(p.x + 2, p.y + 3, r);
    g.fillStyle(MARKER_COLORS[style], 1).fillCircle(p.x, p.y, r);
    g.lineStyle(4, 0xfff8e6, 1).strokeCircle(p.x, p.y, r);
    this.container.add(g);
    let text: Phaser.GameObjects.Text | undefined;
    if (label) {
      text = this.scene.add.text(p.x, p.y - r - 4, label, {
        fontFamily: FONT, fontSize: '24px', color: '#2b1d12', fontStyle: 'bold', stroke: '#fff8e6', strokeThickness: 6,
      }).setOrigin(0.5, 1);
      this.container.add(text);
    }
    this.markers.set(id, { g, label: text });
  }

  // Draws the dashed route through the places in order. The last leg can animate.
  drawRoute(ids: string[], animateLast = false): Promise<void> {
    const pts = ids.filter((id) => mapData.places[id]).map((id) => this.point(id));
    const draw = (lastFraction: number) => {
      this.routeG.clear();
      for (let i = 1; i < pts.length; i++) {
        const f = i === pts.length - 1 ? lastFraction : 1;
        this.dashed(pts[i - 1], pts[i], f);
      }
    };
    if (!animateLast || pts.length < 2) {
      draw(1);
      return Promise.resolve();
    }
    return new Promise((done) => {
      const t = { f: 0 };
      this.scene.tweens.add({ targets: t, f: 1, duration: 1400, ease: 'Sine.easeInOut', onUpdate: () => draw(t.f), onComplete: () => done() });
    });
  }

  private dashed(a: { x: number; y: number }, b: { x: number; y: number }, fraction: number): void {
    const len = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) * fraction;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const g = this.routeG;
    g.lineStyle(9, 0x5a3a1c, 0.35);
    g.lineBetween(a.x, a.y, a.x + Math.cos(ang) * len, a.y + Math.sin(ang) * len);
    g.lineStyle(5, 0xe2a72e, 1);
    for (let d = 0; d < len; d += 22) {
      const e = Math.min(d + 13, len);
      g.lineBetween(a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d, a.x + Math.cos(ang) * e, a.y + Math.sin(ang) * e);
    }
  }

  private drawBase(): void {
    const g = this.scene.add.graphics();
    const W = this.width;
    const H = this.mapHeight;
    const pts = (list: LatLon[]) => list.map((ll) => this.project(ll));

    g.fillStyle(0x86b4c8, 1).fillRect(0, 0, W, H);
    // Land is everything east of the coastline.
    const coast = pts(mapData.coast);
    g.fillStyle(0xe6d6a6, 1).fillPoints([...coast, { x: W, y: H }, { x: W, y: 0 }, { x: coast[0].x, y: 0 }], true);
    // Greener hills in the north.
    g.fillStyle(0xb9c88a, 0.55).fillEllipse(this.project([32.85, 35.35]).x, this.project([32.85, 35.35]).y, W * 0.75, H * 0.28);
    g.fillStyle(0xd2b98a, 0.5).fillEllipse(this.project([31.6, 35.32]).x, this.project([31.6, 35.32]).y, W * 0.3, H * 0.18);

    g.lineStyle(5, 0x5b93b0, 1);
    for (const river of Object.values(mapData.rivers)) g.strokePoints(pts(river), false);
    g.fillStyle(0x6fa6c2, 1);
    for (const lake of Object.values(mapData.lakes)) g.fillPoints(pts(lake), true);
    g.lineStyle(4, 0x5a3a1c, 1).strokeRect(2, 2, W - 4, H - 4);
    this.container.add(g);

    for (const [id, name] of Object.entries(mapLabels.regions)) {
      const p = this.project(mapData.labels[id]);
      const label = this.scene.add.text(p.x, p.y, name.split('').join(' '), {
        fontFamily: FONT, fontSize: '28px', color: '#8a6a45', fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0.75);
      // Keep region names inside the map's edges.
      label.setX(Phaser.Math.Clamp(p.x, label.width / 2 + 12, W - label.width / 2 - 12));
      this.container.add(label);
    }
    for (const [id, name] of Object.entries(mapLabels.water)) {
      const p = this.project(mapData.labels[id]);
      this.container.add(this.scene.add.text(p.x, p.y, name, {
        fontFamily: FONT, fontSize: '22px', color: '#2f5f7a', fontStyle: 'italic', align: 'center',
        wordWrap: { width: 160 },
      }).setOrigin(0.5));
    }
    this.container.add(this.scene.add.text(W - 40, 40, 'N\n↑', {
      fontFamily: FONT, fontSize: '28px', color: '#5a3a1c', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5, 0));
  }

  private setScroll(y: number): void {
    const min = Math.min(0, this.viewHeight - this.mapHeight);
    this.container.y = this.top + Phaser.Math.Clamp(y, min, 0);
  }

  // Drag to scroll; a short tap picks the nearest marked place.
  private enableDrag(): void {
    const zone = this.scene.add.zone(this.x, this.top, this.width, this.viewHeight).setOrigin(0).setInteractive();
    let startY = 0;
    let startScroll = 0;
    let moved = 0;
    let down = false;
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      down = true;
      startY = p.y;
      startScroll = this.container.y - this.top;
      moved = 0;
    });
    zone.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!down) return;
      moved = Math.max(moved, Math.abs(p.y - startY));
      this.setScroll(startScroll + (p.y - startY));
    });
    const up = (p: Phaser.Input.Pointer) => {
      if (!down) return;
      down = false;
      if (moved < 14) this.tapHandler?.(this.nearest(p.x - this.container.x, p.y - this.container.y));
    };
    zone.on('pointerup', up);
    zone.on('pointerout', () => { down = false; });
    this.zone = zone;
  }

  private zone?: Phaser.GameObjects.Zone;

  private nearest(x: number, y: number): string | null {
    let best: string | null = null;
    let bestD = 55;
    for (const id of this.markers.keys()) {
      const p = this.point(id);
      const d = Phaser.Math.Distance.Between(x, y, p.x, p.y);
      if (d < bestD) { best = id; bestD = d; }
    }
    return best;
  }

  setDepth(d: number): void {
    this.container.setDepth(d);
    this.zone?.setDepth(d + 1);
  }

  destroy(): void {
    this.zone?.destroy();
    this.container.destroy();
  }

  static placeName(id: string): string {
    return locations[id]?.name ?? id;
  }
}
