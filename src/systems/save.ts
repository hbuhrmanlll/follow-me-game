// Progress and settings are stored only on this device (localStorage).
import type { TranslationId } from './content';

export interface Progress {
  chapter: string; // e.g. "ch01"
  scene: number; // which scene in the chapter
  step: number; // which line in the scene; equal to the number of lines means "at the puzzle"
  completed: string[]; // finished chapter ids
  visited: string[]; // places in the order the player traveled (for the map route)
  disciples: string[]; // disciples who have joined so far
}

export type Difficulty = 'kids' | 'family' | 'adult';

export interface JournalEntry {
  ref: string;
  quote?: Partial<Record<TranslationId, string[]>>;
  box: number; // 1 = new or just missed … 5 = well known
  due: number; // when to practice it next (milliseconds since 1970)
}

export interface Slot {
  name: string;
  translation: TranslationId;
  difficulty: Difficulty;
  journal: JournalEntry[];
  progress: Progress;
  updated: number;
}

export type Speed = 'slow' | 'normal' | 'fast';
export interface Settings { autoAdvance: boolean; speed: Speed }

export const SLOT_COUNT = 3;
const SLOTS_KEY = 'followme.slots.v1';
const SETTINGS_KEY = 'followme.settings.v1';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (e.g. private browsing): the game still plays, it just won't remember.
  }
}

export function loadSlots(): (Slot | null)[] {
  const slots = read<(Slot | null)[]>(SLOTS_KEY) ?? [];
  return Array.from({ length: SLOT_COUNT }, (_, i) => {
    const s = slots[i];
    if (!s) return null;
    // Saves from before Phase 3 lack these lists.
    s.progress.visited ??= [];
    s.progress.disciples ??= [];
    s.difficulty ??= 'family'; // added in Phase 4
    s.journal ??= [];
    return s;
  });
}

export function saveSlot(index: number, slot: Slot | null): void {
  const slots = loadSlots();
  slots[index] = slot ? { ...slot, updated: Date.now() } : null;
  write(SLOTS_KEY, slots);
}

export function newSlot(name: string, difficulty: Difficulty): Slot {
  return {
    name,
    difficulty,
    journal: [],
    translation: 'bsb',
    progress: { chapter: 'ch01', scene: 0, step: 0, completed: [], visited: [], disciples: [] },
    updated: Date.now(),
  };
}

export function loadSettings(): Settings {
  return { autoAdvance: true, speed: 'normal', ...read<Partial<Settings>>(SETTINGS_KEY) };
}

export function saveSettings(s: Settings): void {
  write(SETTINGS_KEY, s);
}
