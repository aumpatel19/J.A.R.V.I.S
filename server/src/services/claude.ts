import OpenAI from 'openai';
import { JarvisResponse, Action } from '../../../shared/types';
import { JARVIS_SYSTEM_PROMPT } from '../prompts/jarvis';
import { getNews } from '../tools/news';
import { getWeather } from '../tools/weather';
import { searchWeb } from '../tools/search';
import { setMemoryKey, getMemoryKey } from './memory';
import {
  setVolume, muteVolume, changeVolume, getVolume,
  setBrightness, mediaControl, takeScreenshot,
  systemPower, getSystemInfo, launchApp, typeText, keyboardShortcut,
  openWorldMonitorOnSecondScreen,
} from '../tools/system';

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
  {
    type: 'function',
    function: {
      name: 'control_volume',
      description: 'Control system audio volume. Set exact level, mute, or adjust up/down.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['set', 'mute', 'up', 'down', 'get'], description: 'Volume action' },
          level: { type: 'number', description: 'Volume level 0-100 (required for set action)' },
          steps: { type: 'number', description: 'Steps to change volume (for up/down, default 5)' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_brightness',
      description: 'Set screen brightness level.',
      parameters: {
        type: 'object',
        properties: {
          level: { type: 'number', description: 'Brightness 0-100' },
        },
        required: ['level'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'media_control',
      description: 'Control media playback — play/pause, next track, previous track, stop.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['play_pause', 'next', 'prev', 'stop'], description: 'Media action' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'take_screenshot',
      description: 'Take a screenshot of the screen and save it to the Desktop.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'system_power',
      description: 'Control system power state.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['shutdown', 'restart', 'sleep', 'lock', 'hibernate'], description: 'Power action' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_system_info',
      description: 'Get system hardware and resource information — CPU usage, RAM, disk, battery.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['cpu', 'ram', 'disk', 'battery', 'all'], description: 'Info type' },
        },
        required: ['type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'launch_app',
      description: 'Launch any application on the computer by name (notepad, chrome, spotify, discord, excel, etc.).',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'App name (notepad, calculator, explorer, chrome, firefox, edge, spotify, discord, vscode, terminal, word, excel, powerpoint, steam, camera, settings, paint, snipping, taskmgr, cmd)' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'type_text',
      description: 'Type text at the current cursor position on screen.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to type' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'keyboard_shortcut',
      description: 'Send a keyboard shortcut like ctrl+c, alt+f4, win+d, ctrl+shift+esc.',
      parameters: {
        type: 'object',
        properties: {
          keys: { type: 'string', description: 'Shortcut in format: ctrl+c, alt+f4, win+d, ctrl+z, etc.' },
        },
        required: ['keys'],
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
    case 'open_website': {
      const { spawnSync } = await import('child_process');
      spawnSync('powershell', ['-Command', `Start-Process '${args.url.replace(/'/g, "''")}'`]);
      return {
        result: `Opened ${args.title ?? args.url}. Done.`,
        action: { type: 'open_website', url: args.url },
      };
    }
    case 'open_app':
      return {
        result: launchApp(args.name),
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
    case 'control_volume': {
      const a = args.action;
      if (a === 'set') return { result: setVolume(Number(args.level)) };
      if (a === 'mute') return { result: muteVolume() };
      if (a === 'up') return { result: changeVolume('up', Number(args.steps) || 5) };
      if (a === 'down') return { result: changeVolume('down', Number(args.steps) || 5) };
      if (a === 'get') return { result: getVolume() };
      return { result: 'Unknown volume action.' };
    }
    case 'set_brightness':
      return { result: setBrightness(Number(args.level)) };
    case 'media_control':
      return { result: mediaControl(args.action) };
    case 'take_screenshot':
      return { result: takeScreenshot() };
    case 'system_power':
      return { result: systemPower(args.action) };
    case 'get_system_info':
      return { result: getSystemInfo(args.type) };
    case 'launch_app': {
      const n = args.name?.toLowerCase();
      if (n === 'world monitor' || n === 'worldmonitor') {
        return { result: openWorldMonitorOnSecondScreen() };
      }
      return { result: launchApp(args.name) };
    }
    case 'type_text':
      return { result: typeText(args.text) };
    case 'keyboard_shortcut':
      return { result: keyboardShortcut(args.keys) };
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
    let completion: OpenAI.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: MODEL,
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
      });
    } catch (err: unknown) {
      // Groq sometimes fails to generate valid tool calls — retry without tools
      const msg = (err as Error).message ?? '';
      if (msg.includes('tool') || msg.includes('function') || msg.includes('400')) {
        completion = await client.chat.completions.create({
          model: MODEL,
          messages,
        });
      } else {
        throw err;
      }
    }

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
        let args: Record<string, string> = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
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

    // Stop looping after side-effect actions — no need to re-query the model
    if (uiActions.length > 0) break;
  }

  return {
    response: 'Task completed, sir.',
    intent: 'chat',
    actions: uiActions,
  };
}
