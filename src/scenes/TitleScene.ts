import Phaser from 'phaser';
import { COLORS, FONT, makeButton } from '../ui';
import { canSpeak, speak } from '../systems/speech';

// Height is always 720; width grows on wide screens (set in create()).
let W = 1280;
const H = 720;
const VERSION = 'Phase 1 · v0.1.0';

// Title screen: the Jordan River valley at dawn, drawn with simple shapes
// as placeholder art. Each layer drifts at a different speed (parallax).
export class TitleScene extends Phaser.Scene {
  private layers: { obj: Phaser.GameObjects.Graphics; speed: number }[] = [];

  constructor() {
    super('Title');
  }

  create(): void {
    W = this.scale.width;
    this.scale.once('resize', () => this.scene.restart());
    this.drawSky();
    this.layers = [
      { obj: this.drawHills(400, 0x9a7a8c, 1, 1), speed: 3 },
      { obj: this.drawHills(470, 0x74805a, 1, 2), speed: 7 },
      { obj: this.drawHills(560, 0x4a6a3c, 1, 3), speed: 14 },
      { obj: this.drawRiver(), speed: 0 },
      { obj: this.drawReeds(), speed: 22 },
    ];

    this.add
      .text(W / 2, 150, 'Follow Me', {
        fontFamily: FONT, fontSize: '110px', color: '#fff4d6', fontStyle: 'bold',
        stroke: '#3b2410', strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setShadow(0, 6, '#000000', 12, true, true);
    this.add
      .text(W / 2, 240, 'Walk with Jesus', {
        fontFamily: FONT, fontSize: '44px', color: '#ffe7b0', stroke: '#3b2410', strokeThickness: 6,
      })
      .setOrigin(0.5);

    makeButton(this, W / 2, 400, 'Begin', () => this.begin());
    makeButton(this, W / 2, 530, '🔊 Test Voice', () => this.testVoice());

    this.add
      .text(W / 2, H - 36, 'Third Heaven Studios', {
        fontFamily: FONT, fontSize: '28px', color: '#f3e6c8',
      })
      .setOrigin(0.5);
    this.add.text(16, H - 30, VERSION, { fontFamily: FONT, fontSize: '18px', color: '#e8d9b5' });
  }

  update(_time: number, delta: number): void {
    // Slowly slide each layer to the left, wrapping around.
    for (const { obj, speed } of this.layers) {
      if (!speed) continue;
      obj.x -= (speed * delta) / 1000;
      if (obj.x <= -W) obj.x += W;
    }
  }

  private begin(): void {
    if (!this.scale.isFullscreen && this.sys.game.device.input.touch) {
      this.scale.startFullscreen();
    }
    this.showToast('Chapter 1 arrives in Phase 2!');
  }

  private testVoice(): void {
    if (!canSpeak()) {
      this.showToast('This browser has no built-in voice.');
      return;
    }
    speak('Welcome to Follow Me. Come and walk with Jesus and His disciples.');
    this.showToast('You should hear a voice now.');
  }

  private showToast(message: string): void {
    const t = this.add
      .text(W / 2, 640, message, {
        fontFamily: FONT, fontSize: '30px', color: '#2b1d12',
        backgroundColor: '#f3e6c8', padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 500, onComplete: () => t.destroy() });
  }

  private drawSky(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x2c3e6b, 0x2c3e6b, 0xf2b36b, 0xf2b36b, 1).fillRect(0, 0, W, H);
    g.fillStyle(0xfff0c0, 0.9).fillCircle(W * 0.72, H * 0.52, 60);
    g.fillStyle(0xffe0a0, 0.25).fillCircle(W * 0.72, H * 0.52, 110);
  }

  // Rolling hills drawn twice side by side so the layer can wrap seamlessly.
  private drawHills(baseY: number, color: number, alpha: number, seed: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(color, alpha);
    for (const offset of [0, W]) {
      const pts: Phaser.Types.Math.Vector2Like[] = [{ x: offset, y: H }];
      for (let i = 0; i <= 80; i++) {
        const x = (i / 80) * W;
        const y = baseY
          - 40 * Math.sin((x / W) * Math.PI * 2 * seed + seed)
          - 20 * Math.sin((x / W) * Math.PI * 2 * (seed + 2));
        pts.push({ x: offset + x, y });
      }
      pts.push({ x: offset + W, y: H });
      g.fillPoints(pts, true);
    }
    return g;
  }

  private drawRiver(): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(0x4f86a8, 1);
    const r = (f: number) => f * W;
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

  private drawReeds(): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.lineStyle(5, COLORS.ink, 0.85);
    for (const offset of [0, W]) {
      for (let x = 10; x < W - 5; x += 37) {
        const h = 50 + ((x * 7) % 45);
        g.lineBetween(offset + x, H, offset + x + ((x % 3) - 1) * 8, H - h);
      }
    }
    return g;
  }
}
