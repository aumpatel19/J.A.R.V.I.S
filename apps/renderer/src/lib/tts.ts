import { sarvamTTS } from './api';

let preferredVoice: SpeechSynthesisVoice | null = null;
let useSarvam = false;

export function setSarvamTTS(enabled: boolean) {
  useSarvam = enabled;
}

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

function speakBrowser(text: string, onEnd?: () => void): void {
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

async function speakSarvam(text: string, onEnd?: () => void): Promise<void> {
  try {
    const base64Audio = await sarvamTTS(text);
    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const audioCtx = new AudioContext();
    const buffer = await audioCtx.decodeAudioData(bytes.buffer);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.onended = () => {
      audioCtx.close();
      onEnd?.();
    };
    source.start();
  } catch {
    speakBrowser(text, onEnd);
  }
}

export function speak(text: string, onEnd?: () => void): void {
  if (useSarvam) {
    speakSarvam(text, onEnd);
  } else {
    speakBrowser(text, onEnd);
  }
}

export function stopSpeaking(): void {
  speechSynthesis.cancel();
}
