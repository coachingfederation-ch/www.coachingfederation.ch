/**
 * Member-facing account security actions.
 *
 * Only one today: confirming a new sign-in address that ICF Global reported.
 * The change is made through the caller's *own* session, so the provider sends
 * its confirmation link to the new address and nothing moves until the member
 * clicks it. An admin can never perform this step on someone's behalf — that
 * would defeat the confirmation.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PendingEmailChange } from "./member-email-change.server";

export const getPendingEmailChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PendingEmailChange | null> => {
    const { loadPendingEmailChange } = await import("./member-email-change.server");
    return loadPendingEmailChange(context.userId);
  });

export const startEmailChangeConfirmation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; reason?: string }> => {
    const { loadPendingEmailChange, markConfirmationSent } = await import(
      "./member-email-change.server"
    );
    const pending = await loadPendingEmailChange(context.userId);
    if (!pending) return { ok: false, reason: "no_pending_change" };
    if (pending.state === "blocked") return { ok: false, reason: "address_in_use" };

    const { error } = await context.supabase.auth.updateUser({ email: pending.pendingEmail });
    if (error) return { ok: false, reason: "provider_error" };

    await markConfirmationSent(pending.memberId);
    return { ok: true };
  });
