/**
 * Append-only audit trail and per-user throttle for staff reads of member PII.
 *
 * Why: bulk member data (list, CSV export, detail) is the most valuable target
 * for a compromised staff account. Every call is recorded with actor, IP and
 * row count, and capped per user so mass extraction is slow and visible.
 * Logging fails open (never blocks the staff request), like the rate limiter.
 *
 * Exports: STAFF_MEMBER_LIMITS, guardMemberAccess, logMemberAccess.
 */
import { checkRateLimit, clientIp, type RateLimitRule } from "./rate-limit.server";

export type MemberAccessAction = "members_list" | "members_export" | "member_detail";

const HOUR = 3600;
const QUARTER = 900;

/** Per-user limits. Raise here if legitimate admin work hits them. */
export const STAFF_MEMBER_LIMITS: Record<MemberAccessAction, RateLimitRule[]> = {
  members_export: [
    { windowSeconds: HOUR, max: 3 },
    { windowSeconds: 24 * HOUR, max: 5 },
  ],
  members_list: [{ windowSeconds: QUARTER, max: 60 }],
  member_detail: [{ windowSeconds: QUARTER, max: 120 }],
};

const BUCKETS: Record<MemberAccessAction, string> = {
  members_export: "staff_members_export",
  members_list: "staff_members_list",
  member_detail: "staff_member_detail",
};

async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    if (!request) return { ip: null, userAgent: null };
    return {
      ip: clientIp(request),
      userAgent: (request.headers.get("user-agent") ?? "").slice(0, 200) || null,
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

export async function logMemberAccess(entry: {
  actorUserId: string;
  action: MemberAccessAction | `${MemberAccessAction}_blocked`;
  subjectMemberId?: string | null;
  rowCount?: number | null;
}): Promise<void> {
  try {
    const meta = await requestMeta();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("member_access_log").insert({
      actor_user_id: entry.actorUserId,
      action: entry.action,
      subject_member_id: entry.subjectMemberId ?? null,
      row_count: entry.rowCount ?? null,
      ip: meta.ip,
      user_agent: meta.userAgent,
    });
    if (error) console.error("member_access_log insert failed", error.message);
    // Opportunistic retention: ~2% of writes prune entries older than 12 months.
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 365 * 86_400_000).toISOString();
      await supabaseAdmin.from("member_access_log").delete().lt("created_at", cutoff);
    }
  } catch (err) {
    console.error("member_access_log insert failed", err);
  }
}

/** Throws a user-facing error when the caller exceeded the limit (and logs the block). */
export async function guardMemberAccess(
  actorUserId: string,
  action: MemberAccessAction,
  subjectMemberId?: string,
): Promise<void> {
  const verdict = await checkRateLimit(BUCKETS[action], actorUserId, STAFF_MEMBER_LIMITS[action]);
  if (verdict.allowed) return;
  await logMemberAccess({ actorUserId, action: `${action}_blocked`, subjectMemberId });
  throw new Error("RATE_LIMITED: Too many requests. Please try again later.");
}
