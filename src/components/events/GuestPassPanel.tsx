/**
 * "Request a Guest Pass" panel on the public event page.
 *
 * Shown only on events whose organiser switched guest passes on. An active,
 * signed-in member fills in the guest's details; their own details come from
 * their member record and are read-only, because the pass is tied to the
 * inviter the server resolves, not to anything typed here. The request goes to
 * Membership & Engagement as pending — nothing is confirmed on this screen.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import { getEventTicketing } from "@/lib/tickets.functions";
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/icf-welcome-design-system-a835df";
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
  const [guestPhone, setGuestPhone] = useState("");
  const [guestLocation, setGuestLocation] = useState("");
  const [guestPreferredLanguage, setGuestPreferredLanguage] = useState<"de" | "fr" | "it" | "en">(
    "de",
  );
  const [guestCoachingLevel, setGuestCoachingLevel] = useState("");
  const [guestProfessionalFocus, setGuestProfessionalFocus] = useState("");
  const [guestOtherAssociations, setGuestOtherAssociations] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
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
          attested: true,
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
        <div>
          <Label htmlFor="gp-phone">{t("events.guestPass.fieldPhone")}</Label>
          <Input
            id="gp-phone"
            required
            maxLength={60}
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="gp-location">{t("events.guestPass.fieldLocation")}</Label>
          <Input
            id="gp-location"
            required
            maxLength={120}
            value={guestLocation}
            onChange={(e) => setGuestLocation(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="gp-language">{t("events.guestPass.fieldLanguage")}</Label>
          <Select
            value={guestPreferredLanguage}
            onValueChange={(value) => setGuestPreferredLanguage(value as "de" | "fr" | "it" | "en")}
          >
            <SelectTrigger id="gp-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="it">Italiano</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="gp-level">{t("events.guestPass.fieldCoachingLevel")}</Label>
          <Input
            id="gp-level"
            required
            maxLength={160}
            value={guestCoachingLevel}
            onChange={(e) => setGuestCoachingLevel(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="gp-focus">{t("events.guestPass.fieldFocus")}</Label>
          <Input
            id="gp-focus"
            required
            maxLength={200}
            value={guestProfessionalFocus}
            onChange={(e) => setGuestProfessionalFocus(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="gp-associations">{t("events.guestPass.fieldAssociations")}</Label>
          <Input
            id="gp-associations"
            maxLength={200}
            value={guestOtherAssociations}
            onChange={(e) => setGuestOtherAssociations(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="gp-notes">{t("events.guestPass.fieldNotes")}</Label>
          <Textarea
            id="gp-notes"
            rows={3}
            maxLength={1000}
            value={guestNotes}
            onChange={(e) => setGuestNotes(e.target.value)}
          />
        </div>

        {state.kind === "error" ? (
          <p className="text-xs text-warn">{t(`events.guestPass.error.${state.reason}`)}</p>
        ) : null}

        <Button type="submit" size="pill" disabled={state.kind === "saving"} className="w-full">
          {state.kind === "saving" ? t("events.guestPass.saving") : t("events.guestPass.submit")}
        </Button>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("events.guestPass.privacy")}
        </p>
      </form>
    </>,
  );
}
