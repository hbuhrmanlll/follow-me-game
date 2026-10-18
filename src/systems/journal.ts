// The Verse Journal: every verse the player has learned, with simple spaced
// repetition. Each verse sits in a "box" from 1 to 5. Getting it right moves
// it up a box and waits longer before asking again; missing it starts over.
import type { Quote } from './content';
import type { JournalEntry, Slot } from './save';

const DAY = 24 * 60 * 60 * 1000;
const WAIT_DAYS = [0, 0, 1, 3, 7, 14];

function sameVerse(e: JournalEntry, ref: string, quote?: Quote): boolean {
  return e.ref === ref && JSON.stringify(e.quote ?? null) === JSON.stringify(quote ?? null);
}

export function addVerse(slot: Slot, ref: string, quote?: Quote): void {
  if (slot.journal.some((e) => sameVerse(e, ref, quote))) return;
  slot.journal.push({ ref, quote, box: 1, due: Date.now() });
}

export function dueVerses(slot: Slot, now = Date.now()): JournalEntry[] {
  return slot.journal.filter((e) => e.due <= now).sort((a, b) => a.box - b.box || a.due - b.due);
}

export function recordPractice(entry: JournalEntry, rightFirstTime: boolean, now = Date.now()): void {
  entry.box = rightFirstTime ? Math.min(5, entry.box + 1) : 1;
  entry.due = now + WAIT_DAYS[entry.box] * DAY;
}
