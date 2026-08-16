/**
 * Role administration RPC surface (admin only).
 *
 * Only `editor` is grantable here, and only on a claimed member account.
 * `admin` remains a migration-only provisioning step: letting one admin session
 * mint further admins turns a single compromise into a permanent one.
 *
 * Writes go through `context.supabase` — the caller's own RLS-scoped client —
 * so the database policies ("admins grant editor" / "admins revoke editor")
 * are the real boundary and the audit trigger records the acting admin.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./authz";
import { GRANTABLE_ROLES, MANAGED_ROLES } from "./role-model";

const memberIdSchema = z.object({ memberId: z.string().uuid() });
const grantSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(GRANTABLE_ROLES),
});
const accountSchema = z.object({ authUserId: z.string().uuid() });
const accountRoleSchema = z.object({
  authUserId: z.string().uuid(),
  role: z.enum(GRANTABLE_ROLES),
});
const qaAccountSchema = z.object({
  memberId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(10),
});
const qaSearchSchema = z.object({ query: z.string().max(120) });

/**
 * Claimed members with their current CMS grant, the internal (non-member)
 * privileged accounts, and recent grant history.
 */
export const listRoleAdminData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { listClaimedMemberRoles, listInternalStaffAccounts, listRoleGrantAudit, countSuperAdmins } =
      await import("./roles-admin.server");
    const [members, internal, audit, superAdminCount] = await Promise.all([
      listClaimedMemberRoles(),
      listInternalStaffAccounts(),
      listRoleGrantAudit(),
      countSuperAdmins(),
    ]);
    // The caller's own id and the Super Admin headcount drive the lockout
    // guards in the UI; the database enforces the same two rules.
    return { members, internal, audit, superAdminCount, currentUserId: context.userId };
  });

/**
 * QA support path: the claimable-member list and whether the TEST-mode gate is
 * currently open. Separate from the main read model so the Roles screen only
 * pays for it when the panel is opened.
 */
export const listQaProvisioningOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { loadIntegrationConfigAdmin } = await import("./integration-config.server");
    const config = await loadIntegrationConfigAdmin();
    if (config.mode !== "test") return { testMode: false as const, candidates: [] };
    const { listClaimableMembers } = await import("./qa-test-account.server");
    return { testMode: true as const, candidates: await listClaimableMembers() };
  });

/**
 * Searches every claimable member, not just the first page of the default
 * list — the picker would otherwise never surface members further down the
 * alphabet.
 */
export const searchQaCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => qaSearchSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { loadIntegrationConfigAdmin } = await import("./integration-config.server");
    const config = await loadIntegrationConfigAdmin();
    if (config.mode !== "test") return { candidates: [], truncated: false };
    const { listClaimableMembers } = await import("./qa-test-account.server");
    const candidates = await listClaimableMembers(data.query, 50);
    return { candidates, truncated: candidates.length === 50 };
  });

/**
 * Creates a pure-member QA account and binds it to one unclaimed member.
 * The password is echoed back once by the caller's UI and never stored.
 */
export const provisionQaTestAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => qaAccountSchema.parse(input))
  .handler(async ({ context, data }) => {
    const actorUserId = await assertAdmin(context);
    const { provisionQaTestMember } = await import("./qa-test-account.server");
    return provisionQaTestMember(actorUserId, data.memberId, data.email, data.password);
  });

/** Adds a managed staff grant to a claimed member. Membership is untouched. */
export const listAccountRoleAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { listRoleGrantAuditForUser } = await import("./roles-admin.server");
    return { audit: await listRoleGrantAuditForUser(data.authUserId) };
  });

/** Adds a managed staff grant to a claimed member. Membership is untouched. */
export const grantMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => grantSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { authUserIdForMember } = await import("./roles-admin.server");
    const authUserId = await authUserIdForMember(data.memberId);

    // Plain insert, not upsert: the grant path holds INSERT and DELETE only,
    // so an already-granted row is a harmless unique-violation, not an update.
    // `.select()` makes PostgREST return the affected row, so a policy-blocked
    // write cannot be mistaken for success.
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: authUserId, role: data.role })
      .select("id");
    if (error && error.code !== "23505") throw new Error("Could not grant access.");
    return { ok: true };
  });

/** Removes a managed staff grant. The member keeps their profile and portal. */
export const revokeMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => grantSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { authUserIdForMember } = await import("./roles-admin.server");
    const authUserId = await authUserIdForMember(data.memberId);

    // A DELETE blocked by RLS returns no error and zero rows, so the row count
    // — not the error — is what proves the revoke actually happened.
    const { data: deleted, error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", authUserId)
      .eq("role", data.role)
      .select("id");
    if (error) throw new Error("Could not revoke access.");
    if (!deleted || deleted.length === 0) throw new Error("Could not revoke access.");
    return { ok: true };
  });

/**
 * Grants a role to an account addressed by its auth user id — the internal
 * accounts on the Roles screen have no imported member record to key off.
 * Only `admin` is legal here: the four managed roles still require a
 * claim-linked member and go through `grantMemberRole`.
 */
export const grantAccountRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountRoleSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.role !== "admin") throw new Error("Could not grant access.");
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.authUserId, role: data.role })
      .select("id");
    if (error && error.code !== "23505") throw new Error("Could not grant access.");
    return { ok: true };
  });

/** Revokes one role from an account addressed by its auth user id. */
export const revokeAccountRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountRoleSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: deleted, error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.authUserId)
      .eq("role", data.role)
      .select("id");
    // The database refuses a self-revoke and the removal of the last Super
    // Admin; surface that reason instead of the generic message.
    if (error) throw new Error(error.message || "Could not revoke access.");
    if (!deleted || deleted.length === 0) throw new Error("Could not revoke access.");
    return { ok: true };
  });

/**
 * Removes every managed staff grant (editor + organizer) from one account in a
 * single action. `admin` and `member` are deliberately untouched: this only
 * takes away CMS/event access, never membership or the account itself.
 *
 * Keyed by auth user id rather than member id so it also works for internal
 * accounts that have no imported member record.
 */
export const revokeAccountStaffRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.authUserId)
      .in("role", MANAGED_ROLES)
      .select("id");
    if (error) throw new Error("Could not remove access.");
    return { ok: true };
  });
