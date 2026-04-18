import { useCallback, useRef } from 'react';

interface UseSpeechToTextOptions {
  onResult: (transcript: string) => void;
  onEnd?: () => void;
}

export function useSpeechToText({ onResult, onEnd }: UseSpeechToTextOptions) {
  const recRef = useRef<SpeechRecognition | null>(null);

  const start = useCallback(() => {
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

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  return { start, stop };
}
