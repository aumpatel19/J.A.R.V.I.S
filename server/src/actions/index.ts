import { Action } from '../../../shared/types';
import { openWebsite } from './openWebsite';
import { search } from './search';
import { openApp } from './openApp';
import { setMemoryKey, getMemoryKey } from '../services/memory';

export interface ActionResult {
  type: string;
  signal?: string;
  error?: string;
  value?: unknown;
}

export async function executeAction(action: Action): Promise<ActionResult> {
  try {
    switch (action.type) {
      case 'open_website': {
        const signal = await openWebsite(action);
        return { type: action.type, signal };
      }
      case 'search': {
        const signal = await search(action);
        return { type: action.type, signal };
      }
      case 'open_app': {
        const signal = await openApp(action);
        return { type: action.type, signal };
      }
      case 'remember': {
        await setMemoryKey(action.key!, action.value);
        return { type: action.type };
      }
      case 'recall': {
        const value = await getMemoryKey(action.key!);
        return { type: action.type, value };
      }
      default:
        return { type: (action as Action).type, error: 'Unknown action type' };
    }
  } catch (err) {
    return { type: action.type, error: (err as Error).message };
  }
}
