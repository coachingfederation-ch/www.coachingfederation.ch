/**
 * "Join community" interest requests.
 *
 * A member presses one button on the Member Area landing page and the leads of
 * that local community get an email with the member's name and address. The
 * recipients are resolved here, server-side, from the community's lead
 * assignments — a lead's address is never sent to the browser, and unlike the
 * public directory this internal notification does not depend on the lead's
 * public-contact opt-in.
 *
 * Guards, in order: the caller must be a claimed member, the community must
 * actually cover one of the member's service regions (the same rule that put
 * the card on their screen), no second request for the same community within
 * 30 days, and a shared rate limit on top.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Locale } from "@/i18n/config";
import { localizedName } from "./team";
import { checkRateLimit } from "./rate-limit.server";

const OFFICE_EMAIL = "office@coachingfederation.ch";
const LEAD_SLUGS = ["lead", "president", "president-elect", "co-lead"];
const DUPLICATE_WINDOW_DAYS = 30;

export type JoinCommunityOutcome =
  | { status: "sent" }
  | { status: "already" }
  | { status: "rate_limited" }
  | { status: "error"; message: string };

/** Which of the member's communities they have already asked to join. */
export async function listJoinedCommunitySlugs(memberId: string): Promise<string[]> {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("community_join_requests")
    .select("op_projects(slug)")
    .eq("member_id", memberId)
    .gte("created_at", since);
  if (error) return [];
  type Row = { op_projects: { slug: string } | null };
  return (data ?? [])
    .map((row) => (row as unknown as Row).op_projects?.slug)
    .filter((slug): slug is string => Boolean(slug));
}

export async function requestToJoinCommunity(
  userId: string,
  slug: string,
  locale: Locale,
): Promise<JoinCommunityOutcome> {
  const { data: member } = await supabaseAdmin
    .from("members")
    .select("id, full_name, first_name, last_name, email")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (!member) return { status: "error", message: "No member record." };

  const limit = await checkRateLimit("community-join", member.id as string, [
    { windowSeconds: 3600, max: 5 },
    { windowSeconds: 86_400, max: 10 },
  ]);
  if (!limit.allowed) return { status: "rate_limited" };

  const { data: project } = await supabaseAdmin
    .from("op_projects")
    .select("id, slug, name, name_de, name_fr, name_it, contact_email, is_active, is_community")
    .eq("slug", slug)
    .maybeSingle();
  if (!project || !project.is_active || !project.is_community) {
    return { status: "error", message: "Unknown community." };
  }

  // The member may only ask to join a community that covers their own service
  // area — the same rule that decided the card was shown to them.
  const { data: profile } = await supabaseAdmin
    .from("member_directory_profiles")
    .select("id")
    .eq("member_id", member.id)
    .maybeSingle();
  if (!profile) return { status: "error", message: "No profile." };
  const { data: regionRows } = await supabaseAdmin
    .from("member_profile_regions")
    .select("region_id")
    .eq("profile_id", profile.id);
  const regionIds = (regionRows ?? []).map((r) => r.region_id);
  if (!regionIds.length) return { status: "error", message: "No service regions selected." };
  const { data: covered } = await supabaseAdmin
    .from("op_project_regions")
    .select("project_id")
    .eq("project_id", project.id)
    .in("region_id", regionIds);
  if (!covered?.length) return { status: "error", message: "Community outside service area." };

  const since = new Date(Date.now() - DUPLICATE_WINDOW_DAYS * 86_400_000).toISOString();
  const { data: existing } = await supabaseAdmin
    .from("community_join_requests")
    .select("id")
    .eq("member_id", member.id)
    .eq("project_id", project.id)
    .gte("created_at", since)
    .maybeSingle();
  if (existing) return { status: "already" };

  const recipients = await leadRecipients(
    project.id as string,
    project.contact_email as string | null,
  );

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("community_join_requests")
    .insert({
      member_id: member.id as string,
      project_id: project.id as string,
      notified_emails: recipients,
    })
    .select("id")
    .single();
  if (insertError) return { status: "error", message: insertError.message };

  const memberName =
    (member.full_name ?? "").trim() ||
    [member.first_name, member.last_name].filter(Boolean).join(" ").trim();
  const communityName = localizedName(project, locale);

  const { sendTemplateEmail } = await import("./email-templates/send-email");
  for (const to of recipients) {
    try {
      await sendTemplateEmail("community-join-interest", to, {
        idempotencyKey: `community-join-${inserted.id}-${to}`,
        replyTo: (member.email as string | null) ?? undefined,
        templateData: {
          locale,
          communityName,
          memberName,
          memberEmail: member.email ?? "",
        },
      });
    } catch (err) {
      // A failed notification must not lose the recorded interest — staff can
      // still see the request in the database.
      console.error("[community-join] notification email failed", err);
    }
  }

  return { status: "sent" };
}

/** Lead addresses for a community, falling back to the community, then the office. */
async function leadRecipients(projectId: string, contactEmail: string | null): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("op_assignments")
    .select("members(email), op_project_roles(slug)")
    .eq("project_id", projectId);

  type Row = {
    members: { email: string | null } | null;
    op_project_roles: { slug: string } | null;
  };
  const leads = ((data ?? []) as unknown as Row[])
    .filter((row) => LEAD_SLUGS.includes(row.op_project_roles?.slug ?? ""))
    .map((row) => row.members?.email)
    .filter((email): email is string => Boolean(email));

  const unique = [...new Set(leads)];
  if (unique.length) return unique;
  if (contactEmail) return [contactEmail];
  return [OFFICE_EMAIL];
}
