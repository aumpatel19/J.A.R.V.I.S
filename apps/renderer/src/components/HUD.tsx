import { motion } from 'framer-motion';
import { AppStatus } from '../store/session';

interface Props {
  status: AppStatus;
  micLevel: number;
}

const STATUS_COLORS: Record<AppStatus, string> = {
  idle:      '#004455',
  listening: '#00f0ff',
  thinking:  '#0077ff',
  speaking:  '#00ff88',
  error:     '#ff3344',
};

export function HUD({ status, micLevel }: Props) {
  const color = STATUS_COLORS[status];
  const scale = 1 + micLevel * 0.3;

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {/* Outer ring — slow rotation */}
      <svg
        className="absolute rotate-slow"
        width={380}
        height={380}
        viewBox="0 0 380 380"
      >
        <circle cx="190" cy="190" r="185" fill="none" stroke={color} strokeWidth="1" strokeDasharray="8 6" opacity="0.4" />
        {/* tick marks */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i * 10 * Math.PI) / 180;
          const r1 = 180;
          const r2 = i % 9 === 0 ? 165 : 172;
          return (
            <line
              key={i}
              x1={190 + r1 * Math.cos(angle)}
              y1={190 + r1 * Math.sin(angle)}
              x2={190 + r2 * Math.cos(angle)}
              y2={190 + r2 * Math.sin(angle)}
              stroke={color}
              strokeWidth={i % 9 === 0 ? 2 : 1}
              opacity="0.5"
            />
          );
        })}
      </svg>

      {/* Middle ring — reverse rotation */}
      <svg className="absolute rotate-reverse" width={290} height={290} viewBox="0 0 290 290">
        <circle cx="145" cy="145" r="140" fill="none" stroke={color} strokeWidth="2" strokeDasharray="20 5 5 5" opacity="0.5" />
      </svg>

      {/* Inner ring — medium rotation */}
      <svg className="absolute rotate-medium" width={220} height={220} viewBox="0 0 220 220">
        <circle cx="110" cy="110" r="105" fill="none" stroke={color} strokeWidth="1" strokeDasharray="4 8" opacity="0.6" />
        {/* corner accents */}
        {[0, 90, 180, 270].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 110 110)`}>
            <line x1="110" y1="5" x2="110" y2="25" stroke={color} strokeWidth="3" opacity="0.8" />
          </g>
        ))}
      </svg>

      {/* Core orb */}
      <motion.div
        className="relative z-10 flex items-center justify-center rounded-full"
        style={{
          width: 130,
          height: 130,
          background: `radial-gradient(circle, ${color}22 0%, ${color}08 60%, transparent 100%)`,
          border: `2px solid ${color}`,
          boxShadow: `0 0 20px ${color}, 0 0 60px ${color}44, inset 0 0 30px ${color}22`,
        }}
        animate={{ scale }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Inner concentric circles */}
        {[60, 80, 100].map((size) => (
          <div
            key={size}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              border: `1px solid ${color}44`,
            }}
          />
        ))}

        {/* Status text inside orb */}
        <span
          className="text-[10px] tracking-[0.2em] font-bold z-10 pulse-glow"
          style={{ color }}
        >
          {status === 'idle' ? 'JARVIS' : status.toUpperCase()}
        </span>
      </motion.div>

      {/* Crosshair lines */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{ width: 340, height: 1, background: `linear-gradient(to right, transparent, ${color}33, transparent)` }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{ width: 1, height: 340, background: `linear-gradient(to bottom, transparent, ${color}33, transparent)` }} />
      </div>
    </div>
  );
}
