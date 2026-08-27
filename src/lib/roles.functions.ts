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
const historySchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
  offset: z.number().int().min(0).default(0),
  search: z.string().max(120).optional(),
  role: z.enum(GRANTABLE_ROLES).optional(),
  action: z.enum(["granted", "revoked"]).optional(),
});
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
    const {
      listClaimedMemberRoles,
      listInternalStaffAccounts,
      listRoleGrantAudit,
      countSuperAdmins,
    } = await import("./roles-admin.server");
    const [members, internal, audit, superAdminCount] = await Promise.all([
      listClaimedMemberRoles(),
      listInternalStaffAccounts(),
      listRoleGrantAudit(10, 0),
      countSuperAdmins(),
    ]);
    // The caller's own id and the Super Admin headcount drive the lockout
    // guards in the UI; the database enforces the same two rules.
    return {
      members,
      internal,
      audit: audit.entries,
      auditTotal: audit.total,
      superAdminCount,
      currentUserId: context.userId,
    };
  });

/**
 * Paged and filtered role change history. Separate from `listRoleAdminData` so
 * paging does not re-read the whole member and internal-account model.
 */
export const listRoleGrantHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => historySchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { listRoleGrantAudit } = await import("./roles-admin.server");
    const { entries, total } = await listRoleGrantAudit(data.limit, data.offset, {
      search: data.search,
      role: data.role,
      action: data.action,
    });
    return { entries, total };
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
    // Managed roles still require either a claim-linked member record or a
    // live `internal_accounts` marker — the database policy is the boundary,
    // this only keeps the error readable.
    if (data.role !== "admin") {
      const { data: internal } = await context.supabase
        .from("internal_accounts")
        .select("auth_user_id")
        .eq("auth_user_id", data.authUserId)
        .is("revoked_at", null)
        .maybeSingle();
      if (!internal) throw new Error("Could not grant access.");
    }
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

const inviteSchema = z.object({
  email: z.string().email().max(200),
  displayName: z.string().trim().min(2).max(120),
  role: z.enum(GRANTABLE_ROLES).optional(),
});

const ROLE_LABELS: Record<string, string> = {
  admin: "Super Admin",
  administrator: "Administrator",
  editor: "Editor",
  organizer: "Event organizer",
  publisher: "Publisher",
  membership: "Membership & Engagement",
};

/**
 * Invites an internal (non-member) staff account: creates or attaches the auth
 * account, records the `internal_accounts` marker, optionally grants one role
 * through the caller's own RLS-scoped client (so the audit trigger records the
 * acting Super Admin), and mails the one-time password-set link.
 */
export const inviteInternalAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const { createOrAttachInternalAccount, deliverInternalInvitation } =
      await import("./internal-accounts.server");

    const { authUserId } = await createOrAttachInternalAccount({
      email: data.email,
      displayName: data.displayName,
      invitedBy: context.userId,
    });

    if (data.role) {
      const { error } = await context.supabase
        .from("user_roles")
        .insert({ user_id: authUserId, role: data.role })
        .select("id");
      if (error && error.code !== "23505") throw new Error("Could not grant access.");
    }

    await deliverInternalInvitation({
      authUserId,
      email: data.email,
      displayName: data.displayName,
      roleLabel: data.role ? (ROLE_LABELS[data.role] ?? data.role) : "internal access",
      baseUrl: new URL(getRequestUrl()).origin,
      isResend: false,
    });

    return { ok: true, authUserId };
  });

/** Sends a fresh password-set link; any earlier link stops working. */
export const resendInternalInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const { deliverInternalInvitation } = await import("./internal-accounts.server");

    const { data: row } = await context.supabase
      .from("internal_accounts")
      .select("auth_user_id, display_name, email")
      .eq("auth_user_id", data.authUserId)
      .is("revoked_at", null)
      .maybeSingle();
    if (!row?.email) throw new Error("Could not send the invitation.");

    await deliverInternalInvitation({
      authUserId: row.auth_user_id as string,
      email: row.email as string,
      displayName: (row.display_name as string) || (row.email as string),
      roleLabel: "internal access",
      baseUrl: new URL(getRequestUrl()).origin,
      isResend: true,
    });
    return { ok: true };
  });

/**
 * Withdraws an invitation: every managed grant is removed through the caller's
 * client (audited), then the marker row goes away and an account that never
 * signed in is deleted, which kills the emailed link.
 */
export const withdrawInternalInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.authUserId === context.userId) throw new Error("Could not withdraw the invitation.");

    await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.authUserId)
      .in("role", MANAGED_ROLES)
      .select("id");

    const { withdrawInternalAccount } = await import("./internal-accounts.server");
    return await withdrawInternalAccount(data.authUserId);
  });

/**
 * Revokes an internal (non-member) staff account outright: all managed grants
 * are removed through the caller's client (audited), then the marker row and
 * the auth account are deleted.
 *
 * Guarded so a Super Admin cannot be removed sideways: the target must not hold
 * `admin` (turn that off first) and must not be the caller.
 */
export const revokeInternalAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.authUserId === context.userId) throw new Error("Could not revoke the account.");

    const { data: marker } = await context.supabase
      .from("internal_accounts")
      .select("auth_user_id")
      .eq("auth_user_id", data.authUserId)
      .maybeSingle();
    if (!marker) throw new Error("Not an internal account.");

    const { data: heldRoles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.authUserId);
    if ((heldRoles ?? []).some((r) => r.role === "admin")) {
      throw new Error("Remove Super Admin first.");
    }

    const { error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.authUserId)
      .in("role", MANAGED_ROLES)
      .select("id");
    if (error) throw new Error("Could not remove access.");

    const { deleteInternalAccount } = await import("./internal-accounts.server");
    return await deleteInternalAccount(data.authUserId);
  });

/**
 * Marks the signed-in internal account as activated. Called once from the
 * password-set screen; harmless if it runs again.
 */
export const completeInternalInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { markInternalAccountAccepted } = await import("./internal-accounts.server");
    await markInternalAccountAccepted(context.userId);
    return { ok: true };
  });

/**
 * Exchanges the emailed invitation token for a one-time Supabase hash.
 *
 * Public by necessity — the invitee has no session yet — so it is rate limited
 * per caller and outcome-neutral: every failure returns the same shape, never
 * revealing whether an address was invited.
 */
export const exchangeInternalInvite = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { checkRateLimit, clientIp } = await import("./rate-limit.server");
    const verdict = await checkRateLimit("internal-invite-exchange", clientIp(getRequest()), [
      { windowSeconds: 60, max: 10 },
      { windowSeconds: 3600, max: 60 },
    ]);
    if (!verdict.allowed) return { tokenHash: null as string | null };

    const { exchangeInternalInviteToken } = await import("./internal-accounts.server");
    return { tokenHash: await exchangeInternalInviteToken(data.token) };
  });
