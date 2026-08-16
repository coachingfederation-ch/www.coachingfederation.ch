/**
 * Server functions for the activated-volunteer list.
 *
 * Admin surface (list/activate/deactivate) is platform-admin only. The two
 * member-facing calls are scoped to the caller's own activation row, so a
 * volunteer can check their status and opt out without any admin rights.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPlatformAdmin } from "./authz";
import type { ActivatedVolunteer, EligibleMember } from "./live-chat-volunteers.server";

export const listLiveChatVolunteers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ volunteers: ActivatedVolunteer[]; eligible: EligibleMember[] }> => {
      await assertPlatformAdmin(context);
      const { listActivatedVolunteers, listEligibleMembers } = await import(
        "./live-chat-volunteers.server"
      );
      const [volunteers, eligible] = await Promise.all([
        listActivatedVolunteers(),
        listEligibleMembers(),
      ]);
      return { volunteers, eligible };
    },
  );

export const activateLiveChatVolunteer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ memberId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const actor = await assertPlatformAdmin(context);
    const { activateVolunteer } = await import("./live-chat-volunteers.server");
    await activateVolunteer(data.memberId, actor);
    return { ok: true };
  });

export const deactivateLiveChatVolunteer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context);
    const { deactivateVolunteer } = await import("./live-chat-volunteers.server");
    await deactivateVolunteer(data.userId);
    return { ok: true };
  });

/** Is the caller an activated volunteer? Reads the caller's own row through RLS. */
export const getMyVolunteerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ active: boolean; displayName: string }> => {
    const { data } = await context.supabase
      .from("live_chat_volunteers")
      .select("display_name")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { active: Boolean(data), displayName: data?.display_name ?? "" };
  });

/** Self-service opt-out from the Member Area. */
export const leaveLiveChatVolunteers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("live_chat_volunteers").delete().eq("user_id", context.userId);
    await context.supabase
      .from("live_chat_presence")
      .update({ is_online: false })
      .eq("user_id", context.userId);
    return { ok: true };
  });
