/**
 * Shared hexagon tile used by the team honeycomb, the community comb and the
 * small avatar stacks on community cards.
 *
 * One implementation so the shape language stays identical everywhere: the
 * same clip-path, the same photo/initials fallback, the same hover/focus label
 * reveal. Sizing is left to the caller via `className` — the tile itself only
 * guarantees a square aspect ratio.
 */
import { useState } from "react";
import type { TeamMember } from "@/lib/team";

export const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

/** Photo, or the member's initials on a tinted surface when there is none. */
export function HexPhoto({ member, textClass }: { member: TeamMember; textClass?: string }) {
  const [failed, setFailed] = useState(false);
  const showImage = !!member.imageUrl && !failed;
  return showImage ? (
    <img
      src={member.imageUrl!}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  ) : (
    <span
      className={
        "grid h-full w-full place-items-center font-bold text-primary " + (textClass ?? "text-2xl")
      }
    >
      {member.initials}
    </span>
  );
}

/**
 * A focusable hexagon showing one person. `caption` is revealed on hover and
 * on keyboard focus; `label` is the accessible name.
 */
export function HexMemberTile({
  member,
  label,
  caption,
  onOpen,
  className,
  initialsClass,
}: {
  member: TeamMember;
  label: string;
  caption?: React.ReactNode;
  onOpen: () => void;
  className?: string;
  initialsClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      className={"group relative block shrink-0 focus:outline-none " + (className ?? "")}
    >
      <span
        className="relative block aspect-square w-full overflow-hidden bg-primary/10 transition group-hover:brightness-95 group-focus-visible:ring-4 group-focus-visible:ring-ring/40"
        style={{ clipPath: HEX_CLIP }}
      >
        <HexPhoto member={member} textClass={initialsClass} />
        {caption ? (
          <span className="absolute inset-0 flex flex-col justify-center bg-primary/85 px-3 py-4 text-center opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            {caption}
          </span>
        ) : null}
      </span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

/** Non-interactive hexagon carrying a short label — used for the community name. */
export function HexLabelTile({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={"relative block shrink-0 " + (className ?? "")}>
      <span
        className="grid aspect-square w-full place-items-center bg-primary px-3 text-center text-primary-foreground"
        style={{ clipPath: HEX_CLIP }}
      >
        <span className="text-[13px] font-bold leading-tight sm:text-sm">{children}</span>
      </span>
    </span>
  );
}

/** Alternating full / short rows — the shape that makes a comb read as a comb. */
export function combRows<T>(items: T[], columns: number): T[][] {
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
