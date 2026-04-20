import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: process.env.JARVIS_ENV_PATH ?? path.resolve('.env') });

import express from 'express';
import cors from 'cors';
import { chatRouter } from './routes/chat';
import { memoryRouter } from './routes/memory';
import sttRouter from './routes/stt';
import ttsRouter from './routes/tts';

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/chat', chatRouter);
app.use('/memory', memoryRouter);
app.use('/stt', sttRouter);
app.use('/tts', ttsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/capabilities', (_req, res) =>
  res.json({ sarvam: !!process.env.SARVAM_API_KEY })
);

app.listen(PORT, () => {
  console.log(`JARVIS server running on http://localhost:${PORT}`);
});
