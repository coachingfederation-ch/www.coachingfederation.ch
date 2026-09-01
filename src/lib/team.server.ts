/**
 * Server-only read helpers for the operational-structure surfaces (public team
 * page and the local communities pages).
 *
 * Both surfaces need the exact same member shape — signed photo, translated
 * volunteer bio, localized project/role labels, opt-in contact channels — so
 * the mapping lives here once and `team.functions.ts` /
 * `communities.functions.ts` both call it. Reads go through
 * `team_directory_public` / `team_projects_public`, which are the safety
 * boundary: no phone, no membership data, email only when opted in.
 */
import type { Locale } from "@/i18n/config";
import { initialsOf, localizedName, type TeamMember, type TeamProject } from "./team";
import { resolveProfileLocale } from "./member-translations";

type RawAssignment = {
  project_slug: string;
  project_name: string;
  project_name_de: string | null;
  project_name_fr: string | null;
  project_name_it: string | null;
  project_sort_order: number;
  role_name: string;
  role_name_de: string | null;
  role_name_fr: string | null;
  role_name_it: string | null;
  sort_order: number;
};

export type PublicProjectRow = {
  id: string;
  slug: string;
  name: string;
  name_de: string | null;
  name_fr: string | null;
  name_it: string | null;
  sort_order: number;
  is_community: boolean;
  is_featured_community: boolean;
  description: string | null;
  description_de: string | null;
  description_fr: string | null;
  description_it: string | null;
  cadence_note: string | null;
  cadence_note_de: string | null;
  cadence_note_fr: string | null;
  cadence_note_it: string | null;
  contact_email: string | null;
  signup_url: string | null;
  language_slugs: string[] | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  image_source: string | null;
  image_credit_name: string | null;
  image_credit_url: string | null;
};

export const PUBLIC_PROJECT_COLUMNS =
  "id, slug, name, name_de, name_fr, name_it, sort_order, is_community, is_featured_community, description, description_de, description_fr, description_it, cadence_note, cadence_note_de, cadence_note_fr, cadence_note_it, contact_email, signup_url, language_slugs, cover_image_url, cover_image_alt, image_source, image_credit_name, image_credit_url";

/** Every active project, in admin sort order. */
export async function loadPublicProjects(): Promise<PublicProjectRow[]> {
  const { publicSupabaseClient } = await import("./supabase-public.server");
  const { data, error } = await publicSupabaseClient()
    .from("team_projects_public")
    .select(PUBLIC_PROJECT_COLUMNS)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PublicProjectRow[];
}

/** Every volunteer with at least one assignment, resolved for `locale`. */
export async function loadTeamMembers(locale: Locale): Promise<TeamMember[]> {
  const { publicSupabaseClient } = await import("./supabase-public.server");
  const { signProfileImages } = await import("./storage.server");

  const { data, error } = await publicSupabaseClient()
    .from("team_directory_public")
    .select("*")
    .order("primary_sort_order", { ascending: true })
    .order("full_name", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as Record<string, unknown>[];
  const signed = await signProfileImages(
    rows
      .map((r) => r.profile_image_path as string | null)
      .filter((p): p is string => typeof p === "string" && !!p),
  );

  return rows.map((row) => {
    const localized = resolveProfileLocale(row as never, locale) as unknown as Record<
      string,
      unknown
    >;
    const name = (row.full_name as string | null) ?? "";
    const path = row.profile_image_path as string | null;
    const assignments = ((row.assignments as RawAssignment[] | null) ?? []).map((a) => ({
      projectSlug: a.project_slug,
      project: localizedName(
        {
          name: a.project_name,
          name_de: a.project_name_de,
          name_fr: a.project_name_fr,
          name_it: a.project_name_it,
        },
        locale,
      ),
      role: localizedName(
        {
          name: a.role_name,
          name_de: a.role_name_de,
          name_fr: a.role_name_fr,
          name_it: a.role_name_it,
        },
        locale,
      ),
    }));

    return {
      memberId: row.member_id as string,
      profileId: row.profile_id as string,
      name,
      initials: initialsOf(name),
      imageUrl: path ? (signed.get(path) ?? null) : null,
      bio: (localized.team_bio as string | null) ?? null,
      linkedinUrl: (row.linkedin_url as string | null) ?? null,
      email: (row.contact_email as string | null) ?? null,
      coachProfileId: (row.public_coach_profile_id as string | null) ?? null,
      assignments,
    } satisfies TeamMember;
  });
}

/** Filter pills: only projects that actually have someone in them. */
export function usedProjects(
  projects: PublicProjectRow[],
  members: TeamMember[],
  locale: Locale,
): TeamProject[] {
  const used = new Set(members.flatMap((m) => m.assignments.map((a) => a.projectSlug)));
  return projects
    .filter((p) => used.has(p.slug))
    .map((p) => ({ slug: p.slug, label: localizedName(p, locale), isCommunity: p.is_community }));
}
