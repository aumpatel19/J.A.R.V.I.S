import { useEffect, useRef } from 'react';
import { getBestMicDeviceId } from '../lib/microphone';

interface UseWakeWordOptions {
  onWake: () => void;
  enabled: boolean;
}

const CHUNK_MS = 2500;
const RMS_THRESHOLD = 0.008;

export function useWakeWord({ onWake, enabled }: UseWakeWordOptions) {
  const enabledRef = useRef(enabled);
  const onWakeRef = useRef(onWake);
  enabledRef.current = enabled;
  onWakeRef.current = onWake;

  useEffect(() => {
    if (!enabled) return;

    let stopped = false;
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let loopTimer: ReturnType<typeof setTimeout> | null = null;

    async function init() {
      try {
        const deviceId = await getBestMicDeviceId();
        stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        });
      } catch {
        return;
      }

      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      const dataArray = new Float32Array(analyser.frequencyBinCount);

      function getMaxRms(): number {
        analyser.getFloatTimeDomainData(dataArray);
        return Math.sqrt(dataArray.reduce((s, v) => s + v * v, 0) / dataArray.length);
      }

      function nextChunk() {
        if (stopped || !enabledRef.current) return;

        const chunks: Blob[] = [];
        let maxRms = 0;

        recorder = new MediaRecorder(stream!);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
          const rms = getMaxRms();
          if (rms > maxRms) maxRms = rms;
        };

        recorder.onstop = async () => {
          if (stopped || !enabledRef.current) return;

          // Only call STT if there was voice activity in this chunk
          if (maxRms > RMS_THRESHOLD && chunks.length > 0) {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            if (blob.size > 500) {
              try {
                const form = new FormData();
                form.append('audio', blob, 'audio.webm');
                const res = await fetch('http://localhost:4000/stt', { method: 'POST', body: form });
                if (res.ok) {
                  const { transcript } = (await res.json()) as { transcript: string };
                  if (transcript?.toLowerCase().includes('jarvis')) {
                    if (enabledRef.current && !stopped) {
                      onWakeRef.current();
                      return; // stop loop — STT will take over
                    }
                  }
                }
              } catch { /* network/STT error — just continue */ }
            }
          }

          // Schedule next chunk
          if (!stopped && enabledRef.current) {
            loopTimer = setTimeout(nextChunk, 100);
          }
        };

        recorder.start(200); // collect data every 200ms for RMS sampling
        setTimeout(() => {
          if (recorder?.state === 'recording') recorder.stop();
        }, CHUNK_MS);
      }

      nextChunk();
    }

    init();

    return () => {
      stopped = true;
      if (loopTimer) clearTimeout(loopTimer);
      try { recorder?.stop(); } catch {}
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled]);
}
