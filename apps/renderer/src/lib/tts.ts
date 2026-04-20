// Always use server-side Edge TTS (en-GB-RyanNeural). Falls back to browser TTS if server is down.

let preferredVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (preferredVoice) return preferredVoice;
  const voices = speechSynthesis.getVoices();
  const preferred = [
    'Microsoft Ryan Online (Natural)',
    'Microsoft Guy Online (Natural)',
    'Microsoft David',
    'Google UK English Male',
    'Daniel',
  ];
  for (const name of preferred) {
    const v = voices.find((v) => v.name.includes(name));
    if (v) { preferredVoice = v; return v; }
  }
  return voices[0] ?? null;
}

function speakBrowser(text: string, onEnd?: () => void): void {
  speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.92;
  utt.pitch = 0.85;
  utt.volume = 1;
  const voice = pickVoice();
  if (voice) utt.voice = voice;
  if (onEnd) utt.onend = onEnd;
  speechSynthesis.speak(utt);
}

async function speakServer(text: string, onEnd?: () => void): Promise<void> {
  const res = await fetch('http://localhost:4000/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Server TTS failed');
  const { audio } = (await res.json()) as { audio: string };

  const binary = atob(audio);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  const buffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.onended = () => { audioCtx.close(); onEnd?.(); };
  source.start();
}

export function speak(text: string, onEnd?: () => void): void {
  // Safety timeout: if TTS hangs, unblock the app after 20s
  let done = false;
  const guard = setTimeout(() => { if (!done) { done = true; onEnd?.(); } }, 20000);
  const finish = () => { if (!done) { done = true; clearTimeout(guard); onEnd?.(); } };
  speakServer(text, finish).catch(() => speakBrowser(text, finish));
}

export function stopSpeaking(): void {
  speechSynthesis.cancel();
}
