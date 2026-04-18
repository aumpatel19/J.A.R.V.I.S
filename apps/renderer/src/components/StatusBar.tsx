import { motion, AnimatePresence } from 'framer-motion';
import { AppStatus } from '../store/session';

const STATUS_CONFIG: Record<AppStatus, { label: string; color: string }> = {
  idle:      { label: 'STANDBY',   color: '#004455' },
  listening: { label: 'LISTENING', color: '#00f0ff' },
  thinking:  { label: 'THINKING',  color: '#0077ff' },
  speaking:  { label: 'SPEAKING',  color: '#00ff88' },
  error:     { label: 'ERROR',     color: '#ff3344' },
};

interface Props {
  status: AppStatus;
}

export function StatusBar({ status }: Props) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="flex items-center justify-between px-6 py-2 panel border-b border-[#00f0ff22]">
      {/* Left: title */}
      <span className="glow-text text-sm tracking-[0.3em] font-bold">
        J.A.R.V.I.S
      </span>

      {/* Center: status */}
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className="flex items-center gap-2"
        >
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ background: cfg.color }}
            animate={status !== 'idle' ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span
            className="text-xs tracking-[0.25em] font-bold"
            style={{ color: cfg.color }}
          >
            {cfg.label}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* Right: window controls */}
      <div className="flex gap-3 items-center">
        {['−', '□', '✕'].map((sym, i) => (
          <button
            key={i}
            onClick={() => {
              const api = (window as typeof window & { electronAPI?: { minimize: () => void; maximize: () => void; close: () => void } }).electronAPI;
              if (i === 0) api?.minimize();
              if (i === 1) api?.maximize();
              if (i === 2) api?.close();
            }}
            className="text-[#00f0ff66] hover:text-[#00f0ff] text-sm w-5 text-center transition-colors"
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
}
