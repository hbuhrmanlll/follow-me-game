// Achievements are listed in content/en/achievements.json. Each has a rule that
// is checked against a player's progress.
import achievementsJson from '../../content/en/achievements.json';
import { chapterOrder, getChapter, scenePuzzles } from './content';
import type { Slot } from './save';

export interface Achievement {
  id: string; icon: string; title: string; description: string;
  rule: { type: 'chapter' | 'chapters' | 'disciples' | 'versesKnown' | 'chapterVerses' | 'scrolls'; chapter?: string; count?: number };
}
export const achievements = achievementsJson as Achievement[];

export const KNOWN_BOX = 3; // 3 stars or more in the Verse Journal counts as "known by heart"

export function totalScrolls(): number {
  return chapterOrder.reduce((n, id) => n + getChapter(id).scenes.length, 0);
}

// The verses that belong to a chapter: its memory verse and its verse puzzles.
function chapterRefs(chapterId: string): string[] {
  const ch = getChapter(chapterId);
  const refs = [ch.memoryVerse.ref];
  for (const sc of ch.scenes) for (const pz of scenePuzzles(sc)) if (pz.type === 'fillBlank' || pz.type === 'verseOrder') refs.push(pz.ref);
  return [...new Set(refs)];
}

function earned(a: Achievement, slot: Slot): boolean {
  const p = slot.progress;
  const known = slot.journal.filter((e) => e.box >= KNOWN_BOX);
  switch (a.rule.type) {
    case 'chapter': return p.completed.includes(a.rule.chapter!);
    case 'chapters': return p.completed.length >= a.rule.count!;
    case 'disciples': return p.disciples.length >= a.rule.count!;
    case 'versesKnown': return known.length >= a.rule.count!;
    case 'chapterVerses': return chapterRefs(a.rule.chapter!).every((ref) => known.some((e) => e.ref === ref));
    case 'scrolls': return p.scrolls.length >= (a.rule.count || totalScrolls());
  }
}

// Adds any newly earned achievements to the player and returns them.
export function checkAchievements(slot: Slot): Achievement[] {
  const fresh = achievements.filter((a) => !slot.achievements.includes(a.id) && earned(a, slot));
  slot.achievements.push(...fresh.map((a) => a.id));
  return fresh;
}
