/**
 * Member credits dashboard — the signed-in member's own continuing-education
 * record.
 *
 * Two sources are merged here and kept distinguishable on purpose:
 *   - `chapter`: hours attached to a certificate we issued. Confirmed facts.
 *   - `self`:    hours the member recorded themselves for training elsewhere.
 *                Their own bookkeeping, never a chapter confirmation.
 *
 * Every query runs through the caller's own session, so RLS is the boundary:
 * nothing here filters by user id in application code except where a join has
 * no policy of its own.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CreditSource = "chapter" | "self";

export type CreditRow = {
  id: string;
  source: CreditSource;
  occurredOn: string;
  title: string;
  provider: string | null;
  ccHours: number;
  rdHours: number;
  note: string | null;
  linkUrl: string | null;
  /** Certificate verification token, chapter rows only. */
  publicToken: string | null;
};

export type CreditCycle = {
  /** ISO date, inclusive. Null when we have no anchor yet. */
  start: string | null;
  /** ISO date, inclusive. Null when we have no anchor yet. */
  end: string | null;
  /** Where the window comes from — drives the hint under the totals. */
  anchor: "credential" | "member" | "none";
};

export type CreditsDashboard = {
  cycle: CreditCycle;
  rows: CreditRow[];
};

const MAX_HOURS = 999;

const entrySchema = z.object({
  id: z.string().uuid().optional(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().trim().min(1).max(200),
  provider: z.string().trim().max(200).optional().nullable(),
  ccHours: z.number().min(0).max(MAX_HOURS),
  rdHours: z.number().min(0).max(MAX_HOURS),
  note: z.string().trim().max(1000).optional().nullable(),
  linkUrl: z.string().trim().url().max(500).optional().nullable(),
});

/** Adds whole years to an ISO date without dragging in a date library. */
function shiftYears(iso: string, years: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString().slice(0, 10);
}

/** Day before an ISO date — cycles are stated as inclusive windows. */
function dayBefore(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export const getMyCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreditsDashboard> => {
    const [certificates, entries, settings, member] = await Promise.all([
      context.supabase
        .from("event_certificates")
        .select("id, public_token, event_title_snapshot, completed_on, cc_hours, rd_hours")
        .eq("status", "issued")
        .order("completed_on", { ascending: false }),
      context.supabase
        .from("member_credit_entries")
        .select("id, occurred_on, title, provider, cc_hours, rd_hours, note, link_url")
        .order("occurred_on", { ascending: false }),
      context.supabase.from("member_credit_settings").select("cycle_start_on").maybeSingle(),
      context.supabase
        .from("members")
        .select("credential_expires_on")
        .eq("auth_user_id", context.userId)
        .maybeSingle(),
    ]);

    // A blocked read must never look like "nothing earned yet".
    const failure = certificates.error ?? entries.error;
    if (failure) throw new Error(failure.message);

    const rows: CreditRow[] = [
      ...(certificates.data ?? []).map((row) => ({
        id: row.id,
        source: "chapter" as const,
        occurredOn: row.completed_on,
        title: row.event_title_snapshot,
        provider: null,
        ccHours: Number(row.cc_hours ?? 0),
        rdHours: Number(row.rd_hours ?? 0),
        note: null,
        linkUrl: null,
        publicToken: row.public_token,
      })),
      ...(entries.data ?? []).map((row) => ({
        id: row.id,
        source: "self" as const,
        occurredOn: row.occurred_on,
        title: row.title,
        provider: row.provider,
        ccHours: Number(row.cc_hours ?? 0),
        rdHours: Number(row.rd_hours ?? 0),
        note: row.note,
        linkUrl: row.link_url,
        publicToken: null,
      })),
    ].sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : -1));

    // The member's own start date wins: they know their renewal paperwork
    // better than a feed that may carry an outdated expiry.
    const memberStart = settings.data?.cycle_start_on ?? null;
    const expires = member.data?.credential_expires_on ?? null;

    let cycle: CreditCycle = { start: null, end: null, anchor: "none" };
    if (memberStart) {
      cycle = { start: memberStart, end: dayBefore(shiftYears(memberStart, 3)), anchor: "member" };
    } else if (expires) {
      cycle = { start: shiftYears(expires, -3), end: expires, anchor: "credential" };
    }

    return { cycle, rows };
  });

/** Creates or updates one self-declared entry; ownership comes from RLS. */
export const saveMyCreditEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => entrySchema.parse(input))
  .handler(async ({ context, data }) => {
    const payload = {
      occurred_on: data.occurredOn,
      title: data.title,
      provider: data.provider?.trim() ? data.provider.trim() : null,
      cc_hours: data.ccHours,
      rd_hours: data.rdHours,
      note: data.note?.trim() ? data.note.trim() : null,
      link_url: data.linkUrl?.trim() ? data.linkUrl.trim() : null,
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("member_credit_entries")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("member_credit_entries")
      .insert({ ...payload, user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const deleteMyCreditEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("member_credit_entries")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Sets (or clears) the renewal-cycle start the member maintains themselves. */
export const setMyCycleStart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        cycleStartOn: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("member_credit_settings")
      .upsert(
        { user_id: context.userId, cycle_start_on: data.cycleStartOn },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
