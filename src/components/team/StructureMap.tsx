/**
 * Nested-circle ("Maptio style") view of the operational structure.
 *
 * Read-only: chapter → structure group → team → role → person. Circle area is
 * proportional to the number of people inside, colour encodes the structure
 * group. Clicking a circle zooms into it, clicking a person opens the shared
 * member modal — the same card the honeycomb uses, so no new personal data
 * surface is introduced.
 *
 * The SVG is plain React (d3 is used for the pack layout only), so it renders
 * server-side, and a nested list mirrors the same tree for screen readers.
 */
import { useMemo, useState } from "react";
import { hierarchy, pack, type HierarchyCircularNode } from "d3-hierarchy";
import { MemberModal } from "@/components/team/MemberModal";
import { useI18n } from "@/i18n";
import type { TeamMember } from "@/lib/team";
import { buildStructureTree, countPeople, type GroupKey, type MapLabels, type MapNode, type MapProject } from "@/lib/ops-map";

const SIZE = 900;

/** Circle fills per structure group; people are the light "dots" inside. */
const GROUP_FILL: Record<GroupKey, string> = {
  organizational: "var(--color-hero)",
  projectTeams: "var(--color-primary)",
  communities: "var(--color-mark-blue)",
};

type Circle = HierarchyCircularNode<MapNode>;

export function StructureMap({
  projects,
  members,
  labels,
}: {
  projects: MapProject[];
  members: TeamMember[];
  labels: MapLabels;
}) {
  const { t } = useI18n();
  const [focusId, setFocusId] = useState("root");
  const [openMember, setOpenMember] = useState<TeamMember | null>(null);

  const root = useMemo(() => {
    const tree = buildStructureTree(projects, members, labels);
    const laid = pack<MapNode>()
      .size([SIZE, SIZE])
      .padding((node) => (node.depth === 0 ? 16 : node.depth === 1 ? 12 : 6))(
      hierarchy(tree, (d) => d.children)
        .sum((d) => (d.kind === "person" ? 1 : 0))
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    );
    return laid;
  }, [projects, members, labels]);

  const nodes = root.descendants() as Circle[];
  const focus = nodes.find((n) => n.data.id === focusId) ?? root;
  const k = SIZE / (focus.r * 2);
  const trail = focus.ancestors().reverse() as Circle[];

  const isEmpty = !root.children?.length;

  return (
    <div>
      {/* Breadcrumb — also the way back out of a zoom on touch devices. */}
      <nav aria-label={t("team.map.breadcrumb")} className="mb-4 flex flex-wrap items-center gap-1 text-sm">
        {trail.map((node, index) => (
          <span key={node.data.id} className="flex items-center gap-1">
            {index > 0 ? <span className="text-muted-foreground">/</span> : null}
            <button
              type="button"
              onClick={() => setFocusId(node.data.id)}
              className={
                "rounded-full px-2 py-1 " +
                (node === focus
                  ? "font-semibold text-primary"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {node.data.name}
            </button>
          </span>
        ))}
      </nav>

      {isEmpty ? (
        <p className="text-center text-sm text-muted-foreground">{t("team.empty")}</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl bg-background p-2">
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              role="group"
              aria-label={t("team.map.title")}
              className="h-auto w-full"
            >
              <g
                className="motion-safe:transition-transform motion-safe:duration-500"
                transform={`translate(${SIZE / 2},${SIZE / 2}) scale(${k}) translate(${-focus.x},${-focus.y})`}
              >
                {nodes.map((node) => {
                  const person = node.data.kind === "person";
                  const size = node.r * k;
                  // Fit the label to the circle: shrink, truncate, and finally
                  // drop it rather than let names collide across the map.
                  const fontSize = Math.min(node.r / (person ? 4.5 : 3.5), 20 / k);
                  const maxChars = Math.floor((node.r * 1.8) / (fontSize * 0.55));
                  const text =
                    node.data.name.length > maxChars
                      ? node.data.name.slice(0, Math.max(0, maxChars - 1)) + "…"
                      : node.data.name;
                  // Only label the levels near the current zoom: deeper labels collide
                  // with the team names above them at chapter level.
                  const inDepth = person || node.depth <= Math.max(2, focus.depth + 1);
                  const label = node.depth > 0 && inDepth && maxChars >= 5 && size > (person ? 26 : 64);
                  return (
                    <g key={node.data.id}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.r}
                        style={{
                          fill: person ? "var(--color-background)" : GROUP_FILL[node.data.group],
                          fillOpacity: person ? 1 : node.depth === 0 ? 0.12 : 0.18 + node.depth * 0.1,
                          stroke: person ? "var(--color-primary)" : GROUP_FILL[node.data.group],
                          strokeWidth: 1.5 / k,
                        }}
                      />
                      {/* Focusable hit area so the whole map is keyboard operable. */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.r}
                        role="button"
                        tabIndex={0}
                        aria-label={
                          person
                            ? node.data.name
                            : `${node.data.name} — ${countPeople(node.data)}`
                        }
                        onClick={() =>
                          person && node.data.member
                            ? setOpenMember(node.data.member)
                            : setFocusId(node.data.id)
                        }
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          if (person && node.data.member) setOpenMember(node.data.member);
                          else setFocusId(node.data.id);
                        }}
                        style={{ fill: "transparent", cursor: "pointer" }}
                      />
                      {label ? (
                        <text
                          x={node.x}
                          y={node.y + (node.children ? -node.r + fontSize * 1.2 : fontSize / 3)}
                          textAnchor="middle"
                          pointerEvents="none"
                          style={{
                            fill: person ? "var(--color-foreground)" : "var(--color-hero)",
                            fontSize,
                            fontWeight: person ? 500 : 700,
                          }}
                        >
                          {text}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">{t("team.map.hint")}</p>

          {/* Same tree, linearised — screen readers and no-JS get the content. */}
          <details className="mt-6 text-sm">
            <summary className="cursor-pointer text-muted-foreground">{t("team.map.listView")}</summary>
            <NodeList node={root.data} />
          </details>
        </>
      )}

      {openMember ? <MemberModal member={openMember} onClose={() => setOpenMember(null)} /> : null}
    </div>
  );
}

function NodeList({ node }: { node: MapNode }) {
  if (!node.children?.length) return null;
  return (
    <ul className="ml-4 mt-2 list-disc space-y-1">
      {node.children.map((child) => (
        <li key={child.id}>
          <span className={child.kind === "person" ? "" : "font-semibold"}>{child.name}</span>
          <NodeList node={child} />
        </li>
      ))}
    </ul>
  );
}
