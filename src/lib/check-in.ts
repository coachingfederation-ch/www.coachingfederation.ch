/**
 * Client-safe check-in helpers shared by the scanner UI and the server.
 */

/** A scanned QR carries the ticket URL; typed input may be the bare code. */
export function parseScannedTicket(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const fromUrl = raw.match(/\/ticket\/([A-Za-z0-9_-]{16,64})/);
  const token = fromUrl ? fromUrl[1]! : raw;
  return /^[A-Za-z0-9_-]{16,64}$/.test(token) ? token : null;
}

export type CheckInOutcome =
  | { outcome: "checked_in"; name: string; tierName: string | null }
  | { outcome: "already"; name: string; tierName: string | null; checkedInAt: string | null }
  | { outcome: "ineligible"; name: string; reason: string }
  | { outcome: "not_found" }
  | { outcome: "wrong_event"; name: string };
