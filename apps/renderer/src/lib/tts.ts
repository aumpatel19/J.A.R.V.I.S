let preferredVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (preferredVoice) return preferredVoice;
  const voices = speechSynthesis.getVoices();
  const preferred = ['Microsoft David', 'Google UK English Male', 'Daniel'];
  for (const name of preferred) {
    const v = voices.find((v) => v.name.includes(name));
    if (v) { preferredVoice = v; return v; }
  }
  return voices[0] ?? null;
}

export function speak(text: string, onEnd?: () => void): void {
  speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.95;
  utt.pitch = 0.9;
  utt.volume = 1;
  const voice = pickVoice();
  if (voice) utt.voice = voice;
  if (onEnd) utt.onend = onEnd;
  speechSynthesis.speak(utt);
}

export function stopSpeaking(): void {
  speechSynthesis.cancel();
}
