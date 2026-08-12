/**
 * Public event surface.
 *
 * Reads use the anonymous publishable client against `events_public`, so what
 * these functions can see is exactly what an anonymous visitor can see. RSVP
 * writes go to `event_registrations`; the database trigger — not this file —
 * enforces capacity, the registration window and the guest policy.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PUBLIC_EVENT_COLUMNS, type EventFacetOption, type PublicEvent } from "./events";

const slugSchema = z.object({ slug: z.string().min(1).max(120) });
const localeSchema = z.enum(["en", "de", "fr", "it"]);

type EventTranslation = {
  event_id: string;
  locale: string;
  title: string;
  summary: string | null;
  description: string | null;
};

/**
 * Overlays a translation onto the source row, field by field. A missing or
 * blank translated field always falls back to the source text, so a partial
 * translation degrades instead of blanking the page.
 */
function applyTranslation(event: PublicEvent, tr: EventTranslation | undefined) {
  if (!tr) return { ...event, resolvedLocale: event.language ?? "en" };
  return {
    ...event,
    title: tr.title || event.title,
    summary: tr.summary ?? event.summary,
    description: tr.description ?? event.description,
    resolvedLocale: tr.locale,
  };
}

const rsvpSchema = z.object({
  eventId: z.string().uuid(),
  slug: z.string().trim().min(1).max(120),
  locale: localeSchema,
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  notes: z.string().trim().max(1000).optional().nullable(),
  /** Named, never priced, by the client — the server reads the stored price. */
  tierId: z.string().uuid().optional().nullable(),
  /** Optional ICF member id for a signed-in account that is not linked yet. */
  memberId: z.string().trim().max(60).optional().nullable(),
  /** Optional discount code; the server re-resolves the price behind it. */
  discountCode: z.string().trim().max(40).optional().nullable(),
  /** Single-use waitlist invitation token from the emailed link. */
  inviteToken: z.string().trim().max(128).optional().nullable(),
  answers: z.record(z.string().max(80), z.string().max(2000)).default({}),
  environment: z.enum(["sandbox", "live"]).default("sandbox"),
});

type VocabRow = {
  slug: string;
  name: string;
  name_de: string | null;
  name_fr: string | null;
  name_it: string | null;
};

function vocabLabel(row: VocabRow, locale: "en" | "de" | "fr" | "it") {
  if (locale === "de") return row.name_de || row.name;
  if (locale === "fr") return row.name_fr || row.name;
  if (locale === "it") return row.name_it || row.name;
  return row.name;
}

/** Upcoming and recent past events for the public listing. */
export const listPublicEvents = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({ locale: localeSchema.optional() })
      .optional()
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const locale = data?.locale ?? "en";
    const { publicSupabaseClient } = await import("./supabase-public.server");
    const supabase = publicSupabaseClient();

    const cutoff = new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: list, error }, { data: categoryRows }, { data: regionRows }] = await Promise.all(
      [
        supabase
          .from("events_public")
          .select(PUBLIC_EVENT_COLUMNS)
          .gte("starts_at", cutoff)
          .order("starts_at", { ascending: true }),
        supabase
          .from("cf_event_categories")
          .select("slug, name, name_de, name_fr, name_it")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("cf_regions")
          .select("slug, name, name_de, name_fr, name_it")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ],
    );
    if (error) throw new Error(error.message);

    // Filter vocabularies travel with the list so the page can label a slug
    // without a second round trip — and so SSR renders the bar already filled.
    const categories: EventFacetOption[] = ((categoryRows ?? []) as VocabRow[]).map((r) => ({
      slug: r.slug,
      label: vocabLabel(r, locale),
    }));
    const regions: EventFacetOption[] = ((regionRows ?? []) as VocabRow[]).map((r) => ({
      slug: r.slug,
      label: vocabLabel(r, locale),
    }));

    const source = (list ?? []) as PublicEvent[];
    const ids = source.map((e) => e.id).filter((id): id is string => Boolean(id));
    let byEvent = new Map<string, EventTranslation>();
    if (ids.length > 0) {
      const { data: translations } = await supabase
        .from("event_translations")
        .select("event_id, locale, title, summary, description")
        .eq("locale", locale)
        .in("event_id", ids);
      byEvent = new Map(
        ((translations ?? []) as EventTranslation[]).map((tr) => [tr.event_id, tr]),
      );
    }

    const rows = source.map((e) =>
      e.language === locale
        ? { ...e, resolvedLocale: locale }
        : applyTranslation(e, byEvent.get(e.id!)),
    );
    const now = Date.now();
    const upcoming = rows.filter((e) => new Date(e.ends_at ?? e.starts_at!).getTime() >= now);
    const past = rows.filter((e) => new Date(e.ends_at ?? e.starts_at!).getTime() < now).reverse();

    // The chapter marks at most one event as featured; fall back to the next one
    // up so the hero card is never empty.
    const featured = upcoming.find((e) => e.is_featured) ?? upcoming[0] ?? null;
    return {
      featured,
      upcoming: upcoming.filter((e) => e.id !== featured?.id),
      past,
      categories,
      regions,
    };
  });

/** How many events the community section shows at most. */
const COMMUNITY_EVENT_LIMIT = 6;

/**
 * Upcoming events for one local community, with a chapter-wide fallback.
 *
 * A community page should not look dormant just because its own programme is
 * empty, so events from other local communities fill the remaining slots —
 * always after the community's own, and tagged in the UI with their community
 * name so the origin stays obvious.
 */
export const listCommunityEvents = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    slugSchema.extend({ locale: localeSchema.optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const locale = data.locale ?? "en";
    const { publicSupabaseClient } = await import("./supabase-public.server");
    const supabase = publicSupabaseClient();

    // `ends_at` is the real "still upcoming" boundary for multi-day events, but
    // it is nullable; filter on `starts_at` in SQL and refine below.
    const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: list, error } = await supabase
      .from("events_public")
      .select(PUBLIC_EVENT_COLUMNS)
      .not("community_slug", "is", null)
      .gte("starts_at", from)
      .order("starts_at", { ascending: true });
    if (error) throw new Error(error.message);

    const now = Date.now();
    const upcoming = ((list ?? []) as PublicEvent[]).filter(
      (e) => new Date(e.ends_at ?? e.starts_at!).getTime() >= now,
    );
    const own = upcoming.filter((e) => e.community_slug === data.slug);
    const other = upcoming.filter((e) => e.community_slug !== data.slug);
    const selected = [...own, ...other].slice(0, COMMUNITY_EVENT_LIMIT);
    if (selected.length === 0) return { events: [], hasOwn: false };

    const ids = selected.map((e) => e.id).filter((id): id is string => Boolean(id));
    let byEvent = new Map<string, EventTranslation>();
    if (ids.length > 0) {
      const { data: translations } = await supabase
        .from("event_translations")
        .select("event_id, locale, title, summary, description")
        .eq("locale", locale)
        .in("event_id", ids);
      byEvent = new Map(
        ((translations ?? []) as EventTranslation[]).map((tr) => [tr.event_id, tr]),
      );
    }

    return {
      events: selected.map((e) =>
        e.language === locale
          ? { ...e, resolvedLocale: locale }
          : applyTranslation(e, byEvent.get(e.id!)),
      ),
      hasOwn: own.length > 0,
    };
  });

/** One published event by slug, or null. */
export const getPublicEvent = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    slugSchema.extend({ locale: localeSchema.optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { publicSupabaseClient } = await import("./supabase-public.server");
    const supabase = publicSupabaseClient();
    const { data: row, error } = await supabase
      .from("events_public")
      .select(PUBLIC_EVENT_COLUMNS)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const event = (row as PublicEvent | null) ?? null;
    if (!event) return null;

    const { loadEventHosts } = await import("./event-hosts.server");
    const hosts = event.id ? await loadEventHosts(event.id) : [];

    const locale = data.locale ?? "en";
    if (!event.id || event.language === locale) {
      return { ...event, hosts, resolvedLocale: event.language ?? locale };
    }
    const { data: tr } = await supabase
      .from("event_translations")
      .select("event_id, locale, title, summary, description")
      .eq("event_id", event.id)
      .eq("locale", locale)
      .maybeSingle();
    return { ...applyTranslation(event, (tr as EventTranslation | null) ?? undefined), hosts };
  });

/**
 * RSVP without an account. Guests are allowed only when the event says so, and
 * a guest is never a member, so member tiers are refused server-side.
 */
export const submitGuestRegistration = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => rsvpSchema.parse(input))
  .handler(async ({ data }) => {
    const { publicSupabaseClient } = await import("./supabase-public.server");
    const { submitRegistration } = await import("./tickets.server");
    const { clientIp } = await import("./rate-limit.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    return submitRegistration(
      publicSupabaseClient(),
      {
        ...data,
        notes: data.notes ?? null,
        tierId: data.tierId ?? null,
        // Verified server-side before it can unlock member pricing.
        memberId: data.memberId ?? null,
        discountCode: data.discountCode ?? null,
        inviteToken: data.inviteToken ?? null,
      },
      null,
      `ip:${clientIp(getRequest())}`,
    );
  });

/** RSVP as a signed-in visitor: the row is owned, so it can be cancelled later. */
export const submitMemberRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => rsvpSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { submitRegistration } = await import("./tickets.server");
    return submitRegistration(
      context.supabase,
      {
        ...data,
        notes: data.notes ?? null,
        tierId: data.tierId ?? null,
        memberId: data.memberId ?? null,
        discountCode: data.discountCode ?? null,
        inviteToken: data.inviteToken ?? null,
      },
      context.userId,
    );
  });

/** The signed-in visitor's own registration for one event, if any. */
export const getMyRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("event_registrations")
      .select("id, status, full_name, email, created_at, payment_status, amount_cents, currency")
      .eq("event_id", data.eventId)
      .eq("user_id", context.userId)
      .neq("status", "cancelled")
      .maybeSingle();
    return row ?? null;
  });

/** Cancels an own registration, freeing the seat for the next visitor. */
export const cancelMyRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ registrationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // A paid seat involves a refund decision, so it is cancelled by the
    // chapter, never silently by the attendee.
    const { data: existing } = await context.supabase
      .from("event_registrations")
      .select("payment_status")
      .eq("id", data.registrationId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing?.payment_status === "paid") {
      throw new Error("PAID_CANCEL_REQUIRES_STAFF");
    }
    const { error } = await context.supabase
      .from("event_registrations")
      .update({ status: "cancelled" })
      .eq("id", data.registrationId)
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not cancel this registration.");
    return { ok: true };
  });
