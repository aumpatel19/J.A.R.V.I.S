import { useEffect, useRef } from 'react';

interface UseWakeWordOptions {
  onWake: () => void;
  enabled: boolean;
}

export function useWakeWord({ onWake, enabled }: UseWakeWordOptions) {
  const enabledRef = useRef(enabled);
  const onWakeRef = useRef(onWake);
  const recRef = useRef<SpeechRecognition | null>(null);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waking = useRef(false);

  enabledRef.current = enabled;
  onWakeRef.current = onWake;

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;

    function build(): SpeechRecognition {
      const rec = new SR!();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.continuous = true;
      rec.maxAlternatives = 3;

      rec.onresult = (e: SpeechRecognitionEvent) => {
        if (waking.current) return;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          for (let j = 0; j < e.results[i].length; j++) {
            const t = e.results[i][j].transcript.toLowerCase().trim();
            if (t.includes('jarvis') || t.includes('travis') || t.includes('javis')) {
              waking.current = true;
              rec.stop();
              onWakeRef.current();
              // Reset waking flag after STT takes over
              setTimeout(() => { waking.current = false; }, 3000);
              return;
            }
          }
        }
      };

      rec.onerror = () => scheduleRestart();
      rec.onend = () => scheduleRestart();

      return rec;
    }

    function scheduleRestart() {
      if (restartTimer.current) clearTimeout(restartTimer.current);
      if (!enabledRef.current) return;
      restartTimer.current = setTimeout(() => {
        if (!enabledRef.current) return;
        try {
          const rec = build();
          recRef.current = rec;
          rec.start();
        } catch { scheduleRestart(); }
      }, 300);
    }

    function start() {
      try {
        const rec = build();
        recRef.current = rec;
        rec.start();
        console.log('[JARVIS] Wake word listener active');
      } catch (e) {
        console.warn('[JARVIS] Wake word start failed:', e);
        scheduleRestart();
      }
    }

    function stop() {
      if (restartTimer.current) { clearTimeout(restartTimer.current); restartTimer.current = null; }
      try { recRef.current?.stop(); } catch {}
      recRef.current = null;
    }

    if (enabled) start();
    else stop();

    return stop;
  }, [enabled]);
}
