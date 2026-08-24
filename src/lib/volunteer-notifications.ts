/**
 * Client helper for the volunteer console's in-browser chime.
 *
 * The chime plays while the console tab is open (no permissions, uses WebAudio
 * so we ship no audio file). Native push notifications are handled by the iOS
 * app via APNs; the legacy VAPID web-push layer has been removed.
 */
export function playWaitingChime(): void {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1174].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.25, now + index * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.16 + 0.15);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(now + index * 0.16);
      oscillator.stop(now + index * 0.16 + 0.18);
    });
    window.setTimeout(() => void ctx.close(), 800);
  } catch {
    // Audio is a nicety; never let it break the console.
  }
}
