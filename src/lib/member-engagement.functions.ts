/**
 * Member engagement — staff server functions.
 *
 * Reads and writes for the admin panel: campaign copy and mode, the pending
 * queue, and the send history. Every call is re-authorised server-side as
 * Membership & Engagement staff; the client never decides who may edit copy
 * or release a queued send.
 *
 * Exports: listEngagementCampaigns, saveEngagementCampaign, listEngagementSends,
 * releaseEngagementSends, cancelEngagementSends, runEngagementDispatch.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ENGAGEMENT_CAMPAIGN_KEYS,
  ENGAGEMENT_LOCALES,
  type EngagementCampaign,
  type EngagementSendStatus,
} from "./member-engagement";

const campaignKey = z.enum(ENGAGEMENT_CAMPAIGN_KEYS);

const copySchema = z.record(
  z.enum(ENGAGEMENT_LOCALES),
  z.object({ subject: z.string().max(200), body: z.string().max(8000) }),
);

export type EngagementSendRow = {
  id: string;
  campaignKey: string;
  memberId: string;
  memberName: string | null;
  status: EngagementSendStatus;
  triggerDetails: Record<string, unknown>;
  errorMessage: string | null;
  releasedAt: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type EngagementStats = { pending: number; sentLast30Days: number; failed: number };

/** Every campaign with its authored copy — the panel's initial state. */
export const listEngagementCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EngagementCampaign[]> => {
    const { assertMembership } = await import("./authz");
    await assertMembership(context);

    const { data, error } = await context.supabase
      .from("member_engagement_campaigns")
      .select("key, mode, daily_cap, copy, updated_at")
      .order("key");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as EngagementCampaign[];
  });

/** Saves one campaign's copy and delivery settings. */
export const saveEngagementCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        key: campaignKey,
        mode: z.enum(["off", "automatic", "queued"]),
        dailyCap: z.number().int().min(1).max(500),
        copy: copySchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { assertMembership } = await import("./authz");
    await assertMembership(context);

    const { error } = await context.supabase
      .from("member_engagement_campaigns")
      .update({
        mode: data.mode,
        daily_cap: data.dailyCap,
        copy: data.copy as never,
        updated_at: new Date().toISOString(),
      })
      .eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Queue and history, optionally narrowed to one campaign or status. */
export const listEngagementSends = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        campaign: campaignKey.optional(),
        status: z.enum(["pending", "sent", "skipped", "suppressed", "failed"]).optional(),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(input ?? {}),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ rows: EngagementSendRow[]; stats: EngagementStats }> => {
      const { assertMembership } = await import("./authz");
      await assertMembership(context);

      let query = context.supabase
        .from("member_engagement_sends")
        .select(
          "id, campaign_key, member_id, status, trigger_details, error_message, released_at, sent_at, created_at, members(full_name)",
        )
        .order("created_at", { ascending: false })
        .limit(data.limit);
      if (data.campaign) query = query.eq("campaign_key", data.campaign);
      if (data.status) query = query.eq("status", data.status);

      const { data: rows, error } = await query;
      if (error) throw new Error(error.message);

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [pending, sent, failed] = await Promise.all([
        context.supabase
          .from("member_engagement_sends")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        context.supabase
          .from("member_engagement_sends")
          .select("id", { count: "exact", head: true })
          .eq("status", "sent")
          .gte("sent_at", since),
        context.supabase
          .from("member_engagement_sends")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed"),
      ]);

      return {
        rows: (rows ?? []).map((row) => {
          // PostgREST returns an embedded row as an object or an array
          // depending on the relationship it infers — normalise both.
          const embedded = row.members as unknown;
          const member = (Array.isArray(embedded) ? embedded[0] : embedded) as
            | { full_name: string | null }
            | null
            | undefined;
          return {
            id: row.id as string,
            campaignKey: row.campaign_key as string,
            memberId: row.member_id as string,
            memberName: member?.full_name ?? null,
            status: row.status as EngagementSendStatus,
            triggerDetails: (row.trigger_details ?? {}) as Record<string, unknown>,
            errorMessage: row.error_message as string | null,
            releasedAt: row.released_at as string | null,
            sentAt: row.sent_at as string | null,
            createdAt: row.created_at as string,
          };
        }),
        stats: {
          pending: pending.count ?? 0,
          sentLast30Days: sent.count ?? 0,
          failed: failed.count ?? 0,
        },
      };
    },
  );

const idsSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(200) });

/** Approves queued sends so the next dispatch may deliver them. */
export const releaseEngagementSends = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idsSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ released: number }> => {
    const { assertMembership } = await import("./authz");
    await assertMembership(context);

    const { data: updated, error } = await context.supabase
      .from("member_engagement_sends")
      .update({ released_at: new Date().toISOString() })
      .in("id", data.ids)
      .eq("status", "pending")
      .select("id");
    if (error) throw new Error(error.message);
    return { released: updated?.length ?? 0 };
  });

/** Drops queued sends without emailing anyone; the dedupe key stays claimed. */
export const cancelEngagementSends = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idsSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ cancelled: number }> => {
    const { assertMembership } = await import("./authz");
    await assertMembership(context);

    const { data: updated, error } = await context.supabase
      .from("member_engagement_sends")
      .update({ status: "skipped", error_message: "Cancelled by staff" })
      .in("id", data.ids)
      .eq("status", "pending")
      .select("id");
    if (error) throw new Error(error.message);
    return { cancelled: updated?.length ?? 0 };
  });

/** Sends what is currently eligible, without waiting for the next sync run. */
export const runEngagementDispatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ sent: number; failed: number }> => {
    const { assertMembership } = await import("./authz");
    await assertMembership(context);

    const { dispatchEngagementSends } = await import("./member-engagement/dispatch.server");
    const summary = await dispatchEngagementSends();
    return Object.values(summary).reduce(
      (total, row) => ({ sent: total.sent + row.sent, failed: total.failed + row.failed }),
      { sent: 0, failed: 0 },
    );
  });
