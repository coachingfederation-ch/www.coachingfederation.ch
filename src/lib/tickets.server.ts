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
  type PublicTier,
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

/**
 * Entitlement rests on `activity_state`, the same signal the public directory
 * uses (`member_is_active`). The feed's `membership_expiration_date` is not a
 * reliable entitlement date — the vast majority of active records carry a past
 * one — so it is not used to deny a member the sync still reports as active.
 */
const isActiveMember = (row: { activity_state: string }) => row.activity_state === "active";

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
  /** Rate-limit identity for anonymous callers, e.g. `ip:1.2.3.4`. */
  rateSubject?: string | null,
): Promise<MembershipState> {
  const candidateId = (memberIdInput ?? "").trim();

  if (userId) {
    const { data: linked } = await supabaseAdmin
      .from("members")
      .select("id, activity_state")
      .eq("auth_user_id", userId)
      .maybeSingle();
    if (linked && isActiveMember(linked)) return "member";
  } else if (!candidateId) {
    return "signed_out";
  }

  const candidate = candidateId;
  if (!candidate) return "not_member";
  const subject = userId ? `user:${userId}` : (rateSubject ?? "anonymous");

  const { checkRateLimit } = await import("./rate-limit.server");
  const verdict = await checkRateLimit("event-member-id", subject, [
    { windowSeconds: 300, max: 5 },
    { windowSeconds: 86_400, max: 30 },
  ]);
  if (!verdict.allowed) return userId ? "not_member" : "signed_out";

  const { data: byMemberId } = await supabaseAdmin
    .from("members")
    .select("id, activity_state")
    .eq("cst_recno", candidate)
    .maybeSingle();
  if (byMemberId && isActiveMember(byMemberId)) return "member";
  return userId ? "not_member" : "signed_out";
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

  const { loadPublicRegistrationForm } = await import("./event-forms.server");
  const [{ data: tierRows }, form, membership, { data: eventRow }] = await Promise.all([
    supabase
      .from("event_ticket_tiers_public")
      .select(
        "id, event_id, name, name_de, name_fr, name_it, description, description_de, description_fr, description_it, price_cents, currency, capacity, segment, sort_order, seats_remaining, is_sold_out",
      )
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
    loadPublicRegistrationForm(eventId, locale),
    resolveMembership(userId),
    supabase.from("events_public").select("guest_passes_allowed").eq("id", eventId).maybeSingle(),
  ]);

  const tiers = ((tierRows ?? []) as TierRow[]).map((row) => toPublicTier(row, locale));
  return {
    tiers,
    formId: form?.id ?? null,
    questions: form?.questions ?? [],
    membership,
    defaultTierId: defaultTierFor(tiers, membership),
    guestPassesAllowed: Boolean(eventRow?.guest_passes_allowed),
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
  const { validateRegistrationAnswers } = await import("./event-forms.server");
  return validateRegistrationAnswers(eventId, answers);
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
  const rows = data ?? [];
  // Only the delivery that actually flipped the row sends the confirmation, so
  // a replayed webhook produces no second email.
  for (const row of rows) {
    const { triggerRegistrationConfirmation } = await import("./event-confirmation.server");
    await triggerRegistrationConfirmation(row.id);
  }
  return { updated: rows.length };
}

/** Releases the seat behind an expired or abandoned checkout session. */
export async function releaseCheckoutSession(sessionId: string) {
  await supabaseAdmin
    .from("event_registrations")
    .update({ payment_status: "expired", status: "cancelled" })
    .eq("stripe_session_id", sessionId)
    .eq("payment_status", "pending");
}

export type RegistrationInput = {
  eventId: string;
  slug: string;
  locale: Locale;
  fullName: string;
  email: string;
  notes: string | null;
  tierId: string | null;
  memberId: string | null;
  /** Optional discount code typed by the visitor; validated server-side. */
  discountCode: string | null;
  /** Single-use waitlist or guest-list invitation token from the emailed link. */
  inviteToken: string | null;
  answers: Record<string, string>;
  environment: "sandbox" | "live";
};

export type RegistrationOutcome =
  | { ok: true; kind: "free" }
  | { ok: true; kind: "paid"; clientSecret: string }
  | {
      ok: false;
      reason:
        | "full"
        | "closed"
        | "duplicate"
        | "members_only"
        | "invite_required"
        | "tier_required"
        | "tier_unavailable"
        | "answers"
        | "discount"
        | "payment"
        | "error";
    };

/**
 * Maps the database guards to the stable reason codes the UI translates.
 *
 * Matching is deliberately phrase-exact: every error raised on this table
 * mentions `event_registrations`, so a loose substring match on "registration"
 * used to report unrelated failures (constraint violations, schema drift) as
 * "registration is closed" and hid the real cause. Anything unrecognised now
 * falls through to the generic reason and is logged for diagnosis.
 */
function failureReason(
  error: { code?: string; message?: string; details?: string | null; hint?: string | null },
  eventId?: string,
): RegistrationOutcome {
  if (error.code === "23505") return { ok: false, reason: "duplicate" };
  const message = (error.message ?? "").toLowerCase();
  // Grant/RLS failures mention the table name and must not read as "closed".
  if (message.includes("permission denied") || message.includes("row-level security"))
    return { ok: false, reason: "error" };
  if (message.includes("active members only")) return { ok: false, reason: "members_only" };
  if (message.includes("invited members only")) return { ok: false, reason: "invite_required" };
  if (message.includes("discount code")) return { ok: false, reason: "discount" };
  if (message.includes("tier is full")) return { ok: false, reason: "full" };
  if (message.includes("a ticket tier must be selected"))
    return { ok: false, reason: "tier_required" };
  if (message.includes("ticket tier is not available"))
    return { ok: false, reason: "tier_unavailable" };
  if (message.includes("event is full") || message.includes("capacity"))
    return { ok: false, reason: "full" };
  // The exact phrases raised by tg_event_registration_guard — nothing else.
  if (
    message.includes("registration has closed") ||
    message.includes("registration has not opened yet") ||
    message.includes("event is not open for registration") ||
    message.includes("does not take registrations")
  )
    return { ok: false, reason: "closed" };
  console.error("[registration] unmapped database error", {
    eventId,
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
  return { ok: false, reason: "error" };
}

/**
 * One registration, whichever client the caller owns (anonymous for guests,
 * the visitor's own RLS-scoped client when signed in). Free tiers finish here;
 * paid tiers get a 30-minute seat hold and a Stripe Checkout session created
 * from the stored tier price.
 */
export async function submitRegistration(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  input: RegistrationInput,
  userId: string | null,
  rateSubject?: string | null,
): Promise<RegistrationOutcome> {
  await releaseExpiredHolds(input.eventId);

  // The event's registration mode decides what is asked for and who may
  // register; the matching database trigger enforces the same rules.
  const { data: eventRow } = await supabaseAdmin
    .from("events")
    .select("registration_mode, guest_registration_allowed, tickets_enabled")
    .eq("id", input.eventId)
    .maybeSingle();
  if (!eventRow) return { ok: false, reason: "error" };
  const mode = eventRow.registration_mode;
  if (mode === "none") return { ok: false, reason: "closed" };
  const membersOnly = mode === "rsvp_members";
  const invitedOnly = mode === "rsvp_invited";

  const membership = await resolveMembership(userId, input.memberId, rateSubject);
  if (membersOnly && membership !== "member") return { ok: false, reason: "members_only" };

  // Tiers are offered whenever the organiser switched tickets on, whoever the
  // event is open to; without tickets the seat is simply free.
  const resolved = eventRow.tickets_enabled
    ? await resolveChargedTier(input.eventId, input.tierId, membership)
    : { tier: null };
  if ("error" in resolved) return { ok: false, reason: resolved.error };

  const answers = await validateAnswers(input.eventId, input.answers);
  if (!answers.ok) return { ok: false, reason: "answers" };

  const tier = resolved.tier;

  // An invitation-only event is opened by the guest-list token alone; on other
  // events a live waitlist invitation lets this one email past the capacity
  // check. Either way the email is taken from the invitation, never from the
  // form, so a shared link cannot seat somebody else.
  const guestListInvite =
    invitedOnly && input.inviteToken
      ? await (async () => {
          const { resolveInvitationToken } = await import("./event-invitations.server");
          return resolveInvitationToken(input.eventId, input.inviteToken!);
        })()
      : null;
  if (invitedOnly && !guestListInvite) return { ok: false, reason: "invite_required" };

  const invite =
    !invitedOnly && input.inviteToken
      ? await (async () => {
          const { resolveInviteToken } = await import("./waitlist.server");
          return resolveInviteToken(input.eventId, input.inviteToken!);
        })()
      : null;
  const email = guestListInvite ? guestListInvite.email : invite ? invite.email : input.email;
  const fullName = guestListInvite ? guestListInvite.fullName : input.fullName;

  // A discount only exists on a priced ticket. The verdict here decides the
  // Stripe amount; the database trigger recomputes the very same figure from
  // the stored code before the row is accepted.
  const { resolveDiscount } = await import("./discount-codes.server");
  const discount =
    tier && tier.price_cents > 0 && input.discountCode
      ? await resolveDiscount(input.eventId, input.discountCode, tier, membership)
      : null;
  if (discount && !discount.ok) return { ok: false, reason: "discount" };
  const discountRecord = discount && discount.ok ? discount.record! : null;
  const chargedCents =
    discount && discount.ok ? discount.preview.finalCents : (tier?.price_cents ?? 0);

  // A code that brings the ticket to zero finishes on the free path.
  const paid = Boolean(tier && chargedCents > 0);
  const holdExpiresAt = paid ? new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString() : null;

  // A members-only registration is written through the trusted server client,
  // because membership may rest on a member number the database cannot verify.
  // The same applies to a member-only discount code.
  const writer =
    membersOnly || invitedOnly || discountRecord?.member_only || invite ? supabaseAdmin : client;
  // The id is generated here rather than read back: anonymous guests hold an
  // insert-only grant, so a RETURNING clause would fail with a permission error.
  const registrationId = crypto.randomUUID();
  const { error } = await writer.from("event_registrations").insert({
    id: registrationId,
    event_id: input.eventId,
    user_id: userId,
    email,
    full_name: fullName,
    notes: input.notes,
    // Stored so the confirmation — which may be sent later by the payment
    // webhook, with no session — is written in the attendee's own language.
    locale: input.locale,
    tier_id: tier?.id ?? null,
    discount_code_id: discountRecord?.id ?? null,
    // The trigger overwrites amount and currency from the stored tier.
    payment_status: paid ? "pending" : "not_required",
    hold_expires_at: holdExpiresAt,
    answers: answers.answers,
  });
  if (error) return failureReason(error, input.eventId);

  if (invite) {
    const { markInviteConverted } = await import("./waitlist.server");
    await markInviteConverted(invite.entryId, registrationId);
  }
  if (guestListInvite) {
    const { markInvitationRegistered } = await import("./event-invitations.server");
    await markInvitationRegistered(guestListInvite.invitationId, registrationId);
  }

  if (!paid || !tier) {
    const { triggerRegistrationConfirmation } = await import("./event-confirmation.server");
    await triggerRegistrationConfirmation(registrationId);
    return { ok: true, kind: "free" };
  }

  try {
    const { createStripeClient } = await import("./stripe.server");
    const { SITE_URL, localizePath } = await import("@/i18n/config");
    const stripe = createStripeClient(input.environment);
    const returnUrl = `${SITE_URL}${localizePath(`/events/${input.slug}`, input.locale)}?checkout=return&session_id={CHECKOUT_SESSION_ID}`;

    // Managed payments only accept a product that carries an eligible tax code,
    // and an inline product_data tax code is not honoured — so the product is
    // created first. txcd_10000000 = "General – electronically supplied
    // services", the closest code Managed Payments accepts for event tickets.
    const product = await stripe.products.create({
      name: tier.name,
      tax_code: "txcd_10000000",
      metadata: { tierId: tier.id, eventId: input.eventId },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      customer_email: input.email,
      expires_at: Math.floor(Date.now() / 1000) + HOLD_MINUTES * 60,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: tier.currency.toLowerCase(),
            unit_amount: chargedCents,
            product: product.id,
          },
        },
      ],
      payment_intent_data: { description: tier.name },
      metadata: {
        registrationId: registrationId,
        eventId: input.eventId,
        tierId: tier.id,
        ...(userId ? { userId } : {}),
      },
      managed_payments: { enabled: true },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await supabaseAdmin
      .from("event_registrations")
      // The environment travels with the row: a later refund must reach the
      // same Stripe account that took the money.
      .update({ stripe_session_id: session.id, payment_environment: input.environment })
      .eq("id", registrationId);

    if (!session.client_secret) throw new Error("Stripe returned no client secret");
    return { ok: true, kind: "paid", clientSecret: session.client_secret };
  } catch (e) {
    // The seat must not stay held behind a checkout that never opened.
    await supabaseAdmin
      .from("event_registrations")
      .update({ payment_status: "expired", status: "cancelled" })
      .eq("id", registrationId);
    console.error("Stripe checkout creation failed", e);
    return { ok: false, reason: "payment" };
  }
}

/**
 * Name and email to prefill a registration form for a signed-in visitor.
 * Prefers the linked member record; falls back to the account email.
 */
export async function loadRegistrationIdentity(
  userId: string,
  fallbackEmail: string | null,
): Promise<{ fullName: string; email: string }> {
  const { data: member } = await supabaseAdmin
    .from("members")
    .select("first_name, last_name, full_name, email")
    .eq("auth_user_id", userId)
    .maybeSingle();

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  const join = (a?: string | null, b?: string | null) => [a, b].filter(Boolean).join(" ").trim();
  return {
    fullName:
      join(member?.first_name, member?.last_name) ||
      (member?.full_name ?? "") ||
      join(profile?.first_name, profile?.last_name),
    email: member?.email ?? fallbackEmail ?? "",
  };
}
