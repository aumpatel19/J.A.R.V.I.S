import { useEffect, useRef } from 'react';
import { AppStatus } from '../store/session';

interface Props {
  status: AppStatus;
  onMicLevel: (v: number) => void;
}

export function Waveform({ status, onMicLevel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (status !== 'listening') {
      onMicLevel(0);
      return;
    }

    let audioCtx: AudioContext;

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      streamRef.current = stream;
      audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      drawLoop(analyser);
    });

    return () => {
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtx?.close();
    };
  }, [status]);

  function drawLoop(analyser: AnalyserNode) {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    // Capture non-null refs for use inside the animation closure
    const c = canvasEl;
    const cx = ctx;

    function draw() {
      animRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(buf);

      const avg = buf.reduce((a, b) => a + b, 0) / buf.length / 255;
      onMicLevel(avg);

      cx.clearRect(0, 0, c.width, c.height);

      const w = c.width;
      const h = c.height;
      const barW = w / buf.length * 2.5;

      buf.forEach((val, i) => {
        const barH = (val / 255) * h * 0.8;
        const x = i * (barW + 1);
        const alpha = 0.4 + (val / 255) * 0.6;
        cx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
        cx.fillRect(x, h - barH, barW, barH);
      });
    }

    draw();
  }

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={48}
      className="rounded opacity-80"
      style={{ display: status === 'listening' ? 'block' : 'none' }}
    />
  );
}
