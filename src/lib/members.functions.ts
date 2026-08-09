/**
 * Server functions for member management, sync control, and account claim flows.
 * Exports: listMembers, runSyncNow, completeMemberClaim (createServerFn). Called by staff and claim routes.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, assertStaff } from "./authz";

/** Staff members list, including contact details the public role cannot read. */
export const listMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { listMembersForStaff } = await import("./member-admin.server");
    return await listMembersForStaff();
  });

/** Manual sync run (admin). Uses whichever mode integration_config is in. */
export const runSyncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = await assertAdmin(context);
    const { runMemberSync } = await import("./member-sync.server");
    return await runMemberSync({ triggerSource: "manual", actorUserId: userId });
  });

/** Admin "Clean up": anonymise members past their scheduled deletion date. */
export const getSyncRunDetail = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ runId: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    // Admin only: the run log carries member names and email addresses.
    await assertAdmin(context);
    const { loadSyncRunDetail } = await import("./sync-run-log.server");
    return await loadSyncRunDetail(data.runId);
  });

/** Admin "Clean up": anonymise members past their scheduled deletion date. */
export const cleanupExpiredMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = await assertAdmin(context);
    const { runLifecycleCleanup } = await import("./member-sync.server");
    return await runLifecycleCleanup(userId);
  });

/** One-time TEST -> LIVE cutover (admin only, irreversible). */
export const executeCutover = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ confirm: z.literal("CUTOVER") }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = await assertAdmin(context);
    const { runCutover } = await import("./cutover.server");
    return await runCutover(userId);
  });

/**
 * Cutover readiness rehearsal (admin only, non-destructive). Runs pre-flight and
 * the archive snapshot, then reports exactly what a real cutover would delete,
 * unbind and switch — without freezing, purging, changing mode or importing.
 */
export const rehearseCutover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = await assertAdmin(context);
    const { runCutover } = await import("./cutover.server");
    return await runCutover(userId, { dryRun: true });
  });

/** Bulk PII export — admin only, never editors. */
export const exportMembersCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { buildMembersCsv } = await import("./members-export.server");
    return await buildMembersCsv();
  });

/** Admin member detail: imported ICF reference data + local directory fields. */
export const getMemberDetail = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ memberId: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { loadMemberDetail } = await import("./member-admin.server");
    return await loadMemberDetail(data.memberId);
  });

/**
 * Staff-owned directory fields. Service-area regions are declared, never
 * derived from the imported address, so they are only written from here or
 * (later) from the Member Area.
 */
export const updateMemberDirectory = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        memberId: z.string().uuid(),
        visibility: z
          .enum(["draft", "published", "hidden_no_credential", "hidden_inactive", "hidden_admin"])
          .optional(),
        mentor_accredited: z.boolean().optional(),
        supervision_accredited: z.boolean().optional(),
        region_ids: z.array(z.string().uuid()).max(40).optional(),
      })
      .parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const userId = await assertAdmin(context);
    const { updateMemberDirectoryAdmin } = await import("./member-admin.server");
    return await updateMemberDirectoryAdmin(userId, data);
  });

/**
 * Member account claim. Built now, inert until the chapter explicitly opens the
 * Member Area after the LIVE cutover — `account_claim_enabled` cannot be true
 * in TEST mode (database trigger).
 */
export const requestMemberClaim = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ email: z.string().email().max(320) }).parse(input))
  .handler(async ({ data }) => {
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const { getRequestHeaders } = await import("@tanstack/react-start/server");
    const { attemptMemberClaim } = await import("./member-claim.server");
    const { checkRateLimit, clientIp } = await import("./rate-limit.server");

    // Per-IP cap on top of the per-address cap in the state machine, so the
    // form cannot be walked through a list of addresses from one host.
    const request = new Request("https://local/", { headers: getRequestHeaders() as HeadersInit });
    const verdict = await checkRateLimit("member-claim", `ip:${clientIp(request)}`, [
      { windowSeconds: 3_600, max: 10 },
      { windowSeconds: 86_400, max: 30 },
    ]);
    // Throttled callers get the same neutral answer as everyone else.
    if (!verdict.allowed) return { status: "sent" as const };

    const result = await attemptMemberClaim(data.email, new URL(getRequestUrl()).origin);
    // Outcome-neutral: only "the claim window is closed" and "if this address
    // belongs to a member, an email is on its way" are observable publicly.
    // The precise statuses stay internal to the staff-side support flow.
    return { status: result.status === "disabled" ? ("disabled" as const) : ("sent" as const) };
  });

/** Read-only token state for the /claim/$token screen. Never returns the raw email. */
export const getMemberClaimStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { loadIntegrationConfigAdmin } = await import("./integration-config.server");
  const config = await loadIntegrationConfigAdmin();
  return {
    enabled: config.account_claim_enabled && config.mode === "live" && !config.cutover_in_progress,
  };
});

export const checkMemberClaimToken = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().min(20).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { verifyClaimToken } = await import("./member-claim.server");
    return await verifyClaimToken(data.token);
  });

/**
 * Consumes a claim token: creates the account, binds the member record and
 * grants the `member` role in one guarded path.
 */
export const completeMemberClaim = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ token: z.string().min(20).max(200), password: z.string().min(10).max(200) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { completeClaim } = await import("./member-claim.server");
    return await completeClaim(data.token, data.password);
  });

/**
 * Admin support tooling: mint a claim link and show it once. Exists because the
 * member-facing email transport is still inert before the LIVE cutover.
 */
export const issueMemberClaimLink = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ memberId: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const userId = await assertAdmin(context);
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const { issueClaimLinkForMember } = await import("./member-claim.server");
    return await issueClaimLinkForMember(userId, data.memberId, new URL(getRequestUrl()).origin);
  });

/** Read model behind the staff invitation panel (admin only). */
export const getMemberClaimInvitationStatus = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ memberId: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { loadClaimInvitationStatus } = await import("./member-claim.server");
    return await loadClaimInvitationStatus(data.memberId);
  });

/** Sends (or resends) the claim invitation email to a member. Admin only. */
export const sendMemberClaimInvitation = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ memberId: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const userId = await assertAdmin(context);
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const { sendClaimInvitation } = await import("./member-claim.server");
    return await sendClaimInvitation(userId, data.memberId, new URL(getRequestUrl()).origin);
  });
/**
 * Staff-support account binding (admin only). Separate from the future
 * member-initiated claim flow — this is testing/support tooling.
 */
export const getMemberClaimStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { loadClaimStatuses } = await import("./member-admin.server");
    return await loadClaimStatuses();
  });

/**
 * Staff-support account binding (admin only). Separate from the future
 * member-initiated claim flow — this is testing/support tooling.
 */
export const bindMemberAccount = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ memberId: z.string().uuid(), email: z.string().email().max(320) }).parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const userId = await assertAdmin(context);
    const { bindMemberToAuthUser } = await import("./member-admin.server");
    return await bindMemberToAuthUser(userId, data.memberId, data.email);
  });

export const unbindMemberAccount = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ memberId: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const userId = await assertAdmin(context);
    const { unbindMemberAuthUser } = await import("./member-admin.server");
    await unbindMemberAuthUser(userId, data.memberId);
    return { ok: true };
  });
