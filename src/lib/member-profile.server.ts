/**
 * Member Area — a member editing their own directory profile.
 *
 * Source-of-truth split (same rule as the admin screen, from the other side):
 *  - Imported ICF identity (name, credential, membership dates) is read-only
 *    here; it is replaced wholesale on every sync.
 *  - Local portal data (tagline, description, service-area regions, languages,
 *    formats, specialisations, availability, links, photo, publication) is
 *    owned by the member.
 *  - Accreditation flags (`mentor_accredited`, `supervision_accredited`) stay
 *    staff-maintained: a member may only toggle *availability*, never
 *    accreditation.
 *
 * Every function resolves the member from the authenticated user id, never
 * from client input, so a caller can only ever reach their own record.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  directoryEligibilityReason,
  isDirectoryEligible,
  publishBlockReason,
  type MemberVisibility,
} from "./directory-eligibility";

export const DESCRIPTION_MAX = 3000;
export const TAGLINE_MAX = 160;
export const LINKS_MAX = 6;
/** Longer free-text practice fields (approach, qualifications, fees). */
export const RICH_TEXT_MAX = 2000;
/** One-line notes (session length, availability, response time). */
export const NOTE_MAX = 120;
export const QUOTE_MAX = 400;

export type MemberProfileLink = {
  id: string;
  link_type: "website" | "linkedin" | "other";
  label: string | null;
  url: string;
  sort_order: number;
};

/**
 * Facet join tables are addressed by a name known only at runtime, which the
 * generated Supabase types can't resolve. This is the narrow slice of the
 * query builder those calls actually use — enough to stay type-checked
 * without falling back to `any`.
 */
type FacetError = { message: string } | null;
type FacetTable = {
  select: (columns: string) => {
    eq: (
      column: string,
      value: string,
    ) => PromiseLike<{ data: Record<string, string>[] | null; error: FacetError }>;
  };
  delete: () => {
    eq: (column: string, value: string) => PromiseLike<{ error: FacetError }>;
  };
  insert: (rows: Record<string, string>[]) => PromiseLike<{ error: FacetError }>;
};

const facetTable = (table: string) => supabaseAdmin.from(table as never) as unknown as FacetTable;

export type MyMemberProfile = {
  member: {
    id: string;
    cst_recno: string;
    full_name: string | null;
    email: string | null;
    city: string | null;
    country: string | null;
    credential_slug: string | null;
    credential_expires_on: string | null;
    membership_expiration_date: string | null;
    activity_state: string;
  };
  eligibility: { eligible: boolean; reason: string };
  profile: {
    id: string;
    visibility: MemberVisibility;
    tagline: string | null;
    description: string | null;
    profile_image_path: string | null;
    availability_slug: string | null;
    coaching_available: boolean;
    mentoring_available: boolean;
    supervision_available: boolean;
    mentor_accredited: boolean;
    supervision_accredited: boolean;
    booking_url: string | null;
    contact_email_public: boolean;
    response_time_note: string | null;
    approach: string | null;
    qualifications: string | null;
    experience_band: string | null;
    session_length_note: string | null;
    fees_note: string | null;
    availability_note: string | null;
    testimonial_quote: string | null;
    testimonial_attribution: string | null;
    /** Volunteer bio for the public team page (operational structure). */
    team_bio: string | null;
    region_ids: string[];
    language_ids: string[];
    format_ids: string[];
    specialisation_ids: string[];
    client_type_ids: string[];
    links: MemberProfileLink[];
  } | null;
};

const MEMBER_COLUMNS =
  "id, cst_recno, full_name, email, city, country, credential_slug, credential_expires_on, membership_expiration_date, activity_state";

const PROFILE_COLUMNS =
  "id, visibility, tagline, description, profile_image_path, availability_slug, coaching_available, mentoring_available, supervision_available, mentor_accredited, supervision_accredited, booking_url, contact_email_public, response_time_note, approach, qualifications, experience_band, session_length_note, fees_note, availability_note, testimonial_quote, testimonial_attribution, team_bio";

const JOINS = [
  { table: "member_profile_regions", column: "region_id", key: "region_ids" },
  { table: "member_profile_languages", column: "language_id", key: "language_ids" },
  { table: "member_profile_formats", column: "format_id", key: "format_ids" },
  {
    table: "member_profile_specialisations",
    column: "specialisation_id",
    key: "specialisation_ids",
  },
  { table: "member_profile_client_types", column: "client_type_id", key: "client_type_ids" },
] as const;

/** The member record bound to this auth account, or null when unbound. */
async function resolveMember(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("members")
    .select(MEMBER_COLUMNS)
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadMyMemberProfile(userId: string): Promise<MyMemberProfile | null> {
  const member = await resolveMember(userId);
  if (!member) return null;

  const { data: profile, error } = await supabaseAdmin
    .from("member_directory_profiles")
    .select(PROFILE_COLUMNS)
    .eq("member_id", member.id)
    .maybeSingle();
  if (error) throw error;

  let facets: Record<string, string[]> = {
    region_ids: [],
    language_ids: [],
    format_ids: [],
    specialisation_ids: [],
    client_type_ids: [],
  };
  let links: MemberProfileLink[] = [];

  if (profile) {
    const results = await Promise.all(
      JOINS.map((join) => facetTable(join.table).select(join.column).eq("profile_id", profile.id)),
    );
    facets = Object.fromEntries(
      JOINS.map((join, i) => {
        const res = results[i]!;
        if (res.error) throw res.error;
        return [join.key, (res.data ?? []).map((row) => row[join.column] as string)];
      }),
    ) as typeof facets;

    const { data: linkRows, error: linkError } = await supabaseAdmin
      .from("member_profile_websites")
      .select("id, link_type, label, url, sort_order")
      .eq("profile_id", profile.id)
      .order("sort_order", { ascending: true });
    if (linkError) throw linkError;
    links = (linkRows ?? []) as MemberProfileLink[];
  }

  const { directoryRules } = await import("./directory-config.server");
  const rules = await directoryRules();

  return {
    member: member as MyMemberProfile["member"],
    eligibility: {
      eligible: isDirectoryEligible(member, rules),
      reason: directoryEligibilityReason(member, rules),
    },
    profile: profile
      ? ({ ...profile, ...facets, links } as unknown as MyMemberProfile["profile"])
      : null,
  };
}

export type MyProfileUpdate = {
  tagline?: string | null;
  description?: string | null;
  availability_slug?: string | null;
  coaching_available?: boolean;
  mentoring_available?: boolean;
  supervision_available?: boolean;
  visibility?: "draft" | "published";
  profile_image_path?: string | null;
  booking_url?: string | null;
  contact_email_public?: boolean;
  response_time_note?: string | null;
  approach?: string | null;
  qualifications?: string | null;
  experience_band?: string | null;
  session_length_note?: string | null;
  fees_note?: string | null;
  availability_note?: string | null;
  testimonial_quote?: string | null;
  testimonial_attribution?: string | null;
  team_bio?: string | null;
  region_ids?: string[];
  language_ids?: string[];
  format_ids?: string[];
  specialisation_ids?: string[];
  client_type_ids?: string[];
  links?: { link_type: "website" | "linkedin" | "other"; label?: string | null; url: string }[];
};

/** Plain text only: strip control characters and hard-cap the length. */
function cleanText(value: string | null | undefined, max: number): string | null {
  if (value == null) return null;
  // Control characters are the point: this strips them out of pasted text.
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

async function replaceFacet(profileId: string, table: string, column: string, ids: string[]) {
  const client = facetTable(table);
  const { error } = await client.delete().eq("profile_id", profileId);
  if (error) throw error;
  if (!ids.length) return;
  const { error: insertError } = await client.insert(
    ids.map((id) => ({ profile_id: profileId, [column]: id })),
  );
  if (insertError) throw insertError;
}

export async function updateMyMemberProfile(
  userId: string,
  input: MyProfileUpdate,
): Promise<MyMemberProfile> {
  const member = await resolveMember(userId);
  if (!member) throw new Error("No member record is linked to this account.");

  const { data: profile, error } = await supabaseAdmin
    .from("member_directory_profiles")
    .select("id, visibility")
    .eq("member_id", member.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new Error("This member has no directory profile yet.");

  const patch: Record<string, unknown> = {};
  if (input.tagline !== undefined) patch.tagline = cleanText(input.tagline, TAGLINE_MAX);
  if (input.description !== undefined)
    patch.description = cleanText(input.description, DESCRIPTION_MAX);
  if (input.availability_slug !== undefined)
    patch.availability_slug = input.availability_slug || null;
  if (input.coaching_available !== undefined) patch.coaching_available = input.coaching_available;
  if (input.mentoring_available !== undefined)
    patch.mentoring_available = input.mentoring_available;
  if (input.supervision_available !== undefined) {
    patch.supervision_available = input.supervision_available;
  }

  // Optional "practice detail" fields. All are plain text, cleaned and capped
  // exactly like tagline/description; none of them affect eligibility.
  if (input.approach !== undefined) patch.approach = cleanText(input.approach, RICH_TEXT_MAX);
  if (input.qualifications !== undefined) {
    patch.qualifications = cleanText(input.qualifications, RICH_TEXT_MAX);
  }
  if (input.fees_note !== undefined) patch.fees_note = cleanText(input.fees_note, RICH_TEXT_MAX);
  if (input.session_length_note !== undefined) {
    patch.session_length_note = cleanText(input.session_length_note, NOTE_MAX);
  }
  if (input.availability_note !== undefined) {
    patch.availability_note = cleanText(input.availability_note, NOTE_MAX);
  }
  if (input.response_time_note !== undefined) {
    patch.response_time_note = cleanText(input.response_time_note, NOTE_MAX);
  }
  if (input.experience_band !== undefined) {
    // Bands are chapter-managed vocabulary rows, so accept only an active slug.
    const slug = (input.experience_band ?? "").trim();
    if (slug) {
      const { data: band, error: bandError } = await supabaseAdmin
        .from("cf_experience_bands")
        .select("slug")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (bandError) throw bandError;
      if (!band) throw new Error("Unknown experience band.");
    }
    patch.experience_band = slug || null;
  }
  if (input.testimonial_quote !== undefined) {
    patch.testimonial_quote = cleanText(input.testimonial_quote, QUOTE_MAX);
  }
  if (input.testimonial_attribution !== undefined) {
    patch.testimonial_attribution = cleanText(input.testimonial_attribution, NOTE_MAX);
  }
  // Volunteer bio: only surfaced on the public team page, and only for members
  // who actually hold an operational-structure assignment.
  if (input.team_bio !== undefined) patch.team_bio = cleanText(input.team_bio, RICH_TEXT_MAX);
  if (input.contact_email_public !== undefined) {
    // Opt-in only: the public view reveals the ICF-held email solely when
    // this flag is true, so it is the member's own consent switch.
    patch.contact_email_public = input.contact_email_public;
  }
  if (input.booking_url !== undefined) {
    const url = (input.booking_url ?? "").trim();
    if (url && !/^https:\/\/\S{3,250}$/i.test(url))
      throw new Error("Booking link must start with https://.");
    patch.booking_url = url || null;
  }

  if (input.profile_image_path !== undefined) {
    // The path must live inside this member's own storage folder.
    const path = input.profile_image_path;
    if (path && !path.startsWith(`${member.id}/`)) throw new Error("Invalid image path.");
    patch.profile_image_path = path || null;
  }

  if (input.visibility !== undefined) {
    // System states (hidden_*) are never reachable from the Member Area, and a
    // member cannot publish an ineligible or region-less profile. The database
    // trigger enforces eligibility again as the real boundary.
    if (input.visibility === "published") {
      // Region count comes from this same request when the caller is also
      // replacing the facet, otherwise from what is already stored.
      let regionCount = input.region_ids?.length;
      if (regionCount === undefined) {
        const { count } = await supabaseAdmin
          .from("member_profile_regions")
          .select("region_id", { count: "exact", head: true })
          .eq("profile_id", profile.id);
        regionCount = count ?? 0;
      }
      const { directoryRules } = await import("./directory-config.server");
      const blocked = publishBlockReason({
        eligible: isDirectoryEligible(member, await directoryRules()),
        regionCount,
      });
      if (blocked === "ineligible") throw new Error("Not directory-eligible.");
      if (blocked === "no_region") throw new Error("Select at least one service area.");
    }
    const current = profile.visibility as string;
    // Only draft <-> published are member-controlled; a staff suppression
    // (hidden_admin) or a system demotion must not be silently overwritten.
    if (current === "draft" || current === "published") patch.visibility = input.visibility;
  }

  if (Object.keys(patch).length) {
    const { error: updateError } = await supabaseAdmin
      .from("member_directory_profiles")
      .update(patch as never)
      .eq("id", profile.id);
    if (updateError) throw updateError;
  }

  for (const join of JOINS) {
    const ids = input[join.key];
    if (ids) await replaceFacet(profile.id, join.table, join.column, ids);
  }

  if (input.links) {
    const rows = input.links
      .filter((link) => /^https:\/\/\S{3,250}$/i.test(link.url.trim()))
      .slice(0, LINKS_MAX)
      .map((link, index) => ({
        profile_id: profile.id,
        link_type: link.link_type,
        label: cleanText(link.label ?? null, 80),
        url: link.url.trim(),
        sort_order: index,
      }));
    const { error: deleteError } = await supabaseAdmin
      .from("member_profile_websites")
      .delete()
      .eq("profile_id", profile.id);
    if (deleteError) throw deleteError;
    if (rows.length) {
      const { error: insertError } = await supabaseAdmin
        .from("member_profile_websites")
        .insert(rows as never);
      if (insertError) throw insertError;
    }
  }

  const next = await loadMyMemberProfile(userId);
  if (!next) throw new Error("Profile reload failed.");
  return next;
}
