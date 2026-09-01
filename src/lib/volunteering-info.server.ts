/**
 * Volunteering page data.
 *
 * Resolves the Volunteering project from the operational structure, the
 * assigned director (if any) with their opt-in contact details, and any upcoming
 * volunteer onboarding events. Everything is read-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Locale } from "@/i18n/config";
import { localizedName } from "./team";
import { formatEventDate, formatEventTimeRange } from "./events";

export type VolunteerDirector = {
  name: string;
  role: string;
  email: string;
};

export type VolunteerOnboardingEvent = {
  id: string;
  slug: string;
  title: string;
  date: string;
  timeRange: string;
  url: string;
};

export type VolunteeringInfo = {
  projectName: string;
  /** Best available contact email for the volunteering project. */
  contactEmail: string;
  /** Only returned when a lead has opted in to public contact. */
  director: VolunteerDirector | null;
  onboardingEvents: VolunteerOnboardingEvent[];
};

const LEAD_SLUGS = ["lead", "president", "president-elect", "co-lead"];

const FALLBACK_EMAIL = "office@coachingfederation.ch";

export async function loadVolunteeringInfo(
  _userId: string,
  locale: Locale,
): Promise<VolunteeringInfo> {
  const { data: project, error: projectError } = await supabaseAdmin
    .from("op_projects")
    .select("id, name, name_de, name_fr, name_it, contact_email, public_contact_email")
    .eq("slug", "volunteering")
    .eq("is_active", true)
    .maybeSingle();
  if (projectError) throw projectError;

  const projectName = project ? localizedName(project, locale) : "Volunteering";
  const contactEmail = project?.public_contact_email || project?.contact_email || FALLBACK_EMAIL;

  let director: VolunteerDirector | null = null;

  if (project) {
    const { data: assignments, error: assignError } = await supabaseAdmin
      .from("op_assignments")
      .select(
        "project_id, sort_order, members(full_name, email, member_directory_profiles(contact_email_public)), op_project_roles(slug, name, name_de, name_fr, name_it)",
      )
      .eq("project_id", project.id)
      .order("sort_order", { ascending: true });
    if (assignError) throw assignError;

    type AssignRow = {
      project_id: string;
      members: {
        full_name: string | null;
        email: string | null;
        member_directory_profiles?:
          | { contact_email_public: boolean }[]
          | { contact_email_public: boolean }
          | null;
      } | null;
      op_project_roles: {
        slug: string;
        name: string;
        name_de: string | null;
        name_fr: string | null;
        name_it: string | null;
      } | null;
    };

    for (const raw of (assignments ?? []) as unknown as AssignRow[]) {
      const slug = raw.op_project_roles?.slug ?? "";
      if (!LEAD_SLUGS.includes(slug)) continue;
      const name = raw.members?.full_name?.trim();
      if (!name) continue;
      const optedIn = (raw.members?.member_directory_profiles ?? []).some(
        (p) => p.contact_email_public,
      );
      if (!optedIn || !raw.members?.email) continue;
      director = {
        name,
        role: raw.op_project_roles ? localizedName(raw.op_project_roles, locale) : "",
        email: raw.members.email,
      };
      break;
    }
  }

  const { data: eventRows, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id, slug, title, starts_at, ends_at, timezone")
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .ilike("title", "%Volunteer onboarding%")
    .order("starts_at", { ascending: true })
    .limit(5);
  if (eventError) throw eventError;

  const eventIds = (eventRows ?? []).map((e) => e.id);
  let titleById = new Map<string, string>();
  if (eventIds.length) {
    const { data: translations, error: trError } = await supabaseAdmin
      .from("event_translations")
      .select("event_id, title")
      .in("event_id", eventIds)
      .eq("locale", locale);
    if (trError) throw trError;
    titleById = new Map(
      (translations ?? []).map((t) => [t.event_id, t.title]).filter(([, t]) => !!t) as [
        string,
        string,
      ][],
    );
  }

  const onboardingEvents: VolunteerOnboardingEvent[] = (eventRows ?? []).map((e) => {
    const tz = e.timezone || "Europe/Zurich";
    return {
      id: e.id,
      slug: e.slug,
      title: titleById.get(e.id) || e.title,
      date: formatEventDate(e.starts_at, locale, tz),
      timeRange: formatEventTimeRange(e.starts_at, e.ends_at, locale, tz),
      url: `/events/${e.slug}`,
    };
  });

  return {
    projectName,
    contactEmail,
    director,
    onboardingEvents,
  };
}
