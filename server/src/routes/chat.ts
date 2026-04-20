import { Router, Request, Response } from 'express';
import { askJarvis, ChatMessage } from '../services/claude';
import { saveConversation, getRecentHistory } from '../services/memory';

export const chatRouter = Router();

chatRouter.post('/', async (req: Request, res: Response) => {
  const { text } = req.body as { text: string };
  if (!text?.trim()) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  try {
    const history = await getRecentHistory(10);
    const messages: ChatMessage[] = history.flatMap((turn) => [
      { role: 'user' as const, content: turn.user_text },
      { role: 'assistant' as const, content: turn.jarvis_text },
    ]);

    const jarvisRes = await askJarvis(text, messages);
    await saveConversation(text, jarvisRes);
    res.json(jarvisRes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message });
  }
});
