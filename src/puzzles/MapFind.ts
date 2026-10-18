import Phaser from 'phaser';
import { fill, locations, ui, type MapFindPuzzle } from '../systems/content';
import { MapView } from '../ui/MapView';
import { makePanel } from './panel';

// "Find the place on the map." The choices are unlabeled dots; tapping a wrong
// one names it, so the player still learns where it is.
export function runMapFind(scene: Phaser.Scene, puzzle: MapFindPuzzle, rate: number): Promise<void> {
  return new Promise((resolve) => {
    const W = scene.scale.width;
    const H = scene.scale.height;
    const mapW = Math.min(780, W * 0.5);
    const panelLeft = mapW + 50;
    const panel = makePanel(scene, { rate, prompt: puzzle.prompt, left: panelLeft, width: W - panelLeft - 30 });
    const cx = panel.left + panel.width / 2;
    panel.setFeedbackPosition(cx, H / 2 + 60, panel.width - 60);

    const map = new MapView(scene, 20, 20, mapW, H - 40);
    map.setDepth(51);
    for (const id of puzzle.choices) map.setMarker(id, 'choice');
    map.centerOn(puzzle.target);
    let solved = false;
    map.onTap((id) => {
      if (solved || !id) return;
      const name = locations[id]?.name ?? id;
      if (id === puzzle.target) {
        solved = true;
        map.setMarker(id, 'right', name);
        panel.solved(() => { map.destroy(); resolve(); });
      } else {
        map.setMarker(id, 'wrong', name);
        panel.wrong(`${fill(ui.thatIs, { name })} ${puzzle.hint}`, puzzle.ref);
      }
    });
    // Remove the map too if the panel goes away another way (scene restart).
    panel.layer.once('destroy', () => map.destroy());
  });
}
