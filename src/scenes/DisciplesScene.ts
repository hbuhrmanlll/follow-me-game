import Phaser from 'phaser';
import { drawBackdrop } from '../art/backdrops';
import { COLORS, FONT, makeButton, restartOnResize, whenTapped } from '../ui/common';
import { characters, disciples, ui, type DiscipleCard } from '../systems/content';
import { loadSlots } from '../systems/save';
import { speak, stopSpeaking } from '../systems/speech';

const chapterNumber = (id: string) => Number(id.replace(/\D/g, ''));

// The Twelve: a Disciple Card for each one the player has met.
export class DisciplesScene extends Phaser.Scene {
  private detail?: HTMLDivElement;

  constructor() {
    super('Disciples');
  }

  create(data: { slot: number }): void {
    restartOnResize(this, data);
    this.events.once('shutdown', () => { this.detail?.remove(); stopSpeaking(); });
    const W = this.scale.width;
    drawBackdrop(this, 'galilee', 'dusk');
    this.add.rectangle(0, 0, W, this.scale.height, 0x1b1410, 0.45).setOrigin(0);
    const progress = loadSlots()[data.slot]!.progress;
    const met = progress.disciples;
    const reached = Math.max(chapterNumber(progress.chapter), ...progress.completed.map(chapterNumber));

    this.add.text(W / 2, 54, `👥 ${ui.disciplesTitle}  (${met.length}/12)`, {
      fontFamily: FONT, fontSize: '44px', color: '#fff4d6', fontStyle: 'bold', stroke: '#3b2410', strokeThickness: 8,
    }).setOrigin(0.5);
    makeButton(this, 70, 54, '←', () => this.scene.start('Story', data), { width: 100, height: 84, fontSize: 44 });

    const cols = 6;
    const cw = Math.min(220, (W - 80) / cols - 16);
    const ch = 270;
    disciples.order.forEach((id, i) => {
      const x = W / 2 + ((i % cols) - (cols - 1) / 2) * (cw + 16);
      const y = 250 + Math.floor(i / cols) * (ch + 20);
      const who = characters[id];
      const known = met.includes(id);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.3).fillRoundedRect(x - cw / 2 + 4, y - ch / 2 + 6, cw, ch, 18);
      g.fillStyle(known ? COLORS.parchment : 0x6b5a45, 1).fillRoundedRect(x - cw / 2, y - ch / 2, cw, ch, 18);
      g.lineStyle(4, COLORS.goldDark, 1).strokeRoundedRect(x - cw / 2, y - ch / 2, cw, ch, 18);
      if (known) {
        const c = Phaser.Display.Color.HexStringToColor(who.color).color;
        g.fillStyle(c, 1).fillCircle(x, y - 50, 62);
        this.add.text(x, y - 50, who.emblem ?? who.initials, { fontSize: '64px' }).setOrigin(0.5);
      } else {
        g.fillStyle(0x4a3c2c, 1).fillCircle(x, y - 50, 62);
        this.add.text(x, y - 50, '?', { fontFamily: FONT, fontSize: '70px', color: '#b8ab94' }).setOrigin(0.5);
      }
      this.add.text(x, y + 60, known ? who.name : ui.locked, {
        fontFamily: FONT, fontSize: '24px', color: known ? '#2b1d12' : '#e9dcc0', fontStyle: 'bold', align: 'center',
        wordWrap: { width: cw - 16 },
      }).setOrigin(0.5, 0);
      if (known) {
        const zone = this.add.zone(x, y, cw, ch).setInteractive({ useHandCursor: true });
        whenTapped(zone, () => this.showCard(id, disciples.cards[id], reached));
      }
    });
  }

  private showCard(id: string, card: DiscipleCard, reached: number): void {
    const who = characters[id];
    const root = document.createElement('div');
    root.className = 'fm-overlay';
    const panel = document.createElement('div');
    panel.className = 'fm-panel fm-scripture fm-card';
    const head = document.createElement('div');
    head.className = 'fm-row fm-head';
    const badge = document.createElement('div');
    badge.className = 'fm-badge';
    badge.style.background = who.color;
    badge.textContent = who.emblem ?? who.initials;
    const h = document.createElement('h2');
    h.textContent = who.name;
    head.append(badge, h);

    const body = document.createElement('div');
    body.className = 'fm-passage';
    const spoken: string[] = [who.name];
    const row = (label: string, value: string) => {
      if (!value) return;
      const p = document.createElement('p');
      const b = document.createElement('b');
      b.textContent = `${label}: `;
      p.append(b, value);
      body.appendChild(p);
      spoken.push(`${label}: ${value}.`);
    };
    row(ui.alsoCalled, card.alsoCalled);
    row(ui.work, card.work);
    row(ui.hometown, card.hometown);
    row(ui.family, card.family);
    const facts = card.facts.filter((f) => chapterNumber(f.after) <= reached);
    const ul = document.createElement('ul');
    for (const f of facts) {
      const li = document.createElement('li');
      const ref = document.createElement('sup');
      ref.textContent = ` ${f.ref}`;
      li.append(f.text, ref);
      ul.appendChild(li);
      spoken.push(f.text);
    }
    body.appendChild(ul);
    if (facts.length < card.facts.length) {
      const more = document.createElement('p');
      more.className = 'fm-more';
      more.textContent = ui.laterInStory;
      body.appendChild(more);
    }
    if (card.tradition) {
      const t = document.createElement('p');
      t.className = 'fm-tradition';
      const b = document.createElement('b');
      b.textContent = `ⓘ ${ui.tradition}: `;
      t.append(b, card.tradition);
      body.appendChild(t);
      spoken.push(`${ui.tradition}: ${card.tradition}`);
    }
    const buttons = document.createElement('div');
    buttons.className = 'fm-row';
    const hear = document.createElement('button');
    hear.className = 'fm-btn';
    hear.textContent = '🔊';
    hear.onclick = () => speak(spoken.join(' '));
    const close = document.createElement('button');
    close.className = 'fm-btn fm-btn-secondary';
    close.textContent = ui.close;
    close.onclick = () => { stopSpeaking(); root.remove(); this.detail = undefined; };
    buttons.append(hear, close);
    panel.append(head, body, buttons);
    root.appendChild(panel);
    (document.fullscreenElement ?? document.body).appendChild(root);
    this.detail = root;
    speak(spoken.join(' '));
  }
}
