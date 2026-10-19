# Makes a voice recording for every line with Kokoro, a free AI voice that
# runs on GitHub's computers (or any computer); nothing is paid or sent anywhere.
#
#   python tools/generate-voices-free.py              make everything new or changed
#   python tools/generate-voices-free.py --dry-run    only list what would be made
#   python tools/generate-voices-free.py --only=ch02  one chapter
#
# Needs: pip install kokoro-onnx soundfile, ffmpeg, and the two model files
# (the "Generate voices (free)" action downloads them). Voices are chosen in
# tools/voices-free.json. Like the ElevenLabs maker, it only re-makes lines whose
# words or voice changed, and never replaces a recording you put in yourself.
import hashlib
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

OUT = os.path.join('content', 'audio', 'en')
MANIFEST = os.path.join(OUT, 'manifest.json')
MODEL_DIR = os.environ.get('KOKORO_DIR', 'kokoro-model')
args = dict((a.lstrip('-').split('=') + [True])[:2] for a in sys.argv[1:])


def sha(data):
    return hashlib.sha1(data if isinstance(data, bytes) else data.encode()).hexdigest()[:16]


def file_hash(path):
    with open(path, 'rb') as f:
        return sha(f.read())


# The lines come from the same list the game and the ElevenLabs maker use.
cmd = ['node', 'tools/generate-voices.mjs', '--list'] + ([f"--only={args['only']}"] if 'only' in args else [])
clips = json.loads(subprocess.run(cmd, capture_output=True, text=True, check=True).stdout)
# Puzzle questions, answers and other messages, one recording per sentence.
phrases = json.loads(subprocess.run(['node', 'tools/phrases.mjs'], capture_output=True, text=True, check=True).stdout)
if 'only' not in args and 'no-phrases' not in args:
    clips += [{'file': f"phrases/{p['key']}.mp3", 'speaker': '_phrases', 'text': p['text']} for p in phrases]
voices = json.load(open('tools/voices-free.json'))
manifest = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}


def settings(speaker):
    if speaker == '_phrases':
        return voices['phrases']
    return voices['characters'].get(speaker, voices['default'])


todo, kept, current = [], 0, 0
for clip in clips:
    s = settings(clip['speaker'])
    clip['hash'] = sha(json.dumps([clip['text'], s, 'kokoro-v1.0'], ensure_ascii=False))
    full = os.path.join(OUT, clip['file'])
    entry = manifest.get(clip['file'])
    if os.path.exists(full) and (not entry or entry.get('fileHash') != file_hash(full)):
        kept += 1  # someone's own recording
        continue
    if entry and entry.get('hash') == clip['hash'] and os.path.exists(full):
        current += 1
        continue
    todo.append(clip)

wanted = {c['file'] for c in clips}
if 'only' not in args:
    for name in [n for n, e in manifest.items() if n.startswith('phrases/') and n not in wanted and e.get('engine') == 'kokoro']:
        if os.path.exists(os.path.join(OUT, name)):
            os.remove(os.path.join(OUT, name))
        del manifest[name]
    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=1, sort_keys=True)
        f.write('\n')
print(f"{len(clips)} lines: {current} up to date, {kept} recorded by hand (kept), {len(todo)} to make.")
if 'dry-run' in args:
    for c in todo:
        print(f"  {c['file']}  [{c['speaker']}]  {c['text'][:60]}")
    sys.exit(0)
if not todo:
    sys.exit(0)

kokoro = Kokoro(os.path.join(MODEL_DIR, 'kokoro-v1.0.onnx'), os.path.join(MODEL_DIR, 'voices-v1.0.bin'))


def style(v):
    # A single voice, or a mix of two voices' styles to give a character their own sound.
    if isinstance(v, str):
        return v, ('en-gb' if v.startswith('b') else 'en-us')
    mix = sum(kokoro.get_voice_style(v[i]) * float(v[i + 1]) for i in range(0, len(v), 2))
    return mix, ('en-gb' if v[0].startswith('b') else 'en-us')


def word_timings(text, seconds):
    # Kokoro doesn't report when each word is said, so spread the words over
    # the recording by length, with small pauses at punctuation.
    words, weights = [], []
    i = 0
    for w in text.split():
        c = text.index(w, i)
        i = c + len(w)
        words.append(c)
        weights.append(len(w) + 1 + (4 if w[-1] in '.!?' else 2 if w[-1] in ',;:…—' else 0))
    total = sum(weights) or 1
    t, out = 0.15, []
    span = max(0.1, seconds - 0.3)
    for c, wt in zip(words, weights):
        d = span * wt / total
        out.append({'c': c, 's': round(t, 3), 'e': round(t + d, 3)})
        t += d
    return out


made = 0
for clip in todo:
    s = settings(clip['speaker'])
    voice, lang = style(s['voice'])
    samples, rate = kokoro.create(clip['text'], voice=voice, speed=float(s.get('speed', 1)), lang=lang)
    samples = np.concatenate([np.zeros(int(rate * 0.12), dtype=samples.dtype), samples])
    full = os.path.join(OUT, clip['file'])
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        sf.write(tmp.name, samples, rate)
    # Small files for phones: mono MP3 at 32 kbit/s, which is clear for speech.
    filters = []
    if s.get('pitch'):
        # Deeper (or higher) without changing the speed
        filters += [f"asetrate={int(rate * s['pitch'])}", f'aresample={rate}', f"atempo={1 / s['pitch']:.4f}"]
    if s.get('echo'):
        filters.append('aecho=0.8:0.7:90|180:0.3|0.18')
    filters.append('loudnorm=I=-18:TP=-1.5:LRA=11')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp.name, '-af', ','.join(filters), '-ac', '1', '-ar', '24000', '-b:a', '32k', full], check=True)
    os.unlink(tmp.name)
    seconds = len(samples) / rate
    if clip['speaker'] != '_phrases':  # short messages don't highlight words
        with open(full.replace('.mp3', '.json'), 'w') as f:
            json.dump({'words': word_timings(clip['text'], seconds)}, f, separators=(',', ':'))
    manifest[clip['file']] = {'hash': clip['hash'], 'fileHash': file_hash(full), 'engine': 'kokoro'}
    made += 1
    if made % 20 == 0 or made == len(todo):
        with open(MANIFEST, 'w') as f:
            json.dump(manifest, f, indent=1, sort_keys=True)
            f.write('\n')
        print(f"  {made} of {len(todo)} made")
print('Done.')
