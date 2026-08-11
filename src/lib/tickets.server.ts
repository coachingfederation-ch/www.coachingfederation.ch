/**
 * Ticketing server logic.
 *
 * Everything a client could lie about is decided here or in the database:
 * membership entitlement, which tier applies, what it costs, and whether a
 * registration is paid. The client only ever names a tier id.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Locale } from "@/i18n/config";
import {
  localisedText,
  type EventTicketing,
  type MembershipState,
  type PublicRegistrationField,
  type PublicTier,
  type RegistrationFieldType,
  type TierSegment,
} from "./tickets";

/** How long a paid seat is held while the visitor is in Stripe Checkout. */
export const HOLD_MINUTES = 30;

type TierRow = {
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
  segment: TierSegment;
  sort_order: number;
  seats_remaining: number | null;
  is_sold_out: boolean | null;
};

type FieldRow = {
  id: string;
  field_key: string;
  label: string;
  label_de: string | null;
  label_fr: string | null;
  label_it: string | null;
  field_type: RegistrationFieldType;
  options: string[];
  is_required: boolean;
  sort_order: number;
};

/**
 * Releases seats held by checkouts that were abandoned or never completed.
 * Called before anything reads or writes seat counts, so an expired hold never
 * blocks the next buyer.
 */
export async function releaseExpiredHolds(eventId: string) {
  await supabaseAdmin
    .from("event_registrations")
    .update({ payment_status: "expired", status: "cancelled" })
    .eq("event_id", eventId)
    .eq("payment_status", "pending")
    .lt("hold_expires_at", new Date().toISOString());
}

const isActiveMember = (row: {
  activity_state: string;
  membership_expiration_date: string | null;
}) => {
  if (row.activity_state !== "active") return false;
  if (!row.membership_expiration_date) return true;
  return row.membership_expiration_date >= new Date().toISOString().slice(0, 10);
};

/**
 * Membership as the server sees it. The account link (`members.auth_user_id`)
 * is the only automatic path — never an email match. A signed-in visitor who
 * has not claimed their account yet may name their ICF member id instead,
 * which is verified against an active, unexpired record and grants member
 * pricing for this registration only.
 */
export async function resolveMembership(
  userId: string | null,
  memberIdInput?: string | null,
): Promise<MembershipState> {
  if (!userId) return "signed_out";

  const { data: linked } = await supabaseAdmin
    .from("members")
    .select("id, activity_state, membership_expiration_date")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (linked && isActiveMember(linked)) return "member";

  const candidate = (memberIdInput ?? "").trim();
  if (!candidate) return "not_member";

  const { checkRateLimit } = await import("./rate-limit.server");
  const verdict = await checkRateLimit("event-member-id", userId, [
    { windowSeconds: 300, max: 5 },
    { windowSeconds: 86_400, max: 30 },
  ]);
  if (!verdict.allowed) return "not_member";

  const { data: byMemberId } = await supabaseAdmin
    .from("members")
    .select("id, activity_state, membership_expiration_date")
    .eq("cst_recno", candidate)
    .maybeSingle();
  return byMemberId && isActiveMember(byMemberId) ? "member" : "not_member";
}

function toPublicTier(row: TierRow, locale: Locale): PublicTier {
  return {
    id: row.id,
    name: localisedText(row as never, "name", locale) ?? row.name,
    description: localisedText(row as never, "description", locale),
    priceCents: row.price_cents,
    currency: row.currency,
    segment: row.segment,
    seatsRemaining: row.seats_remaining,
    isSoldOut: Boolean(row.is_sold_out),
    sortOrder: row.sort_order,
  };
}

function toPublicField(row: FieldRow, locale: Locale): PublicRegistrationField {
  return {
    id: row.id,
    key: row.field_key,
    label: localisedText(row as never, "label", locale) ?? row.label,
    type: row.field_type,
    options: row.options ?? [],
    required: row.is_required,
  };
}

/** Which tier the server applies when the visitor does not pick one. */
export function defaultTierFor(tiers: PublicTier[], membership: MembershipState) {
  if (membership === "member") {
    const member = tiers.find((t) => t.segment === "member" && !t.isSoldOut);
    if (member) return member.id;
  }
  const nonMember = tiers.find((t) => t.segment === "non_member" && !t.isSoldOut);
  if (nonMember) return nonMember.id;
  const general = tiers.find((t) => t.segment === "general" && !t.isSoldOut);
  return general?.id ?? tiers[0]?.id ?? null;
}

/** Tiers, questions and the viewer's pricing state for one published event. */
export async function loadEventTicketing(
  eventId: string,
  locale: Locale,
  userId: string | null,
): Promise<EventTicketing> {
  await releaseExpiredHolds(eventId);
  const { publicSupabaseClient } = await import("./supabase-public.server");
  const supabase = publicSupabaseClient();

  const [{ data: tierRows }, { data: fieldRows }, membership] = await Promise.all([
    supabase
      .from("event_ticket_tiers_public")
      .select(
        "id, event_id, name, name_de, name_fr, name_it, description, description_de, description_fr, description_it, price_cents, currency, capacity, segment, sort_order, seats_remaining, is_sold_out",
      )
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("event_registration_fields_public")
      .select(
        "id, field_key, label, label_de, label_fr, label_it, field_type, options, is_required, sort_order",
      )
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
    resolveMembership(userId),
  ]);

  const tiers = ((tierRows ?? []) as TierRow[]).map((row) => toPublicTier(row, locale));
  return {
    tiers,
    fields: ((fieldRows ?? []) as FieldRow[]).map((row) => toPublicField(row, locale)),
    membership,
    defaultTierId: defaultTierFor(tiers, membership),
  };
}

export type TierRecord = {
  id: string;
  event_id: string;
  name: string;
  price_cents: number;
  currency: string;
  segment: TierSegment;
  is_active: boolean;
};

/** The tier the server will actually charge, or `null` for a tier-less event. */
export async function resolveChargedTier(
  eventId: string,
  requestedTierId: string | null,
  membership: MembershipState,
): Promise<{ tier: TierRecord | null } | { error: "tier_required" | "tier_unavailable" }> {
  const { data: rows } = await supabaseAdmin
    .from("event_ticket_tiers")
    .select("id, event_id, name, price_cents, currency, segment, is_active")
    .eq("event_id", eventId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const tiers = (rows ?? []) as TierRecord[];
  if (tiers.length === 0) return { tier: null };

  const requested = requestedTierId ? tiers.find((t) => t.id === requestedTierId) : undefined;
  if (requestedTierId && !requested) return { error: "tier_unavailable" };
  if (!requested) return { error: "tier_required" };
  // Member pricing is never granted on the client's say-so.
  if (requested.segment === "member" && membership !== "member") {
    return { error: "tier_unavailable" };
  }
  return { tier: requested };
}

/**
 * Keeps only the answers the organizer actually asked for, and refuses a
 * submission that skips a required question.
 */
export async function validateAnswers(
  eventId: string,
  answers: Record<string, string>,
): Promise<{ ok: true; answers: Record<string, string> } | { ok: false }> {
  const { data: rows } = await supabaseAdmin
    .from("event_registration_fields")
    .select("field_key, field_type, options, is_required")
    .eq("event_id", eventId)
    .eq("is_active", true);
  const fields = (rows ?? []) as Pick<
    FieldRow,
    "field_key" | "field_type" | "options" | "is_required"
  >[];
  const cleaned: Record<string, string> = {};

  for (const field of fields) {
    const raw = (answers[field.field_key] ?? "").toString().trim().slice(0, 2000);
    if (field.field_type === "single_choice" && raw && !(field.options ?? []).includes(raw)) {
      return { ok: false };
    }
    if (field.field_type === "checkbox") {
      const checked = raw === "true";
      if (field.is_required && !checked) return { ok: false };
      cleaned[field.field_key] = checked ? "true" : "false";
      continue;
    }
    if (field.is_required && !raw) return { ok: false };
    if (raw) cleaned[field.field_key] = raw;
  }
  return { ok: true, answers: cleaned };
}

/**
 * Marks a pending registration paid. Keyed on the Stripe session and only ever
 * `pending -> paid`, so a replayed webhook is a no-op.
 */
export async function finalizePaidRegistration(sessionId: string) {
  const { data } = await supabaseAdmin
    .from("event_registrations")
    .update({ payment_status: "paid", hold_expires_at: null })
    .eq("stripe_session_id", sessionId)
    .eq("payment_status", "pending")
    .select("id");
  return { updated: (data ?? []).length };
}

/** Releases the seat behind an expired or abandoned checkout session. */
export async function releaseCheckoutSession(sessionId: string) {
  await supabaseAdmin
    .from("event_registrations")
    .update({ payment_status: "expired", status: "cancelled" })
    .eq("stripe_session_id", sessionId)
    .eq("payment_status", "pending");
}