import type Phaser from 'phaser';
import { ui } from '../systems/content';

// The ☰ menu during the story.
export function openMenu(scene: Phaser.Scene, slot: number, onResume: () => void): void {
  const root = document.createElement('div');
  root.className = 'fm-overlay';
  const panel = document.createElement('div');
  panel.className = 'fm-panel fm-menu';
  const title = document.createElement('h2');
  title.textContent = ui.menu;
  panel.appendChild(title);
  const go = (label: string, action: () => void, secondary = false) => {
    const b = document.createElement('button');
    b.className = secondary ? 'fm-btn fm-btn-secondary' : 'fm-btn';
    b.textContent = label;
    b.onclick = () => { root.remove(); action(); };
    panel.appendChild(b);
  };
  go(`▶  ${ui.resume}`, onResume);
  go(`🗺  ${ui.map}`, () => scene.scene.start('Map', { slot, back: 'Story' }));
  go(`📖  ${ui.journal}`, () => scene.scene.start('Journal', { slot }));
  go(`👥  ${ui.disciplesTitle}`, () => scene.scene.start('Disciples', { slot }));
  go(`👤  ${ui.players}`, () => scene.scene.start('Slots'), true);
  root.appendChild(panel);
  (document.fullscreenElement ?? document.body).appendChild(root);
}
