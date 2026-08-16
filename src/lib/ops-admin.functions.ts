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
