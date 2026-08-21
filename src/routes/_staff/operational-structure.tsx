/**
 * Admin — operational structure.
 *
 * Owns the three lists behind the public team page: projects (the filter
 * pills), the roles inside each project, and who is assigned to what. Writes
 * go through the caller's own RLS-scoped client; the "admins manage …"
 * policies on `op_*` are the real boundary.
 *
 * Assignment side effect: being part of the operational structure grants the
 * existing `editor` role (no new role was introduced). Removing the last
 * assignment never auto-revokes it — `editor` may also have been granted for
 * editorial work — so the admin is asked.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useCms } from "@/i18n/cms";
import { requireStaffAccess, PLATFORM_ADMIN_ROLES } from "@/lib/staff-guard";
import { slugifyVocab } from "@/lib/vocabularies";
import {
  countOpsAssignments,
  listOpsAssignments,
  listOpsProjects,
  searchOpsMembers,
} from "@/lib/ops-admin.functions";
import { grantMemberRole, revokeMemberRole } from "@/lib/roles.functions";
import { translateOpsLabels } from "@/lib/ops-label-translations.functions";
import { ProjectGroupList } from "@/components/cms/ops/ProjectGroupList";
import { ProjectForm } from "@/components/cms/ops/ProjectForm";
import { RoleAssignmentEditor } from "@/components/cms/ops/RoleAssignmentEditor";
import {
  INPUT,
  type Assignment,
  type Localized,
  type MemberOption,
  type ProjectRow,
} from "@/components/cms/ops/types";

export const Route = createFileRoute("/_staff/operational-structure")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, PLATFORM_ADMIN_ROLES),
  head: () => ({
    meta: [
      { title: "Operational structure — The Switzerland Chapter of ICF CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OperationalStructurePage,
});

const COLUMNS = "id, slug, name, name_de, name_fr, name_it, sort_order, is_active";

function OperationalStructurePage() {
  const { t } = useCms();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [roles, setRoles] = useState<Localized[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [search, setSearch] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newRole, setNewRole] = useState("");
  const [pickedMember, setPickedMember] = useState("");
  const [pickedRole, setPickedRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Ids currently being machine-translated (a new row, or a manual re-run).
  const [translating, setTranslating] = useState<string[]>([]);
  // Reordering writes `sort_order`, which drives the public /team filter chips
  // and the /communities order. It is a rare action, so the arrows stay hidden
  // behind this toggle instead of dominating the list.
  const [reordering, setReordering] = useState(false);

  const loadProjects = async () => {
    // `contact_email` is not granted to the browser roles (it is the private
    // community inbox), so the whole project read happens server-side.
    let rows: ProjectRow[];
    try {
      rows = (await listOpsProjects()) as ProjectRow[];
    } catch (err: unknown) {
      return setError(err instanceof Error ? err.message : String(err));
    }
    setProjects(rows);
    setSelected((current) => current ?? rows[0]?.id ?? null);
  };

  const loadDetail = async (projectId: string) => {
    // Assignments carry member names, and the browser role holds no grants on
    // `public.members` — that read has to happen server-side.
    const [roleRes, assignRows] = await Promise.all([
      supabase
        .from("op_project_roles")
        .select(COLUMNS)
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true }),
      listOpsAssignments({ data: { projectId } }).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        return [] as Assignment[];
      }),
    ]);
    if (roleRes.error) return setError(roleRes.error.message);
    setRoles((roleRes.data ?? []) as Localized[]);
    setAssignments(assignRows as Assignment[]);
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    if (selected) void loadDetail(selected);
  }, [selected]);

  // Member picker: a name search, capped — the chapter has hundreds of members.
  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setMembers([]);
      return;
    }
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const data = await searchOpsMembers({ data: { term } });
          setMembers(data as MemberOption[]);
        } catch {
          setMembers([]);
        }
      })();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const patch = async (
    table: "op_projects" | "op_project_roles",
    id: string,
    values: Partial<ProjectRow>,
  ) => {
    if (table === "op_projects") {
      setProjects((prev) => prev.map((r) => (r.id === id ? { ...r, ...values } : r)));
    } else {
      setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...values } : r)));
    }
    const { error: err } = await supabase
      .from(table)
      .update(values as never)
      .eq("id", id);
    if (err) setError(err.message);
  };

  const move = async (
    table: "op_projects" | "op_project_roles",
    rows: Localized[],
    index: number,
    direction: -1 | 1,
  ) => {
    const a = rows[index];
    const b = rows[index + direction];
    if (!a || !b) return;
    await Promise.all([
      supabase.from(table).update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from(table).update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    if (table === "op_projects") await loadProjects();
    else if (selected) await loadDetail(selected);
  };

  /**
   * Machine-translate one English label into DE/FR/IT and write it back.
   * Creation never depends on this: the row already exists when we get here,
   * so an AI failure only surfaces a notice, it does not lose the entry.
   * Results stay editable — the locale inputs write over them normally.
   */
  const translateLabels = async (
    table: "op_projects" | "op_project_roles",
    id: string,
    name: string,
  ) => {
    if (!name.trim()) return;
    setTranslating((prev) => [...prev, id]);
    try {
      const [labels] = await translateOpsLabels({ data: { names: [name.trim()] } });
      if (!labels) throw new Error("empty translation");
      await patch(table, id, {
        name_de: labels.de,
        name_fr: labels.fr,
        name_it: labels.it,
      });
    } catch {
      setError(t("ops.translateFailed"));
    } finally {
      setTranslating((prev) => prev.filter((entry) => entry !== id));
    }
  };

  const addProject = async () => {
    const name = newProject.trim();
    if (!name) return;
    const { data: row, error: err } = await supabase
      .from("op_projects")
      .insert({
        name,
        slug: slugifyVocab(name) || `project-${Date.now()}`,
        sort_order: (projects.at(-1)?.sort_order ?? 0) + 10,
      })
      .select("id")
      .single();
    if (err) return setError(err.message);
    setNewProject("");
    await loadProjects();
    if (row) await translateLabels("op_projects", row.id, name);
  };

  const addRole = async () => {
    const name = newRole.trim();
    if (!name || !selected) return;
    const { data: row, error: err } = await supabase
      .from("op_project_roles")
      .insert({
        project_id: selected,
        name,
        slug: slugifyVocab(name) || `role-${Date.now()}`,
        sort_order: (roles.at(-1)?.sort_order ?? 0) + 10,
      })
      .select("id")
      .single();
    if (err) return setError(err.message);
    setNewRole("");
    await loadDetail(selected);
    if (row) await translateLabels("op_project_roles", row.id, name);
  };

  const removeRow = async (table: "op_projects" | "op_project_roles", id: string) => {
    if (!window.confirm(t("ops.confirmDelete"))) return;
    const { error: err } = await supabase.from(table).delete().eq("id", id);
    if (err) return setError(err.message);
    if (table === "op_projects") {
      setSelected(null);
      await loadProjects();
    } else if (selected) {
      await loadDetail(selected);
    }
  };

  const assign = async () => {
    if (!selected || !pickedMember || !pickedRole) return;
    setError(null);
    const member = members.find((m) => m.id === pickedMember);
    const { error: err } = await supabase.from("op_assignments").insert({
      member_id: pickedMember,
      project_id: selected,
      role_id: pickedRole,
      sort_order: (assignments.at(-1)?.sort_order ?? 0) + 10,
    });
    if (err) return setError(err.message);

    // Reuse the existing `editor` grant; a member who has not claimed their
    // account yet simply gets it the moment they are granted one.
    if (member?.auth_user_id) {
      try {
        await grantMemberRole({ data: { memberId: pickedMember, role: "editor" } });
      } catch {
        setError(t("ops.grantFailed"));
      }
    } else {
      setError(t("ops.unclaimed"));
    }
    setPickedMember("");
    setSearch("");
    await loadDetail(selected);
  };

  const unassign = async (row: Assignment) => {
    if (!selected) return;
    const { error: err } = await supabase.from("op_assignments").delete().eq("id", row.id);
    if (err) return setError(err.message);

    const count = await countOpsAssignments({ data: { memberId: row.member_id } }).catch(() => 1);
    if (!count && row.member?.auth_user_id && window.confirm(t("ops.confirmRevoke"))) {
      try {
        await revokeMemberRole({ data: { memberId: row.member_id, role: "editor" } });
      } catch {
        setError(t("ops.revokeFailed"));
      }
    }
    await loadDetail(selected);
  };

  const moveAssignmentUp = async (row: Assignment, index: number) => {
    const b = assignments[index - 1];
    if (!b) return;
    await Promise.all([
      supabase.from("op_assignments").update({ sort_order: b.sort_order }).eq("id", row.id),
      supabase.from("op_assignments").update({ sort_order: row.sort_order }).eq("id", b.id),
    ]);
    await loadDetail(selected!);
  };

  const project = projects.find((p) => p.id === selected) ?? null;

  return (
    <Shell>
      <div className="mx-auto max-w-5xl px-10 py-10">
        <h1 className="text-2xl font-bold tracking-tight">{t("ops.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("ops.subtitle")}</p>
        {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

        <div className="mt-6 flex gap-2">
          <input
            value={newProject}
            onChange={(e) => setNewProject(e.target.value)}
            placeholder={t("ops.projectPlaceholder")}
            className={INPUT + " w-72"}
          />
          <button
            onClick={() => void addProject()}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            {t("ops.addProject")}
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
          <ProjectGroupList
            t={t}
            projects={projects}
            selected={selected}
            setSelected={setSelected}
            reordering={reordering}
            setReordering={setReordering}
            move={move}
          />

          {project ? (
            <div className="space-y-6">
              <ProjectForm
                t={t}
                project={project}
                setProjects={setProjects}
                patch={patch}
                removeRow={removeRow}
                loadProjects={loadProjects}
                translateLabels={translateLabels}
                translating={translating}
              />

              <RoleAssignmentEditor
                t={t}
                roles={roles}
                setRoles={setRoles}
                patch={patch}
                move={move}
                removeRow={removeRow}
                newRole={newRole}
                setNewRole={setNewRole}
                addRole={addRole}
                assignments={assignments}
                moveAssignmentUp={moveAssignmentUp}
                unassign={unassign}
                search={search}
                setSearch={setSearch}
                members={members}
                pickedMember={pickedMember}
                setPickedMember={setPickedMember}
                pickedRole={pickedRole}
                setPickedRole={setPickedRole}
                assign={assign}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("ops.selectProject")}</p>
          )}
        </div>
      </div>
    </Shell>
  );
}
