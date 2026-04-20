// Returns the best available microphone deviceId, skipping HDMI/monitor audio inputs.
const SKIP = /hdmi|displayport|display|monitor|virtual|stereo mix|wave out/i;

export async function getBestMicDeviceId(): Promise<string | undefined> {
  try {
    // Need permission first so labels are populated
    const temp = await navigator.mediaDevices.getUserMedia({ audio: true });
    temp.getTracks().forEach((t) => t.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter((d) => d.kind === 'audioinput');

    // Prefer non-HDMI/monitor devices
    const real = mics.find((d) => d.label && !SKIP.test(d.label));
    return real?.deviceId ?? mics[0]?.deviceId;
  } catch {
    return undefined;
  }
}
