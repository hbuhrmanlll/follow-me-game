// Temporary voice: the browser's built-in speech. Later, recorded audio files
// will be played instead whenever one exists for a line.

export interface SpeakOptions {
  pitch?: number;
  rate?: number;
  onWord?: (charIndex: number) => void; // called as each word is spoken, if the browser supports it
  onEnd?: () => void;
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let current: SpeechSynthesisUtterance | null = null;
let endTimer: number | undefined;

export function stopSpeaking(): void {
  current = null;
  window.clearTimeout(endTimer);
  if (canSpeak()) window.speechSynthesis.cancel();
}

// About how long the text takes to say, in milliseconds.
export function estimateDuration(text: string, rate = 1): number {
  return (text.length * 70) / rate + 400;
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  return voices.find((v) => v.lang === 'en-US' && v.localService) ?? voices.find((v) => v.lang === 'en-US') ?? voices[0];
}

export function speak(text: string, opts: SpeakOptions = {}): void {
  stopSpeaking();
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

  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'en-US';
  u.rate = rate;
  u.pitch = opts.pitch ?? 1;
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
