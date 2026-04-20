import { Router, Request, Response } from 'express';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', upload.single('audio'), async (req: Request, res: Response) => {
  if (!process.env.SARVAM_API_KEY) {
    res.status(503).json({ error: 'Sarvam not configured' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'No audio file provided' });
    return;
  }

  try {
    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), 'audio.webm');
    formData.append('model', 'saarika:v2.5');
    formData.append('language_code', 'en-IN');

    const response = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: { 'api-subscription-key': process.env.SARVAM_API_KEY },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      res.status(500).json({ error: err });
      return;
    }

    const data = (await response.json()) as { transcript: string };
    res.json({ transcript: data.transcript });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
