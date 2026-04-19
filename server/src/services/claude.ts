import OpenAI from 'openai';
import { z } from 'zod';
import { JarvisResponse } from '../../../shared/types';
import { JARVIS_SYSTEM_PROMPT } from '../prompts/jarvis';

const client = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY!,
});

const MODEL = 'llama-3.3-70b-versatile';

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
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: JARVIS_SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content } as OpenAI.ChatCompletionMessageParam)),
    { role: 'user', content: userText },
  ];

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages,
  });

  const raw = completion.choices[0]?.message?.content ?? '';

  try {
    return parseResponse(raw);
  } catch {
    // One retry: ask the model to fix the JSON
    const retryMessages: OpenAI.ChatCompletionMessageParam[] = [
      ...messages,
      { role: 'assistant', content: raw },
      { role: 'user', content: 'Your response was not valid JSON. Reply ONLY with the JSON object, no other text.' },
    ];
    const retry = await client.chat.completions.create({
      model: MODEL,
      messages: retryMessages,
    });
    const retryRaw = retry.choices[0]?.message?.content ?? '';
    try {
      return parseResponse(retryRaw);
    } catch {
      return { response: raw, intent: 'chat', actions: [] };
    }
  }
}
