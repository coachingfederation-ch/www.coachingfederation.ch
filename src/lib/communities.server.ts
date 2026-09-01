/**
 * Server-only assembly of the public community payloads.
 *
 * Kept out of `*.functions.ts` module scope on purpose: that scope is bundled
 * for the browser, and this file reaches for the server Supabase client.
 */
import type { Locale } from "@/i18n/config";
import { localizedName, type TeamMember } from "./team";
import type { CommunityDetail, CommunitySummary } from "./communities";
import type { PublicProjectRow } from "./team.server";

function localizedText(
  row: PublicProjectRow,
  field: "description" | "cadence_note",
  locale: Locale,
): string | null {
  const pick = (value: string | null | undefined) => (value && value.trim() ? value : null);
  if (locale === "de") return pick(row[`${field}_de`]) ?? pick(row[field]);
  if (locale === "fr") return pick(row[`${field}_fr`]) ?? pick(row[field]);
  if (locale === "it") return pick(row[`${field}_it`]) ?? pick(row[field]);
  return pick(row[field]);
}

/** slug -> localized label for the language chips. */
async function languageLabels(locale: Locale): Promise<Map<string, string>> {
  const { publicSupabaseClient } = await import("./supabase-public.server");
  const { data } = await publicSupabaseClient()
    .from("cf_languages")
    .select("slug, name, name_de, name_fr, name_it")
    .eq("is_active", true);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.slug as string, localizedName(row as never, locale));
  }
  return map;
}

function membersOf(members: TeamMember[], slug: string): TeamMember[] {
  return members
    .filter((m) => m.assignments.some((a) => a.projectSlug === slug))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function buildCommunities(locale: Locale): Promise<CommunitySummary[]> {
  const { loadPublicProjects, loadTeamMembers } = await import("./team.server");
  const [projects, members, languages] = await Promise.all([
    loadPublicProjects(),
    loadTeamMembers(locale),
    languageLabels(locale),
  ]);

  return projects
    .filter((p) => p.is_community)
    .map((p) => {
      const mine = membersOf(members, p.slug);
      return {
        slug: p.slug,
        name: localizedName(p, locale),
        description: localizedText(p, "description", locale),
        cadence: localizedText(p, "cadence_note", locale),
        contactEmail: p.contact_email,
        signupUrl: p.signup_url,
        languages: (p.language_slugs ?? []).map((s) => languages.get(s) ?? s),
        isFeatured: p.is_featured_community,
        coverImageUrl: p.cover_image_url,
        coverImageAlt: p.cover_image_alt,
        imageSource: p.image_source,
        imageCreditName: p.image_credit_name,
        imageCreditUrl: p.image_credit_url,
        memberCount: mine.length,
        preview: mine.slice(0, 5),
      } satisfies CommunitySummary;
    });
}

export async function buildCommunityDetail(
  slug: string,
  locale: Locale,
): Promise<CommunityDetail | null> {
  const { loadPublicProjects, loadTeamMembers } = await import("./team.server");
  const [projects, members, languages] = await Promise.all([
    loadPublicProjects(),
    loadTeamMembers(locale),
    languageLabels(locale),
  ]);
  const project = projects.find((p) => p.slug === slug && p.is_community);
  if (!project) return null;
  const mine = membersOf(members, slug);

  return {
    slug: project.slug,
    name: localizedName(project, locale),
    description: localizedText(project, "description", locale),
    cadence: localizedText(project, "cadence_note", locale),
    contactEmail: project.contact_email,
    signupUrl: project.signup_url,
    languages: (project.language_slugs ?? []).map((s) => languages.get(s) ?? s),
    isFeatured: project.is_featured_community,
    coverImageUrl: project.cover_image_url,
    coverImageAlt: project.cover_image_alt,
    imageSource: project.image_source,
    imageCreditName: project.image_credit_name,
    imageCreditUrl: project.image_credit_url,
    memberCount: mine.length,
    members: mine,
  } satisfies CommunityDetail;
}
