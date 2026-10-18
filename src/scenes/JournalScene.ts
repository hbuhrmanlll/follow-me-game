import Phaser from 'phaser';
import { drawBackdrop } from '../art/backdrops';
import { restartOnResize } from '../ui/common';
import { fill, loadTranslation, scriptureText, translations, ui } from '../systems/content';
import { loadSlots } from '../systems/save';
import { dueVerses } from '../systems/journal';
import { speak, stopSpeaking } from '../systems/speech';

// The Verse Journal: every verse learned so far, and how well it's known.
export class JournalScene extends Phaser.Scene {
  private root?: HTMLDivElement;

  constructor() {
    super('Journal');
  }

  create(data: { slot: number }): void {
    restartOnResize(this, data);
    drawBackdrop(this, 'jordan', 'dusk');
    this.events.once('shutdown', () => { this.root?.remove(); stopSpeaking(); });
    const slot = loadSlots()[data.slot]!;
    void loadTranslation(slot.translation).then(() => {
      const root = document.createElement('div');
      root.className = 'fm-overlay';
      const panel = document.createElement('div');
      panel.className = 'fm-panel fm-scripture';
      const head = document.createElement('div');
      head.className = 'fm-row fm-head';
      const h = document.createElement('h2');
      h.textContent = `📖 ${ui.journal}`;
      const due = dueVerses(slot).length;
      const practice = document.createElement('button');
      practice.className = due ? 'fm-btn' : 'fm-btn fm-btn-secondary';
      practice.textContent = `✏️ ${fill(ui.practice, { n: due })}`;
      practice.onclick = () => {
        if (due) this.scene.start('Practice', data);
        else speak(ui.practiceNone);
      };
      head.append(h, practice);

      const list = document.createElement('div');
      list.className = 'fm-passage';
      const short = translations.find((t) => t.id === slot.translation)?.short ?? '';
      if (!slot.journal.length) list.textContent = ui.journalEmpty;
      for (const e of slot.journal) {
        const text = scriptureText(e.ref, e.quote, slot.translation);
        const p = document.createElement('p');
        p.className = 'fm-verse';
        const stars = '★'.repeat(e.box) + '☆'.repeat(5 - e.box);
        p.innerHTML = '';
        const ref = document.createElement('b');
        ref.textContent = `${e.ref} · ${short}  `;
        const known = document.createElement('span');
        known.className = 'fm-stars';
        known.textContent = stars;
        known.title = ui.known;
        const body = document.createElement('div');
        body.textContent = `“${text}”`;
        p.append(ref, known, body);
        p.onclick = () => speak(`${e.ref}. ${text}`);
        list.appendChild(p);
      }
      const back = document.createElement('button');
      back.className = 'fm-btn';
      back.textContent = '←';
      back.onclick = () => this.scene.start('Story', data);
      panel.append(head, list, back);
      root.appendChild(panel);
      (document.fullscreenElement ?? document.body).appendChild(root);
      this.root = root;
    });
  }
}
