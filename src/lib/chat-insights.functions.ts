/**
 * Chat Agent Insights server functions.
 *
 * Read-only reporting plus category maintenance. Both are admin-only: the log
 * is operational telemetry about the whole site, not a per-user resource, so
 * `assertAdmin` — a check against the caller's own `user_roles` rows — is the
 * boundary.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./authz";

const filterSchema = z.object({
  from: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/)
    .default(""),
  to: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/)
    .default(""),
  category: z.string().max(64).default("all"),
  outcome: z.string().max(32).default("all"),
  contact: z.string().max(16).default("all"),
  language: z.string().max(8).default("all"),
  feedback: z.string().max(16).default("all"),
  search: z.string().max(120).default(""),
});

export const getChatInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ filters: filterSchema }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { buildChatInsightReport } = await import("./chat-insights.server");
    return buildChatInsightReport(data.filters);
  });

export const exportChatInsightsCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ filters: filterSchema }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { buildChatInsightCsv } = await import("./chat-insights.server");
    return buildChatInsightCsv(data.filters);
  });

export const saveChatCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        slug: z
          .string()
          .min(2)
          .max(64)
          .regex(/^[a-z0-9_]+$/),
        labelEn: z.string().min(1).max(120),
        labelDe: z.string().max(120).default(""),
        labelFr: z.string().max(120).default(""),
        labelIt: z.string().max(120).default(""),
        sortOrder: z.number().int().min(0).max(9999).default(0),
        isActive: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { upsertChatCategory } = await import("./chat-insights.server");
    await upsertChatCategory(data);
    return { ok: true };
  });
