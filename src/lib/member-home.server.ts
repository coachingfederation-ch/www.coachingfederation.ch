/**
 * Member Area landing data.
 *
 * Two things the landing page needs and nothing else can give it: the greeting
 * name from the ICF-mastered member record, and the local communities that
 * cover the regions this member has selected as their service area
 * (`member_profile_regions` -> `op_project_regions` -> `op_projects`).
 *
 * Contact details follow the same opt-in rule as every other public surface:
 * a lead's email is only ever returned when that lead set
 * `contact_email_public`. The community's own `contact_email` is chapter
 * data and always safe to show.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Locale } from "@/i18n/config";
import { localizedName } from "./team";

export type MemberHomeCommunityLead = {
  name: string;
  role: string;
  email: string | null;
};

export type MemberHomeCommunity = {
  slug: string;
  name: string;
  cadence: string | null;
  contactEmail: string | null;
  leads: MemberHomeCommunityLead[];
  /** True when this member already asked to join within the last 30 days. */
  requested: boolean;
};

export type MemberHomeData = {
  /** Preferred greeting name; empty when the member record carries no name. */
  firstName: string;
  hasProfile: boolean;
  /** True when the member has not picked any service regions yet. */
  noRegions: boolean;
  communities: MemberHomeCommunity[];
};

/** Role slugs that count as "someone to contact" for a community. */
const LEAD_SLUGS = ["lead", "president", "president-elect", "co-lead"];

const localizedNote = (
  row: {
    cadence_note: string | null;
    cadence_note_de: string | null;
    cadence_note_fr: string | null;
    cadence_note_it: string | null;
  },
  locale: Locale,
) => {
  if (locale === "de") return row.cadence_note_de || row.cadence_note;
  if (locale === "fr") return row.cadence_note_fr || row.cadence_note;
  if (locale === "it") return row.cadence_note_it || row.cadence_note;
  return row.cadence_note;
};

export async function loadMemberHome(
  userId: string,
  locale: Locale,
): Promise<MemberHomeData | null> {
  const { data: member, error } = await supabaseAdmin
    .from("members")
    .select("id, first_name, full_name")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!member) return null;

  const firstName = (member.first_name || (member.full_name ?? "").split(" ")[0] || "").trim();

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("member_directory_profiles")
    .select("id")
    .eq("member_id", member.id)
    .maybeSingle();
  if (profileError) throw profileError;

  const base: MemberHomeData = {
    firstName,
    hasProfile: !!profile,
    noRegions: true,
    communities: [],
  };
  if (!profile) return base;

  const { data: regionRows, error: regionError } = await supabaseAdmin
    .from("member_profile_regions")
    .select("region_id")
    .eq("profile_id", profile.id);
  if (regionError) throw regionError;
  const regionIds = (regionRows ?? []).map((r) => r.region_id);
  if (!regionIds.length) return base;
  base.noRegions = false;

  const { data: linkRows, error: linkError } = await supabaseAdmin
    .from("op_project_regions")
    .select("project_id")
    .in("region_id", regionIds);
  if (linkError) throw linkError;
  const projectIds = [...new Set((linkRows ?? []).map((r) => r.project_id))];
  if (!projectIds.length) return base;

  const { data: projects, error: projectError } = await supabaseAdmin
    .from("op_projects")
    .select(
      "id, slug, name, name_de, name_fr, name_it, sort_order, contact_email, cadence_note, cadence_note_de, cadence_note_fr, cadence_note_it",
    )
    .in("id", projectIds)
    .eq("is_active", true)
    .eq("is_community", true)
    .order("sort_order", { ascending: true });
  if (projectError) throw projectError;
  type ProjectRow = {
    id: string;
    slug: string;
    name: string;
    name_de: string | null;
    name_fr: string | null;
    name_it: string | null;
    contact_email: string | null;
    cadence_note: string | null;
    cadence_note_de: string | null;
    cadence_note_fr: string | null;
    cadence_note_it: string | null;
  };
  const rows = (projects ?? []) as unknown as ProjectRow[];
  if (!rows.length) return base;

  // Leads, resolved in one round trip for all matched communities.
  const { data: assignments, error: assignError } = await supabaseAdmin
    .from("op_assignments")
    .select(
      "project_id, sort_order, members(full_name, email, member_directory_profiles(contact_email_public)), op_project_roles(slug, name, name_de, name_fr, name_it)",
    )
    .in(
      "project_id",
      rows.map((p) => p.id),
    )
    .order("sort_order", { ascending: true });
  if (assignError) throw assignError;

  type AssignRow = {
    project_id: string;
    members: {
      full_name: string | null;
      email: string | null;
      member_directory_profiles?: { contact_email_public: boolean }[] | null;
    } | null;
    op_project_roles: {
      slug: string;
      name: string;
      name_de: string | null;
      name_fr: string | null;
      name_it: string | null;
    } | null;
  };

  const byProject = new Map<string, MemberHomeCommunityLead[]>();
  for (const raw of (assignments ?? []) as unknown as AssignRow[]) {
    const slug = raw.op_project_roles?.slug ?? "";
    if (!LEAD_SLUGS.includes(slug)) continue;
    const name = raw.members?.full_name?.trim();
    if (!name) continue;
    const optedIn = (raw.members?.member_directory_profiles ?? []).some(
      (p) => p.contact_email_public,
    );
    const list = byProject.get(raw.project_id) ?? [];
    list.push({
      name,
      role: raw.op_project_roles ? localizedName(raw.op_project_roles, locale) : "",
      email: optedIn ? (raw.members?.email ?? null) : null,
    });
    byProject.set(raw.project_id, list);
  }

  // Join requests the member already sent, so the button comes back in its
  // confirmed state after a reload rather than inviting a duplicate mail.
  const { listJoinedCommunitySlugs } = await import("./community-join.server");
  const requested = new Set(await listJoinedCommunitySlugs(member.id as string));

  base.communities = rows.map((p) => ({
    slug: p.slug,
    name: localizedName(p, locale),
    cadence: localizedNote(p, locale),
    contactEmail: p.contact_email,
    leads: byProject.get(p.id) ?? [],
    requested: requested.has(p.slug),
  }));
  return base;
}
