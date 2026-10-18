import Phaser from 'phaser';
import { drawBackdrop } from '../art/backdrops';
import { restartOnResize } from '../ui/common';
import { chapterOrder, getChapter, ui } from '../systems/content';
import { printChapter } from '../systems/print';

// Parents & Leaders: Leader Mode, printable summaries, and privacy information.
// Reached only through the "hold for 3 seconds" check.
export class ParentScene extends Phaser.Scene {
  private root?: HTMLDivElement;

  constructor() {
    super('Parents');
  }

  create(): void {
    restartOnResize(this);
    drawBackdrop(this, 'galilee', 'dawn');
    this.events.once('shutdown', () => this.root?.remove());
    this.home();
  }

  private panel(title: string): HTMLDivElement {
    this.root?.remove();
    const root = document.createElement('div');
    root.className = 'fm-overlay';
    const panel = document.createElement('div');
    panel.className = 'fm-panel fm-scripture';
    const h = document.createElement('h2');
    h.textContent = title;
    panel.appendChild(h);
    root.appendChild(panel);
    (document.fullscreenElement ?? document.body).appendChild(root);
    this.root = root;
    return panel;
  }

  private btn(label: string, onClick: () => void, secondary = false): HTMLButtonElement {
    const b = document.createElement('button');
    b.className = secondary ? 'fm-btn fm-btn-secondary' : 'fm-btn';
    b.textContent = label;
    b.onclick = onClick;
    return b;
  }

  private para(parent: HTMLElement, text: string): void {
    const p = document.createElement('p');
    p.textContent = text;
    parent.appendChild(p);
  }

  private home(): void {
    const panel = this.panel(`👪 ${ui.parents}`);
    const body = document.createElement('div');
    body.className = 'fm-passage fm-choices';
    body.append(this.btn(`🎓 ${ui.leaderMode}`, () => this.chapters('leader')));
    this.para(body, ui.leaderHelp);
    body.append(this.btn(`🖨 ${ui.printSummary}`, () => this.chapters('print')));
    this.para(body, ui.printHelp);
    const priv = document.createElement('p');
    priv.className = 'fm-tradition';
    const b = document.createElement('b');
    b.textContent = `🔒 ${ui.privacy}: `;
    priv.append(b, ui.privacyText);
    body.appendChild(priv);
    panel.append(body, this.btn(`← ${ui.backToTitle}`, () => this.scene.start('Title'), true));
  }

  private chapters(mode: 'leader' | 'print'): void {
    const panel = this.panel(mode === 'leader' ? `🎓 ${ui.leaderMode}: ${ui.chooseChapter}` : `🖨 ${ui.printSummary}: ${ui.chooseChapter}`);
    const grid = document.createElement('div');
    grid.className = 'fm-passage fm-grid';
    for (const id of chapterOrder) {
      const ch = getChapter(id);
      grid.appendChild(this.btn(`${ch.number}. ${ch.title}`, () => (mode === 'leader' ? this.scenes(id) : void printChapter(id, 'bsb')), true));
    }
    panel.append(grid, this.btn('←', () => this.home()));
  }

  private scenes(chapterId: string): void {
    const ch = getChapter(chapterId);
    const panel = this.panel(`🎓 ${ch.number}. ${ch.title}: ${ui.chooseScene}`);
    const list = document.createElement('div');
    list.className = 'fm-passage fm-choices';
    ch.scenes.forEach((sc, i) => {
      list.appendChild(this.btn(`${i + 1}. ${sc.title}  (${sc.passage})`, () => this.scene.start('Story', { leader: { chapter: chapterId, scene: i } }), true));
    });
    panel.append(list, this.btn('←', () => this.chapters('leader')));
  }
}
