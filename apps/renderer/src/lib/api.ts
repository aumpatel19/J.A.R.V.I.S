import { JarvisResponse } from '../../../../shared/types';

const BASE = 'http://localhost:4000';

export type { JarvisResponse };

export async function sendChat(text: string): Promise<JarvisResponse> {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json() as Promise<JarvisResponse>;
}

export async function checkCapabilities(): Promise<{ sarvam: boolean }> {
  try {
    const res = await fetch(`${BASE}/capabilities`);
    return res.json() as Promise<{ sarvam: boolean }>;
  } catch {
    return { sarvam: false };
  }
}

export async function sarvamSTT(audioBlob: Blob): Promise<string> {
  const form = new FormData();
  form.append('audio', audioBlob, 'audio.webm');
  const res = await fetch(`${BASE}/stt`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('STT failed');
  const data = (await res.json()) as { transcript: string };
  return data.transcript;
}

export async function sarvamTTS(text: string): Promise<string> {
  const res = await fetch(`${BASE}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('TTS failed');
  const data = (await res.json()) as { audio: string };
  return data.audio;
}
