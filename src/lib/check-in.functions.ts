/**
 * Staff check-in server functions.
 *
 * Authorisation is decided twice, on purpose: the caller's own RLS-scoped
 * client must be able to see the registration at all, and the database
 * routine re-checks that the caller manages that event before it opens the
 * door. Nothing here trusts an event id supplied by the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertOrganizer } from "./authz";
import type { CheckInOutcome } from "./check-in";

const BOARD_COLUMNS =
  "id, full_name, email, status, payment_status, refund_status, tier_id, amount_cents, currency, checked_in_at, created_by_staff";

export type CheckInAttendee = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  payment_status: string;
  refund_status: string | null;
  tier_id: string | null;
  amount_cents: number;
  currency: string;
  checked_in_at: string | null;
  created_by_staff: boolean | null;
  tier_name: string | null;
};

/** Everything the door screen needs for one event, in one round trip. */
export const loadCheckInBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);

    const { data: event, error: eventError } = await context.supabase
      .from("events")
      .select("id, title, starts_at, timezone, capacity")
      .eq("id", data.eventId)
      .maybeSingle();
    if (eventError || !event) throw new Error("Event not found");

    const [{ data: rows, error }, { data: tiers }] = await Promise.all([
      context.supabase
        .from("event_registrations")
        .select(BOARD_COLUMNS)
        .eq("event_id", data.eventId)
        .order("full_name", { ascending: true }),
      context.supabase.from("event_ticket_tiers").select("id, name").eq("event_id", data.eventId),
    ]);
    if (error) throw new Error(error.message);

    const tierNames = new Map<string, string>(
      ((tiers ?? []) as { id: string; name: string }[]).map((t) => [t.id, t.name]),
    );
    const attendees: CheckInAttendee[] = ((rows ?? []) as CheckInAttendee[]).map((r) => ({
      ...r,
      tier_name: r.tier_id ? (tierNames.get(r.tier_id) ?? null) : null,
    }));

    return {
      event: event as { id: string; title: string; starts_at: string; capacity: number | null },
      attendees,
    };
  });

/** Idempotent: the database returns "already" instead of a second attendance. */
export const checkInAttendee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ registrationId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => runCheckIn(context, data.registrationId));

/** Scan path: resolves the ticket code, then runs the same guarded routine. */
export const checkInByToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        token: z
          .string()
          .trim()
          .min(16)
          .max(64)
          .regex(/^[A-Za-z0-9_-]+$/),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<CheckInOutcome> => {
    await assertOrganizer(context);
    const { registrationForToken } = await import("./check-in.server");
    const match = await registrationForToken(data.token);
    if (!match) return { outcome: "not_found" };
    if (match.event_id !== data.eventId) {
      // A valid ticket for a different event must read as a clear refusal,
      // not as an unknown code.
      return { outcome: "wrong_event", name: "" };
    }
    return runCheckIn(context, match.id);
  });

/** Corrects a mistaken scan. Editors and admins only, enforced in the database. */
export const undoAttendeeCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ registrationId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    // The routine is service-role only; the caller is verified above and the
    // database re-checks the actor's admin/editor role.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("undo_check_in", {
      _registration_id: data.registrationId,
      _actor: context.userId,
    });
    if (error) throw new Error(error.message);
    return result as { outcome: string };
  });

/** The attendee's own ticket code and QR, for staff to re-share on request. */
export const getAttendeeTicketLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ registrationId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { data: row, error } = await context.supabase
      .from("event_registrations")
      .select("id")
      .eq("id", data.registrationId)
      .maybeSingle();
    if (error || !row) throw new Error("Registration not found");

    const { ensureCheckInToken, ticketUrl } = await import("./check-in.server");
    const token = await ensureCheckInToken(data.registrationId);
    return { url: token ? ticketUrl(token) : null };
  });

/* eslint-disable @typescript-eslint/no-explicit-any */
async function runCheckIn(context: any, registrationId: string): Promise<CheckInOutcome> {
  await assertOrganizer(context);

  // RLS decides whether this staff member may see the seat at all. The name is
  // read before the door call so every outcome can be announced with a person.
  const { data: row } = await context.supabase
    .from("event_registrations")
    .select("id, full_name, tier_id")
    .eq("id", registrationId)
    .maybeSingle();
  if (!row) return { outcome: "not_found" };

  let tierName: string | null = null;
  if (row.tier_id) {
    const { data: tier } = await context.supabase
      .from("event_ticket_tiers")
      .select("name")
      .eq("id", row.tier_id)
      .maybeSingle();
    tierName = tier?.name ?? null;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: result, error } = await supabaseAdmin.rpc("check_in_registration", {
    _registration_id: registrationId,
    _actor: context.userId,
  });
  if (error) throw new Error(error.message);

  const outcome = result as { outcome: string; reason?: string; checked_in_at?: string };
  if (outcome.outcome === "checked_in") {
    return { outcome: "checked_in", name: row.full_name, tierName };
  }
  if (outcome.outcome === "already") {
    return {
      outcome: "already",
      name: row.full_name,
      tierName,
      checkedInAt: outcome.checked_in_at ?? null,
    };
  }
  if (outcome.outcome === "ineligible") {
    return { outcome: "ineligible", name: row.full_name, reason: outcome.reason ?? "ineligible" };
  }
  return { outcome: "not_found" };
}

/* ---------------------------------------------------------------------------
 * Attendance windows
 *
 * The window is what makes an online audience countable: the organizer shows
 * one QR on the shared screen, and each attendee still has to present their
 * own ticket code. Both halves are checked inside the database routines — the
 * functions below only carry them across.
 * ------------------------------------------------------------------------ */

export type AttendanceSession = {
  id: string;
  public_token: string;
  ends_at: string;
  grace_minutes: number;
};

/** Opens the window, or returns the one already open (idempotent in SQL). */
export const openAttendanceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        graceMinutes: z.number().int().min(0).max(180).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<AttendanceSession> => {
    await assertOrganizer(context);
    // Run as the caller: the routine authorises on auth.uid().
    const { data: result, error } = await context.supabase.rpc("open_event_attendance_session", {
      _event_id: data.eventId,
      _grace_minutes: data.graceMinutes ?? 30,
    });
    if (error) throw new Error(error.message);
    return result as AttendanceSession;
  });

export const closeAttendanceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { error } = await context.supabase.rpc("close_event_attendance_session", {
      _event_id: data.eventId,
    });
    if (error) throw new Error(error.message);
    return { outcome: "closed" as const };
  });

export const loadAttendanceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }): Promise<AttendanceSession | null> => {
    await assertOrganizer(context);
    const { data: result, error } = await context.supabase.rpc("get_event_attendance_session", {
      _event_id: data.eventId,
    });
    if (error) throw new Error(error.message);
    return (result as AttendanceSession | null) ?? null;
  });

export type AttendanceConfirmation =
  | { outcome: "checked_in"; name: string }
  | { outcome: "already"; name: string; checkedInAt: string | null }
  | { outcome: "ineligible"; name: string; reason: string }
  | { outcome: "wrong_event" }
  | { outcome: "window_closed" }
  | { outcome: "not_found" }
  | { outcome: "rate_limited" };

/**
 * Public: an attendee confirms presence with the window code plus their own
 * ticket code. Deliberately unauthenticated — guests have no account, and the
 * ticket code is the credential. Throttled per IP because it is a public,
 * token-guessing-shaped endpoint.
 */
export const confirmAttendance = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionToken: z.string().trim().min(16).max(64),
        ticketToken: z.string().trim().min(16).max(64),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<AttendanceConfirmation> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { checkRateLimit, clientIp } = await import("./rate-limit.server");
    const ip = clientIp(getRequest());
    const verdict = await checkRateLimit("attendance-confirm", `ip:${ip}`, [
      { windowSeconds: 300, max: 10 },
    ]);
    if (!verdict.allowed) return { outcome: "rate_limited" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("self_check_in_with_ticket", {
      _session_token: data.sessionToken,
      _ticket_token: data.ticketToken,
    });
    if (error) throw new Error(error.message);

    const row = result as {
      outcome: string;
      name?: string;
      reason?: string;
      checked_in_at?: string;
    };
    switch (row.outcome) {
      case "checked_in":
        return { outcome: "checked_in", name: row.name ?? "" };
      case "already":
        return {
          outcome: "already",
          name: row.name ?? "",
          checkedInAt: row.checked_in_at ?? null,
        };
      case "ineligible":
        return {
          outcome: "ineligible",
          name: row.name ?? "",
          reason: row.reason ?? "ineligible",
        };
      case "wrong_event":
        return { outcome: "wrong_event" };
      case "window_closed":
        return { outcome: "window_closed" };
      default:
        return { outcome: "not_found" };
    }
  });

/** Public: is this attendance window still open? Backs the confirm page. */
export const getAttendanceWindow = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().trim().min(16).max(64) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { loadAttendanceSessionStatus } = await import("./check-in.server");
    return loadAttendanceSessionStatus(data.token);
  });
