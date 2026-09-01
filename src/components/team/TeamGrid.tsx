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
import { useI18n } from "@/i18n";
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

/** Alternating full / short rows — the shape that makes a comb read as a comb. */
function combRows<T>(items: T[], columns: number): T[][] {
  const rows: T[][] = [];
  let index = 0;
  let long = true;
  while (index < items.length) {
    const size = long || columns < 3 ? columns : columns - 1;
    rows.push(items.slice(index, index + size));
    index += size;
    long = !long;
  }
  return rows;
}

function HexTile({ member, onOpen }: { member: TeamMember; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  const role = member.assignments[0];
  const showImage = !!member.imageUrl && !failed;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block w-[clamp(7rem,22vw,10.5rem)] shrink-0 focus:outline-none"
    >
      <span
        className="relative block aspect-square w-full overflow-hidden bg-primary/10 transition group-hover:brightness-95 group-focus-visible:ring-4 group-focus-visible:ring-ring/40"
        style={{ clipPath: HEX_CLIP }}
      >
        {showImage ? (
          <img
            src={member.imageUrl!}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-2xl font-bold text-primary">
            {member.initials}
          </span>
        )}
        <span className="absolute inset-0 flex flex-col justify-center bg-primary/85 px-3 py-4 text-center opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="text-[13px] font-bold leading-tight text-primary-foreground">
            {member.name}
          </span>
          {role ? (
            <span className="mt-1 text-[11px] leading-tight text-primary-foreground/85">
              {role.role} · {role.project}
            </span>
          ) : null}
        </span>
      </span>
      <span className="sr-only">{member.name}</span>
    </button>
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
        <button
          key={p.slug}
          type="button"
          aria-pressed={active === p.slug}
          onClick={() => onChange(p.slug)}
          className={pill(active === p.slug)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
