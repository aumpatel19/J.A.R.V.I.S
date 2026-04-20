import { useCallback, useRef } from 'react';
import { sarvamSTT } from '../lib/api';

interface UseSpeechToTextOptions {
  onResult: (transcript: string) => void;
  onEnd?: () => void;
  useSarvam?: boolean;
}

export function useSpeechToText({ onResult, onEnd, useSarvam = false }: UseSpeechToTextOptions) {
  const recRef = useRef<SpeechRecognition | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startBrowser = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const text = e.results[0]?.[0]?.transcript ?? '';
      if (text.trim()) onResult(text.trim());
    };
    rec.onend = () => onEnd?.();
    rec.onerror = () => onEnd?.();
    rec.start();
    recRef.current = rec;
  }, [onResult, onEnd]);

  const startSarvam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const transcript = await sarvamSTT(blob);
          if (transcript.trim()) onResult(transcript.trim());
        } catch {
          onEnd?.();
        }
      };
      mr.start();
      mediaRecRef.current = mr;
    } catch {
      startBrowser();
    }
  }, [onResult, onEnd, startBrowser]);

  const start = useCallback(() => {
    if (useSarvam) {
      startSarvam();
    } else {
      startBrowser();
    }
  }, [useSarvam, startBrowser, startSarvam]);

  const stop = useCallback(() => {
    if (useSarvam && mediaRecRef.current?.state === 'recording') {
      mediaRecRef.current.stop();
    } else {
      recRef.current?.stop();
    }
  }, [useSarvam]);

  return { start, stop };
}
