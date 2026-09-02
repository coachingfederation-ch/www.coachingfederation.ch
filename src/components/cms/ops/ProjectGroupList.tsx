/**
 * Operational structure — sidebar list of projects grouped into "general"
 * and "communities", with optional drag-free reordering and the add-project
 * form. Extracted verbatim from the operational-structure route.
 */
import { ArrowDown, ArrowUp, MapPin } from "lucide-react";
import type { useCms } from "@/i18n/cms";
import { INPUT, type ProjectRow } from "@/components/cms/ops/types";

type Props = {
  t: ReturnType<typeof useCms>["t"];
  projects: ProjectRow[];
  selected: string | null;
  setSelected: (id: string) => void;
  reordering: boolean;
  setReordering: (value: boolean) => void;
  move: (
    table: "op_projects" | "op_project_roles",
    rows: ProjectRow[],
    index: number,
    direction: -1 | 1,
  ) => void | Promise<void>;
};

export function ProjectGroupList({
  t,
  projects,
  selected,
  setSelected,
  reordering,
  setReordering,
  move,
}: Props) {
  return (
    <nav className="space-y-5" aria-label={t("ops.projects")}>
      <div className="flex items-center justify-between gap-2">
        <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={reordering}
            onChange={(e) => setReordering(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--color-primary)]"
          />
          {t("ops.reorder")}
        </label>
      </div>
      {reordering ? (
        <p className="-mt-3 text-[11px] leading-snug text-muted-foreground">
          {t("ops.reorderHint")}
        </p>
      ) : null}
      {(
        [
          {
            key: "general",
            rows: projects.filter((p) => !p.is_community && !p.is_project_team),
          },
          {
            key: "projectTeams",
            rows: projects.filter((p) => !p.is_community && p.is_project_team),
          },
          { key: "communities", rows: projects.filter((p) => p.is_community) },
        ] as const
      ).map((group) =>
        group.rows.length === 0 ? null : (
          <div key={group.key}>
            <h2 className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {t(`ops.group.${group.key}`)}
            </h2>
            <div className="space-y-1">
              {group.rows.map((p, index) => (
                <div key={p.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelected(p.id)}
                    className={
                      "flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm " +
                      (p.id === selected
                        ? "bg-secondary font-semibold text-primary"
                        : "text-muted-foreground hover:bg-secondary/60") +
                      (p.is_active ? "" : " opacity-50")
                    }
                  >
                    {p.is_community ? (
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    ) : null}
                    <span className="truncate">{p.name}</span>
                  </button>
                  {reordering ? (
                    <>
                      <button
                        onClick={() => void move("op_projects", group.rows, index, -1)}
                        disabled={index === 0}
                        aria-label={t("ops.moveUp")}
                        className="rounded p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => void move("op_projects", group.rows, index, 1)}
                        disabled={index === group.rows.length - 1}
                        aria-label={t("ops.moveDown")}
                        className="rounded p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ),
      )}
    </nav>
  );
}
