// Loads the story, characters and Scripture from the JSON files in /content.
import translationsJson from '../../content/translations.json';
import charactersJson from '../../content/en/characters.json';
import locationsJson from '../../content/en/locations.json';
import chapterIndex from '../../content/en/chapters/index.json';
import uiJson from '../../content/en/ui.json';
import mapJson from '../../content/map.json';
import mapLabelsJson from '../../content/en/map-labels.json';
import disciplesJson from '../../content/en/disciples.json';

import type { Mood } from './audio';

export type TranslationId = 'bsb' | 'kjv';

export interface Translation { id: TranslationId; name: string; short: string; notice: string }
export interface Character {
  name: string; color: string; initials: string; disciple?: boolean; emblem?: string;
  voice: { pitch: number; rate: number };
}
export interface Location { name: string; region: string; backdrop?: string; summary: string; mapAs?: string }

// The map dot a place uses (places inside Jerusalem all share Jerusalem's dot).
export function mapPlace(id: string): string {
  return locations[id]?.mapAs ?? id;
}
export type Quote = Partial<Record<TranslationId, string[]>>;

export interface Line {
  id: string;
  speaker: string;
  type: 'scripture' | 'narration';
  ref?: string;
  quote?: Quote;
  text?: string;
  joins?: string[]; // disciples who start following Jesus after this line
  leaves?: string[]; // disciples who leave the group after this line (Judas)
  action?: 'ascend'; // Jesus is taken up into heaven during this line
  cutscene?: string; // a short wordless scene (content/en/cutscenes.json) played before this line
}

export interface Choice { text: string; correct?: boolean; icon?: string }
interface PuzzleBase { prompt: string; hint: string; ref: string }
export interface MultipleChoicePuzzle extends PuzzleBase { type: 'multipleChoice'; choices: Choice[] }
export interface FillBlankPuzzle extends PuzzleBase {
  type: 'fillBlank'; quote?: Quote; blank: Partial<Record<TranslationId, string>>; decoys: string[];
}
export interface MapFindPuzzle extends PuzzleBase { type: 'mapFind'; target: string; choices: string[] }
export interface VerseOrderPuzzle extends PuzzleBase { type: 'verseOrder'; quote?: Quote }
export interface EventOrderPuzzle extends PuzzleBase { type: 'eventOrder'; events: { text: string; icon?: string; ref?: string }[] }
export interface WhoSaidPuzzle extends PuzzleBase { type: 'whoSaid'; pairs: { speaker: string; ref: string; quote?: Quote }[] }
export interface DiscipleMatchPuzzle extends PuzzleBase { type: 'discipleMatch'; pairs: { disciple: string; fact: string }[] }
export interface FindHiddenPuzzle extends PuzzleBase { type: 'findHidden'; hide: string; spot: string; others: string[] }
export interface CountPuzzle extends PuzzleBase {
  type: 'count'; items: { icon: string; n: number }[]; question: string; answer: number;
}
// An action game; its "hint" is shown with the reference when it's finished.
export interface MiniGamePuzzle extends PuzzleBase { type: 'minigame'; game: 'fish' | 'baskets' | 'climb' | 'palms' }
export type Puzzle =
  | MultipleChoicePuzzle | FillBlankPuzzle | MapFindPuzzle | VerseOrderPuzzle | EventOrderPuzzle
  | WhoSaidPuzzle | DiscipleMatchPuzzle | FindHiddenPuzzle | CountPuzzle | MiniGamePuzzle;

export function scenePuzzles(scene: SceneData): Puzzle[] {
  return scene.puzzles ?? (scene.puzzle ? [scene.puzzle] : []);
}

export interface SceneData {
  id: string;
  title: string;
  location: string;
  timeOfDay: TimeOfDay;
  passage: string;
  note?: string; // shown before the scene, e.g. where Gospel accounts differ in order
  companions?: boolean | string[]; // false: no disciples here; or a list of the ones who were
  extras?: string[]; // people present who don't speak, e.g. Moses and Elijah
  weather?: 'storm';
  effect?: 'transfigure';
  staging?: 'cross'; // the crucifixion: Jesus isn't shown as a standing figure
  backdrop?: string; // use a different background than the location's usual one
  mood?: Mood; // the music; chosen from the place and time of day if left out
  lines: Line[];
  puzzle?: Puzzle; // one puzzle…
  puzzles?: Puzzle[]; // …or several, played in order
}

export type TimeOfDay = 'dawn' | 'midday' | 'dusk' | 'night';

export interface Chapter {
  id: string;
  number: number;
  title: string;
  passage: string;
  scenes: SceneData[];
  memoryVerse: { ref: string; quote?: Quote; kids?: { quote: Quote } };
  reflect: string;
  discuss: string[]; // questions for a parent or teacher to talk through
  prayer: string; // a short prayer, read aloud
}

export const translations = translationsJson as Translation[];
export const characters = charactersJson as Record<string, Character>;
export const locations = locationsJson as Record<string, Location>;
export const chapterOrder = chapterIndex as string[];
export const ui = uiJson;

export type LatLon = [number, number];
export interface MapData {
  bounds: { north: number; south: number; west: number; east: number };
  coast: LatLon[];
  lakes: Record<string, LatLon[]>;
  rivers: Record<string, LatLon[]>;
  labels: Record<string, LatLon>;
  places: Record<string, LatLon>;
}
export const mapData = mapJson as unknown as MapData;

export interface DiscipleCard {
  alsoCalled: string; work: string; hometown: string; family: string;
  facts: { text: string; ref: string; after: string }[];
  tradition?: string;
}
export const disciples = disciplesJson as { order: string[]; cards: Record<string, DiscipleCard> };
export const mapLabels = mapLabelsJson as { regions: Record<string, string>; water: Record<string, string> };

const chapterFiles = import.meta.glob<Chapter>('../../content/en/chapters/ch*.json', { eager: true, import: 'default' });

export function getChapter(id: string): Chapter {
  const ch = chapterFiles[`../../content/en/chapters/${id}.json`];
  if (!ch) throw new Error(`Chapter ${id} not found`);
  return ch;
}

// Fills {placeholders} in a UI string, e.g. fill(ui.continueFrom, { n: 2 }).
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ''));
}

// ---- Scripture ----

type Book = Record<string, Record<string, string>>;
const scriptureFiles = import.meta.glob<{ chapters: Book }>('../../content/scripture/*/*.json', { import: 'default' });
const loaded: Partial<Record<TranslationId, Record<string, Book>>> = {};

// Loads the Gospels and Acts for one translation (only the first time it's needed).
export async function loadTranslation(tid: TranslationId): Promise<void> {
  if (loaded[tid]) return;
  const books: Record<string, Book> = {};
  await Promise.all(
    ['matthew', 'mark', 'luke', 'john', 'acts'].map(async (b) => {
      const load = scriptureFiles[`../../content/scripture/${tid}/${b}.json`];
      if (load) books[b] = (await load()).chapters;
    }),
  );
  loaded[tid] = books;
}

const REF_RE = /^(Matthew|Mark|Luke|John|Acts) (\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/;

export interface Verse { chapter: number; verse: number; text: string }

// "Matthew 3:13-17" → the list of verses in that passage.
export function getVerses(ref: string, tid: TranslationId): Verse[] {
  const m = REF_RE.exec(ref);
  const books = loaded[tid];
  if (!m || !books) return [];
  const [, book, c1, v1, c2, v2] = m;
  const data = books[book.toLowerCase()];
  const startC = +c1;
  const endC = c2 ? +c2 : startC;
  const endV = v2 ? +v2 : +v1;
  const out: Verse[] = [];
  for (let c = startC; c <= endC; c++) {
    const chap = data?.[c];
    if (!chap) break;
    const first = c === startC ? +v1 : 1;
    const last = c === endC ? endV : Math.max(...Object.keys(chap).map(Number));
    for (let v = first; v <= last; v++) if (chap[v] !== undefined) out.push({ chapter: c, verse: v, text: chap[v] });
  }
  return out;
}

// The words to show and speak for a Scripture line or memory verse.
// Partial quotes are joined with "…" so it's clear words were left out.
export function scriptureText(ref: string, quote: Quote | undefined, tid: TranslationId): string {
  const parts = quote?.[tid];
  if (parts?.length) return parts.join(' … ');
  return getVerses(ref, tid).map((v) => v.text).join(' ');
}

export function lineText(line: Line, tid: TranslationId): string {
  return line.type === 'scripture' ? scriptureText(line.ref!, line.quote, tid) : line.text ?? '';
}
