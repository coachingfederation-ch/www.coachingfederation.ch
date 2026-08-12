/**
 * Reporting server functions.
 *
 * Read-only. `assertOrganizer` is the fast fail for accounts with no event
 * rights at all; the row-level check below — a lookup through the caller's own
 * RLS-scoped client — is what actually decides whether this caller may see
 * *this* event, exactly as the attendee export does.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertOrganizer } from "./authz";

const filterSchema = z.object({
  tier: z.string().max(64).default("all"),
  status: z.string().max(32).default("all"),
  payment: z.string().max(32).default("all"),
  checkIn: z.string().max(8).default("all"),
  from: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/)
    .default(""),
  to: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/)
    .default(""),
});

const reportInput = z.object({
  eventId: z.string().uuid(),
  filters: filterSchema,
  grouping: z.enum(["day", "week"]).default("day"),
});

/** Throws unless the caller can read this event through their own policies. */
async function assertEventAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: { supabase: any; userId: string },
  eventId: string,
) {
  await assertOrganizer(context);
  const { data, error } = await context.supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  if (error || !data) throw new Error("Event not found");
}

export const getEventReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reportInput.parse(input))
  .handler(async ({ context, data }) => {
    await assertEventAccess(context, data.eventId);
    const { buildEventReport } = await import("./event-reporting.server");
    const report = await buildEventReport(data.eventId, data.filters, data.grouping);
    if (!report) throw new Error("Event not found");
    return report;
  });

export const exportEventReportCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ eventId: z.string().uuid(), filters: filterSchema }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertEventAccess(context, data.eventId);
    const { buildEventReportCsv } = await import("./event-reporting.server");
    const file = await buildEventReportCsv(data.eventId, data.filters);
    if (!file) throw new Error("Event not found");
    return file;
  });
