import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { z } from 'zod';
import { JarvisResponse } from '../../../shared/types';
import { JARVIS_SYSTEM_PROMPT } from '../prompts/jarvis';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  systemInstruction: JARVIS_SYSTEM_PROMPT,
});

const ActionSchema = z.object({
  type: z.enum(['open_website', 'search', 'open_app', 'remember', 'recall']),
  url: z.string().optional(),
  query: z.string().optional(),
  app: z.string().optional(),
  key: z.string().optional(),
  value: z.string().optional(),
});

const JarvisResponseSchema = z.object({
  response: z.string(),
  intent: z.enum(['chat', 'open_website', 'search', 'open_app', 'multi_step_task', 'remember', 'recall']),
  actions: z.array(ActionSchema).default([]),
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function toGeminiHistory(history: ChatMessage[]): Content[] {
  return history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

function parseResponse(raw: string): JarvisResponse {
  const clean = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  return JarvisResponseSchema.parse(JSON.parse(clean));
}

export async function askJarvis(
  userText: string,
  history: ChatMessage[] = []
): Promise<JarvisResponse> {
  const chat = model.startChat({ history: toGeminiHistory(history) });
  const result = await chat.sendMessage(userText);
  const raw = result.response.text();

  try {
    return parseResponse(raw);
  } catch {
    // One retry: ask Gemini to fix the JSON
    const retry = await chat.sendMessage(
      'Your response was not valid JSON. Reply ONLY with the JSON object, no other text.'
    );
    const retryRaw = retry.response.text();
    try {
      return parseResponse(retryRaw);
    } catch {
      return { response: raw, intent: 'chat', actions: [] };
    }
  }
}
