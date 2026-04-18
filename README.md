# J.A.R.V.I.S

Iron-Man-style desktop AI assistant powered by Claude Sonnet.

## Setup (one-time)

### 1. API Keys

Copy the env template and fill in your keys:
```
copy .env.example server\.env
```
Edit `server\.env` and set:
- `ANTHROPIC_API_KEY` — get one at https://console.anthropic.com
- `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` — from your Supabase project > Settings > API

### 2. Supabase database

Open your Supabase project → SQL Editor → New query, paste the contents of `supabase/schema.sql` and run it.

### 3. Run in dev mode

Start the backend and Electron window:
```
npm run dev
```

This starts:
- Express server on http://localhost:4000
- Vite dev server on http://localhost:5173
- Electron window (loads the Vite server)

## Usage

| Action | How |
|--------|-----|
| Wake by voice | Say **"Jarvis"** — the HUD lights up and starts listening |
| Type a command | Use the text box at the bottom |
| Click mic button | Toggle listening on/off |

### Example commands
- *"Open YouTube and search React tutorial"*
- *"Search for the weather in New York"*
- *"Open Notepad"*
- *"Remember my name is Tony"*
- *"What do you know about me?"*

## Project structure

```
J.A.R.V.I.S/
├── apps/
│   ├── desktop/       Electron main process
│   └── renderer/      React UI (Vite + Tailwind + Framer Motion)
├── server/            Express + Claude API backend
├── shared/            Shared TypeScript types
└── supabase/          Database schema
```

## Adding new actions

1. Create `server/src/actions/myAction.ts` with a function `(action, ctx) => Promise<string>`
2. Register it in `server/src/actions/index.ts`
3. Add the intent/type to `shared/types.ts`
4. Update the system prompt in `server/src/prompts/jarvis.ts` with an example
