import { useCallback, useRef } from 'react';
import { getBestMicDeviceId } from '../lib/microphone';

interface UseSpeechToTextOptions {
  onResult: (transcript: string) => void;
  onEnd?: () => void;
  onError?: (msg: string) => void;
}

async function sarvamSTT(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('audio', blob, 'audio.webm');
  const res = await fetch('http://localhost:4000/stt', { method: 'POST', body: form });
  if (!res.ok) throw new Error('STT failed');
  const data = (await res.json()) as { transcript: string };
  return data.transcript;
}

export function useSpeechToText({ onResult, onEnd, onError }: UseSpeechToTextOptions) {
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRecRef = useRef<SpeechRecognition | null>(null);

  const stopSilenceDetection = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    // Try Sarvam (MediaRecorder) first
    try {
      const deviceId = await getBestMicDeviceId();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      chunksRef.current = [];

      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Float32Array(analyser.frequencyBinCount);
      let silenceFrames = 0;
      let hasVoice = false;

      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stopSilenceDetection();
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size < 1000) { onEnd?.(); return; }
        try {
          const transcript = await sarvamSTT(blob);
          if (transcript.trim()) onResult(transcript.trim());
          else { onError?.('No speech detected'); onEnd?.(); }
        } catch (err) {
          onError?.(`STT failed: ${(err as Error).message}`);
          onEnd?.();
        }
      };

      mr.start(100);
      mediaRecRef.current = mr;

      // Hard cap: stop recording after 15s regardless
      maxTimerRef.current = setTimeout(() => {
        if (mr.state === 'recording') mr.stop();
      }, 15000);

      // Silence detection: stop after 1.5s of silence (once voice was detected)
      silenceTimerRef.current = setInterval(() => {
        analyser.getFloatTimeDomainData(dataArray);
        const rms = Math.sqrt(dataArray.reduce((s, v) => s + v * v, 0) / dataArray.length);
        if (rms > 0.01) {
          hasVoice = true;
          silenceFrames = 0;
        } else if (hasVoice) {
          silenceFrames++;
          if (silenceFrames >= 30) {
            mr.stop();
          }
        }
      }, 50);

    } catch {
      // Fallback to Web Speech API
      const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      if (!SR) { onEnd?.(); return; }
      const rec = new SR();
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.onresult = (e: SpeechRecognitionEvent) => {
        const text = e.results[0]?.[0]?.transcript ?? '';
        if (text.trim()) onResult(text.trim());
      };
      rec.onend = () => onEnd?.();
      rec.onerror = () => onEnd?.();
      rec.start();
      fallbackRecRef.current = rec;
    }
  }, [onResult, onEnd, stopSilenceDetection]);

  const stop = useCallback(() => {
    stopSilenceDetection();
    if (mediaRecRef.current?.state === 'recording') {
      mediaRecRef.current.stop();
    }
    fallbackRecRef.current?.stop();
  }, [stopSilenceDetection]);

  return { start, stop };
}
