// Recorded sentences for everything outside the story lines (puzzle questions,
// answers, hints and messages). tools/phrases.mjs lists them and splits and
// names them exactly the same way, so a sentence finds its recording.
const files = import.meta.glob<string>('../../content/audio/en/phrases/*.mp3', { eager: true, query: '?url', import: 'default' });

export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…:])\s+/)
    .map(clean)
    .filter((s) => /[A-Za-z0-9]/.test(s));
}

function clean(s: string): string {
  return s.replace(/^[^A-Za-z0-9“"‘'(]+/, '').trim();
}

function phraseKey(s: string): string {
  let h = 0x811c9dc5;
  const t = clean(s).toLowerCase();
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// Each sentence of the text, with its recording if there is one.
export function phraseParts(text: string): { text: string; url?: string }[] {
  return sentences(text).map((s) => ({ text: s, url: files[`../../content/audio/en/phrases/${phraseKey(s)}.mp3`] }));
}
