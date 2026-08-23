/**
 * Shared, client-safe vocabulary for CCE (Continuing Coach Education) credit
 * applications.
 *
 * An application is an *internal* document: the chapter fills it in, an
 * approver reviews it, and the official submission still happens by hand on
 * ICF's Jotform. Nothing in here talks to the network, so both the editor
 * section and the server functions can import it.
 */
import type { Database } from "@/integrations/supabase/types";

export type CceStatus = Database["public"]["Enums"]["event_cce_status"];
export type CceDelivery = Database["public"]["Enums"]["event_cce_delivery"];
export type CceCategory = Database["public"]["Enums"]["event_cce_category"];

export type CceApplication = Database["public"]["Tables"]["event_cce_applications"]["Row"];
export type CceScheduleRow = Database["public"]["Tables"]["event_cce_schedule_rows"]["Row"];

export const CCE_STATUSES: CceStatus[] = [
  "not_requested",
  "draft",
  "missing_information",
  "ready_for_review",
  "submitted",
  "approved",
  "declined",
  "not_required_rd_only",
  "separate_conference_process",
];

/** States only an editor/admin may set — the database enforces the same list. */
export const CCE_APPROVER_STATUSES: CceStatus[] = ["submitted", "approved", "declined"];

export const CCE_DELIVERY_METHODS: CceDelivery[] = ["in_person", "teleclass", "webinar"];
export const CCE_CATEGORIES: CceCategory[] = ["core_competency", "resource_development", "break"];

/** Credential vocabulary for the facilitator field. */
export const CCE_CREDENTIALS = ["ACC", "PCC", "MCC", "none"] as const;

/** ICF asks for the application at least this many days ahead. */
export const CCE_LEAD_DAYS = 14;

export type ScheduleDraft = {
  key: string;
  id: string | null;
  starts_at_text: string;
  ends_at_text: string;
  duration_minutes: number;
  facilitator: string;
  topic: string;
  delivery_method: CceDelivery | null;
  cce_category: CceCategory;
};

/** The editable half of an application, as the form holds it. */
export type CceDraft = {
  contact_name: string;
  contact_email: string;
  primary_facilitator_name: string;
  primary_facilitator_credential: string;
  additional_facilitators: string;
  delivery_method: CceDelivery | null;
  target_audience: string;
  learning_objectives: string;
  completion_requirements: string;
  attendance_monitoring: string;
  content_rationale: string;
  core_competency_hours: number;
  resource_development_hours: number;
  break_minutes: number;
  supporting_material_url: string;
  supporting_material_note: string;
  internal_notes: string;
};

export const EMPTY_CCE_DRAFT: CceDraft = {
  contact_name: "",
  contact_email: "",
  primary_facilitator_name: "",
  primary_facilitator_credential: "",
  additional_facilitators: "",
  delivery_method: null,
  target_audience: "",
  learning_objectives: "",
  completion_requirements: "",
  attendance_monitoring: "",
  content_rationale: "",
  core_competency_hours: 0,
  resource_development_hours: 0,
  break_minutes: 0,
  supporting_material_url: "",
  supporting_material_note: "",
  internal_notes: "",
};

export function toDraft(row: CceApplication | null): CceDraft {
  if (!row) return { ...EMPTY_CCE_DRAFT };
  const text = (v: string | null) => v ?? "";
  return {
    contact_name: text(row.contact_name),
    contact_email: text(row.contact_email),
    primary_facilitator_name: text(row.primary_facilitator_name),
    primary_facilitator_credential: text(row.primary_facilitator_credential),
    additional_facilitators: text(row.additional_facilitators),
    delivery_method: row.delivery_method,
    target_audience: text(row.target_audience),
    learning_objectives: text(row.learning_objectives),
    completion_requirements: text(row.completion_requirements),
    attendance_monitoring: text(row.attendance_monitoring),
    content_rationale: text(row.content_rationale),
    core_competency_hours: Number(row.core_competency_hours ?? 0),
    resource_development_hours: Number(row.resource_development_hours ?? 0),
    break_minutes: row.break_minutes ?? 0,
    supporting_material_url: text(row.supporting_material_url),
    supporting_material_note: text(row.supporting_material_note),
    internal_notes: text(row.internal_notes),
  };
}

/** Minutes of credit-bearing schedule time, breaks excluded. */
export function creditMinutes(rows: Pick<ScheduleDraft, "cce_category" | "duration_minutes">[]) {
  return rows
    .filter((r) => r.cce_category !== "break")
    .reduce((sum, r) => sum + Math.max(0, r.duration_minutes || 0), 0);
}

export function categoryMinutes(
  rows: Pick<ScheduleDraft, "cce_category" | "duration_minutes">[],
  category: CceCategory,
) {
  return rows
    .filter((r) => r.cce_category === category)
    .reduce((sum, r) => sum + Math.max(0, r.duration_minutes || 0), 0);
}

/** "01:30" from 90 minutes — the unit ICF's form works in. */
export function minutesToHours(minutes: number) {
  return Math.round((minutes / 60) * 100) / 100;
}

/** Minutes between two "HH:MM" strings; 0 when either is unusable. */
export function minutesBetween(start: string, end: string) {
  const parse = (v: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const a = parse(start);
  const b = parse(end);
  if (a === null || b === null) return 0;
  return Math.max(0, b - a);
}

/** True when the event runs across more than one calendar day in its own zone. */
export function isMultiDay(startIso: string, endIso: string | null, timezone: string) {
  if (!endIso) return false;
  const day = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone || "Europe/Zurich" }).format(
      new Date(iso),
    );
  return day(startIso) !== day(endIso);
}

export function daysUntil(startIso: string) {
  return Math.floor((new Date(startIso).getTime() - Date.now()) / 86_400_000);
}

export type CceValidation = {
  /** Translation keys for the fields still missing. */
  missing: string[];
  /** Credit minutes derived from the schedule. */
  scheduleMinutes: number;
  /** Hours entered by hand (CC + RD). */
  enteredHours: number;
  hoursMismatch: boolean;
  rdOnly: boolean;
  multiDay: boolean;
  lateSubmission: boolean;
  canRequestReview: boolean;
};

export function validateCce(input: {
  draft: CceDraft;
  rows: ScheduleDraft[];
  startIso: string;
  endIso: string | null;
  timezone: string;
}): CceValidation {
  const { draft, rows } = input;
  const missing: string[] = [];
  const need = (value: string, key: string) => {
    if (!value.trim()) missing.push(key);
  };

  const cc = Number(draft.core_competency_hours) || 0;
  const rd = Number(draft.resource_development_hours) || 0;
  const rdOnly = cc === 0 && rd > 0;
  const multiDay = isMultiDay(input.startIso, input.endIso, input.timezone);

  if (cc > 0) {
    need(draft.contact_name, "cce.field.contactName");
    need(draft.contact_email, "cce.field.contactEmail");
    need(draft.primary_facilitator_name, "cce.field.facilitatorName");
    need(draft.target_audience, "cce.field.targetAudience");
    need(draft.learning_objectives, "cce.field.learningObjectives");
    need(draft.completion_requirements, "cce.field.completionRequirements");
    need(draft.attendance_monitoring, "cce.field.attendanceMonitoring");
    need(draft.content_rationale, "cce.field.contentRationale");
    if (!draft.delivery_method) missing.push("cce.field.deliveryMethod");
    if (rows.filter((r) => r.cce_category !== "break").length === 0)
      missing.push("cce.field.schedule");
  }

  const scheduleMinutes = creditMinutes(rows);
  const enteredHours = Math.round((cc + rd) * 100) / 100;
  const hoursMismatch =
    rows.length > 0 && Math.abs(minutesToHours(scheduleMinutes) - enteredHours) > 0.05;

  return {
    missing,
    scheduleMinutes,
    enteredHours,
    hoursMismatch,
    rdOnly,
    multiDay,
    lateSubmission: daysUntil(input.startIso) < CCE_LEAD_DAYS,
    canRequestReview: !multiDay && cc > 0 && missing.length === 0,
  };
}
