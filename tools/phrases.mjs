// Everything the game says outside the story lines: puzzle questions, answers,
// hints, "That's right!", notes, chapter endings, Disciple Cards and so on.
// Each sentence gets its own recording (tools/generate-voices-free.py), and the
// game plays them instead of the phone's voice. The game splits and names
// sentences exactly like this (src/systems/phrases.ts), so they match up.
//
//   node tools/phrases.mjs          print the sentences to record, as JSON
import fs from 'node:fs';

const LANG = 'en';
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

export function sentences(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…:])\s+/)
    .map(clean)
    .filter((s) => /[A-Za-z0-9]/.test(s));
}

export function clean(s) {
  return s.replace(/^[^A-Za-z0-9“"‘'(]+/, '').trim();
}

// A short name for a sentence's recording (FNV-1a, the same in the game).
export function phraseKey(s) {
  let h = 0x811c9dc5;
  const t = clean(s).toLowerCase();
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const fill = (t, vars) => t.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

export function collectPhrases() {
  const ui = read(`content/${LANG}/ui.json`);
  const characters = read(`content/${LANG}/characters.json`);
  const locations = read(`content/${LANG}/locations.json`);
  const disciples = read(`content/${LANG}/disciples.json`);
  const achievements = read(`content/${LANG}/achievements.json`);
  const ending = read(`content/${LANG}/ending.json`);
  const translations = read('content/translations.json').map((t) => t.id);
  const chapters = read(`content/${LANG}/chapters/index.json`).map((id) => read(`content/${LANG}/chapters/${id}.json`));
  const texts = [];
  const add = (t) => { if (typeof t === 'string' && /[A-Za-z]/.test(t)) texts.push(t); };

  // Scripture, as the game shows it (parts of a verse are joined with " … ")
  const scripture = {};
  for (const t of translations) {
    scripture[t] = {};
    for (const b of ['matthew', 'mark', 'luke', 'john', 'acts']) scripture[t][b] = read(`content/scripture/${t}/${b}.json`).chapters;
  }
  const REF_RE = /^(Matthew|Mark|Luke|John|Acts) (\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/;
  const verse = (ref, quote, t) => {
    if (quote?.[t]?.length) return quote[t].join(' … ');
    const m = REF_RE.exec(ref);
    if (!m) return '';
    const [, book, c1, v1, c2, v2] = m;
    const data = scripture[t][book.toLowerCase()];
    const out = [];
    const endC = c2 ? +c2 : +c1;
    for (let c = +c1; c <= endC; c++) {
      const last = c === endC ? +(v2 ?? v1) : Math.max(...Object.keys(data[c]).map(Number));
      for (let v = c === +c1 ? +v1 : 1; v <= last; v++) if (data[c][v]) out.push(data[c][v]);
    }
    return out.join(' ');
  };

  // Everything in the interface, with the blanks filled in where the game fills them
  for (const [k, v] of Object.entries(ui)) {
    if (typeof v !== 'string' || v.includes('{')) continue;
    add(v);
    if (k === 'note') add(`${v}.`);
  }
  for (const d of disciples.order) add(fill(ui.joined, { name: characters[d].name }));
  let scenes = 0;
  for (const ch of chapters) scenes += ch.scenes.length;
  for (let n = 1; n <= scenes; n++) add(fill(ui.foundScroll, { n, total: scenes }));
  for (const a of achievements.list ?? achievements) {
    if (!a.title) continue;
    add(fill(ui.newAchievement, { title: a.title }));
    add(`${a.title}. ${a.description}`);
  }
  for (let n = 1; n <= 30; n++) add(String(n));
  for (let n = 2; n <= 40; n++) add(fill(ui.streak, { n }));
  for (let n = 1; n <= 3; n++) add(fill(ui.stars, { n }));
  add('Hosanna! Hosanna!');
  // Walk-around mode: villagers, quests and hints
  const explore = read(`content/${LANG}/explore.json`);
  add(explore.hint); add(explore.questDone);
  for (const pl of Object.values(explore.places)) { pl.villagers.forEach(add); add(pl.quest.ask); }
  for (let n = 1; n <= 100; n++) add(fill(ui.needCoins, { n }));
  for (const c of Object.values(characters)) add(c.name);
  for (const l of Object.values(locations)) { add(`${l.name}. ${l.summary}`); add(l.name); }
  for (const d of Object.values(disciples.cards ?? disciples)) {
    if (typeof d !== 'object' || !d) continue;
    for (const f of d.facts ?? []) add(f.text);
    add(d.tradition);
  }
  for (const s of ending.slides ?? []) { add(s.text); for (const t of translations) add(verse(s.ref, s.quote, t)); }
  add(ending.invite); add(ending.prayer); add(ending.title);

  // Every chapter: notes, puzzles (questions, answers, hints), and the chapter's end
  const walk = (o) => {
    if (typeof o === 'string') add(o);
    else if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (!['type', 'icon', 'target', 'speaker', 'disciple', 'quote', 'blank'].includes(k)) walk(v);
  };
  for (const ch of chapters) {
    add(ch.title); add(ch.reflect); add(ch.prayer);
    (ch.discuss ?? []).forEach(add);
    add(fill(ui.chapterComplete, { n: ch.number }));
    add(`${ui.memoryVerse}.`); add(`${ui.reflect}.`); add(`${ch.memoryVerse.ref}.`);
    for (const t of translations) {
      add(verse(ch.memoryVerse.ref, ch.memoryVerse.quote, t));
      if (ch.memoryVerse.kids) add(verse(ch.memoryVerse.ref, ch.memoryVerse.kids.quote, t));
    }
    for (const sc of ch.scenes) {
      add(sc.title);
      if (sc.note) add(`${ui.note}. ${sc.note}`);
      const puzzles = sc.puzzles ?? (sc.puzzle ? [sc.puzzle] : []);
      for (const pz of puzzles) {
        walk(pz);
        add(fill(ui.tryAgain, { hint: pz.hint, ref: pz.ref }));
        add(`${pz.prompt} ${ui.kidsTapTwice}`);
        for (const t of translations) {
          if (pz.ref && (pz.type === 'fillBlank' || pz.type === 'verseOrder')) add(verse(pz.ref, pz.quote, t));
          for (const pair of pz.pairs ?? []) if (pair.ref) add(verse(pair.ref, pair.quote, t));
        }
      }
    }
  }

  const seen = new Map();
  for (const t of texts) for (const s of sentences(t)) if (!seen.has(phraseKey(s))) seen.set(phraseKey(s), s);
  return [...seen.entries()].map(([key, text]) => ({ key, text }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fs.writeSync(1, JSON.stringify(collectPhrases()));
}
