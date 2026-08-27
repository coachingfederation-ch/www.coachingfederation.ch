/**
 * Zoom / Google Meet attendance CSV: parsing, threshold and matching.
 *
 * Server-only. Two rules drive everything here:
 *
 *  - the only identity in the file we trust is the *registration* email, never
 *    a display name and never a member record, and
 *  - nothing in this module marks anybody present. It writes preview rows; the
 *    security-definer routine `apply_attendance_import` decides eligibility
 *    again at write time.
 */

export type AttendanceProvider = "zoom" | "google_meet" | "other";

export type ParsedParticipant = {
  name: string | null;
  email: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  durationMinutes: number | null;
};

export type ParsedAttendanceFile = {
  provider: AttendanceProvider;
  headers: string[];
  participants: ParsedParticipant[];
};

/** Thrown when the file has no usable email column; the message names headers. */
export class AttendanceCsvError extends Error {}

/* ------------------------------------------------------------------ CSV --- */

/** Split one CSV line, honouring quotes and doubled quotes inside them. */
function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out.map((f) => f.trim());
}

function detectDelimiter(headerLine: string): string {
  const semis = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  const tabs = (headerLine.match(/\t/g) ?? []).length;
  if (tabs > semis && tabs > commas) return "\t";
  return semis > commas ? ";" : ",";
}

/* ------------------------------------------------------------ mapping --- */

const norm = (s: string) => s.toLowerCase().replace(/[\s_]+/g, " ").trim();

const ZOOM_NAME = ["name (original name)", "name", "display name", "user name"];
const ZOOM_EMAIL = ["email", "user email", "email address"];
const ZOOM_DURATION = ["duration (minutes)", "duration"];
const ZOOM_JOIN = ["join time", "joined", "join date/time"];
const ZOOM_LEAVE = ["leave time", "left", "leave date/time"];

const MEET_NAME = ["name", "participant", "full name"];
const MEET_EMAIL = ["email", "email address"];
const MEET_DURATION = ["duration", "time in call", "duration (minutes)"];
const MEET_JOIN = ["first seen", "join time", "joined"];
const MEET_LEAVE = ["last seen", "leave time", "left"];

function indexOfAny(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const i = headers.indexOf(candidate);
    if (i !== -1) return i;
  }
  return -1;
}

function detectProvider(headers: string[]): AttendanceProvider {
  const has = (h: string) => headers.includes(h);
  if (has("name (original name)") || has("user email") || (has("join time") && has("leave time"))) {
    return "zoom";
  }
  if (has("time in call") || has("first seen") || has("last seen")) return "google_meet";
  return "other";
}

/** `HH:MM:SS`, `MM:SS`, `45`, `45 min`, `1h 5m` → minutes. */
export function parseDurationMinutes(raw: string | undefined): number | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  if (value.includes(":")) {
    const parts = value.split(":").map((p) => Number(p.trim()));
    if (parts.some((p) => Number.isNaN(p))) return null;
    if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
    if (parts.length === 2) return parts[0] + parts[1] / 60;
    return null;
  }

  const hm = value.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)/i);
  if (hm && (hm[1] || hm[2])) return Number(hm[1] ?? 0) * 60 + Number(hm[2] ?? 0);

  const plain = Number(value.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(plain) ? plain : null;
}

function parseTimestamp(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Parse an exported participants list.
 *
 * De-duplication policy: durations are **summed** per email. Zoom writes one
 * row per join session, so a participant who drops and rejoins would otherwise
 * look like two short visits. Join is the earliest, leave the latest.
 */
export function parseAttendanceCsv(text: string): ParsedAttendanceFile {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim().length > 0);
  if (!lines.length) throw new AttendanceCsvError("The file is empty.");

  const delimiter = detectDelimiter(lines[0]);
  const rawHeaders = splitLine(lines[0], delimiter);
  const headers = rawHeaders.map(norm);
  const provider = detectProvider(headers);

  const pick = (zoom: string[], meet: string[]) =>
    provider === "google_meet"
      ? indexOfAny(headers, [...meet, ...zoom])
      : indexOfAny(headers, [...zoom, ...meet]);

  const iName = pick(ZOOM_NAME, MEET_NAME);
  const iEmail = pick(ZOOM_EMAIL, MEET_EMAIL);
  const iDuration = pick(ZOOM_DURATION, MEET_DURATION);
  const iJoin = pick(ZOOM_JOIN, MEET_JOIN);
  const iLeave = pick(ZOOM_LEAVE, MEET_LEAVE);

  if (iEmail === -1) {
    throw new AttendanceCsvError(
      `No email column found. Columns in this file: ${rawHeaders.join(", ")}`,
    );
  }

  type Agg = ParsedParticipant & { minutes: number };
  const byEmail = new Map<string, Agg>();
  const anonymous: ParsedParticipant[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitLine(line, delimiter);
    const email = (cells[iEmail] ?? "").trim().toLowerCase();
    const name = iName === -1 ? null : (cells[iName] ?? "").trim() || null;
    const joinedAt = iJoin === -1 ? null : parseTimestamp(cells[iJoin]);
    const leftAt = iLeave === -1 ? null : parseTimestamp(cells[iLeave]);

    let minutes = iDuration === -1 ? null : parseDurationMinutes(cells[iDuration]);
    if (minutes === null && joinedAt && leftAt) {
      minutes = (new Date(leftAt).getTime() - new Date(joinedAt).getTime()) / 60000;
    }

    if (!email) {
      // Kept for staff to see, but never auto-matched.
      anonymous.push({ name, email: null, joinedAt, leftAt, durationMinutes: minutes });
      continue;
    }

    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, {
        name,
        email,
        joinedAt,
        leftAt,
        durationMinutes: minutes,
        minutes: minutes ?? 0,
      });
      continue;
    }
    existing.minutes += minutes ?? 0;
    existing.durationMinutes = existing.minutes;
    existing.name = existing.name ?? name;
    if (joinedAt && (!existing.joinedAt || joinedAt < existing.joinedAt)) {
      existing.joinedAt = joinedAt;
    }
    if (leftAt && (!existing.leftAt || leftAt > existing.leftAt)) existing.leftAt = leftAt;
  }

  const participants: ParsedParticipant[] = [...byEmail.values()].map((p) => ({
    name: p.name,
    email: p.email,
    joinedAt: p.joinedAt,
    leftAt: p.leftAt,
    durationMinutes: p.durationMinutes === null ? null : Math.round(p.durationMinutes * 100) / 100,
  }));

  return { provider, headers: rawHeaders, participants: [...participants, ...anonymous] };
}

/* ---------------------------------------------------------- threshold --- */

/** Scheduled minutes; an open-ended event counts as an hour. */
export function scheduledLengthMinutes(startsAt: string, endsAt: string | null): number {
  if (!endsAt) return 60;
  const minutes = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000;
  return Math.max(1, Math.round(minutes));
}

/** Never below a quarter of an hour, however short the meeting was scheduled. */
export function attendanceThresholdMinutes(lengthMinutes: number, minPercent: number): number {
  return Math.max(15, Math.round((minPercent / 100) * lengthMinutes));
}
