/**
 * Operational structure — admin reads that touch `members`.
 *
 * The browser role holds no grants on `public.members` at all (contact details
 * were deliberately taken off the Data API), so the admin screen cannot embed
 * member names into its `op_assignments` query. These reads run server-side
 * with the admin client after the caller has been verified as an admin.
 *
 * `op_projects.contact_email` is in the same category: the Data API grants on
 * that table are column-scoped and deliberately exclude the private inbox, so
 * the admin project list is read here too rather than from the browser client.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ProjectRow } from "@/components/cms/ops/types";

/** Columns the operational-structure editor needs, including the private ones. */
const PROJECT_COLUMNS =
  "id, slug, name, name_de, name_fr, name_it, sort_order, is_active," +
  " is_community, is_project_team, is_featured_community, description, description_de, description_fr," +
  " description_it, cadence_note, cadence_note_de, cadence_note_fr, cadence_note_it," +
  " contact_email, signup_url, language_slugs, cover_image_url, cover_image_alt," +
  " image_source, image_credit_name, image_credit_url";

export type OpsMemberOption = {
  id: string;
  full_name: string | null;
  auth_user_id: string | null;
};

export type OpsAssignment = {
  id: string;
  member_id: string;
  role_id: string;
  sort_order: number;
  member: { full_name: string | null; email: string | null; auth_user_id: string | null } | null;
};

/** Name search for the assignment picker, capped for a chapter of hundreds. */

/** Every project/community row for the admin editor, private columns included. */
export async function listOpsProjects(): Promise<ProjectRow[]> {
  const { data, error } = await supabaseAdmin
    .from("op_projects")
    .select(PROJECT_COLUMNS)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ProjectRow[];
}

export async function searchOpsMembers(term: string): Promise<OpsMemberOption[]> {
  const cleaned = term.replace(/[%_,()]/g, "").trim();
  if (cleaned.length < 2) return [];
  const { data, error } = await supabaseAdmin
    .from("members")
    .select("id, full_name, auth_user_id")
    .ilike("full_name", `%${cleaned}%`)
    .order("full_name", { ascending: true })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as OpsMemberOption[];
}

/** Assignments of one project, resolved to member names for display. */
export async function listOpsAssignments(projectId: string): Promise<OpsAssignment[]> {
  const { data, error } = await supabaseAdmin
    .from("op_assignments")
    .select("id, member_id, role_id, sort_order, member:members(full_name, email, auth_user_id)")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as OpsAssignment[];
}

/** How many assignments a member still holds — drives the revoke prompt. */
export async function countOpsAssignments(memberId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("op_assignments")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId);
  if (error) throw error;
  return count ?? 0;
}
