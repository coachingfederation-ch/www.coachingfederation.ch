/**
 * Staff event management.
 *
 * Every write runs through `context.supabase` — the caller's own RLS-scoped
 * client — so "organizers touch only their own events, editors touch all" is
 * decided by the database policies, not by this file. `assertOrganizer` is
 * only a fast, legible fail for accounts with no event rights at all.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertOrganizer } from "./authz";
import { MAX_EVENT_HOSTS } from "./event-hosts";
import { HERO_MARK_LIMIT } from "./hero-design";
import { expandRecurrence, occurrenceSlug, RECURRENCE_FREQUENCIES } from "./recurrence";

const LIST_COLUMNS =
  "id, series_id, slug, title, summary, language, status, starts_at, ends_at, timezone, location_mode, venue_name, city, capacity, is_featured, is_internal, category_id, region_id, organizer_id, updated_at";

const EDIT_COLUMNS = `${LIST_COLUMNS}, community_id, series_id, recurrence, description, image_url, image_credit_name, image_credit_url, online_url, map_location, registration_mode, registration_opens_at, registration_closes_at, guest_registration_allowed, practical_notes, published_at, content_updated_at, hero_marks, cce_enabled`;

/** One row of the staff events list, enriched with filterable labels. */
export type ListedEvent = {
  id: string;
  series_id: string | null;
  slug: string;
  title: string;
  summary: string | null;
  language: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string | null;
  location_mode: string;
  venue_name: string | null;
  city: string | null;
  capacity: number | null;
  is_featured: boolean;
  is_internal: boolean;
  category_id: string | null;
  region_id: string | null;
  community_id: string | null;
  organizer_id: string | null;
  updated_at: string | null;
  category_name: string | null;
  community_name: string | null;
  hosts: { id: string; name: string }[];
};

const recurrenceRule = z.object({
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  interval: z.number().int().min(1).max(8),
  endMode: z.enum(["count", "until"]),
  count: z.number().int().min(2).max(61).nullable().optional(),
  until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

const heroMarkSchema = z.object({
  id: z.string().max(80),
  name: z.string().max(40),
  xPct: z.number(),
  yPct: z.number(),
  sizePct: z.number(),
  color: z.string().max(20),
});

const eventInput = z.object({
  title: z.string().trim().min(3).max(200),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens."),
  summary: z.string().trim().max(400).nullable().optional(),
  description: z.string().trim().max(20000).nullable().optional(),
  language: z.enum(["en", "de", "fr", "it"]),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1).nullable().optional(),
  timezone: z.string().min(1).max(60).default("Europe/Zurich"),
  location_mode: z.enum(["in_person", "online", "hybrid"]),
  venue_name: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  online_url: z.string().trim().url().max(500).nullable().optional().or(z.literal("")),
  // Free-form: either a plain address ("Bahnhofstrasse 1, Zürich") or a pasted
  // map link. The public page turns whichever it is into an embedded map.
  map_location: z.string().trim().max(1000).nullable().optional().or(z.literal("")),
  image_url: z.string().trim().url().max(1000).nullable().optional().or(z.literal("")),
  // Unsplash attribution travels with the picked image; a hand-pasted URL
  // simply leaves both blank.
  image_credit_name: z.string().trim().max(200).nullable().optional().or(z.literal("")),
  image_credit_url: z.string().trim().url().max(1000).nullable().optional().or(z.literal("")),
  capacity: z.number().int().positive().max(100000).nullable().optional(),
  registration_mode: z.enum(["none", "rsvp", "rsvp_members", "rsvp_tickets", "rsvp_invited"]),
  registration_opens_at: z.string().min(1).nullable().optional(),
  registration_closes_at: z.string().min(1).nullable().optional(),
  guest_registration_allowed: z.boolean(),
  // Door and joining information, repeated in the reminder emails.
  practical_notes: z.string().trim().max(2000).nullable().optional(),
  is_featured: z.boolean(),
  // Audience marker: the event is aimed at members (onboarding, engagement).
  is_internal: z.boolean().optional(),
  category_id: z.string().uuid().nullable().optional(),
  region_id: z.string().uuid().nullable().optional(),
  // Community events name the local community that runs them; other
  // categories use the region facet instead.
  community_id: z.string().uuid().nullable().optional(),
  // Hand-placed brush marks for the hero (percentage geometry).
  hero_marks: z.array(heroMarkSchema).max(HERO_MARK_LIMIT).nullable().optional(),
});

/** Empty strings from the form mean "unset", not "the empty string". */
function normalize(input: z.infer<typeof eventInput>) {
  const blankToNull = <T>(v: T | "" | null | undefined) => (v === "" || v === undefined ? null : v);
  return {
    ...input,
    summary: blankToNull(input.summary),
    description: blankToNull(input.description),
    ends_at: blankToNull(input.ends_at),
    venue_name: blankToNull(input.venue_name),
    city: blankToNull(input.city),
    online_url: blankToNull(input.online_url),
    map_location: blankToNull(input.map_location),
    image_url: blankToNull(input.image_url),
    image_credit_name: blankToNull(input.image_credit_name),
    image_credit_url: blankToNull(input.image_credit_url),
    capacity: input.capacity ?? null,
    practical_notes: blankToNull(input.practical_notes),
    is_internal: input.is_internal ?? false,
    category_id: input.category_id ?? null,
    region_id: input.region_id ?? null,
    community_id: input.community_id ?? null,
    hero_marks: input.hero_marks ?? null,
    registration_opens_at: blankToNull(input.registration_opens_at),
    registration_closes_at: blankToNull(input.registration_closes_at),
  };
}

/** Events the caller may manage (RLS narrows organizers to their own). */
export const listCommunityOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOrganizer(context);
    const { data, error } = await context.supabase
      .from("op_projects")
      .select("id, name")
      .eq("is_community", true)
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; name: string }[];
  });

export const listManagedEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOrganizer(context);
    const { data, error } = await context.supabase
      .from("events")
      .select(`${LIST_COLUMNS}, community_id`)
      .order("starts_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as (Record<string, unknown> & {
      id: string;
      category_id: string | null;
      community_id: string | null;
    })[];
    if (rows.length === 0) return [] as ListedEvent[];

    // Labels and hosts are resolved separately: embedded selects would be
    // filtered by the caller's RLS on the related tables, which is not what a
    // staff listing needs.
    const { publicSupabaseClient } = await import("./supabase-public.server");
    const pub = publicSupabaseClient();

    const categoryIds = [...new Set(rows.map((r) => r.category_id).filter(Boolean))] as string[];
    const communityIds = [...new Set(rows.map((r) => r.community_id).filter(Boolean))] as string[];

    const [categories, communities, hostLinks] = await Promise.all([
      categoryIds.length
        ? pub.from("cf_event_categories").select("id, name").in("id", categoryIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      communityIds.length
        ? context.supabase.from("op_projects").select("id, name").in("id", communityIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      pub
        .from("event_hosts")
        .select("event_id, profile_id, sort_order")
        .in(
          "event_id",
          rows.map((r) => r.id),
        )
        .order("sort_order", { ascending: true }),
    ]);

    const categoryName = new Map(
      ((categories.data ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]),
    );
    const communityName = new Map(
      ((communities.data ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]),
    );

    const links = (hostLinks.data ?? []) as { event_id: string; profile_id: string }[];
    const profileIds = [...new Set(links.map((l) => l.profile_id))];
    const hostName = new Map<string, string>();
    if (profileIds.length) {
      const { data: profiles } = await pub
        .from("coach_directory_public")
        .select("profile_id, full_name")
        .in("profile_id", profileIds);
      for (const p of (profiles ?? []) as { profile_id: string; full_name: string | null }[]) {
        if (p.full_name) hostName.set(p.profile_id, p.full_name);
      }
    }
    const hostsByEvent = new Map<string, { id: string; name: string }[]>();
    for (const link of links) {
      const name = hostName.get(link.profile_id);
      if (!name) continue;
      const list = hostsByEvent.get(link.event_id) ?? [];
      list.push({ id: link.profile_id, name });
      hostsByEvent.set(link.event_id, list);
    }

    return rows.map((row) => ({
      ...row,
      category_name: row.category_id ? (categoryName.get(row.category_id) ?? null) : null,
      community_name: row.community_id ? (communityName.get(row.community_id) ?? null) : null,
      hosts: hostsByEvent.get(row.id) ?? [],
    })) as ListedEvent[];
  });

export const getManagedEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { data: row, error } = await context.supabase
      .from("events")
      .select(EDIT_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ?? null;
  });

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => eventInput.parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { data: row, error } = await context.supabase
      .from("events")
      // Ownership comes from the session, never from the request body.
      .insert({ ...normalize(data), organizer_id: context.userId, status: "draft" })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("That web address (slug) is already taken.");
      throw new Error(error.message);
    }
    return { id: row.id as string };
  });

export const updateEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => eventInput.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("events")
      .update(normalize(rest as z.infer<typeof eventInput>))
      .eq("id", id);
    if (error) {
      if (error.code === "23505") throw new Error("That web address (slug) is already taken.");
      throw new Error(error.message);
    }
    return { ok: true };
  });

/** Publish / unpublish / cancel. `published_at` is stamped once, on first publish. */
export const setEventStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["draft", "published", "cancelled"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const patch: { status: typeof data.status; published_at?: string } = { status: data.status };
    if (data.status === "published") {
      const { data: existing } = await context.supabase
        .from("events")
        .select("published_at")
        .eq("id", data.id)
        .maybeSingle();
      if (!existing?.published_at) patch.published_at = new Date().toISOString();
    }
    const { error } = await context.supabase.from("events").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** The attendee list for one event. RLS restricts this to the event's managers. */
export const listEventRegistrations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { data: rows, error } = await context.supabase
      .from("event_registrations")
      .select(
        "id, full_name, email, status, notes, created_at, user_id, tier_id, payment_status, amount_cents, currency, answers, locale, confirmation_status, confirmation_sent_at, confirmation_error, cancellation_status, cancellation_error, refund_status, refund_amount_cents, refund_error, refunded_at, checked_in_at, created_by_staff",
      )
      .eq("event_id", data.eventId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/**
 * Re-sends an attendee confirmation after a failed or lost delivery. The
 * calendar entry keeps its identity and gains a higher sequence, so the
 * attendee's calendar updates the existing entry rather than duplicating it.
 */
export const resendEventConfirmation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ registrationId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    // The caller must manage this event: RLS decides, not the client.
    const { data: row, error } = await context.supabase
      .from("event_registrations")
      .select("id")
      .eq("id", data.registrationId)
      .maybeSingle();
    if (error || !row) throw new Error("Registration not found");

    const { sendRegistrationConfirmation } = await import("./event-confirmation.server");
    return sendRegistrationConfirmation(data.registrationId, { force: true });
  });

/**
 * Ticket tiers.
 *
 * Writes go through the caller's own client, so `event_ticket_tiers` RLS
 * decides who may edit which event's tiers. Sold counts are read from the
 * registrations themselves, never stored, so they cannot drift.
 */
const tierInput = z.object({
  id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(120),
  name_de: z.string().trim().max(120).nullable().optional(),
  name_fr: z.string().trim().max(120).nullable().optional(),
  name_it: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(600).nullable().optional(),
  description_de: z.string().trim().max(600).nullable().optional(),
  description_fr: z.string().trim().max(600).nullable().optional(),
  description_it: z.string().trim().max(600).nullable().optional(),
  price_cents: z.number().int().min(0).max(10_000_000),
  currency: z.enum(["CHF", "EUR"]).default("CHF"),
  capacity: z.number().int().positive().max(100000).nullable().optional(),
  segment: z.enum(["member", "non_member", "general"]),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(999),
});

const TIER_COLUMNS =
  "id, event_id, name, name_de, name_fr, name_it, description, description_de, description_fr, description_it, price_cents, currency, capacity, segment, is_active, sort_order";

export type ManagedTier = {
  id: string;
  event_id: string;
  name: string;
  name_de: string | null;
  name_fr: string | null;
  name_it: string | null;
  description: string | null;
  description_de: string | null;
  description_fr: string | null;
  description_it: string | null;
  price_cents: number;
  currency: string;
  capacity: number | null;
  segment: "member" | "non_member" | "general";
  is_active: boolean;
  sort_order: number;
  sold_count: number;
};

/** Tiers with their live sold counts, for the event editor. */
export const listEventTiers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const [{ data: tiers, error }, { data: regs }] = await Promise.all([
      context.supabase
        .from("event_ticket_tiers")
        .select(TIER_COLUMNS)
        .eq("event_id", data.eventId)
        .order("sort_order", { ascending: true }),
      context.supabase
        .from("event_registrations")
        .select("tier_id, status, payment_status")
        .eq("event_id", data.eventId),
    ]);
    if (error) throw new Error(error.message);
    const sold = new Map<string, number>();
    for (const row of (regs ?? []) as {
      tier_id: string | null;
      status: string;
      payment_status: string;
    }[]) {
      if (!row.tier_id || row.status === "cancelled") continue;
      if (row.payment_status === "expired") continue;
      sold.set(row.tier_id, (sold.get(row.tier_id) ?? 0) + 1);
    }
    return ((tiers ?? []) as Omit<ManagedTier, "sold_count">[]).map((tier) => ({
      ...tier,
      sold_count: sold.get(tier.id) ?? 0,
    })) as ManagedTier[];
  });

/** Creates, updates and deletes tiers in one save, mirroring the editor form. */
export const saveEventTiers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ eventId: z.string().uuid(), tiers: z.array(tierInput).max(12) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const keep = data.tiers.map((tier) => tier.id).filter(Boolean) as string[];

    const { data: existing } = await context.supabase
      .from("event_ticket_tiers")
      .select("id")
      .eq("event_id", data.eventId);
    const removable = ((existing ?? []) as { id: string }[])
      .map((row) => row.id)
      .filter((id) => !keep.includes(id));

    for (const id of removable) {
      // A tier that already sold seats is deactivated instead of deleted, so
      // existing registrations keep their price history.
      const { count } = await context.supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("tier_id", id);
      if (count && count > 0) {
        await context.supabase.from("event_ticket_tiers").update({ is_active: false }).eq("id", id);
      } else {
        await context.supabase.from("event_ticket_tiers").delete().eq("id", id);
      }
    }

    for (const [index, tier] of data.tiers.entries()) {
      const row = {
        event_id: data.eventId,
        name: tier.name,
        name_de: tier.name_de || null,
        name_fr: tier.name_fr || null,
        name_it: tier.name_it || null,
        description: tier.description || null,
        description_de: tier.description_de || null,
        description_fr: tier.description_fr || null,
        description_it: tier.description_it || null,
        price_cents: tier.price_cents,
        currency: tier.currency,
        capacity: tier.capacity ?? null,
        segment: tier.segment,
        is_active: tier.is_active,
        sort_order: index,
      };
      const { error } = tier.id
        ? await context.supabase.from("event_ticket_tiers").update(row).eq("id", tier.id)
        : await context.supabase.from("event_ticket_tiers").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const setRegistrationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        registrationId: z.string().uuid(),
        status: z.enum(["confirmed", "cancelled"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { error } = await context.supabase
      .from("event_registrations")
      .update({ status: data.status })
      .eq("id", data.registrationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Host management.
 *
 * Reads resolve through the public directory view, so the CMS can only ever
 * attach a coach the public page can also show. Writes run through the
 * caller's own client, so `event_hosts` RLS decides who may edit which event.
 */
export const searchEventHostCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ term: z.string().max(120) }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { searchHostCandidates } = await import("./event-hosts.server");
    return searchHostCandidates(data.term);
  });

export const listEventHosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { loadEventHosts } = await import("./event-hosts.server");
    // CMS reads use the caller's client: drafts are invisible to the anon reader.
    return loadEventHosts(data.eventId, context.supabase);
  });

/** Replaces the whole host set for one event — at most two, order preserved. */
export const setEventHosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        profileIds: z.array(z.string().uuid()).max(MAX_EVENT_HOSTS),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const unique = [...new Set(data.profileIds)];
    const { error: delError } = await context.supabase
      .from("event_hosts")
      .delete()
      .eq("event_id", data.eventId);
    if (delError) throw new Error(delError.message);
    if (unique.length > 0) {
      const { error } = await context.supabase.from("event_hosts").insert(
        unique.map((profile_id, index) => ({
          event_id: data.eventId,
          profile_id,
          sort_order: index,
        })),
      );
      if (error) throw new Error(error.message);
    }
    const { loadEventHosts } = await import("./event-hosts.server");
    // CMS reads use the caller's client: drafts are invisible to the anon reader.
    return loadEventHosts(data.eventId, context.supabase);
  });

/**
 * Materialise a repeating series.
 *
 * The rule is re-expanded here — never trust a client-supplied date list — and
 * every occurrence is inserted as an independent draft copy of the source
 * event (content, timing offsets, location, registration settings, hosts).
 * Dates whose slug already exists are skipped, so re-running is safe.
 */
export const generateEventOccurrences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), rule: recurrenceRule }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);

    const { data: source, error: loadError } = await context.supabase
      .from("events")
      .select(EDIT_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (loadError) throw new Error(loadError.message);
    if (!source) throw new Error("Event not found.");

    const dates = expandRecurrence(source.starts_at as string, data.rule);
    if (dates.length === 0) return { created: 0, skipped: 0 };

    const seriesId = (source.series_id as string | null) ?? crypto.randomUUID();
    const startMs = new Date(source.starts_at as string).getTime();
    const durationMs = source.ends_at
      ? new Date(source.ends_at as string).getTime() - startMs
      : null;

    const slugs = dates.map((iso) => occurrenceSlug(source.slug as string, iso));
    const { data: taken, error: takenError } = await context.supabase
      .from("events")
      .select("slug")
      .in("slug", slugs);
    if (takenError) throw new Error(takenError.message);
    const existing = new Set((taken ?? []).map((r) => r.slug as string));

    const rows = dates
      .map((iso, i) => ({ iso, slug: slugs[i]! }))
      .filter(({ slug }) => !existing.has(slug))
      .map(({ iso, slug }) => ({
        slug,
        series_id: seriesId,
        title: source.title,
        summary: source.summary,
        description: source.description,
        language: source.language,
        starts_at: iso,
        ends_at:
          durationMs === null ? null : new Date(new Date(iso).getTime() + durationMs).toISOString(),
        timezone: source.timezone,
        location_mode: source.location_mode,
        venue_name: source.venue_name,
        city: source.city,
        online_url: source.online_url,
        map_location: source.map_location,
        image_url: source.image_url,
        image_credit_name: source.image_credit_name,
        image_credit_url: source.image_credit_url,
        capacity: source.capacity,
        registration_mode: source.registration_mode,
        guest_registration_allowed: source.guest_registration_allowed,
        category_id: source.category_id,
        region_id: source.region_id,
        community_id: source.community_id,
        // Occurrences never inherit "featured" or a published state.
        is_featured: false,
        is_internal: source.is_internal,
        status: "draft" as const,
        organizer_id: context.userId,
      }));

    let created: { id: string }[] = [];
    if (rows.length > 0) {
      const { data: inserted, error } = await context.supabase
        .from("events")
        .insert(rows)
        .select("id");
      if (error) throw new Error(error.message);
      created = (inserted ?? []) as { id: string }[];

      // Hosts travel with the series so each date shows the same coaches.
      const { data: hosts } = await context.supabase
        .from("event_hosts")
        .select("profile_id, sort_order")
        .eq("event_id", data.id);
      if (hosts && hosts.length > 0) {
        const hostRows = created.flatMap((row) =>
          hosts.map((h) => ({
            event_id: row.id,
            profile_id: h.profile_id as string,
            sort_order: h.sort_order as number,
          })),
        );
        const { error: hostError } = await context.supabase.from("event_hosts").insert(hostRows);
        if (hostError) throw new Error(hostError.message);
      }
    }

    const { error: markError } = await context.supabase
      .from("events")
      .update({ series_id: seriesId, recurrence: data.rule })
      .eq("id", data.id);
    if (markError) throw new Error(markError.message);

    return { created: created.length, skipped: dates.length - rows.length };
  });

/**
 * Full cancellation of one registration: seat released, payment reversed and
 * the attendee told — in that order, so an attendee is never told about a
 * refund that did not happen.
 *
 * Refund policy: a paid seat cancelled more than 48 hours before the event
 * starts is refunded in full; inside that window it is not. Staff may override
 * either way, because a genuine exception is a human decision, not a rule.
 */
export const REFUND_DEADLINE_HOURS = 48;

export const cancelRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        registrationId: z.string().uuid(),
        /** Omitted: apply the 48-hour policy. Set: staff overrides it. */
        refund: z.boolean().optional(),
        /** Internal reason kept with the row for the audit trail. */
        note: z.string().trim().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);

    // RLS decides whether this staff member manages this event.
    const { data: row, error } = await context.supabase
      .from("event_registrations")
      .select("id, event_id, status, payment_status, amount_cents, refund_status")
      .eq("id", data.registrationId)
      .maybeSingle();
    if (error || !row) throw new Error("Registration not found");

    const { data: event } = await context.supabase
      .from("events")
      .select("starts_at")
      .eq("id", row.event_id)
      .maybeSingle();

    const wasPaid = row.payment_status === "paid" && (row.amount_cents ?? 0) > 0;
    const withinPolicy = event?.starts_at
      ? new Date(event.starts_at).getTime() - Date.now() > REFUND_DEADLINE_HOURS * 3600_000
      : true;
    const shouldRefund = wasPaid && (data.refund ?? withinPolicy);

    if (row.status !== "cancelled") {
      const { error: cancelError } = await context.supabase
        .from("event_registrations")
        .update({ status: "cancelled" })
        .eq("id", data.registrationId);
      if (cancelError) throw new Error(cancelError.message);
    }

    // The note is server-owned (the row guard rejects it from a normal update),
    // so it is written through the trusted client after the cancellation.
    if (data.note) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("event_registrations")
        .update({ cancellation_note: data.note })
        .eq("id", data.registrationId);
    }

    let refund: { status: string; error?: string } = { status: "not_applicable" };
    if (shouldRefund) {
      const { refundRegistration } = await import("./refunds.server");
      refund = await refundRegistration(data.registrationId);
    } else if (wasPaid) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("event_registrations")
        .update({ refund_status: "declined" })
        .eq("id", data.registrationId);
      refund = { status: "declined" };
    }

    const { sendCancellationNotice } = await import("./event-cancellation.server");
    const email = await sendCancellationNotice(data.registrationId, { force: true });

    return { ok: true, refund, email, refunded: shouldRefund };
  });

/** Retries a refund that failed, without re-sending the cancellation notice. */
export const retryRegistrationRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ registrationId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { data: row, error } = await context.supabase
      .from("event_registrations")
      .select("id")
      .eq("id", data.registrationId)
      .maybeSingle();
    if (error || !row) throw new Error("Registration not found");

    const { refundRegistration } = await import("./refunds.server");
    return refundRegistration(data.registrationId);
  });

/**
 * Attendee CSV for one event.
 *
 * The event read goes through the caller's own client, so RLS decides whether
 * this person manages this event; only then does the export read the wider
 * column set through the trusted client.
 */
export const exportEventRegistrations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { data: event, error } = await context.supabase
      .from("events")
      .select("id")
      .eq("id", data.eventId)
      .maybeSingle();
    if (error || !event) throw new Error("Event not found");

    const { buildRegistrationsCsv } = await import("./registrations-export.server");
    return buildRegistrationsCsv(data.eventId);
  });

/**
 * Staff-created registration.
 *
 * Comped seats only: staff may add someone to the list, never take money on
 * their behalf. The row is written with the trusted client because
 * `payment_status` and `created_by_staff` are server-owned, and the seat is
 * marked so the attendee list and the CSV show how it came to exist.
 */
export const createStaffRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        fullName: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(200),
        tierId: z.string().uuid().nullable().optional(),
        locale: z.enum(["en", "de", "fr", "it"]).default("en"),
        notes: z.string().trim().max(500).nullable().optional(),
        sendConfirmation: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);

    const { data: event, error } = await context.supabase
      .from("events")
      .select("id, registration_mode")
      .eq("id", data.eventId)
      .maybeSingle();
    if (error || !event) throw new Error("Event not found");
    if (event.registration_mode === "none") {
      throw new Error("This event does not take registrations");
    }

    const email = data.email.toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("event_registrations")
      .select("id, status")
      .eq("event_id", data.eventId)
      .eq("email", email)
      .maybeSingle();
    if (existing && existing.status === "confirmed") {
      return { ok: false as const, reason: "already_registered" as const, id: existing.id };
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("event_registrations")
      .insert({
        event_id: data.eventId,
        tier_id: event.registration_mode === "rsvp_tickets" ? (data.tierId ?? null) : null,
        full_name: data.fullName,
        email,
        locale: data.locale,
        status: "confirmed",
        // Comped: the guard leaves this alone for a trusted caller, so the
        // seat is never priced or held for payment.
        payment_status: "not_required",
        amount_cents: 0,
        notes: data.notes ?? null,
        // Records which staff member added the seat, for the audit trail.
        created_by_staff: context.userId,
      })
      .select("id")
      .single();
    if (insertError || !inserted) throw new Error(insertError?.message ?? "Could not add attendee");

    let confirmation = { sent: false };
    if (data.sendConfirmation) {
      const { sendRegistrationConfirmation } = await import("./event-confirmation.server");
      const result = await sendRegistrationConfirmation(inserted.id, { force: true });
      confirmation = { sent: result.status === "sent" };
    }

    return { ok: true as const, id: inserted.id, confirmation };
  });
