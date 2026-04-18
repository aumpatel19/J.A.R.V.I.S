import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Waveform } from './Waveform';
import { AppStatus } from '../store/session';

interface Props {
  status: AppStatus;
  onSubmit: (text: string) => void;
  onMicClick: () => void;
  onMicLevel: (v: number) => void;
}

export function CommandInput({ status, onSubmit, onMicClick, onMicLevel }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || status === 'thinking') return;
    onSubmit(trimmed);
    setText('');
  };

  const isActive = status === 'listening' || status === 'thinking' || status === 'speaking';

  return (
    <div className="panel border-t border-[#00f0ff22] px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Mic button */}
        <motion.button
          onClick={onMicClick}
          disabled={status === 'thinking'}
          className="relative w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: status === 'listening' ? '#00f0ff22' : 'transparent',
            border: `1px solid ${status === 'listening' ? '#00f0ff' : '#00f0ff44'}`,
          }}
          whileTap={{ scale: 0.9 }}
        >
          {status === 'listening' && (
            <motion.div
              className="absolute inset-0 rounded-full border border-[#00f0ff]"
              animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="12" rx="3" fill={status === 'listening' ? '#00f0ff' : '#00f0ff66'} />
            <path d="M5 10a7 7 0 0 0 14 0" stroke={status === 'listening' ? '#00f0ff' : '#00f0ff66'} strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="19" x2="12" y2="22" stroke={status === 'listening' ? '#00f0ff' : '#00f0ff66'} strokeWidth="2" strokeLinecap="round" />
          </svg>
        </motion.button>

        {/* Waveform (visible while listening) */}
        <Waveform status={status} onMicLevel={onMicLevel} />

        {/* Text input */}
        {status !== 'listening' && (
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={isActive ? '' : 'Type a command or say "Jarvis..."'}
            disabled={status === 'thinking' || status === 'speaking'}
            className="flex-1 bg-transparent border border-[#00f0ff33] rounded px-3 py-2 text-sm text-[#00f0ff] placeholder-[#00f0ff33] outline-none focus:border-[#00f0ff] focus:glow transition-all"
          />
        )}

        {/* Send button */}
        {status !== 'listening' && (
          <motion.button
            onClick={handleSubmit}
            disabled={!text.trim() || status === 'thinking'}
            className="px-4 py-2 rounded text-xs tracking-widest font-bold transition-colors"
            style={{
              border: '1px solid #00f0ff44',
              color: text.trim() ? '#00f0ff' : '#00f0ff33',
            }}
            whileTap={{ scale: 0.95 }}
          >
            SEND
          </motion.button>
        )}
      </div>

      <div className="mt-2 text-[9px] text-[#00f0ff33] tracking-[0.2em] text-center">
        SAY "JARVIS" TO WAKE • PRESS ENTER TO SEND • CLICK MIC TO LISTEN
      </div>
    </div>
  );
}
