/**
 * Lifecycle stages of the event editor.
 *
 * The editor used to be one very long form. The panels are unchanged; this
 * module only says which stage a panel belongs to, which stage an event should
 * open on, and how the choice survives a reload within the session.
 */

export const EVENT_STAGES = ["setup", "registration", "publish", "run", "after"] as const;

export type EventStage = (typeof EVENT_STAGES)[number];

export function isEventStage(value: unknown): value is EventStage {
  return typeof value === "string" && (EVENT_STAGES as readonly string[]).includes(value);
}

/**
 * The stage an event opens on when staff have not picked one yet: where the
 * event actually stands, not always step one.
 */
export function defaultStageFor(event: {
  status: string;
  starts_at: string | null;
  ends_at: string | null;
}): EventStage {
  const now = Date.now();
  const starts = event.starts_at ? new Date(event.starts_at).getTime() : null;
  const ends = event.ends_at ? new Date(event.ends_at).getTime() : starts;
  if (ends !== null && !Number.isNaN(ends) && ends < now) return "after";
  if (starts !== null && !Number.isNaN(starts) && starts <= now) return "run";
  if (event.status === "published") return "publish";
  return "setup";
}

const STORAGE_KEY = "cms.manage-event.stage";

/** Per-event, per-session memory of the last stage staff worked in. */
export function readStoredStage(eventId: string): EventStage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, unknown>;
    const value = map[eventId];
    return isEventStage(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredStage(eventId: string, stage: EventStage) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    map[eventId] = stage;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Session storage is a convenience here; losing it costs one click.
  }
}
