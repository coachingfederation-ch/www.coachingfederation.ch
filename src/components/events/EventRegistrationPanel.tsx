/**
 * Event registration: ticket tiers, member pricing, custom questions and
 * Stripe Checkout.
 *
 * The panel is deliberately advisory. Entitlement, price, capacity and the
 * registration window are all decided server-side; what happens here is
 * showing the visitor what the server will do and why. An event with no tiers
 * behaves exactly as it did before ticketing existed.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LocaleLink, useI18n } from "@/i18n";
import { localizePath } from "@/i18n/config";
import { supabase } from "@/integrations/supabase/client";
import { CARD_SHADOW } from "@/components/site-chrome";
import { PaymentOverlay } from "@/components/events/PaymentOverlay";
import { isPastEvent, type PublicEvent } from "@/lib/events";
import { trackGoal } from "@/lib/plausible";
import {
  cancelMyRegistration,
  getMyRegistration,
  submitGuestRegistration,
  submitMemberRegistration,
} from "@/lib/events.functions";
import {
  getEventTicketing,
  getMyMembershipState,
  getMyRegistrationIdentity,
  confirmCheckoutSession,
  verifyMemberId,
} from "@/lib/tickets.functions";
import {
  formatPrice,
  memberTier as findMemberTier,
  nonMemberTier as findNonMemberTier,
  selectableTiers,
  type MembershipState,
  type PublicTier,
} from "@/lib/tickets";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";

type Reason =
  | "full"
  | "closed"
  | "duplicate"
  | "members_only"
  | "tier_required"
  | "tier_unavailable"
  | "answers"
  | "payment"
  | "error";

type FormState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "done" }
  | { kind: "paying"; clientSecret: string }
  // The overlay was dismissed: the registration and the Stripe session still
  // exist, so re-opening resumes the same checkout instead of creating a new one.
  | { kind: "held"; clientSecret: string }
  | { kind: "error"; reason: Reason };

type ReturnState = "paid" | "pending" | "failed" | null;

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

/** Draft answers survive the sign-in round trip, so nothing typed is lost. */
function draftKey(eventId: string) {
  return `icf.event-rsvp.${eventId}`;
}

export function EventRegistrationPanel({ event }: { event: PublicEvent }) {
  const { t, locale } = useI18n();
  const eventId = event.id!;
  const slug = event.slug ?? "";
  const past = isPastEvent(event);

  const session = useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
    staleTime: 5 * 60_000,
  });
  const signedIn = Boolean(session.data);

  const mine = useQuery({
    queryKey: ["my-event-registration", eventId],
    queryFn: () => getMyRegistration({ data: { eventId } }),
    enabled: signedIn && session.isFetched,
    retry: false,
  });

  const ticketing = useQuery({
    queryKey: ["event-ticketing", eventId, locale],
    queryFn: () => getEventTicketing({ data: { eventId, locale } }),
    staleTime: 30_000,
  });

  const membershipQuery = useQuery({
    queryKey: ["my-membership-state"],
    queryFn: () => getMyMembershipState(),
    enabled: signedIn && session.isFetched,
    retry: false,
    staleTime: 5 * 60_000,
  });
  // An ICF member id confirmed by the server unlocks member pricing for this
  // registration even without an account link. The server re-checks it.
  const [memberId, setMemberId] = useState("");
  const [memberIdState, setMemberIdState] = useState<"idle" | "checking" | "confirmed" | "failed">(
    "idle",
  );
  const accountMembership: MembershipState = signedIn
    ? ((membershipQuery.data as MembershipState | undefined) ?? "not_member")
    : "signed_out";
  const membership: MembershipState = memberIdState === "confirmed" ? "member" : accountMembership;
  const membershipResolving = signedIn && membershipQuery.isPending;

  // Signed-in visitors get their name and email filled in; both stay editable.
  const identity = useQuery({
    queryKey: ["my-registration-identity"],
    queryFn: () => getMyRegistrationIdentity(),
    enabled: signedIn && session.isFetched,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const applyMemberId = async () => {
    const candidate = memberId.trim();
    if (!candidate) return;
    setMemberIdState("checking");
    try {
      const result = await verifyMemberId({ data: { memberId: candidate } });
      setMemberIdState(result.confirmed ? "confirmed" : "failed");
    } catch {
      setMemberIdState("failed");
    }
  };

  const tiers = useMemo(() => ticketing.data?.tiers ?? [], [ticketing.data]);
  const fields = ticketing.data?.fields ?? [];
  const hasTiers = tiers.length > 0;
  const allowed = useMemo(() => selectableTiers(tiers, membership), [tiers, membership]);
  const memberTier = findMemberTier(tiers);
  const standardTier = findNonMemberTier(tiers);
  const allSoldOut = hasTiers && tiers.every((tier) => tier.isSoldOut);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [tierId, setTierId] = useState<string | null>(null);
  const [state, setState] = useState<FormState>({ kind: "idle" });
  const [returned, setReturned] = useState<ReturnState>(null);

  // Restore a draft left behind by a sign-in detour.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(draftKey(eventId));
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as {
        fullName?: string;
        email?: string;
        notes?: string;
        answers?: Record<string, string>;
      };
      setFullName(draft.fullName ?? "");
      setEmail(draft.email ?? "");
      setNotes(draft.notes ?? "");
      setAnswers(draft.answers ?? {});
    } catch {
      window.sessionStorage.removeItem(draftKey(eventId));
    }
  }, [eventId]);

  // Only fills blanks, so a restored draft or anything already typed wins.
  useEffect(() => {
    const data = identity.data;
    if (!data) return;
    if (data.fullName) setFullName((current) => current || data.fullName);
    if (data.email) setEmail((current) => current || data.email);
  }, [identity.data]);

  // Membership can change the applicable tier (sign-in, or a sold-out member
  // tier), so follow the server's default until the visitor picks explicitly.
  useEffect(() => {
    const preferred = ticketing.data?.defaultTierId ?? null;
    setTierId((current) => {
      if (current && allowed.some((tier) => tier.id === current && !tier.isSoldOut)) return current;
      if (membership === "member") {
        const member = tiers.find((tier) => tier.segment === "member" && !tier.isSoldOut);
        if (member) return member.id;
      }
      const open = allowed.find((tier) => !tier.isSoldOut);
      return open?.id ?? preferred;
    });
  }, [allowed, membership, tiers, ticketing.data]);

  // Stripe sends the visitor back here; reconcile before showing an outcome.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "return") return;
    const sessionId = params.get("session_id");
    params.delete("checkout");
    params.delete("session_id");
    const query = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (query ? `?${query}` : ""));
    if (!sessionId) {
      setReturned("failed");
      return;
    }
    void confirmCheckoutSession({
      data: { sessionId, environment: getStripeEnvironment() },
    }).then((result) => {
      setReturned(result.status);
      if (result.status === "paid") {
        trackGoal("Event Registration Paid", { event_slug: slug });
        void mine.refetch();
      }
    });
    // Runs once per mount: the return parameters are consumed immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Four registration modes: no registration, public RSVP, members-only RSVP
  // (with an optional "allow without a membership" flag) and ticketed RSVP.
  const mode = event.registration_mode ?? "none";
  const rsvpMode = mode !== "none";
  const ticketMode = mode === "rsvp_tickets";
  const membersOnly = mode === "rsvp_members" && event.guest_registration_allowed === false;

  // A tier only applies on a ticketed event, even if tiers linger from an
  // earlier configuration.
  const selected: PublicTier | null =
    ticketMode && tierId ? (tiers.find((tier) => tier.id === tierId) ?? null) : null;
  const freeLabel = t("events.detail.tickets.free");
  const priceOf = (tier: PublicTier) =>
    formatPrice(tier.priceCents, tier.currency, locale, freeLabel);

  const saving =
    memberTier && standardTier && standardTier.priceCents > memberTier.priceCents
      ? formatPrice(
          standardTier.priceCents - memberTier.priceCents,
          memberTier.currency,
          locale,
          freeLabel,
        )
      : null;

  const showTiers = ticketMode && hasTiers;
  const membersGate = membersOnly && membership !== "member";
  const needsPayment = Boolean(selected && selected.priceCents > 0);
  const paymentsBroken = needsPayment && !paymentsConfigured();

  const signInHref = `/auth?next=${encodeURIComponent(localizePath(`/events/${slug}`, locale))}`;

  const persistDraft = () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(
      draftKey(eventId),
      JSON.stringify({ fullName, email, notes, answers }),
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ kind: "saving" });
    const payload = {
      eventId,
      slug,
      locale,
      fullName,
      email,
      notes: notes || null,
      tierId: ticketMode ? tierId : null,
      memberId: memberIdState === "confirmed" ? memberId.trim() : null,
      answers,
      environment: paymentsConfigured() ? getStripeEnvironment() : ("sandbox" as const),
    };
    const result = signedIn
      ? await submitMemberRegistration({ data: payload })
      : await submitGuestRegistration({ data: payload });

    if (!result.ok) {
      setState({ kind: "error", reason: result.reason });
      void ticketing.refetch();
      return;
    }
    if (typeof window !== "undefined") window.sessionStorage.removeItem(draftKey(eventId));
    if (result.kind === "paid") {
      setState({ kind: "paying", clientSecret: result.clientSecret });
      return;
    }
    setState({ kind: "done" });
    trackGoal("Event Registration", { event_slug: slug, member: membership === "member" });
    if (signedIn) void mine.refetch();
    void ticketing.refetch();
  };

  const cancel = async () => {
    const id = mine.data?.id;
    if (!id) return;
    await cancelMyRegistration({ data: { registrationId: id } });
    setState({ kind: "idle" });
    void mine.refetch();
    void ticketing.refetch();
  };

  // Keyed on the secret itself so the options object is stable for as long as
  // the provider is mounted — Stripe rejects a changed secret in place.
  const clientSecret =
    state.kind === "paying" || state.kind === "held" ? state.clientSecret : null;
  const checkoutOptions = useMemo(
    () => ({ fetchClientSecret: async () => clientSecret ?? "" }),
    [clientSecret],
  );

  const notice = (text: string, tone: "info" | "good" | "warn" = "info") => (
    <p
      className={
        "mt-4 rounded-xl px-3 py-2 text-xs leading-relaxed " +
        (tone === "good"
          ? "bg-teal-soft text-teal-foreground"
          : tone === "warn"
            ? "bg-warn-soft text-[color:var(--warn)]"
            : "bg-secondary text-muted-foreground")
      }
    >
      {text}
    </p>
  );

  /** Sign-in prompt plus ICF member id entry, shared by the members-only gate
   *  and the member-pricing hint on ticketed events. */
  const memberIdBlock = (
    prompt: string,
    withSignInLink = true,
    className = "mt-4 rounded-xl bg-secondary px-3 py-3",
  ) => (
    <div className={className}>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {prompt}{" "}
        {withSignInLink && !signedIn ? (
          <a
            href={signInHref}
            onClick={persistDraft}
            className="font-semibold text-primary hover:underline"
          >
            {t("events.detail.signIn")}
          </a>
        ) : null}
      </p>
      <label className="mt-3 block text-xs font-semibold" htmlFor="rsvp-member-id">
        {t("events.detail.tickets.memberIdLabel")}
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="rsvp-member-id"
          value={memberId}
          inputMode="numeric"
          autoComplete="off"
          placeholder={t("events.detail.tickets.memberIdPlaceholder")}
          onChange={(e) => {
            setMemberId(e.target.value);
            setMemberIdState("idle");
          }}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => void applyMemberId()}
          disabled={!memberId.trim() || memberIdState === "checking"}
          className="shrink-0 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-background disabled:opacity-50"
        >
          {memberIdState === "checking"
            ? t("events.detail.tickets.memberIdChecking")
            : t("events.detail.tickets.memberIdApply")}
        </button>
      </div>
      {memberIdState === "failed" ? (
        <p className="mt-2 text-xs text-[color:var(--warn)]">
          {t("events.detail.tickets.memberIdFailed")}
        </p>
      ) : null}
    </div>
  );

  const body = () => {
    if (!rsvpMode) {
      return (
        <p className="mt-4 text-sm text-muted-foreground">{t("events.detail.noRegistration")}</p>
      );
    }
    if (past)
      return <p className="mt-4 text-sm text-muted-foreground">{t("events.detail.pastEvent")}</p>;
    if (returned === "paid")
      return (
        <p className="mt-4 text-sm font-semibold text-teal-foreground">
          {t("events.detail.tickets.returnPaid")}
        </p>
      );
    if (returned === "pending") return notice(t("events.detail.tickets.returnPending"), "warn");
    if (mine.data) {
      const pending = mine.data.payment_status === "pending";
      // A paid seat is cancelled by the chapter, so the refund decision and
      // the notification stay in one hand.
      const paid = mine.data.payment_status === "paid";
      return (
        <div className="mt-4">
          <p className="text-sm font-semibold text-teal-foreground">
            {pending ? t("events.detail.tickets.pendingPayment") : t("events.detail.youAreIn")}
          </p>
          {paid ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("events.detail.tickets.cancelPaidNote")}
            </p>
          ) : (
            <button
              onClick={() => void cancel()}
              className="mt-4 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary"
            >
              {t("events.detail.cancel")}
            </button>
          )}
        </div>
      );
    }
    if (state.kind === "done")
      return (
        <p className="mt-4 text-sm font-semibold text-teal-foreground">
          {t("events.detail.confirmed")}
        </p>
      );
    // While the overlay is open — or after it was dismissed — the panel keeps
    // the seat visible instead of falling back to an empty form.
    if (state.kind === "paying" || state.kind === "held") {
      return (
        <div className="mt-4">
          <p className="text-sm font-semibold">{t("events.detail.tickets.paymentTitle")}</p>
          {notice(t("events.detail.tickets.paymentHeld"))}
          <button
            type="button"
            onClick={() => setState({ kind: "paying", clientSecret: state.clientSecret })}
            className="mt-4 min-h-11 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {t("events.detail.tickets.paymentResume")}
          </button>
        </div>
      );
    }
    if (event.is_full || (ticketMode && allSoldOut))
      return (
        <p className="mt-4 text-sm text-muted-foreground">
          {ticketMode && allSoldOut
            ? t("events.detail.tickets.allSoldOut")
            : t("events.detail.full")}
        </p>
      );
    if (!event.registration_open)
      return <p className="mt-4 text-sm text-muted-foreground">{t("events.detail.closed")}</p>;
    // Members-only: the form stays locked until membership is confirmed, either
    // by signing in with a linked account or by verifying an ICF member id.
    if (membersGate)
      return (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{t("events.detail.membersOnly")}</p>
          {!signedIn ? (
            <a
              href={signInHref}
              onClick={persistDraft}
              className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              {t("events.detail.signIn")}
            </a>
          ) : null}
          {memberIdBlock(
            accountMembership === "not_member"
              ? t("events.detail.tickets.notMember")
              : t("events.detail.membersOnlyPrompt"),
            false,
          )}
        </div>
      );

    return (
      <form onSubmit={submit} className="mt-4 space-y-3">
        {ticketMode && ticketing.isPending ? (
          <p className="text-sm text-muted-foreground">{t("events.detail.tickets.loading")}</p>
        ) : showTiers ? (
          <fieldset>
            <legend className="text-xs font-semibold">{t("events.detail.tickets.choose")}</legend>
            <div className="mt-2 space-y-2">
              {tiers.map((tier) => {
                const locked = tier.segment === "member" && membership !== "member";
                const disabled = tier.isSoldOut || locked;
                return (
                  <div
                    key={tier.id}
                    className={
                      "rounded-xl border text-sm transition " +
                      (tierId === tier.id
                        ? "border-primary bg-primary/5"
                        : "border-border/70")
                    }
                  >
                    <label
                      className={
                        "flex items-start gap-3 p-3 " +
                        (disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")
                      }
                    >
                    <input
                      type="radio"
                      name="ticket-tier"
                      className="mt-1"
                      value={tier.id}
                      checked={tierId === tier.id}
                      disabled={disabled}
                      onChange={() => setTierId(tier.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold">{tier.name}</span>
                        <span className="shrink-0 font-semibold">{priceOf(tier)}</span>
                      </span>
                      {tier.description ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {tier.description}
                        </span>
                      ) : null}
                      <span className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
                        {tier.segment === "member" ? (
                          <span>{t("events.detail.tickets.memberBadge")}</span>
                        ) : tier.segment === "non_member" ? (
                          <span>{t("events.detail.tickets.nonMemberBadge")}</span>
                        ) : null}
                        {tier.isSoldOut ? (
                          <span className="text-[color:var(--warn)]">
                            {t("events.detail.tickets.soldOut")}
                          </span>
                        ) : tier.seatsRemaining !== null ? (
                          <span>
                            {t("events.detail.tickets.seatsLeft").replace(
                              "{n}",
                              String(tier.seatsRemaining),
                            )}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    </label>
                    {/* The member-id unlock lives inside the member tier itself:
                        the ask ("prove membership") and the reward (the member
                        price) belong to the same decision. */}
                    {locked && !tier.isSoldOut
                      ? memberIdBlock(
                          accountMembership === "not_member"
                            ? t("events.detail.tickets.notMember")
                            : t("events.detail.tickets.signedOutPrompt"),
                          true,
                          "border-t border-border/70 px-3 py-3",
                        )
                      : null}
                  </div>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {showTiers && membershipResolving
          ? notice(t("events.detail.tickets.membershipChecking"))
          : null}
        {showTiers && memberTier && accountMembership === "member" && !memberTier.isSoldOut
          ? notice(
              t("events.detail.tickets.memberApplied") +
                (saving
                  ? " " + t("events.detail.tickets.memberSaving").replace("{amount}", saving)
                  : ""),
              "good",
            )
          : null}
        {showTiers && memberTier && membership === "member" && memberTier.isSoldOut
          ? notice(t("events.detail.tickets.memberSoldOut"), "warn")
          : null}
        {showTiers && memberTier && memberIdState === "confirmed"
          ? notice(t("events.detail.tickets.memberIdConfirmed"), "good")
          : null}

        <label className="block text-xs font-semibold" htmlFor="rsvp-name">
          {t("events.detail.fieldName")}
        </label>
        <input
          id="rsvp-name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClass}
        />
        <label className="block text-xs font-semibold" htmlFor="rsvp-email">
          {t("events.detail.fieldEmail")}
        </label>
        <input
          id="rsvp-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />

        {fields.map((field) => {
          const id = `rsvp-field-${field.id}`;
          const value = answers[field.key] ?? "";
          const update = (next: string) => setAnswers((prev) => ({ ...prev, [field.key]: next }));
          if (field.type === "checkbox") {
            return (
              <label key={field.id} className="flex items-start gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  required={field.required}
                  checked={value === "true"}
                  onChange={(e) => update(e.target.checked ? "true" : "false")}
                />
                <span>{field.label}</span>
              </label>
            );
          }
          return (
            <div key={field.id}>
              <label className="block text-xs font-semibold" htmlFor={id}>
                {field.label}
              </label>
              {field.type === "single_choice" ? (
                <select
                  id={id}
                  required={field.required}
                  value={value}
                  onChange={(e) => update(e.target.value)}
                  className={inputClass}
                >
                  <option value="" />
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.type === "long_text" ? (
                <textarea
                  id={id}
                  rows={3}
                  required={field.required}
                  value={value}
                  onChange={(e) => update(e.target.value)}
                  className={inputClass}
                />
              ) : (
                <input
                  id={id}
                  required={field.required}
                  value={value}
                  onChange={(e) => update(e.target.value)}
                  className={inputClass}
                />
              )}
            </div>
          );
        })}

        <label className="block text-xs font-semibold" htmlFor="rsvp-notes">
          {t("events.detail.fieldNotes")}
        </label>
        <textarea
          id="rsvp-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputClass}
        />

        {selected ? (
          <p className="text-sm font-semibold">
            {selected.priceCents > 0
              ? t("events.detail.tickets.total").replace("{amount}", priceOf(selected))
              : t("events.detail.tickets.totalFree")}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={
            state.kind === "saving" ||
            paymentsBroken ||
            (showTiers && (!selected || selected.isSoldOut))
          }
          className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {state.kind === "saving"
            ? t("events.detail.saving")
            : needsPayment
              ? t("events.detail.tickets.payAndRegister")
              : t("events.detail.rsvp")}
        </button>
        {paymentsBroken ? notice(t("events.detail.tickets.paymentsUnavailable"), "warn") : null}
        {state.kind === "error" ? (
          <p className="text-sm text-destructive">{t(`events.detail.error.${state.reason}`)}</p>
        ) : null}
        {returned === "failed" ? notice(t("events.detail.tickets.returnFailed"), "warn") : null}
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("events.detail.privacy")}
        </p>
      </form>
    );
  };

  return (
    <aside
      className={
        "h-fit rounded-2xl border border-border/70 bg-card p-6 lg:sticky lg:top-8 " + CARD_SHADOW
      }
    >
      <p className="eyebrow">{t("events.detail.rsvpEyebrow")}</p>
      {body()}
      <PaymentOverlay
        open={state.kind === "paying"}
        onClose={() =>
          setState((current) =>
            current.kind === "paying"
              ? { kind: "held", clientSecret: current.clientSecret }
              : current,
          )
        }
        title={t("events.detail.tickets.paymentTitle")}
        closeLabel={t("events.detail.tickets.paymentClose")}
        eventTitle={event.title ?? ""}
        summary={selected ? `${selected.name} · ${priceOf(selected)}` : null}
        options={checkoutOptions}
      />
    </aside>
  );
}
