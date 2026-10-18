// A simple check that a grown-up is using the screen: hold a button for 3 seconds.
import { ui } from '../systems/content';

const HOLD_MS = 3000;

export function askParent(): Promise<boolean> {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'fm-overlay';
    const panel = document.createElement('div');
    panel.className = 'fm-panel';
    const h = document.createElement('h2');
    h.textContent = `👪 ${ui.parentCheck}`;
    const p = document.createElement('p');
    p.textContent = ui.parentHold;
    const hold = document.createElement('button');
    hold.className = 'fm-btn fm-hold';
    const bar = document.createElement('span');
    bar.className = 'fm-hold-bar';
    const label = document.createElement('span');
    label.textContent = `✋ ${ui.holdHere}`;
    hold.append(bar, label);
    const cancel = document.createElement('button');
    cancel.className = 'fm-btn fm-btn-secondary';
    cancel.textContent = ui.cancel;
    const done = (ok: boolean) => { root.remove(); resolve(ok); };
    cancel.onclick = () => done(false);

    let start = 0;
    let raf = 0;
    const tick = () => {
      const f = Math.min(1, (performance.now() - start) / HOLD_MS);
      bar.style.width = `${f * 100}%`;
      if (f >= 1) done(true);
      else raf = requestAnimationFrame(tick);
    };
    const stop = () => { cancelAnimationFrame(raf); bar.style.width = '0%'; };
    hold.onpointerdown = (e) => { e.preventDefault(); start = performance.now(); raf = requestAnimationFrame(tick); };
    hold.onpointerup = stop;
    hold.onpointerleave = stop;
    hold.onpointercancel = stop;
    hold.oncontextmenu = (e) => e.preventDefault(); // long-press menus on phones

    const row = document.createElement('div');
    row.className = 'fm-row';
    row.append(cancel, hold);
    panel.append(h, p, row);
    root.appendChild(panel);
    (document.fullscreenElement ?? document.body).appendChild(root);
  });
}
