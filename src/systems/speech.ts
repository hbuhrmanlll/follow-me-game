// Temporary voice: the browser's built-in speech. Later, recorded audio files
// will be played instead whenever one exists for a line.

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, opts: { rate?: number; pitch?: number } = {}): void {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = opts.rate ?? 0.95;
  u.pitch = opts.pitch ?? 1;
  window.speechSynthesis.speak(u);
}
