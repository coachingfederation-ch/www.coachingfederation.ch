/**
 * Operational structure — project detail form: localized names, active
 * toggle, delete, project-type fieldset and the community fields panel.
 * Extracted verbatim from the operational-structure route.
 */
import { Languages, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { useCms } from "@/i18n/cms";
import { CommunityPanel } from "@/components/cms/CommunityPanel";
import { INPUT, LOCALE_COLS, type ProjectRow } from "@/components/cms/ops/types";

type Props = {
  t: ReturnType<typeof useCms>["t"];
  project: ProjectRow;
  setProjects: Dispatch<SetStateAction<ProjectRow[]>>;
  patch: (
    table: "op_projects" | "op_project_roles",
    id: string,
    values: Partial<ProjectRow>,
  ) => void | Promise<void>;
  removeRow: (table: "op_projects" | "op_project_roles", id: string) => void | Promise<void>;
  loadProjects: () => void | Promise<void>;
};

export function ProjectForm({ t, project, setProjects, patch, removeRow, loadProjects }: Props) {
  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold">{t("ops.projectDetails")}</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            aria-label={t("ops.nameEn")}
            value={project.name}
            onChange={(e) =>
              setProjects((prev) =>
                prev.map((r) => (r.id === project.id ? { ...r, name: e.target.value } : r)),
              )
            }
            onBlur={(e) => void patch("op_projects", project.id, { name: e.target.value })}
            className={INPUT}
          />
          {LOCALE_COLS.map((col) => (
            <input
              key={col}
              aria-label={t(`ops.${col}`)}
              placeholder={t(`ops.${col}`)}
              value={project[col] ?? ""}
              onChange={(e) =>
                setProjects((prev) =>
                  prev.map((r) => (r.id === project.id ? { ...r, [col]: e.target.value } : r)),
                )
              }
              onBlur={(e) =>
                void patch("op_projects", project.id, { [col]: e.target.value || null })
              }
              className={INPUT}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4">
          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={project.is_active}
              onChange={(e) =>
                void patch("op_projects", project.id, { is_active: e.target.checked })
              }
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            {t("ops.active")}
          </label>
          <button
            onClick={() => void removeRow("op_projects", project.id)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> {t("ops.deleteProject")}
          </button>
        </div>

        <fieldset className="mt-5 border-t border-border pt-4">
          <legend className="sr-only">{t("ops.type.legend")}</legend>
          <p className="text-xs font-bold">{t("ops.type.legend")}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(
              [
                { value: false, key: "general" },
                { value: true, key: "community" },
              ] as const
            ).map((option) => (
              <label
                key={option.key}
                className={
                  "flex cursor-pointer gap-2 rounded-xl border p-3 text-left " +
                  (project.is_community === option.value
                    ? "border-primary bg-secondary/60"
                    : "border-border hover:bg-secondary/30")
                }
              >
                <input
                  type="radio"
                  name="project-type"
                  className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
                  checked={project.is_community === option.value}
                  onChange={() =>
                    void patch("op_projects", project.id, {
                      is_community: option.value,
                      ...(option.value ? {} : { is_featured_community: false }),
                    })
                  }
                />
                <span>
                  <span className="block text-xs font-semibold">{t(`ops.type.${option.key}`)}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                    {t(`ops.type.${option.key}Note`)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <CommunityPanel project={project} onSaved={loadProjects} />
    </>
  );
}
