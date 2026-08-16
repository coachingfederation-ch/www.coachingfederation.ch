/**
 * Client helpers for volunteer alerts.
 *
 * Two independent layers: a short chime while the console is open (no
 * permissions, uses WebAudio so we ship no audio file), and web push for when
 * the app is closed. Push registers a *messaging* service worker only — it
 * caches nothing, so it cannot serve stale HTML.
 *
 * Exports: playWaitingChime, pushSupported, isStandalone, currentPushState,
 * enablePush, disablePush.
 */
import {
  getPushConfig,
  removePushSubscription,
  savePushSubscription,
} from "./live-chat-push.functions";

const SW_URL = "/push-sw.js";

/** Short two-tone chime; ignored silently when the tab has no audio gesture yet. */
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

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** iOS only delivers push to an app added to the home screen. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function toBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeKey(base64: string): Uint8Array {
  const padded = base64.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function existingSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function currentPushState(): Promise<"on" | "off" | "blocked"> {
  if (!pushSupported()) return "off";
  if (Notification.permission === "denied") return "blocked";
  return (await existingSubscription()) ? "on" : "off";
}

export async function enablePush(): Promise<"on" | "blocked" | "error"> {
  if (!pushSupported()) return "error";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "blocked";

  const { publicKey } = await getPushConfig();
  if (!publicKey) return "error";

  const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeKey(publicKey) as BufferSource,
    }));

  await savePushSubscription({
    data: {
      endpoint: subscription.endpoint,
      p256dh: toBase64Url(subscription.getKey("p256dh")),
      auth: toBase64Url(subscription.getKey("auth")),
    },
  });
  return "on";
}

export async function disablePush(): Promise<void> {
  const subscription = await existingSubscription();
  if (!subscription) return;
  await removePushSubscription({ data: { endpoint: subscription.endpoint } });
  await subscription.unsubscribe();
}
