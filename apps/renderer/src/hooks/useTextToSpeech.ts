import { useCallback } from 'react';
import { speak, stopSpeaking } from '../lib/tts';

export function useTextToSpeech() {
  const say = useCallback((text: string, onEnd?: () => void) => {
    speak(text, onEnd);
  }, []);

  return { say, stop: stopSpeaking };
}
