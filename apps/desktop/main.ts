import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const DEV = process.env.NODE_ENV !== 'production';
const RENDERER_URL = 'http://localhost:5173';

let serverProcess: ChildProcess | null = null;

function startServer(): Promise<void> {
  if (DEV) return Promise.resolve();

  const serverPath = path.join(process.resourcesPath, 'server.cjs');
  const envPath = path.join(process.resourcesPath, 'config.env');

  serverProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      JARVIS_ENV_PATH: envPath,
      PORT: '4000',
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
  await startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  serverProcess?.kill();
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
