// Finds the recorded audio for a line, if there is one. Recordings live in
// content/audio/en/ (Scripture lines in a folder per translation) and are
// found automatically when the game is built: drop in a file named after the
// line's id and it is used instead of the browser voice.
import type { TranslationId } from './content';

const files = import.meta.glob<string>('../../content/audio/en/**/*.{mp3,ogg}', { eager: true, query: '?url', import: 'default' });
const timingFiles = import.meta.glob<WordTimings>(['../../content/audio/en/**/*.json', '!**/manifest.json'], { import: 'default' });

export interface WordTimings { words: { c: number; s: number; e: number }[] }
export interface LineAudio { url: string; timings?: () => Promise<WordTimings> }

function find(rel: string): LineAudio | null {
  for (const ext of ['mp3', 'ogg']) {
    const key = `../../content/audio/en/${rel}.${ext}`;
    if (files[key]) {
      const t = timingFiles[`../../content/audio/en/${rel}.json`];
      return { url: files[key], timings: t };
    }
  }
  return null;
}

// Scripture lines have one recording per translation; narration has one.
export function audioForLine(id: string, scripture: boolean, tid: TranslationId): LineAudio | null {
  return scripture ? find(`${tid}/${id}`) : find(id);
}

export function audioForNote(sceneId: string): LineAudio | null {
  return find(`${sceneId}-note`);
}
