/**
 * Server functions for operational structure management and project assignments.
 * Exports: listOpsProjects, searchOpsMembers, listOpsAssignments (createServerFn).
 * Called by staff routes.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPlatformAdmin } from "./authz";

const searchSchema = z.object({ term: z.string() });
const projectSchema = z.object({ projectId: z.string().uuid() });
const memberSchema = z.object({ memberId: z.string().uuid() });

const auditSchema = z.object({
  offset: z.number().int().min(0).default(0),
  projectId: z.string().uuid().optional(),
  action: z.enum(["assigned", "unassigned"]).optional(),
  search: z.string().trim().max(120).optional(),
});

/** Private operational history; ordinary reads remain bound to the caller's RLS. */
export const listOpsAssignmentHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => auditSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context);
    let query = context.supabase
      .from("op_assignment_audit_log")
      .select(
        "id, created_at, action, member_name, project_name, role_name, actor_id, actor_name, project_id",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (data.projectId) query = query.eq("project_id", data.projectId);
    if (data.action) query = query.eq("action", data.action);
    // Remove PostgREST expression/wildcard characters, never interpolate raw input.
    const term = data.search?.replace(/[^\p{L}\p{N}\s'-]/gu, "").trim();
    if (term)
      query = query.or(
        `member_name.ilike.%${term}%,role_name.ilike.%${term}%,project_name.ilike.%${term}%,actor_name.ilike.%${term}%`,
      );
    const { data: entries, count, error } = await query.range(data.offset, data.offset + 9);
    if (error) throw new Error("Could not load assignment history");
    return { entries: entries ?? [], total: count ?? 0 };
  });

/**
 * Project list for the admin editor.
 *
 * Read server-side because `op_projects.contact_email` is intentionally not
 * granted to the browser roles; selecting it from the client fails the whole
 * query with "permission denied for table op_projects".
 */
export const listOpsProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context);
    const { listOpsProjects: run } = await import("./ops-admin.server");
    return await run();
  });

/** Member name search for the operational-structure assignment picker. */
export const searchOpsMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => searchSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context);
    const { searchOpsMembers: run } = await import("./ops-admin.server");
    return await run(data.term);
  });

/** Assignments of one project, with member names resolved server-side. */
export const listOpsAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => projectSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context);
    const { listOpsAssignments: run } = await import("./ops-admin.server");
    return await run(data.projectId);
  });

/** Remaining assignment count for a member (drives the editor-revoke prompt). */
export const countOpsAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => memberSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context);
    const { countOpsAssignments: run } = await import("./ops-admin.server");
    return await run(data.memberId);
  });
