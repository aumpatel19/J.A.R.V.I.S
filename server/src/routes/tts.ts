import { Router, Request, Response } from 'express';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const router = Router();

// Singleton TTS instance — re-use across requests
let edgeInstance: MsEdgeTTS | null = null;

async function synthesizeEdge(text: string): Promise<Buffer> {
  edgeInstance = new MsEdgeTTS();
  await edgeInstance.setMetadata(
    'en-GB-RyanNeural',
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
  );
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const { audioStream } = edgeInstance!.toStream(text);
    audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    audioStream.on('end', () => resolve(Buffer.concat(chunks)));
    audioStream.on('error', reject);
  });
}

async function synthesizeSarvam(text: string): Promise<Buffer> {
  const response = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'api-subscription-key': process.env.SARVAM_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: 'en-IN',
      speaker: 'karun',
      pitch: 0,
      pace: 1.0,
      loudness: 1.5,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: 'bulbul:v2',
    }),
  });
  if (!response.ok) throw new Error('Sarvam TTS failed');
  const data = (await response.json()) as { audios: string[] };
  return Buffer.from(data.audios[0], 'base64');
}

router.post('/', async (req: Request, res: Response) => {
  const { text } = req.body as { text: string };
  if (!text?.trim()) {
    res.status(400).json({ error: 'No text provided' });
    return;
  }

  try {
    const audioBuffer = await synthesizeEdge(text);
    res.json({ audio: audioBuffer.toString('base64'), format: 'mp3' });
  } catch (edgeErr) {
    console.error('Edge TTS failed, falling back to Sarvam:', edgeErr);
    if (!process.env.SARVAM_API_KEY) {
      res.status(500).json({ error: 'TTS unavailable' });
      return;
    }
    try {
      const audioBuffer = await synthesizeSarvam(text);
      res.json({ audio: audioBuffer.toString('base64'), format: 'wav' });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
});

export default router;
