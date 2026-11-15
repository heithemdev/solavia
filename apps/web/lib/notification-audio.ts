let context: AudioContext | undefined;
let buffer: Promise<AudioBuffer> | undefined;
let primed = false;
export function prepareNotificationSound() {
  try {
    const Audio =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    context ??= new Audio();
    void context.resume().catch(() => {});
    if (!primed) {
      const primer = context.createBufferSource();
      primer.buffer = context.createBuffer(1, 1, context.sampleRate);
      primer.connect(context.destination);
      primer.start();
      primer.onended = () => primer.disconnect();
      primed = true;
    }
    buffer ??= fetch("/notification.mp3")
      .then((r) => {
        if (!r.ok) throw new Error("Audio unavailable");
        return r.arrayBuffer();
      })
      .then((bytes) => context!.decodeAudioData(bytes));
    void buffer.catch(() => {
      buffer = undefined;
    });
  } catch {}
}
export async function playNotificationSound(): Promise<boolean> {
  prepareNotificationSound();
  try {
    if (!context || !buffer) return false;
    await context.resume();
    const decoded = await buffer;
    if (context.state !== "running") return false;
    const source = context.createBufferSource(),
      volume = context.createGain();
    volume.gain.value = 0.9;
    source.buffer = decoded;
    source.connect(volume);
    volume.connect(context.destination);
    source.start();
    source.onended = () => {
      source.disconnect();
      volume.disconnect();
    };
    return true;
  } catch {
    return false;
  }
}
