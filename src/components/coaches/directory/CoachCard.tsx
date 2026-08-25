/**
 * Coach avatar and result card used by the public Coach Finder grid.
 * `CoachAvatar` shows a signed-URL photo with an initials fallback that
 * occupies the same box, so a missing/expired image causes no layout shift.
 */
import { useState } from "react";
import { CARD_SHADOW } from "@/components/site-chrome";
import { LocaleLink, useI18n } from "@/i18n";
import type { DirectoryEntry } from "@/lib/directory.functions";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Fixed-size avatar. The photo comes from a short-lived signed URL minted
 * server-side; the initials tile occupies the exact same box, so a missing or
 * expired image causes no layout shift.
 */
export function CoachAvatar({
  name,
  imageUrl,
  className = "h-14 w-14 rounded-xl text-lg",
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = !!imageUrl && !failed;
  return (
    <span
      aria-hidden
      className={
        "grid shrink-0 place-items-center overflow-hidden bg-primary/10 font-bold text-primary " +
        className
      }
    >
      {showImage ? (
        <img
          src={imageUrl!}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export type LabelLookup = (slug: string) => string;

export function CoachCard({
  entry,
  specialisationLabel,
  formatLabel,
}: {
  entry: DirectoryEntry;
  specialisationLabel: LabelLookup;
  formatLabel: LabelLookup;
}) {
  const { t } = useI18n();
  const name = entry.full_name ?? "";
  const location = [entry.city, entry.country].filter(Boolean).join(" · ");
  const langs = (entry.language_slugs ?? []).map((l) => l.toUpperCase()).join(" / ");
  const accepting = entry.availability_slug !== "not-accepting";
  const credentialYear = entry.credential_awarded_on
    ? new Date(entry.credential_awarded_on).getFullYear()
    : null;
  const chips = [
    ...(entry.specialisation_slugs ?? []).slice(0, 3).map((s) => ({
      key: `s-${s}`,
      label: specialisationLabel(s),
      outlined: false,
    })),
    ...(entry.format_slugs ?? []).slice(0, 1).map((f) => ({
      key: `f-${f}`,
      label: formatLabel(f),
      outlined: true,
    })),
  ];

  return (
    <article
      className={
        "relative flex w-full flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 transition hover:border-primary/40 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 " +
        CARD_SHADOW
      }
    >
      <div className="flex items-start gap-4">
        <CoachAvatar name={name} imageUrl={entry.image_url} />
        <div className="min-w-0">
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            {/* Single link per card, stretched over the whole surface: the card
                is clickable without nesting interactive elements. */}
            <LocaleLink
              to={`/coach/${entry.profile_id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-['']"
            >
              {name}
            </LocaleLink>
          </h3>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {[location, langs].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 flex-col items-end gap-1.5">
          {entry.has_directory_credential ? (
            entry.credential_slug && (
              <span className="inline-flex h-6 items-center rounded-full bg-primary px-2.5 text-[11px] font-bold tracking-wider text-primary-foreground">
                {entry.credential_slug.toUpperCase()}
              </span>
            )
          ) : (
            // Neutral, factual: the chapter may list members without a valid
            // ACC/PCC/MCC, and the card has to say so plainly.
            <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-[11px] font-bold tracking-wider text-muted-foreground">
              {t("directory.card.noAccreditation")}
            </span>
          )}
        </div>
      </div>

      {entry.tagline && <p className="text-sm font-semibold text-primary">{entry.tagline}</p>}

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className={
              "inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold text-muted-foreground " +
              (chip.outlined ? "border border-border" : "bg-muted")
            }
          >
            {chip.label}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-2 border-t border-border/70 pt-4 text-xs font-semibold">
        <span
          aria-hidden
          className={"h-2 w-2 rounded-full " + (accepting ? "bg-accent" : "bg-border")}
        />
        <span className={accepting ? "text-foreground" : "text-muted-foreground"}>
          {accepting ? t("directory.card.accepting") : t("directory.card.waitlist")}
        </span>
        {credentialYear && (
          <span className="ml-auto font-normal text-muted-foreground">
            {t("directory.card.credentialSince").replace("{year}", String(credentialYear))}
          </span>
        )}
      </div>
      <p aria-hidden className="text-xs font-semibold text-primary">
        {t("directory.card.viewProfile")} →
      </p>
    </article>
  );
}
