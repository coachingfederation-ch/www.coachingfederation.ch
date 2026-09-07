/**
 * Email drift between ICF Global and the sign-in account.
 *
 * ICF Global is the master for a member's contact address, but it is *not*
 * allowed to move the address someone signs in with: an address handed to us
 * by a third system has never been proven to belong to the person holding the
 * account. So a changed feed address updates `members.email` (contact data)
 * and is parked as `pending_email` (sign-in data) until the member confirms
 * it from their own session through the provider's email-change flow.
 *
 * States on `members.email_change_state`:
 *   none    — sign-in address and member record agree.
 *   pending — the feed moved the address; the member has not been asked yet.
 *   sent    — a confirmation link went out to the new address.
 *   blocked — another account already signs in with that address; staff only.
 *
 * Server-only: reads the Auth Admin API. Never import from a component.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type EmailChangeState = "none" | "pending" | "sent" | "blocked";

export type PendingEmailChange = {
  memberId: string;
  /** Address ICF Global reports — the one the member is asked to confirm. */
  pendingEmail: string;
  /** Address the account still signs in with. */
  currentSignInEmail: string;
  since: string | null;
  state: Exclude<EmailChangeState, "none">;
};

const norm = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

/** Sign-in address of an auth account, or null when the account is gone. */
async function signInEmail(authUserId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(authUserId);
  if (error) return null;
  return data.user?.email ?? null;
}

/** True when some *other* auth account already owns this address. */
async function addressTaken(email: string, ownAuthUserId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("members")
    .select("auth_user_id")
    .ilike("email", email)
    .not("auth_user_id", "is", null)
    .limit(5);
  if (error) return false;
  return (data ?? []).some((row) => row.auth_user_id !== ownAuthUserId);
}

async function setState(
  memberId: string,
  patch: {
    pending_email: string | null;
    pending_email_since: string | null;
    email_change_state: EmailChangeState;
  },
): Promise<void> {
  const { error } = await supabaseAdmin.from("members").update(patch).eq("id", memberId);
  if (error) throw error;
}

/** Clears the pending change once the account actually signs in with it. */
async function clearIfSettled(row: {
  id: string;
  pending_email: string | null;
  authEmail: string | null;
}): Promise<boolean> {
  if (!row.pending_email || norm(row.pending_email) !== norm(row.authEmail)) return false;
  await setState(row.id, {
    pending_email: null,
    pending_email_since: null,
    email_change_state: "none",
  });
  return true;
}

/**
 * Called at the end of a member sync for the records whose email field moved.
 * Only claimed accounts matter — an unclaimed member has no sign-in address to
 * protect, so the feed value simply stands.
 */
export type SyncEventLogger = (
  eventType: string,
  message: string,
  extra?: Record<string, unknown>,
) => Promise<void>;

export async function detectEmailDriftForRun(
  changedRecnos: string[],
  logEvent: SyncEventLogger,
): Promise<{ pending: number; blocked: number; settled: number }> {
  const result = { pending: 0, blocked: 0, settled: 0 };
  if (!changedRecnos.length) return result;

  const { data: rows, error } = await supabaseAdmin
    .from("members")
    .select("id, cst_recno, email, auth_user_id, pending_email, email_change_state")
    .in("cst_recno", changedRecnos)
    .not("auth_user_id", "is", null);
  if (error) throw error;

  for (const row of rows ?? []) {
    const authUserId = row.auth_user_id as string;
    const authEmail = await signInEmail(authUserId);
    if (!authEmail) continue;

    if (await clearIfSettled({ id: row.id, pending_email: row.pending_email, authEmail })) {
      result.settled += 1;
      continue;
    }

    const feedEmail = (row.email ?? "").trim();
    if (!feedEmail || norm(feedEmail) === norm(authEmail)) {
      if (row.email_change_state !== "none") {
        await setState(row.id, {
          pending_email: null,
          pending_email_since: null,
          email_change_state: "none",
        });
      }
      continue;
    }

    // Already parked on the same address — leave the state (and any sent
    // confirmation) alone so a daily run does not reset the member's progress.
    if (norm(row.pending_email) === norm(feedEmail) && row.email_change_state !== "none") continue;

    const blocked = await addressTaken(feedEmail, authUserId);
    await setState(row.id, {
      pending_email: feedEmail,
      pending_email_since: new Date().toISOString(),
      email_change_state: blocked ? "blocked" : "pending",
    });
    if (blocked) result.blocked += 1;
    else result.pending += 1;

    await logEvent(
      blocked ? "email_change_blocked" : "email_change_pending",
      blocked
        ? "ICF Global reports an address that another account already signs in with."
        : "ICF Global reports a new address — the member has to confirm it before sign-in moves.",
      { severity: blocked ? "warning" : "info", member_id: row.id, cst_recno: String(row.cst_recno) },
    );
  }

  return result;
}

/** The caller's own pending change, settling it first when it already went through. */
export async function loadPendingEmailChange(userId: string): Promise<PendingEmailChange | null> {
  const { data: row, error } = await supabaseAdmin
    .from("members")
    .select("id, pending_email, pending_email_since, email_change_state, auth_user_id")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!row || !row.pending_email || row.email_change_state === "none") return null;

  const authEmail = await signInEmail(userId);
  if (await clearIfSettled({ id: row.id, pending_email: row.pending_email, authEmail })) return null;

  return {
    memberId: row.id,
    pendingEmail: row.pending_email,
    currentSignInEmail: authEmail ?? "",
    since: row.pending_email_since,
    state: row.email_change_state as Exclude<EmailChangeState, "none">,
  };
}

/** Records that a confirmation link went out, so the UI stops nagging. */
export async function markConfirmationSent(memberId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("members")
    .update({ email_change_state: "sent" })
    .eq("id", memberId);
  if (error) throw error;
}

export type SignInHealth = {
  claimed: boolean;
  signInEmail: string | null;
  emailConfirmed: boolean;
  lastSignInAt: string | null;
  createdAt: string | null;
  pending: PendingEmailChange | null;
};

/** Staff-side answer to "why can this member not get in?". No secrets leave here. */
export async function loadSignInHealth(memberId: string): Promise<SignInHealth> {
  const { data: row, error } = await supabaseAdmin
    .from("members")
    .select("id, auth_user_id, pending_email, pending_email_since, email_change_state")
    .eq("id", memberId)
    .maybeSingle();
  if (error) throw error;
  if (!row?.auth_user_id) {
    return {
      claimed: false,
      signInEmail: null,
      emailConfirmed: false,
      lastSignInAt: null,
      createdAt: null,
      pending: null,
    };
  }

  const { data, error: authError } = await supabaseAdmin.auth.admin.getUserById(row.auth_user_id);
  if (authError) throw authError;
  const user = data.user;
  const authEmail = user?.email ?? null;

  const settled = await clearIfSettled({
    id: row.id,
    pending_email: row.pending_email,
    authEmail,
  });

  return {
    claimed: true,
    signInEmail: authEmail,
    emailConfirmed: !!user?.email_confirmed_at,
    lastSignInAt: user?.last_sign_in_at ?? null,
    createdAt: user?.created_at ?? null,
    pending:
      settled || !row.pending_email || row.email_change_state === "none"
        ? null
        : {
            memberId: row.id,
            pendingEmail: row.pending_email,
            currentSignInEmail: authEmail ?? "",
            since: row.pending_email_since,
            state: row.email_change_state as Exclude<EmailChangeState, "none">,
          },
  };
}
