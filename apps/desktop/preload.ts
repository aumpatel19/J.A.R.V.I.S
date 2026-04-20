import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  openApp: (exe: string) => ipcRenderer.invoke('open-app', exe),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  onWakeWord: (cb: () => void) => ipcRenderer.on('wake-word', () => cb()),
});
