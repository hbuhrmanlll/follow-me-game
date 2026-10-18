// Content checker. Run with:  npm run check
// It also runs automatically before every build, so a mistake in a data file
// stops Netlify from publishing a broken version.
import fs from 'node:fs';
import path from 'node:path';

const LANG = 'en';
const BOOKS = ['Matthew', 'Mark', 'Luke', 'John', 'Acts'];
const REF_RE = new RegExp(`^(${BOOKS.join('|')}) (\\d+):(\\d+)(?:-(?:(\\d+):)?(\\d+))?$`);
const AUDIO_DIR = path.join('public', 'audio', LANG, 'voice');

const errors = [];
const warnings = [];
const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${file}: could not be read as JSON (${e.message})`);
    return null;
  }
};

const translations = readJson('content/translations.json') ?? [];
const scripture = {};
for (const t of translations) {
  scripture[t.id] = {};
  for (const b of BOOKS) {
    const data = readJson(path.join('content', 'scripture', t.id, `${b.toLowerCase()}.json`));
    if (data) scripture[t.id][b] = data.chapters;
  }
}

// Returns the verse texts for a reference, or null if any verse is missing.
function versesFor(ref, tid) {
  const m = REF_RE.exec(ref);
  if (!m) return null;
  const [, book, c1, v1, c2, v2] = m;
  const startC = +c1, startV = +v1;
  const endC = c2 ? +c2 : startC, endV = v2 ? +v2 : startV;
  const out = [];
  for (let c = startC; c <= endC; c++) {
    const chap = scripture[tid]?.[book]?.[c];
    if (!chap) return null;
    const first = c === startC ? startV : 1;
    const last = c === endC ? endV : Math.max(...Object.keys(chap).map(Number));
    if (last < first) return null;
    for (let v = first; v <= last; v++) {
      if (chap[v] === undefined) return null;
      out.push(chap[v]);
    }
  }
  return out;
}

function checkRef(where, ref) {
  if (typeof ref !== 'string' || !REF_RE.test(ref)) {
    errors.push(`${where}: reference "${ref}" is not formatted like "Matthew 3:16" or "Matthew 3:13-17"`);
    return false;
  }
  for (const t of translations) {
    if (!versesFor(ref, t.id)) errors.push(`${where}: "${ref}" was not found in ${t.short}`);
  }
  return true;
}

// A quote must list exact words from the verse for every translation.
function checkQuote(where, ref, quote) {
  if (quote === undefined) return;
  for (const t of translations) {
    const parts = quote[t.id];
    if (!Array.isArray(parts) || parts.length === 0) {
      errors.push(`${where}: quote has no "${t.id}" words`);
      continue;
    }
    const full = (versesFor(ref, t.id) ?? []).join(' ');
    for (const p of parts) {
      if (!full.includes(p)) errors.push(`${where}: "${p}" is not word-for-word in ${t.short} ${ref}`);
    }
  }
}

const characters = readJson(`content/${LANG}/characters.json`) ?? {};
const locations = readJson(`content/${LANG}/locations.json`) ?? {};
const map = readJson('content/map.json') ?? { places: {} };
const BACKDROPS = ['jordan', 'wilderness', 'jerusalem', 'galilee'];

for (const [id, loc] of Object.entries(locations)) {
  if (!map.places[id]) errors.push(`locations.json "${id}": has no position in content/map.json`);
  if (!loc.name || !loc.summary) errors.push(`locations.json "${id}": needs a "name" and a "summary"`);
  if (loc.backdrop && !BACKDROPS.includes(loc.backdrop)) errors.push(`locations.json "${id}": unknown backdrop "${loc.backdrop}"`);
}
const chapterIds = readJson(`content/${LANG}/chapters/index.json`) ?? [];
const seenIds = new Set();
let lineCount = 0;
let missingAudio = 0;

for (const chId of chapterIds) {
  const file = `content/${LANG}/chapters/${chId}.json`;
  const ch = readJson(file);
  if (!ch) continue;
  if (ch.id !== chId) errors.push(`${file}: "id" should be "${chId}"`);
  if (ch.passage) checkRef(`${file} passage`, ch.passage);
  if (!Array.isArray(ch.scenes) || ch.scenes.length === 0) errors.push(`${file}: has no scenes`);

  for (const sc of ch.scenes ?? []) {
    const where = `${chId} scene ${sc.id}`;
    if (seenIds.has(sc.id)) errors.push(`${where}: id is used twice`);
    seenIds.add(sc.id);
    if (!locations[sc.location]) errors.push(`${where}: unknown location "${sc.location}"`);
    else if (!locations[sc.location].backdrop) errors.push(`${where}: location "${sc.location}" has no "backdrop" to draw`);
    if (sc.note !== undefined && (typeof sc.note !== 'string' || !sc.note.trim())) errors.push(`${where}: "note" must be some text`);
    if (sc.passage) checkRef(`${where} passage`, sc.passage);

    for (const line of sc.lines ?? []) {
      lineCount++;
      const lw = `${chId} line ${line.id}`;
      if (!line.id) errors.push(`${where}: a line is missing its "id"`);
      if (seenIds.has(line.id)) errors.push(`${lw}: id is used twice`);
      seenIds.add(line.id);
      if (!characters[line.speaker]) errors.push(`${lw}: unknown speaker "${line.speaker}"`);
      if (line.type === 'scripture') {
        if (checkRef(lw, line.ref)) checkQuote(lw, line.ref, line.quote);
        if (line.text) errors.push(`${lw}: Scripture lines must not have "text" (the words come from the Bible files)`);
      } else if (line.type === 'narration') {
        if (!line.text) errors.push(`${lw}: narration needs "text"`);
        if (line.speaker === 'jesus') errors.push(`${lw}: Jesus may only speak Scripture lines`);
      } else {
        errors.push(`${lw}: "type" must be "scripture" or "narration"`);
      }
      for (const j of line.joins ?? []) {
        if (!characters[j]?.disciple) errors.push(`${lw}: "joins" lists "${j}", who isn't marked as a disciple in characters.json`);
      }
      if (line.id && !['ogg', 'mp3'].some((ext) => fs.existsSync(path.join(AUDIO_DIR, `${line.id}.${ext}`)))) {
        missingAudio++;
      }
    }

    const pz = sc.puzzle;
    if (!pz) {
      errors.push(`${where}: has no puzzle`);
    } else if (pz.type === 'multipleChoice') {
      const correct = (pz.choices ?? []).filter((c) => c.correct).length;
      if ((pz.choices ?? []).length < 2) errors.push(`${where}: puzzle needs at least 2 choices`);
      if (correct !== 1) errors.push(`${where}: puzzle needs exactly 1 correct choice (has ${correct})`);
      if (!pz.prompt) errors.push(`${where}: puzzle needs a "prompt"`);
      if (!pz.hint) errors.push(`${where}: puzzle needs a "hint"`);
      checkRef(`${where} puzzle`, pz.ref);
    } else if (pz.type === 'fillBlank') {
      if (checkRef(`${where} puzzle`, pz.ref)) checkQuote(`${where} puzzle`, pz.ref, pz.quote);
      for (const t of translations) {
        const word = pz.blank?.[t.id];
        const text = (pz.quote?.[t.id] ?? versesFor(pz.ref, t.id) ?? []).join(' ');
        if (!word) errors.push(`${where}: puzzle "blank" has no "${t.id}" word`);
        else if (!new RegExp(`\\b${word}\\b`).test(text)) errors.push(`${where}: blank word "${word}" is not in the ${t.short} text`);
      }
      if ((pz.decoys ?? []).length < 2) errors.push(`${where}: puzzle needs at least 2 "decoys" (wrong words)`);
      if (!pz.hint) errors.push(`${where}: puzzle needs a "hint"`);
    } else if (pz.type === 'mapFind') {
      if (!pz.prompt) errors.push(`${where}: puzzle needs a "prompt"`);
      if (!pz.hint) errors.push(`${where}: puzzle needs a "hint"`);
      checkRef(`${where} puzzle`, pz.ref);
      if (!(pz.choices ?? []).includes(pz.target)) errors.push(`${where}: puzzle "choices" must include the target "${pz.target}"`);
      for (const c of pz.choices ?? []) {
        if (!map.places[c] || !locations[c]) errors.push(`${where}: map place "${c}" is not in locations.json and map.json`);
      }
    } else {
      errors.push(`${where}: unknown puzzle type "${pz.type}"`);
    }
  }

  if (!ch.memoryVerse) {
    errors.push(`${file}: has no memoryVerse`);
  } else if (checkRef(`${file} memoryVerse`, ch.memoryVerse.ref)) {
    checkQuote(`${file} memoryVerse`, ch.memoryVerse.ref, ch.memoryVerse.quote);
  }
}

if (missingAudio) {
  warnings.push(`${missingAudio} of ${lineCount} lines have no audio file yet (the browser voice will read them)`);
}

for (const w of warnings) console.log(`note: ${w}`);
if (errors.length) {
  console.error(`\n✗ Found ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ Content OK: ${chapterIds.length} chapter(s), ${lineCount} lines`);
