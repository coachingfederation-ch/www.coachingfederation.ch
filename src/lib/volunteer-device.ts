/**
 * Client side of the seven-day device trust for the volunteer console.
 *
 * The token lives in this browser's own `localStorage` (never the brokered
 * preview storage — it must survive a signed-out launch, which is exactly the
 * case the Supabase session does not cover). It is a fallback credential: the
 * console only reaches for it when there is no Supabase session, and every
 * successful use rotates it and extends the window another seven days.
 *
 * Exports: rememberDevice, restoreVolunteerSession, forgetDevice,
 * lastSessionNote, noteSessionEvent.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  issueVolunteerDeviceToken,
  redeemVolunteerDeviceToken,
} from "@/lib/volunteer-qr.functions";

const DEVICE_KEY = "icf.volunteer.device-token";
const NOTE_KEY = "icf.volunteer.session-note";

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Diagnostics: one short line describing the last sign-in/sign-out decision.
 * Shown on the QR screen so a volunteer can tell us why they were sent there
 * instead of us guessing between token rotation and storage eviction.
 */
export function noteSessionEvent(note: string): void {
  try {
    store()?.setItem(NOTE_KEY, `${new Date().toISOString()} · ${note}`);
  } catch {
    /* diagnostics must never break a sign-in */
  }
}

export function lastSessionNote(): string | null {
  try {
    return store()?.getItem(NOTE_KEY) ?? null;
  } catch {
    return null;
  }
}

function readToken(): string | null {
  try {
    return store()?.getItem(DEVICE_KEY) ?? null;
  } catch {
    return null;
  }
}

/** Ask the server for a device token and keep it on this device. */
export async function rememberDevice(): Promise<void> {
  const result = await issueVolunteerDeviceToken().catch(() => null);
  if (!result?.token) return;
  try {
    store()?.setItem(DEVICE_KEY, result.token);
    noteSessionEvent("device remembered");
  } catch {
    /* private mode: the QR screen stays the fallback */
  }
}

/** Mint one only when this device has none, so launches don't pile up rows. */
export async function ensureDeviceRemembered(): Promise<void> {
  if (readToken()) return;
  await rememberDevice();
}

export function forgetDevice(): void {
  try {
    store()?.removeItem(DEVICE_KEY);
  } catch {
    /* nothing to clean up */
  }
}

/**
 * Re-establish a Supabase session from the stored device token.
 * Returns false when this device has no valid token — the caller then falls
 * back to the QR screen, unchanged.
 */
export async function restoreVolunteerSession(): Promise<boolean> {
  const token = readToken();
  if (!token) {
    noteSessionEvent("no session and no device token");
    return false;
  }

  const result = await redeemVolunteerDeviceToken({ data: { token } }).catch(() => null);
  if (!result?.tokenHash) {
    // Expired, already rotated elsewhere, or no longer a volunteer.
    forgetDevice();
    noteSessionEvent("device token refused");
    return false;
  }

  const { error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: result.tokenHash,
  });
  if (error) {
    noteSessionEvent(`device sign-in failed: ${error.message}`);
    return false;
  }

  try {
    if (result.deviceToken) store()?.setItem(DEVICE_KEY, result.deviceToken);
    else store()?.removeItem(DEVICE_KEY);
  } catch {
    /* the session is established either way */
  }
  noteSessionEvent("session restored from device");
  return true;
}
