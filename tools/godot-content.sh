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
# The 3D test chapter needs Chapter 1's recordings and the shared phrases.
for t in bsb kjv; do
  mkdir -p "$OUT/audio/en/$t"
  cp content/audio/en/$t/ch01-* "$OUT/audio/en/$t/" 2>/dev/null || true
done
cp content/audio/en/ch01-* "$OUT/audio/en/" 2>/dev/null || true
cp -r content/audio/en/phrases "$OUT/audio/en/"
echo "Copied content into $OUT"
