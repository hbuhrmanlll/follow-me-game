// Makes one voice recording per line of dialogue, using ElevenLabs.
//
//   node tools/generate-voices.mjs --dry-run         list what would be made, and the cost in characters
//   node tools/generate-voices.mjs                   make everything that is new or changed
//   node tools/generate-voices.mjs --only=ch02       just one chapter
//   node tools/generate-voices.mjs --translation=bsb just one translation's Scripture lines
//
// Needs the ELEVENLABS_API_KEY environment variable (a GitHub secret when run
// from the "Generate voices" action). Character voices are set in tools/voices.json.
//
// Safe to re-run: a line is only re-made when its words or voice settings
// changed. A file you put there yourself (for example a church member's
// recording) is never replaced.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const LANG = 'en';
const OUT = path.join('content', 'audio', LANG);
const MANIFEST = path.join(OUT, 'manifest.json');
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
const voices = read('tools/voices.json');
const translations = read('content/translations.json').map((t) => t.id);
const chapters = read(`content/${LANG}/chapters/index.json`).map((id) => read(`content/${LANG}/chapters/${id}.json`));
const manifest = fs.existsSync(MANIFEST) ? read(MANIFEST) : {};

// ---- The same text rules the game uses ----
const scripture = {};
for (const t of translations) {
  scripture[t] = {};
  for (const b of ['matthew', 'mark', 'luke', 'john', 'acts']) scripture[t][b] = read(`content/scripture/${t}/${b}.json`).chapters;
}
const REF_RE = /^(Matthew|Mark|Luke|John|Acts) (\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/;
function verseText(ref, quote, t) {
  if (quote?.[t]?.length) return quote[t].join(' … ');
  const [, book, c1, v1, c2, v2] = REF_RE.exec(ref);
  const data = scripture[t][book.toLowerCase()];
  const out = [];
  const endC = c2 ? +c2 : +c1;
  for (let c = +c1; c <= endC; c++) {
    const first = c === +c1 ? +v1 : 1;
    const last = c === endC ? +(v2 ?? v1) : Math.max(...Object.keys(data[c]).map(Number));
    for (let v = first; v <= last; v++) if (data[c][v]) out.push(data[c][v]);
  }
  return out.join(' ');
}

// ---- Everything that gets a recording ----
const clips = [];
for (const ch of chapters) {
  if (args.only && ch.id !== args.only) continue;
  for (const sc of ch.scenes) {
    if (sc.note) clips.push({ file: `${sc.id}-note.mp3`, speaker: 'narrator', text: `Note. ${sc.note}` });
    for (const line of sc.lines) {
      if (line.type === 'scripture') {
        for (const t of translations) {
          if (args.translation && args.translation !== t) continue;
          clips.push({ file: `${t}/${line.id}.mp3`, speaker: line.speaker, text: verseText(line.ref, line.quote, t) });
        }
      } else {
        clips.push({ file: `${line.id}.mp3`, speaker: line.speaker, text: line.text });
      }
    }
  }
}

const settingsFor = (speaker) => voices.characters[speaker] ?? voices.default;
const fileHash = (f) => sha(fs.readFileSync(f));

const todo = [];
let kept = 0;
let current = 0;
for (const clip of clips) {
  const s = settingsFor(clip.speaker);
  clip.hash = sha(JSON.stringify([clip.text, s, voices.model, voices.format]));
  const full = path.join(OUT, clip.file);
  const entry = manifest[clip.file];
  if (fs.existsSync(full) && (!entry || entry.fileHash !== fileHash(full))) {
    // Someone's own recording. If it replaced one we made, drop our word timings too.
    if (entry) {
      fs.rmSync(full.replace(/\.mp3$/, '.json'), { force: true });
      delete manifest[clip.file];
      fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
      console.log(`  ${clip.file}: using your recording instead of the AI voice`);
    }
    kept++;
    continue;
  }
  if (entry && entry.hash === clip.hash && fs.existsSync(full)) { current++; continue; }
  todo.push(clip);
}

const chars = todo.reduce((n, c) => n + c.text.length, 0);
console.log(`${clips.length} lines in total: ${current} up to date, ${kept} recorded by hand (kept), ${todo.length} to make.`);
console.log(`About ${chars.toLocaleString()} characters will be sent to ElevenLabs.`);
if (args['dry-run']) {
  for (const c of todo) console.log(`  ${c.file}  [${c.speaker}]  ${c.text.slice(0, 60)}${c.text.length > 60 ? '…' : ''}`);
  process.exit(0);
}
if (!todo.length) process.exit(0);

const key = process.env.ELEVENLABS_API_KEY;
if (!key) { console.error('Missing ELEVENLABS_API_KEY. See VOICES.md.'); process.exit(1); }
const missing = [...new Set(todo.map((c) => c.speaker))].filter((sp) => !/^[A-Za-z0-9]{10,}$/.test(settingsFor(sp).voiceId ?? ''));
if (missing.length) { console.error(`These characters need a Voice ID in tools/voices.json: ${missing.join(', ')}`); process.exit(1); }

// Turn ElevenLabs' per-letter timing into per-word timing for the highlight.
function wordTimings(text, alignment) {
  const words = [];
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  const re = /\S+/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const a = m.index;
    const b = Math.min(m.index + m[0].length, ends.length) - 1;
    if (a >= starts.length) break;
    words.push({ c: a, s: +starts[a].toFixed(3), e: +ends[b].toFixed(3) });
  }
  return words;
}

async function synth(clip) {
  const s = settingsFor(clip.speaker);
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${s.voiceId}/with-timestamps?output_format=${voices.format}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        text: clip.text,
        model_id: voices.model,
        voice_settings: { stability: s.stability, similarity_boost: s.similarity, style: s.style ?? 0, use_speaker_boost: true },
      }),
    });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, attempt * 4000)); continue; }
    throw new Error(`ElevenLabs said ${res.status}: ${await res.text()}`);
  }
  throw new Error('ElevenLabs is busy; try again later.');
}

let made = 0;
for (const clip of todo) {
  const data = await synth(clip);
  const full = path.join(OUT, clip.file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, Buffer.from(data.audio_base64, 'base64'));
  if (data.alignment) fs.writeFileSync(full.replace(/\.mp3$/, '.json'), JSON.stringify({ words: wordTimings(clip.text, data.alignment) }));
  manifest[clip.file] = { hash: clip.hash, fileHash: fileHash(full) };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n'); // save as we go
  made++;
  console.log(`  made ${clip.file} (${made}/${todo.length})`);
}
console.log(`Done: ${made} recordings made.`);
