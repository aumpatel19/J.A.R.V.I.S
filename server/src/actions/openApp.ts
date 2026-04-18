import { Action } from '../../../shared/types';

// Safe allowlist — only these app names can be launched
const ALLOWLIST: Record<string, string> = {
  notepad: 'notepad.exe',
  explorer: 'explorer.exe',
  calculator: 'calc.exe',
  paint: 'mspaint.exe',
  code: 'code',
  terminal: 'wt.exe',
};

export async function openApp(action: Action): Promise<string> {
  const appName = (action.app ?? '').toLowerCase().trim();
  const exe = ALLOWLIST[appName];
  if (!exe) {
    throw new Error(`App "${appName}" is not in the allowed list.`);
  }
  // Signal Electron main process to spawn the app
  return `open_app:${exe}`;
}
