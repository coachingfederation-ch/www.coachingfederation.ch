/**
 * Coach profile hero: identity, at-a-glance meta and the two contact actions
 * (booking link / email). Extracted verbatim from src/pages/CoachProfile.tsx.
 */
import { CoachAvatar } from "@/components/coaches/directory";
import { LocaleLink, useI18n } from "@/i18n";
import type { PublicCoachProfile } from "@/lib/directory.functions";
import { trackGoal } from "@/lib/plausible";

export function CoachProfileHero({
  profile,
  name,
  location,
  languages,
  accepting,
  credentialYear,
  resolvedLocale,
  showFallbackNotice,
  bookingUrl,
  contactEmail,
  hasCta,
}: {
  profile: PublicCoachProfile;
  name: string;
  location: string;
  languages: string[];
  accepting: boolean;
  credentialYear: number | null;
  resolvedLocale: string;
  showFallbackNotice: boolean;
  bookingUrl: string | null | undefined;
  contactEmail: string | null | undefined;
  hasCta: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className="relative overflow-hidden bg-hero text-hero-foreground">
      {/* Soft teal glow — the palette accent carried into the hero band. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-24 h-96 w-96 rounded-full bg-accent opacity-15 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-5 pb-12 sm:px-8 sm:pb-16">
        <LocaleLink
          to="/find-a-coach"
          className="inline-flex items-center text-sm font-semibold text-hero-foreground/80 hover:text-hero-foreground"
        >
          ← {t("directory.detail.back")}
        </LocaleLink>

        {showFallbackNotice && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-hero-foreground/10 px-3 py-1.5 text-xs font-medium text-hero-foreground/90">
            {t("directory.detail.languageFallback").replace(
              "{language}",
              t(`common.languageNames.${resolvedLocale}`),
            )}
          </p>
        )}

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-start gap-8 sm:grid-cols-[auto_minmax(0,1fr)]">
          <CoachAvatar
            name={name}
            imageUrl={profile.image_url}
            className="h-28 w-28 shrink-0 rounded-full text-3xl sm:h-36 sm:w-36 sm:text-4xl"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {name}
              </h1>
              {profile.has_directory_credential ? (
                profile.credential_slug && (
                  <span className="inline-flex h-6 items-center rounded-full bg-hero-foreground/15 px-2.5 text-[11px] font-bold tracking-wider">
                    {profile.credential_slug.toUpperCase()}
                  </span>
                )
              ) : (
                <span className="inline-flex h-6 items-center rounded-full bg-hero-foreground/15 px-2.5 text-[11px] font-bold tracking-wider">
                  {t("directory.card.noAccreditation")}
                </span>
              )}
            </div>
            {profile.tagline && (
              <p className="mt-3 max-w-2xl text-lg font-semibold leading-relaxed text-hero-foreground/90">
                {profile.tagline}
              </p>
            )}
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-hero-foreground/80">
              {location && <span>{location}</span>}
              {profile.organisation && <span>{profile.organisation}</span>}
              {languages.length > 0 && <span>{languages.join(" · ")}</span>}
              {credentialYear && (
                <span>
                  {t("directory.card.credentialSince").replace("{year}", String(credentialYear))}
                </span>
              )}
            </p>
            <p className="mt-4 flex items-center gap-2 text-xs font-semibold">
              <span
                aria-hidden
                className={
                  "h-2 w-2 rounded-full " + (accepting ? "bg-accent" : "bg-hero-foreground/40")
                }
              />
              <span className="text-hero-foreground/90">
                {accepting ? t("directory.card.accepting") : t("directory.card.waitlist")}
              </span>
            </p>
            {hasCta && (
              <div className="mt-6 flex flex-wrap gap-3">
                {bookingUrl && (
                  <a
                    href={bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    onClick={() => trackGoal("Coach Contact", { channel: "booking" })}
                    className="inline-flex h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground"
                  >
                    {t("directory.detail.book")}
                  </a>
                )}
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    target="_top"
                    onClick={() => trackGoal("Coach Contact", { channel: "email" })}
                    className="inline-flex h-11 items-center rounded-full border border-hero-foreground/40 px-5 text-sm font-semibold text-hero-foreground hover:bg-hero-foreground/10"
                  >
                    {t("directory.detail.message")}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
