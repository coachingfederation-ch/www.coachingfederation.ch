/**
 * When each attendee reminder is due.
 *
 * - day: 24 hours before the start. If that lands outside 08:00–21:00 Zurich
 *   time, it moves to 21:00 on the evening before the event's start date.
 * - hours2: 2 hours before the start.
 * - minutes15: 15 minutes before the start.
 *
 * Each stage may only be sent between its own due time and the next stage's
 * due time, so a missed reminder is replaced by the next one rather than
 * arriving alongside it. Pure functions, no I/O.
 */
import type { ReminderStage } from "./email-templates/event-reminder-copy";

export const REMINDER_STAGES: ReminderStage[] = ["day", "hours2", "minutes15"];

const ZONE = "Europe/Zurich";
const HOUR = 3600_000;

/** Zurich wall-clock parts for an instant. */
function zurichParts(at: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute") };
}

/** The instant of a Zurich wall-clock time (handles summer/winter time). */
function zurichInstant(y: number, m: number, d: number, h: number, min: number) {
  const guess = Date.UTC(y, m - 1, d, h, min);
  // Offset of Zurich at the guessed instant; one correction pass is enough
  // except inside the skipped DST hour, which 21:00 never falls into.
  const p = zurichParts(new Date(guess));
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - guess;
  return new Date(guess - offset);
}

export function reminderDueAt(stage: ReminderStage, startsAt: Date): Date {
  if (stage === "hours2") return new Date(startsAt.getTime() - 2 * HOUR);
  if (stage === "minutes15") return new Date(startsAt.getTime() - 15 * 60_000);

  const candidate = new Date(startsAt.getTime() - 24 * HOUR);
  const { h, min } = zurichParts(candidate);
  const minutes = h * 60 + min;
  if (minutes >= 8 * 60 && minutes <= 21 * 60) return candidate;

  // Outside the window: 21:00 the evening before the event's (Zurich) date.
  const start = zurichParts(startsAt);
  const eveningBefore = new Date(Date.UTC(start.y, start.m - 1, start.d - 1));
  return zurichInstant(
    eveningBefore.getUTCFullYear(),
    eveningBefore.getUTCMonth() + 1,
    eveningBefore.getUTCDate(),
    21,
    0,
  );
}

/** The latest moment a stage may still go out (exclusive). */
export function reminderDeadline(stage: ReminderStage, startsAt: Date): Date {
  if (stage === "day") return reminderDueAt("hours2", startsAt);
  if (stage === "hours2") return reminderDueAt("minutes15", startsAt);
  return startsAt;
}
