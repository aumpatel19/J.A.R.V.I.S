import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogEntry } from '../store/session';

interface Props {
  logs: LogEntry[];
}

const TYPE_COLOR: Record<LogEntry['type'], string> = {
  user:   '#00f0ff',
  jarvis: '#00ff88',
  system: '#0077ff',
  error:  '#ff3344',
};

const TYPE_PREFIX: Record<LogEntry['type'], string> = {
  user:   'YOU',
  jarvis: 'JAR',
  system: 'SYS',
  error:  'ERR',
};

export function LogsPanel({ logs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="panel flex flex-col h-full rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-[#00f0ff22] flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] pulse-glow" />
        <span className="text-[10px] tracking-[0.2em] text-[#00f0ff88]">SYSTEM LOG</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-2 text-[11px] leading-snug"
            >
              <span className="shrink-0 text-[#00f0ff33]">{log.time}</span>
              <span
                className="shrink-0 font-bold"
                style={{ color: TYPE_COLOR[log.type] }}
              >
                [{TYPE_PREFIX[log.type]}]
              </span>
              <span className="text-[#00f0ffbb] break-words">{log.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
