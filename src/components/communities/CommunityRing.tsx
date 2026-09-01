/**
 * Community honeycomb — a connected cluster of hexagons.
 *
 * The community itself is one Deep Blue hexagon sitting in the middle of the
 * comb; every volunteer is a photo hexagon around it, tiles touching edge to
 * edge in offset rows. It is the same shape language as the team page, so the
 * two views read as one system. Display rules:
 *   - 0 members      -> the name hexagon on its own
 *   - 1 to 12        -> everyone in the comb
 *   - more than 12   -> the first twelve alphabetically, plus an overflow note
 *
 * Accessibility: every photo is a real focusable <button> in DOM order with an
 * aria-label carrying name and role; the label reveal is driven by :hover *and*
 * :focus-visible. Below `sm` (and therefore on most touch devices) the comb is
 * replaced by a plain avatar list, so nothing depends on hovering.
 */
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { MemberModal } from "@/components/team/MemberModal";
import { combRows, HexLabelTile, HexMemberTile, HexPhoto } from "@/components/hex-tile";
import { splitRing } from "@/lib/communities";
import type { TeamMember } from "@/lib/team";

const TILE = "w-[clamp(4.5rem,13vw,6.5rem)]";

/** Keep the comb roughly square rather than a long strip. */
function columnsFor(total: number): number {
  if (total <= 2) return 2;
  if (total <= 6) return 3;
  return 4;
}

function roleFor(member: TeamMember, slug: string): string | null {
  const match = member.assignments.find((a) => a.projectSlug === slug);
  return match ? match.role : (member.assignments[0]?.role ?? null);
}

type Cell = { kind: "name" } | { kind: "member"; member: TeamMember };

export function CommunityRing({
  name,
  slug,
  members,
}: {
  name: string;
  slug: string;
  members: TeamMember[];
}) {
  const { t } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);
  const { ring, overflow } = splitRing(members);
  const open = members.find((m) => m.memberId === openId) ?? null;

  const rows = useMemo(() => {
    const cells: Cell[] = ring.map((member) => ({ kind: "member", member }));
    cells.splice(Math.floor(cells.length / 2), 0, { kind: "name" });
    return combRows(cells, columnsFor(cells.length));
  }, [ring]);

  const label = (member: TeamMember) => {
    const role = roleFor(member, slug);
    return role ? `${member.name} — ${role}` : member.name;
  };

  return (
    <>
      {/* Comb layout — pointer devices and roomy viewports. */}
      <div className="hidden sm:block">
        <div className="flex flex-col items-center">
          {rows.map((row, i) => (
            <div key={i} className={"flex justify-center gap-1.5 " + (i > 0 ? "-mt-[3.5%]" : "")}>
              {row.map((cell) =>
                cell.kind === "name" ? (
                  <HexLabelTile key="name" className={TILE}>
                    {name}
                  </HexLabelTile>
                ) : (
                  <HexMemberTile
                    key={cell.member.memberId}
                    member={cell.member}
                    label={label(cell.member)}
                    initialsClass="text-lg"
                    onOpen={() => setOpenId(cell.member.memberId)}
                    className={TILE}
                    caption={
                      <>
                        <span className="text-[12px] font-bold leading-tight text-primary-foreground">
                          {cell.member.name}
                        </span>
                        {roleFor(cell.member, slug) ? (
                          <span className="mt-1 text-[10px] leading-tight text-primary-foreground/85">
                            {roleFor(cell.member, slug)}
                          </span>
                        ) : null}
                      </>
                    }
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Touch / small-screen fallback: a plain, tappable avatar list. */}
      <div className="sm:hidden">
        <div className="mx-auto w-40">
          <HexLabelTile className="w-full">{name}</HexLabelTile>
        </div>
        {ring.length ? (
          <ul className="mt-6 space-y-2">
            {ring.map((member) => (
              <li key={member.memberId}>
                <button
                  type="button"
                  onClick={() => setOpenId(member.memberId)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left"
                >
                  <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-primary/10">
                    <HexPhoto member={member} textClass="text-xs" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{member.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {roleFor(member, slug)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {overflow.length ? (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("communities.detail.andMore").replace("{count}", String(overflow.length))}
        </p>
      ) : null}

      {open ? <MemberModal member={open} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}
