// Loads the story, characters and Scripture from the JSON files in /content.
import translationsJson from '../../content/translations.json';
import charactersJson from '../../content/en/characters.json';
import locationsJson from '../../content/en/locations.json';
import chapterIndex from '../../content/en/chapters/index.json';
import uiJson from '../../content/en/ui.json';

export type TranslationId = 'bsb' | 'kjv';

export interface Translation { id: TranslationId; name: string; short: string; notice: string }
export interface Character { name: string; color: string; initials: string; voice: { pitch: number; rate: number } }
export interface Location { name: string; region: string; backdrop: string; summary: string }
export type Quote = Partial<Record<TranslationId, string[]>>;

export interface Line {
  id: string;
  speaker: string;
  type: 'scripture' | 'narration';
  ref?: string;
  quote?: Quote;
  text?: string;
}

export interface Choice { text: string; correct?: boolean }
export interface Puzzle { type: 'multipleChoice'; prompt: string; choices: Choice[]; hint: string; ref: string }

export interface SceneData {
  id: string;
  title: string;
  location: string;
  timeOfDay: TimeOfDay;
  passage: string;
  lines: Line[];
  puzzle: Puzzle;
}

export type TimeOfDay = 'dawn' | 'midday' | 'dusk' | 'night';

export interface Chapter {
  id: string;
  number: number;
  title: string;
  passage: string;
  scenes: SceneData[];
  memoryVerse: { ref: string; quote?: Quote };
  reflect: string;
}

export const translations = translationsJson as Translation[];
export const characters = charactersJson as Record<string, Character>;
export const locations = locationsJson as Record<string, Location>;
export const chapterOrder = chapterIndex as string[];
export const ui = uiJson;

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
