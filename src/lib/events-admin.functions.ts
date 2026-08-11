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
  "id, series_id, slug, title, summary, language, status, starts_at, ends_at, timezone, location_mode, venue_name, city, capacity, is_featured, category_id, region_id, organizer_id, updated_at";

const EDIT_COLUMNS = `${LIST_COLUMNS}, community_id, series_id, recurrence, description, image_url, image_credit_name, image_credit_url, online_url, map_location, registration_mode, registration_opens_at, registration_closes_at, guest_registration_allowed, published_at, content_updated_at, hero_marks`;

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
  registration_mode: z.enum(["none", "rsvp"]),
  registration_opens_at: z.string().min(1).nullable().optional(),
  registration_closes_at: z.string().min(1).nullable().optional(),
  guest_registration_allowed: z.boolean(),
  is_featured: z.boolean(),
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
      .select(LIST_COLUMNS)
      .order("starts_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
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
      .select("id, full_name, email, status, notes, created_at, user_id")
      .eq("event_id", data.eventId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
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
    return loadEventHosts(data.eventId);
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
    return loadEventHosts(data.eventId);
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
