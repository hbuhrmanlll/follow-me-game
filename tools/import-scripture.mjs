// Converts a full-Bible JSON file (scrollmapper/bible_databases format) into
// the small per-book files the game uses. Only needed when adding a translation.
//
//   node tools/import-scripture.mjs <downloaded-file.json> <translation-id>
//   e.g. node tools/import-scripture.mjs BSB.json bsb
import fs from 'node:fs';
import path from 'node:path';

const BOOKS = ['Matthew', 'Mark', 'Luke', 'John', 'Acts'];
const [src, id] = process.argv.slice(2);
if (!src || !id) {
  console.error('Usage: node tools/import-scripture.mjs <file.json> <translation-id>');
  process.exit(1);
}

const bible = JSON.parse(fs.readFileSync(src, 'utf8'));
const outDir = path.join('content', 'scripture', id);
fs.mkdirSync(outDir, { recursive: true });

for (const name of BOOKS) {
  const book = bible.books.find((b) => b.name === name);
  if (!book) throw new Error(`${name} not found in ${src}`);
  const chapters = {};
  for (const c of book.chapters) {
    chapters[c.chapter] = {};
    for (const v of c.verses) chapters[c.chapter][v.verse] = v.text.trim();
  }
  const file = path.join(outDir, `${name.toLowerCase()}.json`);
  fs.writeFileSync(file, JSON.stringify({ translation: id.toUpperCase(), book: name, chapters }, null, 1) + '\n');
  console.log(`wrote ${file}`);
}
