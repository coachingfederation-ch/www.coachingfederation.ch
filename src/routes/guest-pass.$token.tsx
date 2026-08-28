/**
 * Guest Pass claim page (/guest-pass/$token).
 *
 * Public and unauthenticated: the token in the URL is the credential, so the
 * page is never indexed and never shows anything about the guest beyond what
 * they were already told (their own name and who invited them). Submitting
 * moves the pass from `invited` to `pending` for Membership & Engagement.
 */
import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Button,
  Checkbox,
  Input,
  Label,
  Textarea,
} from "@/design-system/icf-welcome-design-system-a835df";
import { SiteFooter, SiteHeaderBar } from "@/components/site-chrome";
import { useCms } from "@/i18n/cms";
import { completeGuestPassClaim, getGuestPassClaim } from "@/lib/guest-passes.functions";
import type { Locale } from "@/i18n/config";

export const Route = createFileRoute("/guest-pass/$token")({
  loader: async ({ params }) => {
    const claim = await getGuestPassClaim({ data: { token: params.token } });
    if (!claim) throw notFound();
    return { claim };
  },
  head: () => {
    const title = "Your guest pass — The Switzerland Chapter of ICF";
    const description =
      "Complete your details so we can review your Guest Pass and register you for the event.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  errorComponent: () => <GuestPassFallback />,
  notFoundComponent: () => <GuestPassFallback />,
  component: GuestPassClaimRoute,
});

function GuestPassFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderBar compact standalone />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-24">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          This invitation is no longer valid
        </h1>
        <p className="mt-3 text-muted-foreground">
          The link may already have been used, or the Guest Pass was withdrawn. Write to
          office@coachingfederation.ch and we will help.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

const LANGUAGES: Locale[] = ["de", "fr", "it", "en"];

function GuestPassClaimRoute() {
  const { claim } = Route.useLoaderData();
  const params = Route.useParams();
  const { t, locale } = useCms();

  const [preferredLanguage, setPreferredLanguage] = useState<Locale>(locale);
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [coachingLevel, setCoachingLevel] = useState("");
  const [focus, setFocus] = useState("");
  const [associations, setAssociations] = useState("");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "saving" } | { kind: "done" } | { kind: "error"; reason: string }
  >({ kind: "idle" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ kind: "saving" });
    try {
      const result = await completeGuestPassClaim({
        data: {
          token: params.token,
          guestPreferredLanguage: preferredLanguage,
          guestPhone: phone || undefined,
          guestLocation: location || undefined,
          guestCoachingLevel: coachingLevel || undefined,
          guestProfessionalFocus: focus || undefined,
          guestOtherAssociations: associations || undefined,
          guestNotes: notes || undefined,
          followUpConsent: followUp,
        },
      });
      if (result.ok || result.reason === "already_completed") setState({ kind: "done" });
      else setState({ kind: "error", reason: result.reason ?? "error" });
    } catch {
      setState({ kind: "error", reason: "error" });
    }
  };

  const when = claim.eventStartsAt
    ? new Date(claim.eventStartsAt).toLocaleString(locale, {
        dateStyle: "full",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderBar compact standalone />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14">
        <p className="eyebrow text-primary">{t("events.guestPass.claim.eyebrow")}</p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {t("events.guestPass.claim.title")}
        </h1>

        <div className="mt-8 rounded-3xl border border-border bg-card p-6 sm:p-8">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("events.guestPass.claim.invitedBy")}
              </dt>
              <dd className="mt-1 font-semibold">{claim.invitingMemberName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("events.guestPass.claim.guest")}
              </dt>
              <dd className="mt-1 font-semibold">{claim.guestFullName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("events.guestPass.claim.event")}
              </dt>
              <dd className="mt-1 font-semibold">{claim.eventTitle}</dd>
            </div>
            {when ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("events.guestPass.claim.when")}
                </dt>
                <dd className="mt-1 font-semibold">{when}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        {state.kind === "done" ? (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold">
              {t("events.guestPass.claim.successTitle")}
            </h2>
            <p className="mt-2 text-muted-foreground">{t("events.guestPass.claim.successBody")}</p>
            <Button asChild size="pill" className="mt-6">
              <Link to="/events">{t("events.guestPass.claim.browseEvents")}</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-6">
            <p className="text-muted-foreground">{t("events.guestPass.claim.intro")}</p>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="gp-language">{t("events.guestPass.claim.fieldLanguage")}</Label>
                <div className="mt-2 flex flex-wrap gap-2" id="gp-language">
                  {LANGUAGES.map((code) => (
                    <Button
                      key={code}
                      type="button"
                      size="pill"
                      variant={preferredLanguage === code ? "default" : "outline"}
                      onClick={() => setPreferredLanguage(code)}
                    >
                      {code.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="gp-phone">{t("events.guestPass.claim.fieldPhone")}</Label>
                <Input
                  id="gp-phone"
                  className="mt-2"
                  value={phone}
                  maxLength={60}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="gp-location">{t("events.guestPass.claim.fieldLocation")}</Label>
                <Input
                  id="gp-location"
                  className="mt-2"
                  value={location}
                  maxLength={120}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="gp-level">{t("events.guestPass.claim.fieldCoachingLevel")}</Label>
                <Input
                  id="gp-level"
                  className="mt-2"
                  value={coachingLevel}
                  maxLength={160}
                  onChange={(e) => setCoachingLevel(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="gp-focus">{t("events.guestPass.claim.fieldFocus")}</Label>
                <Input
                  id="gp-focus"
                  className="mt-2"
                  value={focus}
                  maxLength={200}
                  onChange={(e) => setFocus(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="gp-assoc">{t("events.guestPass.claim.fieldAssociations")}</Label>
                <Input
                  id="gp-assoc"
                  className="mt-2"
                  value={associations}
                  maxLength={200}
                  onChange={(e) => setAssociations(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="gp-notes">{t("events.guestPass.claim.fieldNotes")}</Label>
                <Textarea
                  id="gp-notes"
                  className="mt-2"
                  value={notes}
                  maxLength={1000}
                  rows={4}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-sm font-bold">{t("events.guestPass.claim.privacyTitle")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("events.guestPass.claim.privacyNotice")}{" "}
                <Link to="/privacy" className="font-semibold text-primary underline">
                  {t("events.guestPass.claim.privacyLink")}
                </Link>
              </p>
              <div className="mt-5 flex items-start gap-3">
                <Checkbox
                  id="gp-followup"
                  checked={followUp}
                  onCheckedChange={(v) => setFollowUp(v === true)}
                />
                <Label htmlFor="gp-followup" className="text-sm leading-relaxed font-normal">
                  {t("events.guestPass.claim.followUpConsent")}
                </Label>
              </div>
            </div>

            {state.kind === "error" ? (
              <p className="text-sm font-semibold text-destructive">
                {t(`events.guestPass.claim.error.${state.reason}`)}
              </p>
            ) : null}

            <Button type="submit" size="pill" disabled={state.kind === "saving"}>
              {state.kind === "saving"
                ? t("events.guestPass.claim.saving")
                : t("events.guestPass.claim.submit")}
            </Button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
