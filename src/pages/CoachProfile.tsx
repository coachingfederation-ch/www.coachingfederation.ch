/**
 * Public, read-only coach profile.
 *
 * Data comes from the same public-safe path as the listing
 * (`coach_directory_public` via `getPublicCoachProfile`), so nothing is shown
 * here that a visitor could not already see in search results — plus the
 * member's own website links, which are only loaded after the view has already
 * confirmed the profile is published and eligible.
 */
import { useQuery } from "@tanstack/react-query";
import { CARD_SHADOW, SiteFooter, SiteHeaderBar } from "@/components/site-chrome";
import { LocaleLink, useI18n } from "@/i18n";
import type { PublicCoachProfile } from "@/lib/directory.functions";
import {
  fetchActiveVocabularies,
  vocabLabel,
  type CoachFinderVocabularies,
  type VocabRow,
} from "@/lib/vocabularies";
import { Chips, Panel, Prose } from "@/components/coaches/profile/shared";
import { HowIWorkFlow } from "@/components/coaches/profile/HowIWorkFlow";
import { CoachProfileHero } from "@/components/coaches/profile/CoachProfileHero";
import { CoachProfileSidebar } from "@/components/coaches/profile/CoachProfileSidebar";
import { Mark } from "@/components/marks";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import { useTrackView } from "@/lib/plausible";

export function CoachProfileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="bg-hero text-hero-foreground">
        <div className="mx-auto max-w-7xl px-5 pt-6 pb-8 sm:px-8">
          <SiteHeaderBar compact />
        </div>
      </header>
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function CoachFallback({ titleKey, bodyKey }: { titleKey: string; bodyKey: string }) {
  const { t } = useI18n();
  return (
    <CoachProfileShell>
      <div className="mx-auto max-w-3xl px-8 py-28 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t(titleKey)}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{t(bodyKey)}</p>
        <Button asChild variant="pill" size="pill" className="mt-8">
          <LocaleLink to="/find-a-coach">{t("directory.detail.back")}</LocaleLink>
        </Button>
      </div>
    </CoachProfileShell>
  );
}

export default function CoachProfilePage({
  profile,
  demo = false,
}: {
  profile: PublicCoachProfile;
  /** Renders the fictional sample profile shown while the finder is closed. */
  demo?: boolean;
}) {
  const { t, locale } = useI18n();
  useTrackView("Coach Profile View", profile.profile_id ?? "", {
    profile_id: profile.profile_id ?? "",
  });
  const { data: vocab } = useQuery<CoachFinderVocabularies>({
    queryKey: ["coach-finder-vocabularies"],
    queryFn: fetchActiveVocabularies,
    staleTime: 5 * 60 * 1000,
  });

  const lookup = (rows: VocabRow[] | undefined) => {
    const map = new Map((rows ?? []).map((r) => [r.slug, vocabLabel(r, locale)]));
    return (slug: string) => map.get(slug) ?? slug;
  };
  const specialisationLabel = lookup(vocab?.cf_specialisations);
  const formatLabel = lookup(vocab?.cf_formats);
  const languageLabel = lookup(vocab?.cf_languages);
  const regionLabel = lookup(vocab?.cf_regions);
  const clientTypeLabel = lookup(vocab?.cf_client_types);
  const availabilityLabel = lookup(vocab?.cf_availability_labels);
  const experienceLabel = lookup(vocab?.cf_experience_bands);

  const name = profile.full_name ?? "";
  const location = [profile.city, profile.country].filter(Boolean).join(" · ");
  const accepting = profile.availability_slug !== "not-accepting";
  const credentialYear = profile.credential_awarded_on
    ? new Date(profile.credential_awarded_on).getFullYear()
    : null;
  const languages = (profile.language_slugs ?? []).map(languageLabel);
  const regions = (profile.region_slugs ?? []).map(regionLabel);
  const specialisations = (profile.specialisation_slugs ?? []).map(specialisationLabel);
  const formats = (profile.format_slugs ?? []).map(formatLabel);
  const clientTypes = (profile.client_type_slugs ?? []).map(clientTypeLabel);

  const bookingUrl = profile.booking_url;
  // Display language: the profile falls back to its authoring language whenever
  // the visitor's language has no published translation.
  const resolvedLocale = profile.resolvedLocale ?? profile.primary_locale ?? "en";
  const showFallbackNotice = resolvedLocale !== locale;
  const contactEmail = profile.contact_email;
  const hasCta = Boolean(bookingUrl || contactEmail);
  const experience = profile.experience_band ? experienceLabel(profile.experience_band) : null;
  const availabilityText =
    profile.availability_note ||
    (profile.availability_slug ? availabilityLabel(profile.availability_slug) : null);
  const hasSidebarFacts = Boolean(
    formats.length ||
    profile.session_length_note ||
    languages.length ||
    availabilityText ||
    experience,
  );
  const hasSidebarCards = Boolean(
    hasSidebarFacts || hasCta || profile.fees_note || regions.length || profile.links.length,
  );
  // Panels are numbered in render order, skipping whatever the coach left empty.
  let panelIndex = 0;
  const panel = () => ++panelIndex;

  return (
    <CoachProfileShell>
      {/* A fictional example must say so before anything else on the page. */}
      {demo ? (
        <div className="bg-highlight text-highlight-foreground">
          <div className="mx-auto max-w-6xl px-5 py-3 text-sm sm:px-8">
            <span className="font-bold">{t("directory.demo.badge")}</span>{" "}
            <span>{t("directory.demo.notice")}</span>
          </div>
        </div>
      ) : null}
      {/* Hero: identity, at-a-glance meta and the two contact actions. */}
      <CoachProfileHero
        profile={profile}
        name={name}
        location={location}
        languages={languages}
        accepting={accepting}
        credentialYear={credentialYear}
        resolvedLocale={resolvedLocale}
        showFallbackNotice={showFallbackNotice}
        bookingUrl={bookingUrl}
        contactEmail={contactEmail}
        hasCta={hasCta}
      />

      <div
        className={
          "mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:items-start " +
          (hasSidebarCards ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "lg:grid-cols-1")
        }
      >
        <div className="flex min-w-0 flex-col gap-6">
          {profile.description && (
            <Panel index={panel()} title={t("directory.detail.about")} mark="highlight3">
              <Prose text={profile.description} />
            </Panel>
          )}
          {profile.testimonial_quote && (
            <figure
              className={
                "relative overflow-hidden rounded-2xl border border-border/60 bg-hero p-8 text-hero-foreground sm:p-10 " +
                CARD_SHADOW
              }
            >
              <Mark
                name="asterisk2"
                className="pointer-events-none absolute -top-4 -right-4 h-20 w-20 text-accent/20"
              />
              <div className="relative">
                <blockquote className="text-lg leading-relaxed font-semibold sm:text-xl">
                  “{profile.testimonial_quote}”
                </blockquote>
                {profile.testimonial_attribution && (
                  <figcaption className="mt-6 flex items-center gap-4">
                    <span aria-hidden className="h-px w-10 shrink-0 bg-accent" />
                    <span className="text-xs font-semibold tracking-wide text-hero-foreground/80 uppercase">
                      {profile.testimonial_attribution}
                    </span>
                  </figcaption>
                )}
              </div>
            </figure>
          )}
          {profile.approach && (
            <Panel index={panel()} title={t("directory.detail.approach")}>
              <HowIWorkFlow text={profile.approach} />
            </Panel>
          )}
          {(specialisations.length > 0 || clientTypes.length > 0) && (
            <div
              className={
                "grid gap-6 " +
                (specialisations.length > 0 && clientTypes.length > 0
                  ? "md:grid-cols-[1.35fr_1fr]"
                  : "")
              }
            >
              {specialisations.length > 0 && (
                <Panel index={panel()} title={t("directory.detail.specialisations")}>
                  <Chips labels={specialisations} />
                </Panel>
              )}
              {clientTypes.length > 0 && (
                <Panel index={panel()} title={t("directory.detail.clientTypes")}>
                  <Chips labels={clientTypes} />
                </Panel>
              )}
            </div>
          )}
          {profile.qualifications && (
            <Panel index={panel()} title={t("directory.detail.qualifications")}>
              <Prose text={profile.qualifications} />
            </Panel>
          )}
        </div>

        <CoachProfileSidebar
          profile={profile}
          name={name}
          languages={languages}
          regions={regions}
          formats={formats}
          experience={experience}
          availabilityText={availabilityText}
          bookingUrl={bookingUrl}
          contactEmail={contactEmail}
          hasCta={hasCta}
          hasSidebarFacts={hasSidebarFacts}
        />
      </div>
    </CoachProfileShell>
  );
}
