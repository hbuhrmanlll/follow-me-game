// Finished artwork. Pictures dropped into content/art/ are found automatically
// when the game is built, and used instead of the drawn placeholders:
//   content/art/backdrops/{backdrop}.jpg        (or {backdrop}-{time}.jpg for one time of day)
//   content/art/portraits/{character}.png       (the round picture in the dialogue box)
//   content/art/figures/{character}.png         (the person standing on the stage)
// See ART_GUIDE.md for sizes and how to make them.
import Phaser from 'phaser';
import type { TimeOfDay } from './content';

const files = import.meta.glob<string>('../../content/art/*/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' });
const urls = new Map<string, string>();
for (const [file, url] of Object.entries(files)) {
  const m = file.match(/content\/art\/([a-z]+)\/([^/]+)\.(png|jpe?g|webp)$/);
  if (m) urls.set(`${m[1]}/${m[2]}`, url);
}

export const textureKey = (key: string) => `art:${key}`;

// The picture to use for a backdrop at a time of day, if there is one. `exact`
// is false when the picture wasn't made for this time of day, so the game tints it.
export function backdropArt(name: string, time: TimeOfDay): { key: string; exact: boolean } | null {
  if (urls.has(`backdrops/${name}-${time}`)) return { key: `backdrops/${name}-${time}`, exact: true };
  if (urls.has(`backdrops/${name}`)) return { key: `backdrops/${name}`, exact: false };
  return null;
}

// The loaded texture for a picture, or null if there is no picture (or it isn't loaded yet).
export function artTexture(scene: Phaser.Scene, key: string): string | null {
  return urls.has(key) && scene.textures.exists(textureKey(key)) ? textureKey(key) : null;
}

// Adds pictures to the scene's loader. Call from preload(), or use loadArt().
export function queueArt(scene: Phaser.Scene, keys: string[]): void {
  for (const k of keys) {
    const url = urls.get(k);
    if (url && !scene.textures.exists(textureKey(k))) scene.load.image(textureKey(k), url);
  }
  trimBackdrops(scene, keys);
}

export function loadArt(scene: Phaser.Scene, keys: string[]): Promise<void> {
  queueArt(scene, keys);
  if (scene.load.list.size === 0 && !scene.load.isLoading()) return Promise.resolve();
  return new Promise((done) => {
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => done());
    scene.load.start();
  });
}

// Big background pictures use a lot of memory on cheap phones, so only the
// few most recently used are kept.
const recent: string[] = [];
function trimBackdrops(scene: Phaser.Scene, keys: string[]): void {
  for (const k of keys) {
    if (!k.startsWith('backdrops/')) continue;
    const i = recent.indexOf(k);
    if (i !== -1) recent.splice(i, 1);
    recent.push(k);
  }
  while (recent.length > 5) {
    const old = recent.shift()!;
    if (scene.textures.exists(textureKey(old))) scene.textures.remove(textureKey(old));
  }
}
