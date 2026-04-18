import { Action } from '../../../shared/types';

export async function search(action: Action): Promise<string> {
  const q = encodeURIComponent(action.query ?? '');
  const url = `https://www.google.com/search?q=${q}`;
  return `open_external:${url}`;
}
