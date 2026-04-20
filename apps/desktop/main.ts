import { app, BrowserWindow, ipcMain, shell, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const vars: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    vars[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return vars;
}

const DEV = process.env.NODE_ENV !== 'production';
const RENDERER_URL = 'http://localhost:5173';

let serverProcess: ChildProcess | null = null;
let wakeProcess: ChildProcess | null = null;

const WAKE_PS = `
Add-Type -AssemblyName System.Speech
$eng = New-Object System.Speech.Recognition.SpeechRecognitionEngine
$gb = New-Object System.Speech.Recognition.GrammarBuilder
$choices = New-Object System.Speech.Recognition.Choices
$choices.Add(@("jarvis","hey jarvis","ok jarvis"))
$gb.Append($choices)
$g = New-Object System.Speech.Recognition.Grammar($gb)
$eng.LoadGrammar($g)
$eng.SetInputToDefaultAudioDevice()
while ($true) {
  $r = $eng.Recognize([TimeSpan]::FromSeconds(10))
  if ($r) { Write-Output "WAKE"; [Console]::Out.Flush() }
}
`;

function startWakeWord(win: BrowserWindow): void {
  wakeProcess = spawn('powershell', [
    '-NonInteractive', '-NoProfile', '-Command', WAKE_PS,
  ], { stdio: ['ignore', 'pipe', 'ignore'] });

  wakeProcess.stdout?.on('data', (d: Buffer) => {
    if (d.toString().includes('WAKE')) {
      win.webContents.send('wake-word');
    }
  });

  wakeProcess.on('exit', () => {
    setTimeout(() => { if (win && !win.isDestroyed()) startWakeWord(win); }, 1000);
  });
}

function startServer(): Promise<void> {
  if (DEV) return Promise.resolve();

  const serverPath = path.join(process.resourcesPath, 'server.cjs');
  const envPath = path.join(process.resourcesPath, 'config.env');

  const envVars = parseEnvFile(envPath);
  serverProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: '4000',
      ...envVars,
    },
    detached: false,
    stdio: 'ignore',
  });

  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      try {
        await fetch('http://localhost:4000/health');
        clearInterval(interval);
        resolve();
      } catch {
        // still starting
      }
    }, 300);
    setTimeout(() => { clearInterval(interval); resolve(); }, 8000);
  });
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#000000',
    titleBarStyle: 'hidden',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (DEV) {
    win.loadURL(RENDERER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
  }

  return win;
}

app.whenReady().then(async () => {
  // Grant microphone and media permissions to the renderer
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    const allowed = ['media', 'microphone', 'audioCapture', 'speaker'];
    callback(allowed.includes(permission));
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
    return ['media', 'microphone', 'audioCapture'].includes(permission);
  });

  await startServer();
  const win = createWindow();
  startWakeWord(win);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  serverProcess?.kill();
  wakeProcess?.kill();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('open-external', (_event, url: string) => {
  shell.openExternal(url);
});

const ALLOWED_EXES = new Set([
  'notepad.exe', 'explorer.exe', 'calc.exe',
  'mspaint.exe', 'code', 'wt.exe',
]);

ipcMain.handle('open-app', (_event, exe: string) => {
  if (!ALLOWED_EXES.has(exe)) throw new Error(`"${exe}" is not in the allowed list.`);
  spawn(exe, [], { detached: true, stdio: 'ignore' }).unref();
});

ipcMain.on('window-minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
ipcMain.on('window-maximize', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  win?.isMaximized() ? win.unmaximize() : win?.maximize();
});
ipcMain.on('window-close', (e) => BrowserWindow.fromWebContents(e.sender)?.close());
