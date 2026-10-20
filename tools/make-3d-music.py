"""Makes the background music and river sound for the 3D version.

Everything is made from simple waves, so there are no licenses to worry about.
Run:  python3 tools/make-3d-music.py   (needs numpy and ffmpeg)
Writes godot/audio/music_jordan.ogg and godot/audio/river.ogg.
"""
import subprocess, sys, wave
import numpy as np

R = 44100
OUT = 'godot/audio'
rng = np.random.default_rng(7)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tone(f, length, partials=((1, 1.0),)):
    t = np.arange(int(R * length)) / R
    return sum(a * np.sin(2 * np.pi * f * k * t) for k, a in partials)


def reverb(x, seconds=2.6, mix=0.32):
    # A soft hall: noise that dies away, used as an echo pattern
    n = int(R * seconds)
    t = np.arange(n) / R
    ir = rng.standard_normal(n) * np.exp(-t * 3.2)
    ir[0] = 0
    ir /= np.sqrt((ir ** 2).sum())
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:len(x) + n]
    wet[:len(x)] *= 1
    out = np.zeros(len(x) + n)
    out[:len(x)] += x
    return out * (1 - mix) + wet * mix * 0.5


def write(name, x, loop_len):
    # Wrap the reverb tail back to the start so the loop is seamless
    y = x[:loop_len].copy()
    tail = x[loop_len:]
    y[:len(tail)] += tail
    y /= np.abs(y).max() / 0.85
    pcm = (y * 32767).astype(np.int16)
    tmp = f'{OUT}/_tmp.wav'
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(R); w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '3', f'{OUT}/{name}'], check=True)
    import os; os.remove(tmp)
    print('wrote', name, round(len(y) / R, 1), 's')


def music():
    beat = 0.62
    bar = beat * 4
    chord_bars = 2
    # D, Bm, G, A, D, G, Em, A
    chords = [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64], [62, 66, 69], [55, 59, 62], [52, 55, 59], [57, 61, 64]]
    clen = bar * chord_bars
    total = int(R * clen * len(chords))
    buf = np.zeros(total + int(R * 4))
    for ci, notes in enumerate(chords):
        s = int(ci * clen * R)
        # Strings: soft, slightly detuned, swelling in and out
        n = int(R * (clen + 0.8))
        t = np.arange(n) / R
        env = np.minimum(1, t / 1.0) * np.clip((clen + 0.8 - t) / 1.0, 0, 1)
        for m in notes:
            for d in (0.996, 1.004):
                buf[s:s + n] += tone(hz(m) * d, clen + 0.8, ((1, 1), (2, 0.25), (3, 0.08))) * env * 0.05
        # Bass
        n = int(R * clen)
        t = np.arange(n) / R
        buf[s:s + n] += tone(hz(notes[0] - 24), clen, ((1, 1), (2, 0.35))) * np.minimum(1, t / 0.08) * np.exp(-t * 0.45) * 0.12
        # Harp: plucked notes rising and falling through the chord
        pattern = [0, 1, 2, 3, 4, 3, 2, 1]
        harp = [notes[0], notes[1], notes[2], notes[0] + 12, notes[1] + 12]
        for k in range(chord_bars * 8):
            if ci % 2 == 1 and k >= 12:
                continue
            m = harp[pattern[k % 8]] + 12
            at = s + int(k * beat / 2 * R)
            n = int(R * 1.8)
            t = np.arange(n) / R
            pl = tone(hz(m), 1.8, ((1, 1), (2, 0.4), (3, 0.15), (4, 0.06)))
            pl *= np.exp(-t * 2.8) * np.minimum(1, t * 500)
            buf[at:at + n] += pl * (0.075 if k % 2 == 0 else 0.06)
        # A soft flute melody on the second time round
        if ci >= 4:
            melody = [notes[2] + 12, notes[1] + 12, notes[2] + 12, notes[0] + 24]
            for k, m in enumerate(melody[: 2 + ci % 2]):
                at = s + int(k * bar * R * 0.9)
                n = int(R * bar * 0.85)
                t = np.arange(n) / R
                env = np.minimum(1, t / 0.25) * np.clip((bar * 0.85 - t) / 0.4, 0, 1)
                vib = np.sin(2 * np.pi * 5 * t) * 0.004
                ph = 2 * np.pi * np.cumsum(hz(m) * (1 + vib)) / R
                buf[at:at + n] += (np.sin(ph) + 0.12 * np.sin(2 * ph)) * env * 0.045
    write('music_jordan.ogg', reverb(buf[:total + int(R * 1.5)]), total)


def river():
    n = int(R * 8)
    x = rng.standard_normal(n + R)
    # Soft rushing water: filtered noise that rises and falls a little
    from numpy.fft import rfft, irfft
    X = rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / R)
    X *= 1 / (1 + (f / 500) ** 2) * (f > 60)
    y = irfft(X, len(x))
    y *= 0.8 + 0.2 * np.sin(np.arange(len(y)) / R * 2 * np.pi * 0.125)
    write('river.ogg', y, n)


if __name__ == '__main__':
    music()
    river()
