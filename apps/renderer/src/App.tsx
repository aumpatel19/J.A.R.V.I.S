import { useCallback, useEffect, useRef, useState } from 'react';
import { useWakeWord } from './hooks/useWakeWord';
import { motion } from 'framer-motion';
import { HUD } from './components/HUD';
import { StatusBar } from './components/StatusBar';
import { LogsPanel } from './components/LogsPanel';
import { TasksPanel } from './components/TasksPanel';
import { CommandInput } from './components/CommandInput';
import { useSession } from './store/session';
import { useSpeechToText } from './hooks/useSpeechToText';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { sendChat } from './lib/api';
import { Action } from '../../../shared/types';

type ElectronAPI = {
  openExternal: (url: string) => Promise<void>;
  openApp: (exe: string) => Promise<void>;
  onWakeWord: (cb: () => void) => void;
};

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export default function App() {
  const { status, logs, tasks, micLevel, setStatus, addLog, addTask, updateTask, setLastResponse, setMicLevel } = useSession();
  const { say } = useTextToSpeech();

  const [micReady, setMicReady] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => { stream.getTracks().forEach(t => t.stop()); setMicReady(true); })
      .catch(() => {});
  }, []);

  const processCommand = useCallback(async (rawText: string) => {
    // Strip wake word prefix so "Jarvis, open YouTube" → "open YouTube"
    const text = rawText.replace(/^(hey\s+)?jarvis[,.]?\s*/i, '').trim() || rawText;
    setStatus('thinking');
    addLog({ type: 'user', text });

    try {
      const res = await sendChat(text);
      setLastResponse(res);
      addLog({ type: 'jarvis', text: res.response });

      // Execute UI actions via Electron IPC
      for (const action of res.actions) {
        if (action.type === 'open_website' && action.url) {
          const taskId = crypto.randomUUID();
          addTask({ id: taskId, description: `Open ${action.url}`, status: 'running', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
          await window.electronAPI?.openExternal(action.url);
          updateTask(taskId, { status: 'done' });
        } else if (action.type === 'open_app' && action.app) {
          const taskId = crypto.randomUUID();
          addTask({ id: taskId, description: `Launch ${action.app}`, status: 'running', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
          await window.electronAPI?.openApp(action.app);
          updateTask(taskId, { status: 'done' });
        }
      }

      // Log non-UI tool actions as tasks
      const uiTypes = new Set<Action['type']>(['open_website', 'open_app']);
      res.actions
        .filter((a) => !uiTypes.has(a.type))
        .forEach((action) => {
          const descriptions: Partial<Record<Action['type'], string>> = {
            remember: `Remembered: ${action.key}`,
            recall: `Recalled: ${action.key}`,
          };
          addTask({
            id: crypto.randomUUID(),
            description: descriptions[action.type] ?? action.type,
            status: 'done',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        });

      setStatus('speaking');
      say(res.response, () => setStatus('idle'));
    } catch (err) {
      const msg = (err as Error).message;
      addLog({ type: 'error', text: msg });
      setStatus('error');
      say('I encountered an error, sir. Please check the logs.');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [setStatus, addLog, addTask, updateTask, setLastResponse, say]);

  const startListening = useCallback(() => {
    if (status !== 'idle') return;
    setStatus('listening');
    addLog({ type: 'system', text: 'Listening...' });
  }, [status, setStatus, addLog]);

  const { start: startSTT, stop: stopSTT } = useSpeechToText({
    onResult: (transcript) => {
      stopSTT();
      processCommand(transcript);
    },
    onEnd: () => {
      if (status === 'listening') setStatus('idle');
    },
    onError: (msg) => {
      addLog({ type: 'error', text: msg });
    },
  });

  const handleMicClick = useCallback(() => {
    if (status === 'listening') {
      stopSTT();
      setStatus('idle');
    } else {
      startListening();
      startSTT();
    }
  }, [status, startListening, startSTT, stopSTT, setStatus]);

  const statusRef = useRef(status);
  statusRef.current = status;

  useWakeWord({
    enabled: micReady && status === 'idle',
    onWake: () => {
      startListening();
      startSTT();
    },
  });

  return (
    <div className="flex flex-col h-screen bg-black text-[#00f0ff] select-none overflow-hidden">
      {/* Scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-50"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.015) 2px, rgba(0,240,255,0.015) 4px)',
        }}
      />

      <StatusBar status={status} />

      <div className="flex flex-1 overflow-hidden gap-2 p-2">
        <motion.div
          className="w-72 shrink-0"
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <LogsPanel logs={logs} />
        </motion.div>

        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <motion.div
            className="flex-1 flex items-center justify-center w-full"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <HUD status={status} micLevel={micLevel} />
          </motion.div>
        </div>

        <motion.div
          className="w-72 shrink-0"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <TasksPanel tasks={tasks} />
        </motion.div>
      </div>

      <CommandInput
        status={status}
        onSubmit={processCommand}
        onMicClick={handleMicClick}
        onMicLevel={setMicLevel}
      />
    </div>
  );
}
