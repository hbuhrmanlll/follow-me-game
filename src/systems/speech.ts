// The built-in voice, used for any line without a recording. In the web
// version it is the browser's speech; in the Android app it is the phone's own
// text-to-speech engine (Android's web view has no browser speech).
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { loadSettings } from './save';
import { phraseParts } from './phrases';

const native = Capacitor.isNativePlatform();
let nativeToken = 0; // which request is current, so a stopped one is ignored
let nativeWord: ((charIndex: number) => void) | undefined;
if (native) void TextToSpeech.addListener('onRangeStart', ({ start }) => nativeWord?.(start));

export interface SpeakOptions {
  pitch?: number;
  rate?: number;
  onWord?: (charIndex: number) => void; // called as each word is spoken, if the browser supports it
  onEnd?: () => void;
}

export function canSpeak(): boolean {
  if (native) return true;
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let current: SpeechSynthesisUtterance | null = null;
let endTimer: number | undefined;
let sequence = 0; // which spoken message is current, so a stopped one goes quiet
let player: HTMLAudioElement | undefined;

export function stopSpeaking(): void {
  sequence++;
  if (player) { player.onended = null; player.onerror = null; player.pause(); player = undefined; }
  current = null;
  window.clearTimeout(endTimer);
  if (native) {
    nativeToken++;
    nativeWord = undefined;
    void TextToSpeech.stop().catch(() => undefined);
  } else if (canSpeak()) {
    window.speechSynthesis.cancel();
  }
}

// About how long the text takes to say, in milliseconds.
export function estimateDuration(text: string, rate = 1): number {
  return (text.length * 70) / rate + 400;
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  return voices.find((v) => v.lang === 'en-US' && v.localService) ?? voices.find((v) => v.lang === 'en-US') ?? voices[0];
}

// Says something: with the recorded voice for each sentence that has a
// recording, and the built-in voice for any sentence that doesn't.
export function speak(text: string, opts: SpeakOptions = {}): void {
  stopSpeaking();
  const parts = phraseParts(text);
  if (!parts.some((p) => p.url)) { speakVoice(text, opts); return; }
  const mine = sequence;
  let i = 0;
  const next = () => {
    if (mine !== sequence) return;
    const part = parts[i++];
    if (!part) { opts.onEnd?.(); return; }
    if (!part.url) { speakVoice(part.text, { ...opts, onWord: undefined, onEnd: next }); return; }
    const a = new Audio(part.url);
    a.playbackRate = opts.rate ?? 1;
    a.volume = loadSettings().voiceVolume;
    a.onended = next;
    a.onerror = () => speakVoice(part.text, { ...opts, onWord: undefined, onEnd: next });
    player = a;
    a.play().catch(() => { if (player === a) speakVoice(part.text, { ...opts, onWord: undefined, onEnd: next }); });
  };
  next();
}

// The built-in voice (the browser's, or the phone's in the Android app).
function speakVoice(text: string, opts: SpeakOptions = {}): void {
  current = null;
  window.clearTimeout(endTimer);
  const rate = opts.rate ?? 1;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(endTimer);
    opts.onEnd?.();
  };
  // Some phones never report that speech ended, so give up waiting after a while.
  const estimate = estimateDuration(text, rate);
  if (!canSpeak()) {
    endTimer = window.setTimeout(finish, estimate);
    return;
  }
  endTimer = window.setTimeout(finish, estimate * 1.8 + 2500);
  if (native) {
    speakNative(text, opts, rate, estimate, finish);
    return;
  }

  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'en-US';
  u.rate = rate;
  u.pitch = opts.pitch ?? 1;
  u.volume = loadSettings().voiceVolume;
  u.onboundary = (e) => {
    if (u === current && e.name === 'word') opts.onWord?.(e.charIndex);
  };
  // If the voice stops far too early (no voice installed, or an error), keep
  // the line on screen for about as long as it would take to say it.
  const startedAt = performance.now();
  const ended = () => {
    if (u !== current) return;
    const elapsed = performance.now() - startedAt;
    window.clearTimeout(endTimer);
    if (elapsed < estimate * 0.3) endTimer = window.setTimeout(finish, estimate - elapsed);
    else finish();
  };
  u.onend = ended;
  u.onerror = ended;
  current = u;
  window.speechSynthesis.speak(u);
}

function speakNative(text: string, opts: SpeakOptions, rate: number, estimate: number, finish: () => void): void {
  const token = ++nativeToken;
  nativeWord = opts.onWord;
  const startedAt = performance.now();
  const ended = () => {
    if (token !== nativeToken) return;
    nativeWord = undefined;
    const elapsed = performance.now() - startedAt;
    window.clearTimeout(endTimer);
    // No voice installed or an error: keep the line up for about as long as it would take to say.
    if (elapsed < estimate * 0.3) endTimer = window.setTimeout(finish, estimate - elapsed);
    else finish();
  };
  TextToSpeech.speak({
    text, lang: 'en-US', rate, pitch: opts.pitch ?? 1, volume: loadSettings().voiceVolume, category: 'playback',
  }).then(ended, ended);
}
