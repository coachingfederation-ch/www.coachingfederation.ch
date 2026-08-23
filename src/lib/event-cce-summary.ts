/**
 * Turns an event plus its CCE application into the flat, ordered list of
 * values a human copies into ICF's Jotform. Pure formatting, no I/O, so both
 * the review screen and the copy/print output read from one source.
 */
import { minutesToHours, type CceApplication, type CceScheduleRow } from "./event-cce";

export type SummaryEvent = {
  title: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string | null;
  language: string;
  location_mode: string;
  venue_name: string | null;
  city: string | null;
  online_url: string | null;
  summary: string | null;
};

export type SummaryItem = { key: string; value: string };

const fmtDate = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, dateStyle: "full" }).format(new Date(iso));

const fmtTime = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );

export function buildCceSummary(
  event: SummaryEvent,
  app: CceApplication | null,
  rows: CceScheduleRow[],
): SummaryItem[] {
  const tz = event.timezone ?? "Europe/Zurich";
  const dash = "—";
  const text = (v: string | null | undefined) => (v && v.trim() ? v.trim() : dash);

  const place =
    event.location_mode === "online"
      ? text(event.online_url)
      : [event.venue_name, event.city].filter(Boolean).join(", ") || text(event.online_url);

  const cc = Number(app?.core_competency_hours ?? 0);
  const rd = Number(app?.resource_development_hours ?? 0);

  const schedule = rows
    .map(
      (r) =>
        `${r.starts_at_text ?? ""}–${r.ends_at_text ?? ""} · ${r.duration_minutes} min · ${
          r.cce_category
        } · ${r.topic ?? ""}${r.facilitator ? ` · ${r.facilitator}` : ""}`,
    )
    .join("\n");

  return [
    { key: "eventTitle", value: event.title },
    { key: "eventDate", value: fmtDate(event.starts_at, tz) },
    {
      key: "eventTime",
      value: `${fmtTime(event.starts_at, tz)}${
        event.ends_at ? ` – ${fmtTime(event.ends_at, tz)}` : ""
      }`,
    },
    { key: "timezone", value: tz },
    { key: "language", value: event.language.toUpperCase() },
    { key: "location", value: place },
    { key: "deliveryMethod", value: text(app?.delivery_method) },
    { key: "contactName", value: text(app?.contact_name) },
    { key: "contactEmail", value: text(app?.contact_email) },
    {
      key: "primaryFacilitator",
      value:
        [app?.primary_facilitator_name, app?.primary_facilitator_credential]
          .filter(Boolean)
          .join(" · ") || dash,
    },
    { key: "additionalFacilitators", value: text(app?.additional_facilitators) },
    { key: "targetAudience", value: text(app?.target_audience) },
    { key: "learningObjectives", value: text(app?.learning_objectives) },
    { key: "completionRequirements", value: text(app?.completion_requirements) },
    { key: "attendanceMonitoring", value: text(app?.attendance_monitoring) },
    { key: "coreCompetencyHours", value: cc.toFixed(2) },
    { key: "resourceDevelopmentHours", value: rd.toFixed(2) },
    { key: "totalHours", value: (cc + rd).toFixed(2) },
    { key: "breakMinutes", value: String(app?.break_minutes ?? 0) },
    { key: "contentRationale", value: text(app?.content_rationale) },
    { key: "schedule", value: schedule || dash },
    {
      key: "supportingMaterial",
      value:
        [app?.supporting_material_url, app?.supporting_material_note].filter(Boolean).join(" — ") ||
        dash,
    },
  ];
}

/** Hours implied by the stored schedule, breaks excluded. */
export function scheduleHours(rows: CceScheduleRow[]) {
  return minutesToHours(
    rows
      .filter((r) => r.cce_category !== "break")
      .reduce((sum, r) => sum + Math.max(0, r.duration_minutes ?? 0), 0),
  );
}

/** Plain-text block for "copy all". */
export function summaryToText(items: SummaryItem[], label: (key: string) => string) {
  return items.map((i) => `${label(i.key)}\n${i.value}`).join("\n\n");
}
