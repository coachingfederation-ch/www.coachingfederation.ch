/**
 * Super Admin alert for a member sync that failed every automatic attempt.
 *
 * Recipients are the accounts holding the `admin` role (Super Admin) resolved to
 * their sign-in addresses, following the same pattern as the article review
 * nudge. Sending is best effort: an alert that cannot be delivered must never
 * throw inside the cron handler.
 *
 * Exports: notifySyncFailed.
 */
import { SITE_URL } from "@/i18n/config";

async function superAdminEmails(): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
  const ids = [...new Set(((data ?? []) as { user_id: string }[]).map((r) => r.user_id))];

  const emails: string[] = [];
  for (const id of ids) {
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(id);
    const email = user?.user?.email;
    if (email && !emails.includes(email)) emails.push(email);
  }
  return emails;
}

export async function notifySyncFailed(input: {
  attempts: number;
  lastError: string | null;
  runId: string;
}): Promise<boolean> {
  let recipients: string[] = [];
  try {
    recipients = await superAdminEmails();
  } catch (err) {
    console.error(
      `[member-sync] alert recipients failed error=${JSON.stringify(
        err instanceof Error ? err.message : String(err),
      )}`,
    );
    return false;
  }
  if (!recipients.length) {
    console.warn("[member-sync] alert not sent — no Super Admin address on record");
    return false;
  }

  const today = new Date().toISOString().slice(0, 10);
  const { sendTemplateEmail } = await import("./email-templates/send-email");

  let sent = false;
  for (const to of recipients) {
    try {
      await sendTemplateEmail("member-sync-failed", to, {
        // One alert per night per recipient, whatever calls this.
        idempotencyKey: `member-sync-alert-${today}-${to}`,
        templateData: {
          attempts: input.attempts,
          lastError: input.lastError ?? "",
          failedAt: new Date().toISOString(),
          integrationUrl: `${SITE_URL}/integration`,
        },
      });
      sent = true;
    } catch (err) {
      console.error(
        `[member-sync] alert send failed error=${JSON.stringify(
          err instanceof Error ? err.message : String(err),
        )}`,
      );
    }
  }
  return sent;
}
