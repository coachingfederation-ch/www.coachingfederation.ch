/**
 * Board digest admin server functions. Platform admins only; the server-only
 * module is loaded after the role check.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPlatformAdmin } from "./authz";

const settingsSchema = z.object({
  enabled: z.boolean(),
  recipient: z.string().trim().email().max(254),
  cadence: z.enum(["weekly", "biweekly"]),
  weekday: z.number().int().min(0).max(6),
  hour: z.number().int().min(0).max(23),
  sections: z.object({
    members: z.boolean(),
    articles: z.boolean(),
    events: z.boolean(),
    assistant: z.boolean(),
  }),
});

export const getBoardDigestSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context);
    const { loadDigestSettings } = await import("./board-digest.server");
    return await loadDigestSettings();
  });

export const saveBoardDigestSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => settingsSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context);
    const { saveDigestSettings } = await import("./board-digest.server");
    await saveDigestSettings(data);
    return { ok: true };
  });

export const previewBoardDigest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context);
    const { loadDigestSettings, buildBoardDigest } = await import("./board-digest.server");
    const digest = await buildBoardDigest(await loadDigestSettings());
    const React = await import("react");
    const { render } = await import("@react-email/render");
    const { template } = await import("./email-templates/board-digest");
    const html = await render(
      React.createElement(
        template.component as unknown as React.ComponentType<Record<string, unknown>>,
        { digest },
      ),
    );
    return { html };
  });

export const sendBoardDigestTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context);
    const { sendBoardDigest } = await import("./board-digest.server");
    return await sendBoardDigest({ test: true });
  });
