/**
 * Staff server functions for the Zoom / Google Meet attendance import.
 *
 * Every function is organizer-gated twice: `assertOrganizer` rejects accounts
 * that manage no events at all, and each read/write goes through the caller's
 * own RLS-scoped client so the event id in the request cannot widen access.
 * The admin client appears only after those checks, and only where RLS
 * deliberately grants nothing: writing the private bucket, inserting preview
 * rows, and calling the service-role apply routine.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertOrganizer } from "./authz";
import { EVENT_ATTENDANCE_IMPORT_BUCKET, EVENT_ATTENDANCE_IMPORT_TTL_SECONDS } from "./storage";

export type AttendanceImportStats = {
  rows: number;
  matched: number;
  below_threshold: number;
  already: number;
  unmatched: number;
  ineligible: number;
  will_check_in: number;
  checked_in?: number;
  skipped?: number;
};

export type AttendanceImportRow = {
  id: string;
  raw_name: string | null;
  raw_email: string | null;
  duration_minutes: number | null;
  match_registration_id: string | null;
  match_method: "email" | "manual" | "none";
  apply_decision: "pending" | "check_in" | "skip";
  skip_reason: string | null;
};

export type AttendanceImport = {
  id: string;
  event_id: string;
  created_at: string;
  provider: "zoom" | "google_meet" | "other";
  original_filename: string;
  storage_path: string;
  status: "uploaded" | "previewed" | "applied" | "discarded";
  stats: AttendanceImportStats;
  error: string | null;
};

export type AttendancePreview = {
  import: AttendanceImport;
  rows: AttendanceImportRow[];
  thresholdMinutes: number;
  lengthMinutes: number;
  minPercent: number;
};

type Registration = {
  id: string;
  email: string;
  full_name: string;
  status: string;
  payment_status: string;
  refund_status: string | null;
  checked_in_at: string | null;
};

/** Mirrors `private.registration_is_check_in_eligible` for the preview only. */
function ineligibleReason(r: Registration): string | null {
  if (r.status !== "confirmed") return "cancelled";
  if (r.refund_status === "refunded" || r.refund_status === "pending") return "refunded";
  if (r.payment_status !== "not_required" && r.payment_status !== "paid") return r.payment_status;
  return null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function loadManagedEvent(context: any, eventId: string) {
  const { data, error } = await context.supabase
    .from("events")
    .select("id, starts_at, ends_at, attendance_min_percent")
    .eq("id", eventId)
    .maybeSingle();
  if (error || !data) throw new Error("Event not found");
  return data as {
    id: string;
    starts_at: string;
    ends_at: string | null;
    attendance_min_percent: number;
  };
}

async function loadRegistrations(context: any, eventId: string): Promise<Registration[]> {
  const { data, error } = await context.supabase
    .from("event_registrations")
    .select("id, email, full_name, status, payment_status, refund_status, checked_in_at")
    .eq("event_id", eventId);
  if (error) throw new Error(error.message);
  return (data ?? []) as Registration[];
}

/** Upload a participants CSV, match it against this event's registrations. */
export const uploadAttendanceCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        filename: z.string().trim().min(1).max(200),
        // CSV text, not a binary upload: the files these tools export are small.
        content: z.string().min(1).max(4_000_000),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<AttendancePreview> => {
    await assertOrganizer(context);
    const event = await loadManagedEvent(context, data.eventId);

    const {
      parseAttendanceCsv,
      scheduledLengthMinutes,
      attendanceThresholdMinutes,
      AttendanceCsvError,
    } = await import("./attendance-import.server");

    let parsed;
    try {
      parsed = parseAttendanceCsv(data.content);
    } catch (e) {
      if (e instanceof AttendanceCsvError) throw new Error(e.message);
      throw e;
    }

    const lengthMinutes = scheduledLengthMinutes(event.starts_at, event.ends_at);
    const thresholdMinutes = attendanceThresholdMinutes(
      lengthMinutes,
      event.attendance_min_percent ?? 80,
    );

    // The import row is created as the caller, so RLS confirms once more that
    // this account manages the event.
    const { data: created, error: createError } = await context.supabase
      .from("event_attendance_imports")
      .insert({
        event_id: data.eventId,
        uploaded_by: context.userId,
        provider: parsed.provider,
        original_filename: data.filename.slice(0, 200),
        storage_path: "",
      })
      .select("id")
      .single();
    if (createError) throw new Error(createError.message);
    const importId = created.id as string;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const safeName = data.filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
    const storagePath = `${data.eventId}/${importId}/${safeName}`;
    await supabaseAdmin.storage
      .from(EVENT_ATTENDANCE_IMPORT_BUCKET)
      .upload(storagePath, new Blob([data.content], { type: "text/csv" }), {
        contentType: "text/csv",
        upsert: true,
      });

    const registrations = await loadRegistrations(context, data.eventId);
    const byEmail = new Map<string, Registration>();
    for (const r of registrations) byEmail.set((r.email ?? "").trim().toLowerCase(), r);

    const stats: AttendanceImportStats = {
      rows: parsed.participants.length,
      matched: 0,
      below_threshold: 0,
      already: 0,
      unmatched: 0,
      ineligible: 0,
      will_check_in: 0,
    };

    const rows = parsed.participants.map((p) => {
      const match = p.email ? byEmail.get(p.email) : undefined;
      if (!match) {
        stats.unmatched += 1;
        return {
          import_id: importId,
          raw_name: p.name,
          raw_email: p.email,
          joined_at: p.joinedAt,
          left_at: p.leftAt,
          duration_minutes: p.durationMinutes,
          match_registration_id: null,
          match_method: "none" as const,
          apply_decision: "skip" as const,
          skip_reason: "unmatched",
        };
      }

      stats.matched += 1;
      const base = {
        import_id: importId,
        raw_name: p.name,
        raw_email: p.email,
        joined_at: p.joinedAt,
        left_at: p.leftAt,
        duration_minutes: p.durationMinutes,
        match_registration_id: match.id,
        match_method: "email" as const,
      };

      const reason = ineligibleReason(match);
      if (reason) {
        stats.ineligible += 1;
        return { ...base, apply_decision: "skip" as const, skip_reason: reason };
      }
      if (match.checked_in_at) {
        stats.already += 1;
        return { ...base, apply_decision: "skip" as const, skip_reason: "already" };
      }
      if ((p.durationMinutes ?? 0) < thresholdMinutes) {
        stats.below_threshold += 1;
        return { ...base, apply_decision: "skip" as const, skip_reason: "below_threshold" };
      }
      stats.will_check_in += 1;
      return { ...base, apply_decision: "check_in" as const, skip_reason: null };
    });

    if (rows.length) {
      const { error: rowsError } = await supabaseAdmin
        .from("event_attendance_import_rows")
        .insert(rows);
      if (rowsError) throw new Error(rowsError.message);
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("event_attendance_imports")
      .update({ status: "previewed", stats, storage_path: storagePath })
      .eq("id", importId)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);

    return {
      import: updated as unknown as AttendanceImport,
      rows: await readRows(context, importId),
      thresholdMinutes,
      lengthMinutes,
      minPercent: event.attendance_min_percent ?? 80,
    };
  });

async function readRows(context: any, importId: string): Promise<AttendanceImportRow[]> {
  const { data, error } = await context.supabase
    .from("event_attendance_import_rows")
    .select(
      "id, raw_name, raw_email, duration_minutes, match_registration_id, match_method, apply_decision, skip_reason",
    )
    .eq("import_id", importId)
    .order("raw_email", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AttendanceImportRow[];
}

/** Previous imports for an event, newest first. */
export const listAttendanceImports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }): Promise<AttendanceImport[]> => {
    await assertOrganizer(context);
    const { data: rows, error } = await context.supabase
      .from("event_attendance_imports")
      .select("*")
      .eq("event_id", data.eventId)
      .neq("status", "discarded")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as AttendanceImport[];
  });

/** One import with its rows and the threshold that produced them. */
export const loadAttendanceImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ importId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }): Promise<AttendancePreview> => {
    await assertOrganizer(context);
    const { data: row, error } = await context.supabase
      .from("event_attendance_imports")
      .select("*")
      .eq("id", data.importId)
      .maybeSingle();
    if (error || !row) throw new Error("Import not found");

    const event = await loadManagedEvent(context, (row as unknown as AttendanceImport).event_id);
    const { scheduledLengthMinutes, attendanceThresholdMinutes } =
      await import("./attendance-import.server");
    const lengthMinutes = scheduledLengthMinutes(event.starts_at, event.ends_at);

    return {
      import: row as unknown as AttendanceImport,
      rows: await readRows(context, data.importId),
      lengthMinutes,
      minPercent: event.attendance_min_percent ?? 80,
      thresholdMinutes: attendanceThresholdMinutes(
        lengthMinutes,
        event.attendance_min_percent ?? 80,
      ),
    };
  });

/**
 * Staff correction before apply: link an unmatched participant by hand, or
 * check somebody in despite a short duration. RLS freezes applied imports, and
 * the column grants keep this away from `checked_in_at`.
 */
export const setImportRowDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        rowId: z.string().uuid(),
        registrationId: z.string().uuid().nullable().optional(),
        decision: z.enum(["check_in", "skip"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);

    const patch: {
      apply_decision: "check_in" | "skip";
      match_registration_id?: string | null;
      match_method?: "email" | "manual" | "none";
      skip_reason?: string | null;
    } = { apply_decision: data.decision };
    if (data.registrationId !== undefined) {
      if (data.registrationId) {
        // The seat must belong to an event this caller manages; RLS on
        // `event_registrations` is what answers that.
        const { data: reg, error } = await context.supabase
          .from("event_registrations")
          .select("id")
          .eq("id", data.registrationId)
          .maybeSingle();
        if (error || !reg) throw new Error("Registration not found");
        patch.match_registration_id = data.registrationId;
        patch.match_method = "manual";
        patch.skip_reason = null;
      } else {
        patch.match_registration_id = null;
        patch.match_method = "none";
        patch.skip_reason = "unmatched";
      }
    }

    const { error } = await context.supabase
      .from("event_attendance_import_rows")
      .update(patch)
      .eq("id", data.rowId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Applies the import. Idempotent: the routine returns the recorded stats. */
export const applyAttendanceImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ importId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("apply_attendance_import", {
      _import_id: data.importId,
      _actor: context.userId,
    });
    if (error) throw new Error(error.message);
    return result as {
      outcome: string;
      checked_in?: number;
      already?: number;
      skipped?: number;
    };
  });

/** Before apply only — RLS refuses once the import has been applied. */
export const discardAttendanceImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ importId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { error } = await context.supabase
      .from("event_attendance_imports")
      .update({ status: "discarded" })
      .eq("id", data.importId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Short-lived link so staff can re-read the file they uploaded. */
export const getAttendanceImportFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ importId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }): Promise<{ url: string | null }> => {
    await assertOrganizer(context);
    const { data: row, error } = await context.supabase
      .from("event_attendance_imports")
      .select("storage_path")
      .eq("id", data.importId)
      .maybeSingle();
    if (error || !row?.storage_path) return { url: null };

    const { signStoragePaths } = await import("./storage.server");
    const signed = await signStoragePaths(
      EVENT_ATTENDANCE_IMPORT_BUCKET,
      [row.storage_path as string],
      EVENT_ATTENDANCE_IMPORT_TTL_SECONDS,
    );
    return { url: signed.get(row.storage_path as string) ?? null };
  });
