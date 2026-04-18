import { Router, Request, Response } from 'express';
import { getMemoryKey, setMemoryKey, getRecentHistory } from '../services/memory';

export const memoryRouter = Router();

memoryRouter.get('/history', async (_req: Request, res: Response) => {
  const history = await getRecentHistory(20);
  res.json(history);
});

memoryRouter.get('/:key', async (req: Request, res: Response) => {
  const key = req.params['key'] as string;
  const value = await getMemoryKey(key);
  res.json({ key, value });
});

memoryRouter.post('/:key', async (req: Request, res: Response) => {
  const key = req.params['key'] as string;
  const { value } = req.body as { value: unknown };
  await setMemoryKey(key, value);
  res.json({ ok: true });
});
