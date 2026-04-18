import { Action } from '../../../shared/types';

export async function openWebsite(action: Action): Promise<string> {
  const url = action.url ?? 'https://google.com';
  // Signal Electron to open URL — the renderer calls window.electronAPI.openExternal
  return `open_external:${url}`;
}
