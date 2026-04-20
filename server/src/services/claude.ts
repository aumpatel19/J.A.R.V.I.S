import OpenAI from 'openai';
import { JarvisResponse, Action } from '../../../shared/types';
import { JARVIS_SYSTEM_PROMPT } from '../prompts/jarvis';
import { getNews } from '../tools/news';
import { getWeather } from '../tools/weather';
import { searchWeb } from '../tools/search';
import { setMemoryKey, getMemoryKey } from './memory';

const client = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY!,
});

const MODEL = 'llama-3.3-70b-versatile';

const TOOLS: OpenAI.Tool[] = [
  {
    type: 'function',
    function: {
      name: 'get_news',
      description: 'Fetch latest news headlines, optionally filtered by topic or keyword.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Topic or keyword to filter news (optional)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather conditions for a city.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City name' },
        },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Search the web for information on any topic.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_website',
      description: 'Open a website in the browser.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Full URL including https://' },
          title: { type: 'string', description: 'Human-readable site name' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_app',
      description: 'Open a local application on the computer.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'App name: notepad, calculator, explorer, vscode, terminal' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remember',
      description: 'Save information to long-term memory for future recall.',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Short identifier for the memory' },
          value: { type: 'string', description: 'Information to store' },
        },
        required: ['key', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recall',
      description: 'Retrieve information previously saved to memory.',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Memory key to look up' },
        },
        required: ['key'],
      },
    },
  },
];

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function runTool(
  name: string,
  args: Record<string, string>
): Promise<{ result: string; action?: Action }> {
  switch (name) {
    case 'get_news':
      return { result: await getNews(args.topic) };
    case 'get_weather':
      return { result: await getWeather(args.city) };
    case 'search_web':
      return { result: await searchWeb(args.query) };
    case 'open_website':
      return {
        result: `Opening ${args.title ?? args.url}...`,
        action: { type: 'open_website', url: args.url },
      };
    case 'open_app':
      return {
        result: `Launching ${args.name}...`,
        action: { type: 'open_app', app: args.name },
      };
    case 'remember':
      await setMemoryKey(args.key, args.value);
      return { result: `Stored: ${args.key} = ${args.value}` };
    case 'recall': {
      const val = await getMemoryKey(args.key);
      return {
        result: val != null
          ? `${args.key}: ${JSON.stringify(val)}`
          : `No memory found for "${args.key}".`,
      };
    }
    default:
      return { result: 'Unknown tool called.' };
  }
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

  const uiActions: Action[] = [];

  for (let round = 0; round < 6; round++) {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
    });

    const choice = completion.choices[0];
    messages.push(choice.message as OpenAI.ChatCompletionMessageParam);

    if (choice.finish_reason !== 'tool_calls' || !choice.message.tool_calls?.length) {
      return {
        response: choice.message.content ?? "I'm sorry, I couldn't process that request.",
        intent: 'chat',
        actions: uiActions,
      };
    }

    const toolResults = await Promise.all(
      choice.message.tool_calls.map(async (tc) => {
        const args = JSON.parse(tc.function.arguments || '{}') as Record<string, string>;
        const { result, action } = await runTool(tc.function.name, args);
        if (action) uiActions.push(action);
        return {
          role: 'tool' as const,
          tool_call_id: tc.id,
          content: result,
        };
      })
    );

    messages.push(...toolResults);
  }

  return {
    response: 'Task completed, sir.',
    intent: 'chat',
    actions: uiActions,
  };
}
