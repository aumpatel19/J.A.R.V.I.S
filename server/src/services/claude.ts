import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { JarvisResponse } from '../../../shared/types';
import { JARVIS_SYSTEM_PROMPT } from '../prompts/jarvis';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

async function callClaude(messages: ChatMessage[], model: string): Promise<string> {
  const result = await client.messages.create({
    model,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: JARVIS_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  });

  const block = result.content[0];
  if (block.type !== 'text') throw new Error('Unexpected content type from Claude');
  return block.text;
}

function parseResponse(raw: string): JarvisResponse {
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(clean);
  return JarvisResponseSchema.parse(parsed);
}

export async function askJarvis(
  userText: string,
  history: ChatMessage[] = []
): Promise<JarvisResponse> {
  const messages: ChatMessage[] = [
    ...history,
    { role: 'user', content: userText },
  ];

  const raw = await callClaude(messages, 'claude-sonnet-4-6');

  try {
    return parseResponse(raw);
  } catch {
    // One retry asking Claude to fix the JSON
    const retryMessages: ChatMessage[] = [
      ...messages,
      { role: 'assistant', content: raw },
      {
        role: 'user',
        content: 'Your response was not valid JSON. Please respond ONLY with the JSON object, no other text.',
      },
    ];
    const retryRaw = await callClaude(retryMessages, 'claude-haiku-4-5-20251001');
    try {
      return parseResponse(retryRaw);
    } catch {
      return { response: raw, intent: 'chat', actions: [] };
    }
  }
}
