#!/usr/bin/env bash
# Copies the shared game content (Bible text, chapters, characters, looks and
# voice recordings) into the Godot project, which can only read files inside
# its own folder. Run from the project root before opening or building godot/.
set -euo pipefail
OUT=godot/content
rm -rf "$OUT"
mkdir -p "$OUT/en/chapters" "$OUT/scripture" "$OUT/audio/en"
cp content/looks.json content/translations.json content/map.json "$OUT/"
cp content/en/*.json "$OUT/en/"
cp content/en/chapters/*.json "$OUT/en/chapters/"
cp -r content/scripture/bsb content/scripture/kjv "$OUT/scripture/"
cp content/en/chapters/index.json "$OUT/en/chapters/" 2>/dev/null || true
# All the voice recordings (only .mp3 files, not the .json timing files).
( cd content/audio/en && find . -name '*.mp3' ) | while read -r f; do
  mkdir -p "$OUT/audio/en/$(dirname "$f")"
  cp "content/audio/en/$f" "$OUT/audio/en/$f"
done
echo "Copied content into $OUT"
