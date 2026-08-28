/**
 * "Request a Guest Pass" panel on the public event page.
 *
 * Shown only on events whose organiser switched guest passes on. An active,
 * signed-in member shares only the guest's name and email; their own details
 * come from their member record and are read-only, because the pass is tied to
 * the inviter the server resolves, not to anything typed here. The guest then
 * completes their own profile on a personal link — only afterwards does
 * Membership & Engagement see a request to decide on.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import { getEventTicketing } from "@/lib/tickets.functions";
import { Button, Checkbox, Input, Label } from "@/design-system/icf-welcome-design-system-a835df";
import { CARD_SHADOW } from "@/components/site-chrome";
import {
  getMyGuestPassContext,
  submitGuestPassRequest,
  type GuestPassOutcome,
} from "@/lib/guest-passes.functions";
import type { PublicEvent } from "@/lib/events";

type FormState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "done" }
  | { kind: "error"; reason: GuestPassOutcome };

export function GuestPassPanel({ event }: { event: PublicEvent }) {
  const { t, locale } = useI18n();
  const eventId = event.id!;

  const session = useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
    staleTime: 5 * 60_000,
  });
  const signedIn = Boolean(session.data);

  // The organiser's toggle is the gate; it lives on the public ticketing read.
  const ticketing = useQuery({
    queryKey: ["event-ticketing", eventId, locale],
    queryFn: () => getEventTicketing({ data: { eventId, locale } }),
    staleTime: 30_000,
  });

  const ctx = useQuery({
    queryKey: ["guest-pass-context", eventId],
    queryFn: () => getMyGuestPassContext({ data: { eventId } }),
    enabled: signedIn && session.isFetched,
    retry: false,
    staleTime: 60_000,
  });

  const [guestFullName, setGuestFullName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [attested, setAttested] = useState(false);
  const [state, setState] = useState<FormState>({ kind: "idle" });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState({ kind: "saving" });
    try {
      // Only the guest's name and email travel with the member's request now;
      // the guest fills in everything else on their own claim page.
      const result = await submitGuestPassRequest({
        data: {
          eventId,
          guestFullName,
          guestEmail,
          attested,
        },
      });
      if (result.outcome === "ok") setState({ kind: "done" });
      else setState({ kind: "error", reason: result.outcome });
    } catch {
      setState({ kind: "error", reason: "error" });
    }
  };

  // A visitor who is not an active member never sees the form — only the note
  // that guest passes belong to membership.
  if (!ticketing.data?.guestPassesAllowed) return null;
  if (signedIn && ctx.isPending) return null;
  const isMember = Boolean(ctx.data?.isMember);

  const shell = (children: ReactNode) => (
    <section
      className={"mt-4 h-fit rounded-2xl border border-border/70 bg-card p-6 " + CARD_SHADOW}
    >
      <p className="eyebrow text-muted-foreground">{t("events.guestPass.eyebrow")}</p>
      <h2 className="mt-2 font-heading text-xl">{t("events.guestPass.title")}</h2>
      {children}
    </section>
  );

  if (!isMember) {
    return shell(
      <p className="mt-3 text-sm text-muted-foreground">{t("events.guestPass.membersOnly")}</p>,
    );
  }

  const inviter = ctx.data?.inviter;

  if (state.kind === "done") {
    return shell(
      <p className="mt-3 text-sm font-semibold text-teal-foreground">
        {t("events.guestPass.success")}
      </p>,
    );
  }

  if (ctx.data?.alreadyRequested) {
    return shell(
      <p className="mt-3 text-sm text-muted-foreground">
        {t("events.guestPass.alreadyRequested")}
      </p>,
    );
  }

  return shell(
    <>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t("events.guestPass.intro")}
      </p>

      <div className="mt-4 rounded-xl bg-secondary px-3 py-3 text-xs leading-relaxed">
        <p className="font-semibold">{t("events.guestPass.inviterTitle")}</p>
        <p className="mt-1 text-muted-foreground">
          {inviter?.name}
          {inviter?.email ? ` · ${inviter.email}` : ""}
          {inviter?.memberNumber
            ? ` · ${t("events.guestPass.memberNumber")} ${inviter.memberNumber}`
            : ""}
        </p>
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <Label htmlFor="gp-name">{t("events.guestPass.fieldName")}</Label>
          <Input
            id="gp-name"
            required
            maxLength={120}
            value={guestFullName}
            onChange={(e) => setGuestFullName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="gp-email">{t("events.guestPass.fieldEmail")}</Label>
          <Input
            id="gp-email"
            type="email"
            required
            maxLength={255}
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
          />
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-secondary px-3 py-3">
          <Checkbox
            id="gp-attestation"
            checked={attested}
            onCheckedChange={(value) => setAttested(value === true)}
            className="mt-0.5"
          />
          <Label htmlFor="gp-attestation" className="text-xs leading-relaxed">
            {t("events.guestPass.attestation")}
          </Label>
        </div>

        {state.kind === "error" ? (
          <p className="text-xs text-warn">{t(`events.guestPass.error.${state.reason}`)}</p>
        ) : null}

        <Button
          type="submit"
          size="pill"
          disabled={state.kind === "saving" || !attested}
          className="w-full"
        >
          {state.kind === "saving" ? t("events.guestPass.saving") : t("events.guestPass.submit")}
        </Button>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("events.guestPass.privacy")}
        </p>
      </form>
    </>,
  );
}
