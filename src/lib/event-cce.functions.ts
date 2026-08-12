/**
 * CCE application server functions.
 *
 * Every read and write goes through `context.supabase`, the caller's own
 * RLS-scoped client, so "organizers touch their own events, editors touch all"
 * stays a database decision. The approver boundary (submitted / approved /
 * declined) is enforced twice: `assertEditor` here for a legible error, and
 * the `event_cce_guard` trigger in the database as the real rule.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertEditor, assertOrganizer } from "./authz";

const EVENT_COLUMNS =
  "id, title, slug, summary, description, language, starts_at, ends_at, timezone, location_mode, venue_name, city, online_url, cce_enabled, organizer_id";

const APP_COLUMNS = "*";

const scheduleRow = z.object({
  id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).max(200),
  starts_at_text: z.string().trim().max(20),
  ends_at_text: z.string().trim().max(20),
  duration_minutes: z.number().int().min(0).max(1440),
  facilitator: z.string().trim().max(200),
  topic: z.string().trim().max(1000),
  delivery_method: z.enum(["in_person", "teleclass", "webinar"]).nullable(),
  cce_category: z.enum(["core_competency", "resource_development", "break"]),
});

const draftSchema = z.object({
  contact_name: z.string().trim().max(200),
  contact_email: z.string().trim().max(255),
  primary_facilitator_name: z.string().trim().max(200),
  primary_facilitator_credential: z.string().trim().max(40),
  additional_facilitators: z.string().trim().max(1000),
  delivery_method: z.enum(["in_person", "teleclass", "webinar"]).nullable(),
  target_audience: z.string().trim().max(2000),
  learning_objectives: z.string().trim().max(4000),
  completion_requirements: z.string().trim().max(2000),
  attendance_monitoring: z.string().trim().max(2000),
  content_rationale: z.string().trim().max(4000),
  core_competency_hours: z.number().min(0).max(24),
  resource_development_hours: z.number().min(0).max(24),
  break_minutes: z.number().int().min(0).max(600),
  supporting_material_url: z.string().trim().max(1000),
  supporting_material_note: z.string().trim().max(1000),
  internal_notes: z.string().trim().max(4000),
});

const blank = (v: string) => (v.trim() === "" ? null : v.trim());

/** Event + application + schedule, as the editor section and review page need. */
export const getEventCce = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ eventId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertOrganizer(context);

    const { data: event, error: eventError } = await context.supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("id", data.eventId)
      .maybeSingle();
    if (eventError) throw new Error(eventError.message);
    if (!event) throw new Error("Event not found");

    const { data: application, error } = await context.supabase
      .from("event_cce_applications")
      .select(APP_COLUMNS)
      .eq("event_id", data.eventId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    let rows: unknown[] = [];
    if (application) {
      const { data: scheduleRows, error: rowError } = await context.supabase
        .from("event_cce_schedule_rows")
        .select("*")
        .eq("application_id", application.id)
        .order("position", { ascending: true });
      if (rowError) throw new Error(rowError.message);
      rows = scheduleRows ?? [];
    }

    return { event, application: application ?? null, rows };
  });

/** Turns the editor toggle on or off. Off never deletes an existing draft. */
export const setEventCceEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ eventId: z.string().uuid(), enabled: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertOrganizer(context);
    const { error } = await context.supabase
      .from("events")
      .update({ cce_enabled: data.enabled })
      .eq("id", data.eventId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Saves the organizer-authored half of the application plus its schedule. */
export const saveEventCce = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        draft: draftSchema,
        rows: z.array(scheduleRow).max(60),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const userId = await assertOrganizer(context);
    const d = data.draft;

    const payload = {
      event_id: data.eventId,
      contact_name: blank(d.contact_name),
      contact_email: blank(d.contact_email),
      primary_facilitator_name: blank(d.primary_facilitator_name),
      primary_facilitator_credential: blank(d.primary_facilitator_credential),
      additional_facilitators: blank(d.additional_facilitators),
      delivery_method: d.delivery_method,
      target_audience: blank(d.target_audience),
      learning_objectives: blank(d.learning_objectives),
      completion_requirements: blank(d.completion_requirements),
      attendance_monitoring: blank(d.attendance_monitoring),
      content_rationale: blank(d.content_rationale),
      core_competency_hours: d.core_competency_hours,
      resource_development_hours: d.resource_development_hours,
      break_minutes: d.break_minutes,
      supporting_material_url: blank(d.supporting_material_url),
      supporting_material_note: blank(d.supporting_material_note),
      internal_notes: blank(d.internal_notes),
    };

    const { data: existing, error: readError } = await context.supabase
      .from("event_cce_applications")
      .select("id, status")
      .eq("event_id", data.eventId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);

    let applicationId: string;
    if (existing) {
      const { error } = await context.supabase
        .from("event_cce_applications")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      applicationId = existing.id;
    } else {
      const { data: inserted, error } = await context.supabase
        .from("event_cce_applications")
        .insert({ ...payload, status: "draft", created_by: userId })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      applicationId = inserted.id;
    }

    // The schedule is small and fully owned by the form, so replace it wholesale
    // rather than diffing rows the organizer may have reordered.
    const { error: deleteError } = await context.supabase
      .from("event_cce_schedule_rows")
      .delete()
      .eq("application_id", applicationId);
    if (deleteError) throw new Error(deleteError.message);

    if (data.rows.length > 0) {
      const { error } = await context.supabase.from("event_cce_schedule_rows").insert(
        data.rows.map((r, index) => ({
          application_id: applicationId,
          position: index,
          starts_at_text: blank(r.starts_at_text),
          ends_at_text: blank(r.ends_at_text),
          duration_minutes: r.duration_minutes,
          facilitator: blank(r.facilitator),
          topic: blank(r.topic),
          delivery_method: r.delivery_method,
          cce_category: r.cce_category,
        })),
      );
      if (error) throw new Error(error.message);
    }

    return { id: applicationId };
  });

const ORGANIZER_STATUSES = [
  "draft",
  "missing_information",
  "ready_for_review",
  "not_required_rd_only",
  "separate_conference_process",
] as const;

const APPROVER_STATUSES = ["submitted", "approved", "declined"] as const;

/** Status moves. Approver states additionally require editor rights. */
export const setEventCceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        status: z.enum([...ORGANIZER_STATUSES, ...APPROVER_STATUSES]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertOrganizer(context);
    if ((APPROVER_STATUSES as readonly string[]).includes(data.status)) {
      await assertEditor(context);
    }
    const { error } = await context.supabase
      .from("event_cce_applications")
      .update({ status: data.status })
      .eq("event_id", data.eventId);
    if (error) throw new Error(error.message);
    return { status: data.status };
  });

/** Records what the approver did on the official form. Editors/admins only. */
export const recordEventCceOutcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        submitted_at: z.string().max(20).nullable(),
        jotform_reference: z.string().trim().max(200).nullable(),
        decision_at: z.string().max(20).nullable(),
        decision: z.enum(["none", "approved", "declined"]),
        approved_cc_hours: z.number().min(0).max(24).nullable(),
        approved_rd_hours: z.number().min(0).max(24).nullable(),
        decision_notes: z.string().trim().max(4000).nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const userId = await assertEditor(context);

    const status =
      data.decision === "approved"
        ? "approved"
        : data.decision === "declined"
          ? "declined"
          : data.submitted_at
            ? "submitted"
            : "ready_for_review";

    const { error } = await context.supabase
      .from("event_cce_applications")
      .update({
        submitted_at: data.submitted_at || null,
        jotform_reference: data.jotform_reference || null,
        submitted_by: data.submitted_at ? userId : null,
        decision_at: data.decision_at || null,
        approved_cc_hours: data.decision === "approved" ? data.approved_cc_hours : null,
        approved_rd_hours: data.decision === "approved" ? data.approved_rd_hours : null,
        decision_notes: data.decision_notes || null,
        status,
      })
      .eq("event_id", data.eventId);
    if (error) throw new Error(error.message);
    return { status };
  });
