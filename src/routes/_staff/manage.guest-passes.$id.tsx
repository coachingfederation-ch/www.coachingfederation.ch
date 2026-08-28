/**
 * Membership & Engagement detail view for one guest pass
 * (/_staff/manage/guest-passes/$id).
 * Exports: Route.
 *
 * This is the only screen that shows what the guest wrote about themselves.
 * The list stays deliberately thin; community leaders never see any of it.
 * Like the list, the read happens in the component because it is a protected
 * server function and the staff shell is client-gated.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/design-system/icf-welcome-design-system-a835df";
import { Shell } from "@/components/cms/Shell";
import { useCms } from "@/i18n/cms";
import { requireStaffAccess, MEMBERSHIP_ROLES } from "@/lib/staff-guard";
import { getGuestPass, type StaffGuestPass } from "@/lib/guest-passes.functions";

/** Matches the purge job: the record lives 365 days past the event's end. */
const RETENTION_DAYS = 365;

export const Route = createFileRoute("/_staff/manage/guest-passes/$id")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, MEMBERSHIP_ROLES),
  head: () => ({
    meta: [
      { title: "Guest pass — The Switzerland Chapter of ICF CMS" },
      {
        name: "description",
        content: "Review one guest pass, the details the guest provided, consent and retention.",
      },
      { property: "og:title", content: "Guest pass — The Switzerland Chapter of ICF CMS" },
      {
        property: "og:description",
        content: "Review one guest pass, the details the guest provided, consent and retention.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GuestPassDetailPage,
});

function GuestPassDetailPage() {
  const { id } = Route.useParams();
  const { t, locale } = useCms();
  const [pass, setPass] = useState<StaffGuestPass | null | "loading">("loading");

  useEffect(() => {
    let active = true;
    getGuestPass({ data: { passId: id } })
      .then((row) => {
        if (active) setPass(row);
      })
      .catch(() => {
        if (active) setPass(null);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const formatDate = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleDateString(locale, { dateStyle: "long" }) : "—";

  const retentionUntil = (() => {
    if (!pass || pass === "loading" || !pass.eventEndsAt) return null;
    const end = new Date(pass.eventEndsAt);
    end.setDate(end.getDate() + RETENTION_DAYS);
    return end.toLocaleDateString(locale, { dateStyle: "long", timeZone: "Europe/Zurich" });
  })();

  return (
    <Shell>
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-10">
        <Link
          to="/manage/guest-passes"
          className="text-sm font-semibold text-primary underline underline-offset-4"
        >
          {t("guestPasses.detail.back")}
        </Link>

        {pass === "loading" ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="animate-spin" />
          </div>
        ) : pass === null ? (
          <p className="mt-8 rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {t("guestPasses.detail.notFound")}
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            <header className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-3xl text-primary">{pass.guestFullName}</h1>
                <Badge variant="secondary">{t(`guestPasses.status.${pass.status}`)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {pass.eventTitle} · {formatDate(pass.eventStartsAt)}
              </p>
            </header>

            <Section title={t("guestPasses.detail.guestSection")}>
              <Row label={t("guestPasses.detail.email")} value={pass.guestEmail} />
              <Row label={t("guestPasses.detail.phone")} value={pass.guestPhone} />
              <Row label={t("guestPasses.detail.location")} value={pass.guestLocation} />
              <Row
                label={t("guestPasses.detail.language")}
                value={pass.guestPreferredLanguage?.toUpperCase() ?? null}
              />
              <Row label={t("guestPasses.detail.requestedAt")} value={formatDate(pass.createdAt)} />
              <Row
                label={t("guestPasses.detail.completedAt")}
                value={
                  pass.guestCompletedAt
                    ? formatDate(pass.guestCompletedAt)
                    : t("guestPasses.detail.notCompleted")
                }
              />
            </Section>

            <Section title={t("guestPasses.detail.profileSection")}>
              <Row label={t("guestPasses.detail.coachingLevel")} value={pass.guestCoachingLevel} />
              <Row label={t("guestPasses.detail.focus")} value={pass.guestProfessionalFocus} />
              <Row
                label={t("guestPasses.detail.associations")}
                value={pass.guestOtherAssociations}
              />
              <Row label={t("guestPasses.detail.notes")} value={pass.guestNotes} />
            </Section>

            <Section title={t("guestPasses.detail.memberSection")}>
              <Row label={t("guestPasses.columns.member")} value={pass.invitingMemberName} />
              <Row label={t("guestPasses.detail.email")} value={pass.invitingMemberEmail} />
              <Row label={t("guestPasses.memberNumber")} value={pass.invitingMemberNumber} />
              <Row label={t("guestPasses.columns.status")} value={pass.invitingMemberStatus} />
            </Section>

            <Section title={t("guestPasses.detail.consentSection")}>
              <p className="text-sm">
                {pass.followUpConsent
                  ? `${t("guestPasses.detail.consentGiven")} ${formatDate(pass.followUpConsentAt)}`
                  : t("guestPasses.detail.consentNone")}
              </p>
              <p className="text-sm text-muted-foreground">{t("guestPasses.detail.consentHelp")}</p>
              <p className="text-sm">
                {retentionUntil
                  ? `${t("guestPasses.detail.retention")} ${retentionUntil}`
                  : t("guestPasses.detail.retentionUnknown")}
              </p>
            </Section>

            <Section title={t("guestPasses.detail.decisionSection")}>
              {pass.decisionAt ? (
                <>
                  <Row
                    label={t("guestPasses.detail.decisionAt")}
                    value={formatDate(pass.decisionAt)}
                  />
                  <Row label={t("guestPasses.columns.note")} value={pass.decisionNote} />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("guestPasses.detail.noDecision")}
                </p>
              )}
            </Section>

            <Section title={t("guestPasses.detail.followUpSection")}>
              <Row
                label={t("guestPasses.columns.followUp")}
                value={t(`guestPasses.followUpStatus.${pass.followUpStatus}`)}
              />
              <Row label={t("guestPasses.followUpDialog.noteLabel")} value={pass.followUpNote} />
            </Section>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-heading text-lg text-primary">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <p className="flex flex-wrap justify-between gap-2 border-b border-border py-1 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value || "—"}</span>
    </p>
  );
}
