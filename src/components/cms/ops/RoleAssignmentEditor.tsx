/**
 * Operational structure — the project's roles list (with reordering) plus
 * the assignment list, member search and assign/unassign controls.
 * Extracted verbatim from the operational-structure route.
 */
import type { Dispatch, SetStateAction } from "react";
import { ArrowDown, ArrowUp, Languages, Trash2 } from "lucide-react";
import type { useCms } from "@/i18n/cms";
import {
  INPUT,
  LOCALE_COLS,
  type Assignment,
  type Localized,
  type MemberOption,
} from "@/components/cms/ops/types";

type Props = {
  t: ReturnType<typeof useCms>["t"];
  roles: Localized[];
  setRoles: Dispatch<SetStateAction<Localized[]>>;
  patch: (
    table: "op_projects" | "op_project_roles",
    id: string,
    values: Partial<Localized>,
  ) => void | Promise<void>;
  move: (
    table: "op_projects" | "op_project_roles",
    rows: Localized[],
    index: number,
    direction: -1 | 1,
  ) => void | Promise<void>;
  removeRow: (table: "op_projects" | "op_project_roles", id: string) => void | Promise<void>;
  newRole: string;
  setNewRole: (value: string) => void;
  addRole: () => void | Promise<void>;
  assignments: Assignment[];
  moveAssignmentUp: (row: Assignment, index: number) => void | Promise<void>;
  unassign: (row: Assignment) => void | Promise<void>;
  search: string;
  setSearch: (value: string) => void;
  members: MemberOption[];
  pickedMember: string;
  setPickedMember: (value: string) => void;
  pickedRole: string;
  setPickedRole: (value: string) => void;
  assign: () => void | Promise<void>;
  /** Non-error feedback shown under the assignment controls. */
  notice?: string | null;
  translateLabels: (
    table: "op_projects" | "op_project_roles",
    id: string,
    name: string,
  ) => void | Promise<void>;
  translating: string[];
};

export function RoleAssignmentEditor({
  t,
  roles,
  setRoles,
  patch,
  move,
  removeRow,
  newRole,
  setNewRole,
  addRole,
  assignments,
  moveAssignmentUp,
  unassign,
  search,
  setSearch,
  members,
  pickedMember,
  setPickedMember,
  pickedRole,
  setPickedRole,
  assign,
  translateLabels,
  translating,
  notice,
}: Props) {
  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold">{t("ops.roles")}</h2>
        <div className="mt-3 space-y-3">
          {roles.map((role, index) => (
            <div key={role.id} className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
              <div className="flex items-center gap-1 sm:col-span-2">
                <input
                  aria-label={t("ops.nameEn")}
                  value={role.name}
                  onChange={(e) =>
                    setRoles((prev) =>
                      prev.map((r) => (r.id === role.id ? { ...r, name: e.target.value } : r)),
                    )
                  }
                  onBlur={(e) => void patch("op_project_roles", role.id, { name: e.target.value })}
                  className={INPUT + " flex-1 font-semibold"}
                />
                <button
                  onClick={() => void move("op_project_roles", roles, index, -1)}
                  disabled={index === 0}
                  aria-label={t("ops.moveUp")}
                  className="rounded p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => void move("op_project_roles", roles, index, 1)}
                  disabled={index === roles.length - 1}
                  aria-label={t("ops.moveDown")}
                  className="rounded p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => void translateLabels("op_project_roles", role.id, role.name)}
                  disabled={translating.includes(role.id)}
                  aria-label={t("ops.translateLabels")}
                  title={t("ops.translateLabels")}
                  className="rounded p-1 text-muted-foreground hover:text-primary disabled:opacity-30"
                >
                  <Languages className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => void removeRow("op_project_roles", role.id)}
                  aria-label={t("ops.delete")}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {LOCALE_COLS.map((col) => (
                <input
                  key={col}
                  aria-label={t(`ops.${col}`)}
                  placeholder={t(`ops.${col}`)}
                  value={role[col] ?? ""}
                  onChange={(e) =>
                    setRoles((prev) =>
                      prev.map((r) => (r.id === role.id ? { ...r, [col]: e.target.value } : r)),
                    )
                  }
                  onBlur={(e) =>
                    void patch("op_project_roles", role.id, { [col]: e.target.value || null })
                  }
                  className={INPUT}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder={t("ops.rolePlaceholder")}
            className={INPUT + " w-60"}
          />
          <button
            onClick={() => void addRole()}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
          >
            {t("ops.addRole")}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold">{t("ops.assignments")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("ops.assignmentsNote")}</p>

        <ul className="mt-3 divide-y divide-border">
          {assignments.map((row, index) => (
            <li key={row.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1 truncate text-sm">
                {row.member?.full_name ?? row.member_id}
                <span className="ml-2 text-xs text-muted-foreground">
                  {roles.find((r) => r.id === row.role_id)?.name ?? ""}
                </span>
              </span>
              <button
                onClick={() => void moveAssignmentUp(row, index)}
                disabled={index === 0}
                aria-label={t("ops.moveUp")}
                className="rounded p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => void unassign(row)}
                aria-label={t("ops.remove")}
                className="rounded p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {assignments.length === 0 ? (
            <li className="py-2 text-sm text-muted-foreground">{t("ops.noAssignments")}</li>
          ) : null}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("ops.memberSearch")}
            className={INPUT + " w-56"}
          />
          <select
            aria-label={t("ops.member")}
            value={pickedMember}
            onChange={(e) => setPickedMember(e.target.value)}
            className={INPUT + " w-56"}
          >
            <option value="">{t("ops.selectMember")}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name ?? m.id}
              </option>
            ))}
          </select>
          <select
            aria-label={t("ops.role")}
            value={pickedRole}
            onChange={(e) => setPickedRole(e.target.value)}
            className={INPUT + " w-44"}
          >
            <option value="">{t("ops.selectRole")}</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => void assign()}
            disabled={!pickedMember || !pickedRole}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {t("ops.assign")}
          </button>
        </div>
        {notice ? <p className="mt-2 text-xs text-muted-foreground">{notice}</p> : null}
      </section>
    </>
  );
}
