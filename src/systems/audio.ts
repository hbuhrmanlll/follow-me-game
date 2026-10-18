// Music and sound effects. The game makes its own gentle music and sounds
// with the Web Audio API, so there is nothing to license and nothing to
// download. A recording dropped into content/audio/music/{mood}.mp3 or
// content/audio/sfx/{name}.mp3 is used instead of the built-in sound.
import { loadSettings } from './save';

export type Mood = 'peace' | 'journey' | 'night' | 'sorrow' | 'wonder' | 'joy' | 'storm';
export type Sfx = 'tap' | 'correct' | 'wrong' | 'scroll' | 'join' | 'achievement' | 'thunder' | 'rumble' | 'wind' | 'chime';
export const MOODS: Mood[] = ['peace', 'journey', 'night', 'sorrow', 'wonder', 'joy', 'storm'];
export const SFX: Sfx[] = ['tap', 'correct', 'wrong', 'scroll', 'join', 'achievement', 'thunder', 'rumble', 'wind', 'chime'];

const musicFiles = import.meta.glob<string>('../../content/audio/music/*.{mp3,ogg}', { eager: true, query: '?url', import: 'default' });
const sfxFiles = import.meta.glob<string>('../../content/audio/sfx/*.{mp3,ogg}', { eager: true, query: '?url', import: 'default' });

function fileFor(files: Record<string, string>, folder: string, name: string): string | undefined {
  return files[`../../content/audio/${folder}/${name}.mp3`] ?? files[`../../content/audio/${folder}/${name}.ogg`];
}

// How each mood sounds: the notes it uses (as semitones above its key note),
// how often a note is played, and how bright the sound is.
interface MoodStyle { root: number; scale: number[]; beat: number; chance: number; bright: number; octave: number; wind?: boolean }
const STYLES: Record<Mood, MoodStyle> = {
  peace: { root: 50, scale: [0, 2, 4, 7, 9], beat: 0.85, chance: 0.45, bright: 1800, octave: 1 },
  journey: { root: 55, scale: [0, 2, 4, 7, 9], beat: 0.7, chance: 0.6, bright: 2200, octave: 1 },
  night: { root: 45, scale: [0, 3, 5, 7, 10], beat: 1.1, chance: 0.3, bright: 1100, octave: 1 },
  sorrow: { root: 50, scale: [0, 2, 3, 5, 7, 8, 10], beat: 1.2, chance: 0.32, bright: 1000, octave: 1 },
  wonder: { root: 52, scale: [0, 2, 4, 6, 7, 11], beat: 0.9, chance: 0.4, bright: 2600, octave: 2 },
  joy: { root: 48, scale: [0, 2, 4, 7, 9], beat: 0.55, chance: 0.65, bright: 2800, octave: 2 },
  storm: { root: 38, scale: [0, 3, 5, 7, 10], beat: 1.4, chance: 0.12, bright: 700, octave: 1, wind: true },
};

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

let ctx: AudioContext | undefined;
let musicBus: GainNode | undefined;
let sfxBus: GainNode | undefined;
let echo: DelayNode | undefined;
let noise: AudioBuffer | undefined;
let duckLevel = 1;
let current: { mood: Mood; stop(): void } | undefined;
let wanted: Mood | undefined;
const recordings = new Set<HTMLAudioElement>(); // music files that are playing

function audio(): AudioContext | undefined {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return undefined;
  ctx = new AC();
  musicBus = ctx.createGain();
  sfxBus = ctx.createGain();
  musicBus.connect(ctx.destination);
  sfxBus.connect(ctx.destination);
  // A soft echo gives the plucked notes some space, like a stone courtyard.
  echo = ctx.createDelay(1);
  echo.delayTime.value = 0.38;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.32;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 1600;
  echo.connect(tone).connect(feedback).connect(echo);
  tone.connect(musicBus);
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  applyVolumes();
  return ctx;
}

// Phones only allow sound after the player has touched the screen.
export function unlockAudioOnFirstTouch(): void {
  const unlock = () => {
    const c = audio();
    if (!c) return;
    void c.resume().then(() => {
      if (wanted && !current) setMood(wanted);
    });
  };
  for (const ev of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(ev, unlock, { capture: true });
}

export function applyVolumes(): void {
  const s = loadSettings();
  if (!ctx || !musicBus || !sfxBus) return;
  musicBus.gain.setTargetAtTime(s.musicVolume * 0.32 * duckLevel, ctx.currentTime, 0.3);
  sfxBus.gain.setTargetAtTime(s.sfxVolume * 0.5, ctx.currentTime, 0.05);
  for (const a of recordings) a.volume = s.musicVolume * 0.5 * duckLevel;
}

// Silence everything while the app is in the background.
export function pauseAudio(paused: boolean): void {
  if (!ctx) return;
  void (paused ? ctx.suspend() : ctx.resume()).catch(() => undefined);
  for (const a of recordings) {
    if (paused) a.pause();
    else void a.play().catch(() => undefined);
  }
}

// Music gets quieter while someone is speaking.
export function duckMusic(on: boolean): void {
  duckLevel = on ? 0.5 : 1;
  applyVolumes();
}


// Changes the music, fading from the old mood to the new one.
export function setMood(mood: Mood): void {
  wanted = mood;
  if (current?.mood === mood) return;
  const c = audio();
  if (!c || c.state !== 'running') return; // starts once the player first taps
  current?.stop();
  const file = fileFor(musicFiles, 'music', mood);
  current = { mood, stop: file ? playRecording(file) : playGenerated(c, STYLES[mood]) };
}

export function currentMood(): Mood | undefined {
  return wanted;
}

function playRecording(url: string): () => void {
  const a = new Audio(url);
  a.loop = true;
  a.volume = 0;
  recordings.add(a);
  void a.play().catch(() => undefined);
  const target = () => loadSettings().musicVolume * 0.5 * duckLevel;
  let v = 0;
  const fadeIn = window.setInterval(() => {
    v = Math.min(target(), v + 0.03);
    a.volume = v;
    if (v >= target()) window.clearInterval(fadeIn);
  }, 100);
  return () => {
    window.clearInterval(fadeIn);
    recordings.delete(a);
    const fade = window.setInterval(() => {
      a.volume = Math.max(0, a.volume - 0.04);
      if (a.volume <= 0) { window.clearInterval(fade); a.pause(); }
    }, 100);
  };
}

// A quiet drone with plucked notes over it, a little like a lyre.
function playGenerated(c: AudioContext, st: MoodStyle): () => void {
  const out = c.createGain();
  out.gain.value = 0;
  out.gain.setTargetAtTime(1, c.currentTime, 1.2);
  out.connect(musicBus!);
  out.connect(echo!);
  const nodes: AudioScheduledSourceNode[] = [];

  const pad = c.createBiquadFilter();
  pad.type = 'lowpass';
  pad.frequency.value = st.bright * 0.35;
  const padGain = c.createGain();
  padGain.gain.value = 0.16;
  pad.connect(padGain).connect(out);
  for (const [semi, type, detune] of [[-12, 'triangle', 0], [-5, 'sine', 4], [0, 'sine', -3]] as const) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = hz(st.root + semi);
    o.detune.value = detune;
    o.connect(pad);
    o.start();
    nodes.push(o);
  }
  // The drone slowly swells and fades.
  const lfo = c.createOscillator();
  const lfoDepth = c.createGain();
  lfo.frequency.value = 0.07;
  lfoDepth.gain.value = 0.06;
  lfo.connect(lfoDepth).connect(padGain.gain);
  lfo.start();
  nodes.push(lfo);

  if (st.wind) nodes.push(windNoise(c, out, 0.22));

  let step = 0;
  let next = c.currentTime + 0.5;
  let degree = 0;
  const tick = () => {
    while (next < c.currentTime + 0.6) {
      if (Math.random() < st.chance) {
        degree = Math.max(0, Math.min(st.scale.length * 2 - 1, degree + Math.round((Math.random() - 0.5) * 4)));
        const semi = st.scale[degree % st.scale.length] + 12 * (Math.floor(degree / st.scale.length) + st.octave);
        pluck(c, out, hz(st.root + semi), next, st.bright, step % 8 === 0 ? 0.22 : 0.15);
      }
      step++;
      next += st.beat * (step % 2 ? 1.08 : 0.92); // a slight lilt
    }
  };
  tick();
  const timer = window.setInterval(tick, 200);
  return () => {
    window.clearInterval(timer);
    out.gain.setTargetAtTime(0, c.currentTime, 0.6);
    window.setTimeout(() => { for (const n of nodes) n.stop(); out.disconnect(); }, 3500);
  };
}

function pluck(c: AudioContext, dest: AudioNode, freq: number, at: number, bright: number, level: number): void {
  const o = c.createOscillator();
  const o2 = c.createOscillator();
  o.type = 'triangle';
  o2.type = 'sine';
  o.frequency.value = freq;
  o2.frequency.value = freq * 2;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(bright, at);
  f.frequency.exponentialRampToValueAtTime(400, at + 1.5);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(level, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 2.2);
  const g2 = c.createGain();
  g2.gain.value = 0.25;
  o.connect(f);
  o2.connect(g2).connect(f);
  f.connect(g).connect(dest);
  o.start(at);
  o2.start(at);
  o.stop(at + 2.3);
  o2.stop(at + 2.3);
}

function windNoise(c: AudioContext, dest: AudioNode, level: number): AudioBufferSourceNode {
  const src = c.createBufferSource();
  src.buffer = noise!;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 500;
  f.Q.value = 0.8;
  const sweep = c.createOscillator();
  const depth = c.createGain();
  sweep.frequency.value = 0.13;
  depth.gain.value = 300;
  sweep.connect(depth).connect(f.frequency);
  sweep.start();
  src.onended = () => sweep.stop();
  const g = c.createGain();
  g.gain.value = level;
  src.connect(f).connect(g).connect(dest);
  src.start();
  return src;
}

// A short sound effect.
export function sfx(name: Sfx): void {
  const c = audio();
  if (!c || c.state !== 'running') return;
  const file = fileFor(sfxFiles, 'sfx', name);
  if (file) {
    const a = new Audio(file);
    a.volume = loadSettings().sfxVolume;
    void a.play().catch(() => undefined);
    return;
  }
  const t = c.currentTime + 0.01;
  const bus = sfxBus!;
  const notes = (list: number[], gap: number, level: number, length = 1.2) =>
    list.forEach((m, i) => pluck(c, bus, hz(m), t + i * gap, 3000, level * (length / 1.2)));
  switch (name) {
    case 'tap': tone(c, bus, 880, t, 0.06, 0.12, 'sine'); break;
    case 'correct': notes([72, 76, 79], 0.09, 0.35); break;
    case 'wrong': tone(c, bus, 330, t, 0.18, 0.18, 'triangle'); tone(c, bus, 262, t + 0.16, 0.25, 0.18, 'triangle'); break;
    case 'scroll': notes([84, 88, 91, 96], 0.07, 0.25); break;
    case 'join': notes([60, 64, 67, 72], 0.12, 0.3); break;
    case 'achievement': notes([67, 72, 76, 79, 84], 0.1, 0.32); break;
    case 'chime': notes([88, 95], 0.25, 0.2); break;
    case 'thunder': burst(c, bus, t, 180, 2.8, 0.9); break;
    case 'rumble': burst(c, bus, t, 90, 3.5, 1.0); break;
    case 'wind': burst(c, bus, t, 700, 3, 0.35, 1.2); break;
  }
}

function tone(c: AudioContext, dest: AudioNode, freq: number, at: number, len: number, level: number, type: OscillatorType): void {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(level, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g).connect(dest);
  o.start(at);
  o.stop(at + len + 0.05);
}

// Filtered noise: thunder, an earthquake's rumble or a gust of wind.
function burst(c: AudioContext, dest: AudioNode, at: number, freq: number, len: number, level: number, attack = 0.02): void {
  const src = c.createBufferSource();
  src.buffer = noise!;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(level, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(f).connect(g).connect(dest);
  src.start(at);
  src.stop(at + len + 0.1);
}
