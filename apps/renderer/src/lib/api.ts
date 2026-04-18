import { JarvisResponse } from '../../../../shared/types';

const BASE = 'http://localhost:4000';

export interface ChatApiResponse extends JarvisResponse {
  actionResults: Array<{ type: string; signal?: string; error?: string; value?: unknown }>;
}

export async function sendChat(text: string): Promise<ChatApiResponse> {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json() as Promise<ChatApiResponse>;
}
