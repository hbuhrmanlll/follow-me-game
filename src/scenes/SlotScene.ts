import Phaser from 'phaser';
import { COLORS, FONT, makeButton, restartOnResize } from '../ui/common';
import { drawBackdrop } from '../art/backdrops';
import { fill, getChapter, ui } from '../systems/content';
import { loadSlots, newSlot, saveSlot, SLOT_COUNT } from '../systems/save';
import { askName, confirmBox } from '../ui/dom';

// "Who is playing?" — one save slot for each family member.
export class SlotScene extends Phaser.Scene {
  constructor() {
    super('Slots');
  }

  create(): void {
    restartOnResize(this);
    const W = this.scale.width;
    drawBackdrop(this, 'jordan', 'dawn');
    this.add.rectangle(0, 0, W, this.scale.height, 0x1b1410, 0.45).setOrigin(0);

    this.add
      .text(W / 2, 80, ui.chooseTraveler, {
        fontFamily: FONT, fontSize: '56px', color: '#fff4d6', fontStyle: 'bold', stroke: '#3b2410', strokeThickness: 8,
      })
      .setOrigin(0.5);

    makeButton(this, 90, 80, '←', () => this.scene.start('Title'), { width: 110, height: 90, fontSize: 48 });

    const slots = loadSlots();
    const cardW = Math.min(360, (W - 120) / SLOT_COUNT - 30);
    slots.forEach((slot, i) => {
      const x = W / 2 + (i - 1) * (cardW + 40);
      if (slot) {
        const ch = getChapter(slot.progress.chapter);
        const where = `${fill(ui.continueFrom, { n: ch.number })}\n${ch.scenes[slot.progress.scene]?.title ?? '✓'}`;
        const card = makeButton(this, x, 330, `${slot.name}\n\n${where}`, () => this.play(i), {
          width: cardW, height: 300, fontSize: 32, fill: COLORS.parchment,
        });
        card.setDepth(1);
        makeButton(this, x, 560, ui.erase, () => this.erase(i, slot.name), {
          width: 180, height: 80, fontSize: 28, fill: COLORS.muted,
        });
      } else {
        makeButton(this, x, 330, ui.newTraveler, () => this.newPlayer(i), {
          width: cardW, height: 300, fontSize: 36, fill: 0xe9dcc0,
        });
      }
    });
  }

  private async newPlayer(i: number): Promise<void> {
    const name = await askName();
    if (!name) return;
    saveSlot(i, newSlot(name));
    this.play(i);
  }

  private async erase(i: number, name: string): Promise<void> {
    if (await confirmBox(fill(ui.eraseConfirm, { name }), ui.yesErase)) {
      saveSlot(i, null);
      this.scene.restart();
    }
  }

  private play(i: number): void {
    this.scene.start('Story', { slot: i });
  }
}
