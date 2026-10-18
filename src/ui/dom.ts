// Pop-up windows built from regular web page elements. They are used where
// real text boxes or scrolling are needed (typing a name, reading a passage).
import { ui } from '../systems/content';
import type { Difficulty } from '../systems/save';

function overlay(): { root: HTMLDivElement; panel: HTMLDivElement; close(): void } {
  const root = document.createElement('div');
  root.className = 'fm-overlay';
  const panel = document.createElement('div');
  panel.className = 'fm-panel';
  root.appendChild(panel);
  (document.fullscreenElement ?? document.body).appendChild(root);
  return { root, panel, close: () => root.remove() };
}

function button(label: string, onClick: () => void, secondary = false): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = secondary ? 'fm-btn fm-btn-secondary' : 'fm-btn';
  b.textContent = label;
  b.onclick = onClick;
  return b;
}

export function askName(): Promise<string | null> {
  return new Promise((resolve) => {
    const { panel, close } = overlay();
    const title = document.createElement('h2');
    title.textContent = ui.typeName;
    const input = document.createElement('input');
    input.className = 'fm-input';
    input.maxLength = 16;
    input.autocomplete = 'off';
    const row = document.createElement('div');
    row.className = 'fm-row';
    const done = () => {
      const name = input.value.trim();
      if (!name) return input.focus();
      close();
      resolve(name);
    };
    row.append(button(ui.cancel, () => { close(); resolve(null); }, true), button(ui.done, done));
    input.onkeydown = (e) => e.key === 'Enter' && done();
    panel.append(title, input, row);
    input.focus();
  });
}

export function confirmBox(message: string, yesLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    const { panel, close } = overlay();
    const p = document.createElement('p');
    p.textContent = message;
    const row = document.createElement('div');
    row.className = 'fm-row';
    row.append(
      button(ui.cancel, () => { close(); resolve(false); }, true),
      button(yesLabel, () => { close(); resolve(true); }),
    );
    panel.append(p, row);
  });
}

export interface PassageView {
  title: string; // e.g. "Matthew 3:13-17"
  verses: { chapter: number; verse: number; text: string }[];
  notice: string;
  translations: { id: string; short: string }[];
  current: string;
  onSwitch(id: string): Promise<PassageView>;
}

// The Scripture panel: the full passage for the current scene, with a BSB/KJV switch.
export function showPassage(view: PassageView): Promise<void> {
  return new Promise((resolve) => {
    const { panel, close } = overlay();
    panel.classList.add('fm-scripture');
    const render = (v: PassageView) => {
      panel.innerHTML = '';
      const head = document.createElement('div');
      head.className = 'fm-row fm-head';
      const h = document.createElement('h2');
      h.textContent = `📜 ${v.title}`;
      const switcher = document.createElement('div');
      switcher.className = 'fm-switch';
      for (const t of v.translations) {
        const b = button(t.short, async () => render(await v.onSwitch(t.id)), t.id !== v.current);
        switcher.appendChild(b);
      }
      head.append(h, switcher);
      const body = document.createElement('div');
      body.className = 'fm-passage';
      for (const verse of v.verses) {
        const p = document.createElement('p');
        const num = document.createElement('sup');
        num.textContent = `${verse.chapter}:${verse.verse} `;
        p.append(num, verse.text);
        body.appendChild(p);
      }
      const notice = document.createElement('small');
      notice.textContent = v.notice;
      body.appendChild(notice);
      panel.append(head, body, button(ui.close, () => { close(); resolve(); }));
    };
    render(view);
  });
}

// "Who is this player?" — Kids, Family or Adult.
export function askDifficulty(): Promise<Difficulty | null> {
  return new Promise((resolve) => {
    const { panel, close } = overlay();
    const title = document.createElement('h2');
    title.textContent = ui.chooseDifficulty;
    const list = document.createElement('div');
    list.className = 'fm-choices';
    for (const d of ['kids', 'family', 'adult'] as Difficulty[]) {
      const b = button('', () => { close(); resolve(d); });
      const icon = { kids: '🧒', family: '👨‍👩‍👧', adult: '🧔' }[d];
      b.textContent = `${icon}  ${ui.difficulty[d]}`;
      const small = document.createElement('small');
      small.textContent = ui.difficultyHelp[d];
      b.appendChild(small);
      list.appendChild(b);
    }
    panel.append(title, list, button(ui.cancel, () => { close(); resolve(null); }, true));
  });
}

// "Talk Together": discussion questions and a short prayer for the end of a chapter.
export function showTalkTogether(title: string, questions: string[], prayer: string, speakText: (t: string) => void): void {
  const { panel, close } = overlay();
  panel.classList.add('fm-scripture');
  const h = document.createElement('h2');
  h.textContent = `💬 ${ui.talkTogether}: ${title}`;
  const body = document.createElement('div');
  body.className = 'fm-passage';
  const intro = document.createElement('p');
  intro.textContent = ui.discussIntro;
  const ol = document.createElement('ol');
  for (const q of questions) {
    const li = document.createElement('li');
    li.textContent = q;
    li.onclick = () => speakText(q);
    ol.appendChild(li);
  }
  const pr = document.createElement('p');
  pr.className = 'fm-tradition';
  const b = document.createElement('b');
  b.textContent = `🙏 ${ui.prayer}: `;
  pr.append(b, prayer);
  body.append(intro, ol, pr);
  const row = document.createElement('div');
  row.className = 'fm-row';
  row.append(
    button('🔊', () => speakText(`${ui.discussIntro} ${questions.join(' ')}`)),
    button(`🙏 ${ui.prayer}`, () => speakText(`${ui.prayTogether} ${prayer}`)),
    button(ui.close, close, true),
  );
  panel.append(h, body, row);
}
