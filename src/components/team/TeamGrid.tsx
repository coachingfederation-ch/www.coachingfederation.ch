/**
 * Public team page grid.
 *
 * Layout is a honeycomb: rows of hexagonal tiles that alternate between a full
 * and a short row and overlap vertically, so the arrangement stays organic at
 * every breakpoint instead of collapsing into a rectangular grid. The number of
 * tiles per row is derived from the viewport, so filtering simply re-chunks the
 * list and the comb reflows.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { LocaleLink, useI18n } from "@/i18n";
import { MemberModal } from "@/components/team/MemberModal";
import { combRows, HexMemberTile } from "@/components/hex-tile";
import type { TeamMember, TeamProject } from "@/lib/team";

function useColumns(): number {
  const [cols, setCols] = useState(4);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w < 480) return 2;
      if (w < 768) return 3;
      if (w < 1100) return 4;
      return 5;
    };
    const apply = () => setCols(compute());
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
  return cols;
}

function HexTile({ member, onOpen }: { member: TeamMember; onOpen: () => void }) {
  const role = member.assignments[0];
  return (
    <HexMemberTile
      member={member}
      label={member.name}
      onOpen={onOpen}
      className="w-[clamp(7rem,22vw,10.5rem)]"
      caption={
        <>
          <span className="text-[13px] font-bold leading-tight text-primary-foreground">
            {member.name}
          </span>
          {role ? (
            <span className="mt-1 text-[11px] leading-tight text-primary-foreground/85">
              {role.role} · {role.project}
            </span>
          ) : null}
        </>
      }
    />
  );
}

export function TeamHoneycomb({ members }: { members: TeamMember[] }) {
  const columns = useColumns();
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = useMemo(() => combRows(members, columns), [members, columns]);
  const open = members.find((m) => m.memberId === openId) ?? null;

  return (
    <>
      <div className="flex flex-col items-center">
        {rows.map((row, i) => (
          <div
            key={i}
            className={"flex justify-center gap-2 sm:gap-3 " + (i > 0 ? "-mt-[3.5%]" : "")}
          >
            {row.map((member) => (
              <HexTile
                key={member.memberId}
                member={member}
                onOpen={() => setOpenId(member.memberId)}
              />
            ))}
          </div>
        ))}
      </div>
      {open ? <MemberModal member={open} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}

export function TeamFilters({
  projects,
  active,
  onChange,
}: {
  projects: TeamProject[];
  active: string | null;
  onChange: (slug: string | null) => void;
}) {
  const { t } = useI18n();
  const pill = (selected: boolean) =>
    "rounded-full px-4 py-1.5 text-xs font-semibold transition " +
    (selected
      ? "bg-primary text-primary-foreground"
      : "bg-secondary text-muted-foreground hover:text-foreground");
  return (
    <div className="flex flex-wrap justify-center gap-2" aria-label={t("team.filters.label")}>
      <button
        type="button"
        aria-pressed={active === null}
        onClick={() => onChange(null)}
        className={pill(active === null)}
      >
        {t("team.filters.all")}
      </button>
      {projects.map((p) => (
        <span key={p.slug} className="inline-flex items-center gap-1">
          <button
            type="button"
            aria-pressed={active === p.slug}
            onClick={() => onChange(p.slug)}
            className={pill(active === p.slug)}
          >
            {p.label}
          </button>
          {p.isCommunity ? (
            <LocaleLink
              to={`/communities/${p.slug}`}
              aria-label={`${t("team.filters.openCommunity")}: ${p.label}`}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-semibold text-primary underline-offset-4 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">
                {t("team.filters.openCommunity")}
              </span>
            </LocaleLink>
          ) : null}
        </span>
      ))}
    </div>
  );
}
