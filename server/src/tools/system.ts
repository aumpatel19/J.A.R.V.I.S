import { spawnSync } from 'child_process';
import os from 'os';
import path from 'path';

function ps(script: string): string {
  const r = spawnSync('powershell', ['-NonInteractive', '-NoProfile', '-Command', '-'], {
    input: script,
    encoding: 'utf8',
    timeout: 10000,
  });
  if (r.error) throw r.error;
  return (r.stdout ?? '').trim();
}

// ---------- Volume ----------

export function setVolume(level: number): string {
  const clamped = Math.max(0, Math.min(100, level));
  ps(`
$vol = ${clamped / 100};
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int a();int b();int c();int d();
  int SetMasterVolumeLevelScalar(float f,Guid g);
  int e();int GetMasterVolumeLevelScalar(out float f);
  int f2();int g2();int h2();int i2();
  int SetMute([MarshalAs(UnmanagedType.Bool)]bool m,Guid g);
  int GetMute(out bool m);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  int aa();int bb();int cc();
  int Activate(ref Guid id,uint ctx,IntPtr p,[MarshalAs(UnmanagedType.IUnknown)]out object iface);
}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
  int aa();
  int GetDefaultAudioEndpoint(int df,int role,out IMMDevice d);
}
[ComImport,Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDevEnum {}
'@
$e = [Activator]::CreateInstance([Type]::GetTypeFromCLSID([Guid]"BCDE0395-E52F-467C-8E3D-C4579291692E")) -as [IMMDeviceEnumerator]
$ep = $null; $e.GetDefaultAudioEndpoint(0,1,[ref]$ep) | Out-Null
$id = [Guid]"5CDF2C82-841E-4546-9722-0CF74078229A"
$v = $null; $ep.Activate([ref]$id,23,[IntPtr]::Zero,[ref]$v) | Out-Null
($v -as [IAudioEndpointVolume]).SetMasterVolumeLevelScalar($vol,[Guid]::Empty) | Out-Null
`);
  return `Volume set to ${clamped}%.`;
}

export function muteVolume(): string {
  const wsh = `(New-Object -ComObject WScript.Shell).SendKeys([char]173)`;
  ps(wsh);
  return 'Audio muted.';
}

export function changeVolume(direction: 'up' | 'down', steps = 5): string {
  const key = direction === 'up' ? '[char]175' : '[char]174';
  const script = `$w = New-Object -ComObject WScript.Shell; for($i=0;$i -lt ${steps};$i++){$w.SendKeys(${key})}`;
  ps(script);
  return `Volume ${direction === 'up' ? 'increased' : 'decreased'}.`;
}

export function getVolume(): string {
  const out = ps(`
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int a();int b();int c();int d();
  int SetMasterVolumeLevelScalar(float f,Guid g);
  int e();int GetMasterVolumeLevelScalar(out float f);
  int f2();int g2();int h2();int i2();
  int SetMute([MarshalAs(UnmanagedType.Bool)]bool m,Guid g);
  int GetMute(out bool m);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  int aa();int bb();int cc();
  int Activate(ref Guid id,uint ctx,IntPtr p,[MarshalAs(UnmanagedType.IUnknown)]out object iface);
}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
  int aa();
  int GetDefaultAudioEndpoint(int df,int role,out IMMDevice d);
}
[ComImport,Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDevEnum {}
'@
$e = [Activator]::CreateInstance([Type]::GetTypeFromCLSID([Guid]"BCDE0395-E52F-467C-8E3D-C4579291692E")) -as [IMMDeviceEnumerator]
$ep = $null; $e.GetDefaultAudioEndpoint(0,1,[ref]$ep) | Out-Null
$id = [Guid]"5CDF2C82-841E-4546-9722-0CF74078229A"
$v = $null; $ep.Activate([ref]$id,23,[IntPtr]::Zero,[ref]$v) | Out-Null
$f = 0.0; ($v -as [IAudioEndpointVolume]).GetMasterVolumeLevelScalar([ref]$f) | Out-Null
[int]($f * 100)
`);
  return `Current volume is ${out}%.`;
}

// ---------- Brightness ----------

export function setBrightness(level: number): string {
  const clamped = Math.max(0, Math.min(100, level));
  try {
    ps(`(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,${clamped})`);
    return `Brightness set to ${clamped}%.`;
  } catch {
    return 'Brightness control not available on this display.';
  }
}

// ---------- Media ----------

const MEDIA_KEYS: Record<string, number> = {
  play_pause: 179,
  next: 176,
  prev: 177,
  stop: 178,
};

export function mediaControl(action: string): string {
  const code = MEDIA_KEYS[action];
  if (!code) return 'Unknown media action.';
  ps(`(New-Object -ComObject WScript.Shell).SendKeys([char]${code})`);
  const labels: Record<string, string> = {
    play_pause: 'Play/Pause toggled.',
    next: 'Skipped to next track.',
    prev: 'Went to previous track.',
    stop: 'Media stopped.',
  };
  return labels[action] ?? 'Done.';
}

// ---------- Screenshot ----------

export function takeScreenshot(): string {
  const file = path.join(os.homedir(), 'Desktop', `jarvis-screenshot-${Date.now()}.png`);
  ps(`
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$s = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($s.Width,$s.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($s.Location,[System.Drawing.Point]::Empty,$s.Size)
$bmp.Save('${file.replace(/\\/g, '\\\\')}')
$g.Dispose(); $bmp.Dispose()
`);
  return `Screenshot saved to Desktop as ${path.basename(file)}.`;
}

// ---------- System Power ----------

export function systemPower(action: string): string {
  switch (action) {
    case 'shutdown':
      ps('Stop-Computer -Force');
      return 'Shutting down...';
    case 'restart':
      ps('Restart-Computer -Force');
      return 'Restarting...';
    case 'sleep':
      ps('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
      return 'Going to sleep.';
    case 'lock':
      ps('rundll32.exe user32.dll,LockWorkStation');
      return 'Workstation locked.';
    case 'hibernate':
      ps('shutdown /h');
      return 'Hibernating...';
    default:
      return 'Unknown power action.';
  }
}

// ---------- System Info ----------

export function getSystemInfo(type: string): string {
  switch (type) {
    case 'cpu': {
      const load = ps(`(Get-CimInstance Win32_Processor).LoadPercentage`);
      const name = ps(`(Get-CimInstance Win32_Processor).Name`);
      return `CPU: ${name.split('  ').join(' ')} — ${load}% load.`;
    }
    case 'ram': {
      const info = ps(`
$o = Get-CimInstance Win32_OperatingSystem
$used = [math]::Round(($o.TotalVisibleMemorySize - $o.FreePhysicalMemory)/1MB,1)
$total = [math]::Round($o.TotalVisibleMemorySize/1MB,1)
"$used GB used of $total GB"
`);
      return `RAM: ${info}.`;
    }
    case 'disk': {
      const info = ps(`
$d = Get-PSDrive C
$used = [math]::Round($d.Used/1GB,1)
$free = [math]::Round($d.Free/1GB,1)
"$used GB used, $free GB free on C:"
`);
      return `Disk: ${info}.`;
    }
    case 'battery': {
      const info = ps(`
$b = Get-CimInstance Win32_Battery
if ($b) { "$($b.EstimatedChargeRemaining)% — $($b.BatteryStatus -eq 2 ? 'Charging' : 'Discharging')" }
else { "No battery detected" }
`);
      return `Battery: ${info}.`;
    }
    case 'all': {
      const cpu = getSystemInfo('cpu');
      const ram = getSystemInfo('ram');
      const disk = getSystemInfo('disk');
      const bat = getSystemInfo('battery');
      return `${cpu} | ${ram} | ${disk} | ${bat}`;
    }
    default:
      return 'Unknown info type.';
  }
}

// ---------- World Monitor on Secondary Screen ----------

export function openWorldMonitorOnSecondScreen(): string {
  const EXE = 'C:\\Users\\Aum\\OneDrive\\Desktop\\World Monitor\\world-monitor.exe';
  ps(`
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinMove {
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h,int x,int y,int w,int h2,bool r);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int c);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
}
'@
$screens = [System.Windows.Forms.Screen]::AllScreens
$sec = $screens | Where-Object { -not $_.Primary } | Select-Object -First 1
if (-not $sec) { $sec = $screens[0] }
$x = $sec.Bounds.X; $y = $sec.Bounds.Y; $w = $sec.Bounds.Width; $h = $sec.Bounds.Height
Start-Process '${EXE.replace(/\\/g, '\\\\')}'
$proc = $null
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Milliseconds 500
  $proc = Get-Process 'world-monitor' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if ($proc) { break }
}
if ($proc) {
  [WinMove]::MoveWindow($proc.MainWindowHandle, $x, $y, $w, $h, $true) | Out-Null
  [WinMove]::ShowWindow($proc.MainWindowHandle, 3) | Out-Null
  [WinMove]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
}
`);
  return 'World Monitor is now open on your external screen, sir.';
}

// ---------- App Launch ----------

export function launchApp(name: string): string {
  const known: Record<string, string> = {
    notepad: 'notepad.exe',
    calculator: 'calc.exe',
    explorer: 'explorer.exe',
    paint: 'mspaint.exe',
    vscode: 'code',
    terminal: 'wt.exe',
    cmd: 'cmd.exe',
    taskmgr: 'taskmgr.exe',
    chrome: 'chrome.exe',
    firefox: 'firefox.exe',
    edge: 'msedge.exe',
    spotify: 'spotify.exe',
    discord: 'discord.exe',
    steam: 'steam.exe',
    'world monitor': 'C:\\Users\\Aum\\OneDrive\\Desktop\\World Monitor\\world-monitor.exe',
    worldmonitor: 'C:\\Users\\Aum\\OneDrive\\Desktop\\World Monitor\\world-monitor.exe',
    word: 'winword.exe',
    excel: 'excel.exe',
    powerpoint: 'powerpnt.exe',
    snipping: 'SnippingTool.exe',
    settings: 'ms-settings:',
    camera: 'microsoft.windows.camera:',
  };
  const exe = known[name.toLowerCase()] ?? name;
  try {
    ps(`Start-Process '${exe.replace(/'/g, "''")}'`);
    return `Launched ${name}.`;
  } catch (e) {
    return `Could not launch ${name}: ${(e as Error).message}`;
  }
}

// ---------- Type Text / Keyboard ----------

export function typeText(text: string): string {
  // Escape special SendKeys characters
  const escaped = text.replace(/[+^%~(){}[\]]/g, '{$&}');
  ps(`(New-Object -ComObject WScript.Shell).SendKeys('${escaped.replace(/'/g, "''")}')`);
  return `Typed: "${text}"`;
}

export function keyboardShortcut(keys: string): string {
  // Convert human-readable (ctrl+c) to SendKeys format
  const map: Record<string, string> = {
    ctrl: '^', alt: '%', shift: '+', win: '^{ESC}',
    enter: '{ENTER}', tab: '{TAB}', esc: '{ESC}',
    backspace: '{BACKSPACE}', delete: '{DELETE}',
    up: '{UP}', down: '{DOWN}', left: '{LEFT}', right: '{RIGHT}',
    home: '{HOME}', end: '{END}', pgup: '{PGUP}', pgdn: '{PGDN}',
    f1:'{F1}',f2:'{F2}',f3:'{F3}',f4:'{F4}',f5:'{F5}',
    f6:'{F6}',f7:'{F7}',f8:'{F8}',f9:'{F9}',f10:'{F10}',
    f11:'{F11}',f12:'{F12}',
  };
  let combo = keys.toLowerCase();
  // Build SendKeys string: ctrl+c → ^c, alt+f4 → %{F4}
  const parts = combo.split('+').map(p => p.trim());
  let result = '';
  const mods = parts.slice(0, -1).map(p => map[p] ?? p).join('');
  const key = parts[parts.length - 1];
  const mappedKey = map[key] ?? key;
  if (mods) result = mods + mappedKey;
  else result = mappedKey;
  ps(`(New-Object -ComObject WScript.Shell).SendKeys('${result.replace(/'/g, "''")}')`);
  return `Sent shortcut: ${keys}`;
}
