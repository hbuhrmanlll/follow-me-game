// Progress and settings are stored only on this device (localStorage).
import type { TranslationId } from './content';

export interface Progress {
  chapter: string; // e.g. "ch01"
  scene: number; // which scene in the chapter
  step: number; // which line in the scene; equal to the number of lines means "at the puzzle"
  completed: string[]; // finished chapter ids
  visited: string[]; // places in the order the player traveled (for the map route)
  disciples: string[]; // disciples who have joined so far
  departed: string[]; // disciples who have left the group (Judas)
  scrolls: string[]; // scenes whose hidden scroll piece was found
  mistakes: number; // wrong answers in the current chapter (for its stars)
  streak: number; // puzzles answered right the first time, in a row
  stars: Record<string, number>; // best stars (1-3) earned in each finished chapter
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
  achievements: string[]; // ids of achievements earned
  progress: Progress;
  coins: number; // earned by exploring, quests, puzzles and mini-games
  xp: number; // everything ever earned; sets the player's level
  look: PlayerLook; // how the player's own character looks
  unlocked: string[]; // cloak colors bought with coins
  updated: number;
}

// The player's own character, walking around in each place.
export interface PlayerLook { sex: 'm' | 'f'; skin: string; hair: string; tunic: string; mantle: string }
export const DEFAULT_LOOKS: PlayerLook[] = [
  { sex: 'm', skin: '#b08058', hair: '#3a2618', tunic: '#e0d2b2', mantle: '#4a7aa8' },
  { sex: 'f', skin: '#a8774e', hair: '#2a1a10', tunic: '#e4d6b8', mantle: '#c0603a' },
];

export function levelOf(xp: number): { level: number; into: number; need: number } {
  const per = 40;
  return { level: 1 + Math.floor(xp / per), into: xp % per, need: per };
}

export type Speed = 'slow' | 'normal' | 'fast';
export type TextSize = 'normal' | 'large' | 'xlarge';
export interface Settings {
  autoAdvance: boolean;
  speed: Speed;
  voiceVolume: number; // 0 to 1
  musicVolume: number;
  sfxVolume: number;
  textSize: TextSize;
  highContrast: boolean;
  subtitles: boolean;
  shortStory: boolean; // Kids and Family: skip the narrator's in-between lines
}

const DEFAULT_SETTINGS: Settings = {
  autoAdvance: true, shortStory: true, speed: 'normal', voiceVolume: 1, musicVolume: 0.6, sfxVolume: 0.8,
  textSize: 'normal', highContrast: false, subtitles: true,
};

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
    s.progress.departed ??= [];
    s.progress.scrolls ??= [];
    s.progress.mistakes ??= 0; // added in v0.7.5
    s.progress.streak ??= 0;
    s.progress.stars ??= {};
    s.achievements ??= [];
    s.difficulty ??= 'family'; // added in Phase 4
    s.journal ??= [];
    s.coins ??= 0; // added in v0.9
    s.xp ??= 0;
    s.look ??= DEFAULT_LOOKS[s.name.length % 2];
    s.unlocked ??= [];
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
    coins: 0,
    xp: 0,
    look: DEFAULT_LOOKS[name.length % 2],
    unlocked: [],
    journal: [],
    achievements: [],
    translation: 'bsb',
    progress: { chapter: 'ch01', scene: 0, step: 0, completed: [], visited: [], disciples: [], departed: [], scrolls: [], mistakes: 0, streak: 0, stars: {} },
    updated: Date.now(),
  };
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(SETTINGS_KEY) };
}

export function saveSettings(s: Settings): void {
  write(SETTINGS_KEY, s);
}
