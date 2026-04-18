import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { HUD } from './components/HUD';
import { StatusBar } from './components/StatusBar';
import { LogsPanel } from './components/LogsPanel';
import { TasksPanel } from './components/TasksPanel';
import { CommandInput } from './components/CommandInput';
import { useSession } from './store/session';
import { useWakeWord } from './hooks/useWakeWord';
import { useSpeechToText } from './hooks/useSpeechToText';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { sendChat } from './lib/api';
import { Action } from '../../../shared/types';

type ElectronAPI = {
  openExternal: (url: string) => Promise<void>;
  openApp: (exe: string) => Promise<void>;
};

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export default function App() {
  const { status, logs, tasks, micLevel, setStatus, addLog, addTask, updateTask, setLastResponse, setMicLevel } = useSession();
  const { say } = useTextToSpeech();

  const processCommand = useCallback(async (text: string) => {
    setStatus('thinking');
    addLog({ type: 'user', text });

    try {
      const res = await sendChat(text);
      setLastResponse(res);
      addLog({ type: 'jarvis', text: res.response });

      // Process action signals (open_external, open_app)
      for (const ar of res.actionResults) {
        if (ar.signal?.startsWith('open_external:')) {
          const url = ar.signal.replace('open_external:', '');
          await window.electronAPI?.openExternal(url);
        } else if (ar.signal?.startsWith('open_app:')) {
          const exe = ar.signal.replace('open_app:', '');
          await window.electronAPI?.openApp(exe);
        }
      }

      // Add tasks for each action
      res.actions.forEach((action: Action) => {
        const taskId = crypto.randomUUID();
        const descriptions: Partial<Record<Action['type'], string>> = {
          open_website: `Open ${action.url}`,
          search: `Search: ${action.query}`,
          open_app: `Launch ${action.app}`,
          remember: `Remember ${action.key} = ${action.value}`,
          recall: `Recall ${action.key}`,
        };
        addTask({
          id: taskId,
          description: descriptions[action.type] ?? action.type,
          status: 'done',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        // Mark done after brief delay so user sees the running state
        setTimeout(() => updateTask(taskId, { status: 'done' }), 500);
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

  // Wake word detection — always on when idle
  useWakeWord({
    enabled: status === 'idle',
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
        {/* Left: Logs */}
        <motion.div
          className="w-72 shrink-0"
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <LogsPanel logs={logs} />
        </motion.div>

        {/* Center: HUD */}
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

        {/* Right: Tasks */}
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
