/**
 * Review nudges for the Insights CMS.
 *
 * When an article enters `review` every account that may publish it gets one
 * email — except the person who submitted it, who cannot publish their own
 * article under the four-eye rule. Sending is best effort: a failed
 * notification must never undo the submission.
 */
import { SITE_URL } from "@/i18n/config";

/** Publishers who should be nudged, minus the submitter. Never throws. */
async function reviewRecipients(submitterUserId: string): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "publisher");
  const ids = ((roles ?? []) as { user_id: string }[])
    .map((r) => r.user_id)
    .filter((id) => id !== submitterUserId);
  if (!ids.length) return [];

  const emails: string[] = [];
  for (const id of ids) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(id);
    const email = data?.user?.email;
    if (email && !emails.includes(email)) emails.push(email);
  }
  return emails;
}

export async function notifyReviewRequested(
  articleId: string,
  submitterUserId: string,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: article } = await supabaseAdmin
    .from("articles")
    .select("id, title, language, updated_at, category:categories(name)")
    .eq("id", articleId)
    .maybeSingle();
  if (!article) return;

  const row = article as unknown as {
    title: string | null;
    language: string | null;
    updated_at: string | null;
    category: { name: string | null } | null;
  };

  const { data: submitter } = await supabaseAdmin
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", submitterUserId)
    .maybeSingle();
  const person = submitter as { first_name: string | null; last_name: string | null } | null;
  const submitterName =
    [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim() || "A colleague";

  const recipients = await reviewRecipients(submitterUserId);
  if (!recipients.length) return;

  const { sendTemplateEmail } = await import("./email-templates/send-email");
  // The submission timestamp keys the idempotency, so a retry of the same
  // action is deduplicated while a later re-submission nudges again.
  const stamp = row.updated_at ?? new Date().toISOString();

  for (const to of recipients) {
    try {
      await sendTemplateEmail("article-review-request", to, {
        idempotencyKey: `article-review-${articleId}-${stamp}-${to}`,
        templateData: {
          articleTitle: row.title || "Untitled article",
          submitterName,
          language: row.language ?? "",
          categoryName: row.category?.name ?? "",
          articleUrl: `${SITE_URL}/articles/${articleId}`,
        },
      });
    } catch {
      // A failed nudge must not lose the submission — the article is already
      // in review and visible in the CMS list.
    }
  }
}
