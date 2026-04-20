import { Router, Request, Response } from 'express';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  if (!process.env.SARVAM_API_KEY) {
    res.status(503).json({ error: 'Sarvam not configured' });
    return;
  }

  const { text, language = 'en-IN', speaker = 'meera' } = req.body as {
    text: string;
    language?: string;
    speaker?: string;
  };

  if (!text?.trim()) {
    res.status(400).json({ error: 'No text provided' });
    return;
  }

  try {
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': process.env.SARVAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: language,
        speaker,
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: 'bulbul:v1',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      res.status(500).json({ error: err });
      return;
    }

    const data = (await response.json()) as { audios: string[] };
    res.json({ audio: data.audios[0] });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
