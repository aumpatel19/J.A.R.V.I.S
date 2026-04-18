import { useCallback, useEffect, useRef } from 'react';

interface UseWakeWordOptions {
  onWake: () => void;
  enabled: boolean;
}

export function useWakeWord({ onWake, enabled }: UseWakeWordOptions) {
  const recRef = useRef<SpeechRecognition | null>(null);
  const onWakeRef = useRef(onWake);
  onWakeRef.current = onWake;

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = true;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.toLowerCase().trim();
        if (t.startsWith('jarvis') || t.includes('hey jarvis')) {
          rec.stop();
          onWakeRef.current();
          return;
        }
      }
    };

    rec.onend = () => {
      if (enabled) {
        setTimeout(() => recRef.current?.start(), 500);
      }
    };

    rec.start();
    recRef.current = rec;
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      recRef.current?.stop();
    }
    return () => recRef.current?.stop();
  }, [enabled, startListening]);
}
