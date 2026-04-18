import { Router, Request, Response } from 'express';
import { askJarvis, ChatMessage } from '../services/claude';
import { saveConversation, getRecentHistory } from '../services/memory';
import { executeAction } from '../actions';

export const chatRouter = Router();

chatRouter.post('/', async (req: Request, res: Response) => {
  const { text } = req.body as { text: string };
  if (!text?.trim()) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  try {
    // Build history as ChatMessage array from Supabase
    const history = await getRecentHistory(10);
    const messages: ChatMessage[] = history.flatMap((turn) => [
      { role: 'user' as const, content: turn.user_text },
      { role: 'assistant' as const, content: turn.jarvis_text },
    ]);

    const jarvisRes = await askJarvis(text, messages);

    // Execute all actions and collect signals for the renderer
    const actionResults = await Promise.all(
      jarvisRes.actions.map((a) => executeAction(a))
    );

    // Persist conversation
    await saveConversation(text, jarvisRes);

    res.json({ ...jarvisRes, actionResults });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message });
  }
});
