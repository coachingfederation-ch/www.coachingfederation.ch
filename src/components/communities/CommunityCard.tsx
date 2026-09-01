/**
 * Shared card for a local community.
 *
 * Used by the /communities overview and the "Chapter communities" teaser on
 * the For Coaches page, so both always render the same CMS-managed data.
 */
import { ArrowRight, MapPin, Users } from "lucide-react";
import { CARD_SHADOW } from "@/components/site-chrome";
import { AiBadge } from "@/design-system/icf-welcome-design-system-a835df";
import { LocaleLink, useI18n } from "@/i18n";
import type { CommunitySummary } from "@/lib/communities";
import type { TeamMember } from "@/lib/team";

function AvatarStack({ members }: { members: TeamMember[] }) {
  if (!members.length) return null;
  return (
    <div className="flex -space-x-2" aria-hidden="true">
      {members.map((m) => (
        <span
          key={m.memberId}
          className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-primary/10 text-[10px] font-bold text-primary ring-2 ring-card"
        >
          {m.imageUrl ? (
            <img src={m.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            m.initials
          )}
        </span>
      ))}
    </div>
  );
}

/** First sentence / paragraph of the markdown description, stripped of syntax. */
function excerpt(markdown: string | null, max = 180): string | null {
  if (!markdown) return null;
  const plain = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return null;
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
}

export function CommunityCard({
  community,
  headingLevel = "h2",
}: {
  community: CommunitySummary;
  /** The overview page uses h2; the teaser sits under a section h2. */
  headingLevel?: "h2" | "h3";
}) {
  const { t } = useI18n();
  const summary = excerpt(community.description);
  const Heading = headingLevel;
  return (
    <LocaleLink
      to={`/communities/${community.slug}`}
      className={
        "group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition hover:-translate-y-0.5 " +
        CARD_SHADOW
      }
    >
      {community.coverImageUrl ? (
        <div className="relative">
          <img
            src={community.coverImageUrl}
            alt={community.coverImageAlt ?? ""}
            loading="lazy"
            className="h-44 w-full object-cover"
          />
          {community.imageSource === "ai" ? <AiBadge className="absolute bottom-3 left-3" /> : null}
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-7">
        <div className="flex items-start justify-between gap-4">
          <Heading className="text-lg font-bold leading-tight tracking-tight">
            {community.name}
          </Heading>
          <AvatarStack members={community.preview} />
        </div>
        {summary ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{summary}</p>
        ) : null}
        {community.cadence ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" /> {community.cadence}
          </p>
        ) : null}
        {community.languages.length ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {community.languages.map((lang) => (
              <li
                key={lang}
                className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
              >
                {lang}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {t("communities.list.members").replace("{count}", String(community.memberCount))}
          </span>
          <span className="inline-flex items-center gap-1 text-primary">
            {t("communities.list.open")}
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </LocaleLink>
  );
}
