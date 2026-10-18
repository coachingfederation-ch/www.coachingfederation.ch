/**
 * Sticky right-column sidebar for the coach profile: "work with" facts and
 * CTAs, fees, regions, external links and the standard disclaimer note.
 * Extracted verbatim from src/pages/CoachProfile.tsx.
 */
import { useI18n } from "@/i18n";
import type { PublicCoachProfile } from "@/lib/directory.functions";
import { Chips, Fact, PROFILE_CARD, Prose, SideCard } from "@/components/coaches/profile/shared";

export function CoachProfileSidebar({
  profile,
  name,
  languages,
  regions,
  formats,
  experience,
  availabilityText,
  bookingUrl,
  contactEmail,
  hasCta,
  hasSidebarFacts,
}: {
  profile: PublicCoachProfile;
  name: string;
  languages: string[];
  regions: string[];
  formats: string[];
  experience: string | null;
  availabilityText: string | null | undefined;
  bookingUrl: string | null | undefined;
  contactEmail: string | null | undefined;
  hasCta: boolean;
  hasSidebarFacts: boolean;
}) {
  const { t } = useI18n();

  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-8">
      {(hasSidebarFacts || hasCta) && (
        <div className={PROFILE_CARD + " overflow-hidden"}>
          {/* Blue masthead makes the fact ledger read as the card's title block. */}
          <h2 className="eyebrow bg-primary px-6 py-4 text-primary-foreground">
            {t("directory.detail.workWith").replace("{name}", name.split(" ")[0] ?? name)}
          </h2>
          <div className="p-6">
            {hasSidebarFacts && (
              <dl>
                <Fact
                  label={t("directory.detail.formats")}
                  value={formats.length ? formats.join(" · ") : null}
                />
                <Fact label={t("directory.detail.session")} value={profile.session_length_note} />
                <Fact
                  label={t("directory.detail.languages")}
                  value={languages.length ? languages.join(" · ") : null}
                />
                <Fact label={t("directory.detail.experience")} value={experience} />
                <Fact label={t("directory.detail.availability")} value={availabilityText} />
              </dl>
            )}
            {hasCta && (
              <div className={(hasSidebarFacts ? "mt-6 " : "") + "flex flex-col gap-2"}>
                {bookingUrl && (
                  <a
                    href={bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    {t("directory.detail.book")}
                  </a>
                )}
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    target="_top"
                    className="inline-flex h-11 items-center justify-center rounded-full border-2 border-primary px-5 text-sm font-semibold text-primary hover:bg-secondary"
                  >
                    {t("directory.detail.message")}
                  </a>
                )}
                {profile.response_time_note && (
                  <p className="mt-1 text-xs text-muted-foreground">{profile.response_time_note}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Practical details live in the right rail: fees, where they work, links. */}
      {profile.fees_note && (
        <SideCard title={t("directory.detail.fees")} dot="accent">
          <Prose text={profile.fees_note} />
        </SideCard>
      )}
      {regions.length > 0 && (
        <SideCard title={t("directory.detail.regions")} dot="primary">
          <Chips labels={regions} />
        </SideCard>
      )}
      {profile.links.length > 0 && (
        <SideCard title={t("directory.detail.links")} dot="muted">
          <ul className="flex list-none flex-col gap-3 p-0">
            {profile.links.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="group inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  <span>{link.label || link.url}</span>
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </SideCard>
      )}

      <div className="rounded-2xl border border-border/70 bg-secondary/60 p-6">
        <h2 className="eyebrow text-muted-foreground">{t("directory.note.title")}</h2>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {t("directory.note.body")}
        </p>
      </div>
    </aside>
  );
}
