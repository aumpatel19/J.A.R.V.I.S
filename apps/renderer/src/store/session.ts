import { create } from 'zustand';
import { JarvisResponse, Task } from '../../../../shared/types';

export type AppStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface LogEntry {
  id: string;
  time: string;
  text: string;
  type: 'user' | 'jarvis' | 'system' | 'error';
}

interface SessionState {
  status: AppStatus;
  logs: LogEntry[];
  tasks: Task[];
  lastResponse: JarvisResponse | null;
  micLevel: number;

  setStatus: (s: AppStatus) => void;
  addLog: (entry: Omit<LogEntry, 'id' | 'time'>) => void;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  setLastResponse: (r: JarvisResponse) => void;
  setMicLevel: (v: number) => void;
}

export const useSession = create<SessionState>((set) => ({
  status: 'idle',
  logs: [{ id: '0', time: now(), text: 'JARVIS online. How can I assist you, sir?', type: 'jarvis' }],
  tasks: [],
  lastResponse: null,
  micLevel: 0,

  setStatus: (status) => set({ status }),

  addLog: (entry) =>
    set((s) => ({
      logs: [...s.logs.slice(-99), { ...entry, id: crypto.randomUUID(), time: now() }],
    })),

  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks].slice(0, 20) })),
  updateTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  setLastResponse: (lastResponse) => set({ lastResponse }),
  setMicLevel: (micLevel) => set({ micLevel }),
}));

function now(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
