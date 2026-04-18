export type Intent =
  | 'chat'
  | 'open_website'
  | 'search'
  | 'open_app'
  | 'multi_step_task'
  | 'remember'
  | 'recall';

export interface Action {
  type: 'open_website' | 'search' | 'open_app' | 'remember' | 'recall';
  url?: string;
  query?: string;
  app?: string;
  key?: string;
  value?: string;
}

export interface JarvisResponse {
  response: string;
  intent: Intent;
  actions: Action[];
}

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed';

export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  result?: unknown;
  created_at: string;
  updated_at: string;
}

export interface ConversationTurn {
  id: string;
  user_text: string;
  jarvis_text: string;
  intent: Intent;
  actions: Action[];
  created_at: string;
}

export interface MemoryEntry {
  id: string;
  key: string;
  value: unknown;
  updated_at: string;
}
