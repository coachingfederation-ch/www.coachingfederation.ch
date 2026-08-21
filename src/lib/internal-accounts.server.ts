/**
 * Internal (non-member) staff accounts — provisioning and invitation delivery.
 *
 * Chapter staff who administer the system are not necessarily ICF members, so
 * they have no imported member record to key a claim off. This module creates
 * the auth account, records it in `public.internal_accounts` (the marker the
 * `user_roles` grant policy reads), and mails a one-time password-set link.
 *
 * The link is a Supabase recovery hash rather than an `invite` link: recovery
 * works both for a freshly created account and for an existing one, so a
 * resend never depends on how the account came to exist.
 *
 * Server-only: uses the service-role client. Never import from a component.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Supabase recovery links expire with the project's email OTP lifetime. */
export const INVITE_TTL_HOURS = 24;

export type InternalInviteOutcome = {
  authUserId: string;
  /** False when the address already had an auth account we attached to. */
  created: boolean;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Finds an existing auth user by address without leaking the full user list. */
async function findAuthUserByEmail(email: string): Promise<string | null> {
  // The admin API has no email filter, so we page. Chapter-scale user counts
  // make this cheap, and it only runs on an invite.
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (hit) return hit.id;
    if (users.length < 200) return null;
  }
  return null;
}

/**
 * Creates (or attaches to) the auth account for one internal invitation and
 * records the `internal_accounts` row. Idempotent per address.
 */
export async function createOrAttachInternalAccount(args: {
  email: string;
  displayName: string;
  invitedBy: string;
}): Promise<InternalInviteOutcome> {
  const email = normalizeEmail(args.email);
  let created = false;

  let authUserId = await findAuthUserByEmail(email);
  if (!authUserId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      // The invitee sets their own password through the recovery link; the
      // account is confirmed up front so that link is all they ever need.
      email_confirm: true,
      user_metadata: { full_name: args.displayName, internal_account: true },
    });
    if (error || !data?.user) throw new Error("Could not create the account.");
    authUserId = data.user.id;
    created = true;
  }

  const { error: upsertError } = await supabaseAdmin.from("internal_accounts").upsert(
    {
      auth_user_id: authUserId,
      display_name: args.displayName,
      email,
      invited_by: args.invitedBy,
      invited_at: new Date().toISOString(),
      revoked_at: null,
    },
    { onConflict: "auth_user_id" },
  );
  if (upsertError) throw new Error("Could not record the internal account.");

  return { authUserId, created };
}

/** Mints the one-time password-set link and sends the branded invitation. */
export async function deliverInternalInvitation(args: {
  authUserId: string;
  email: string;
  displayName: string;
  roleLabel: string;
  baseUrl: string;
  isResend: boolean;
}) {
  const email = normalizeEmail(args.email);
  const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (error || !tokenHash) throw new Error("Could not create the invitation link.");

  const inviteUrl = `${args.baseUrl.replace(/\/$/, "")}/staff-invite?token_hash=${encodeURIComponent(tokenHash)}`;

  const { sendTemplateEmail } = await import("./email-templates/send-email");
  await sendTemplateEmail("internal-invitation", email, {
    templateData: {
      inviteUrl,
      baseUrl: args.baseUrl,
      displayName: args.displayName,
      roleLabel: args.roleLabel,
      expiresInHours: INVITE_TTL_HOURS,
      isResend: args.isResend,
    },
    // Hash-scoped: a retry of the same send is deduped, a genuine resend mints
    // a new hash and therefore a new key.
    idempotencyKey: `internal-invite-${tokenHash.slice(0, 32)}`,
  });

  return { ok: true as const };
}

/**
 * Marks the invitation accepted the first time the account sets a password.
 * Called from the password-set screen through a server function.
 */
export async function markInternalAccountAccepted(authUserId: string) {
  await supabaseAdmin
    .from("internal_accounts")
    .update({ accepted_at: new Date().toISOString() })
    .eq("auth_user_id", authUserId)
    .is("accepted_at", null);
}

/**
 * Withdraws a pending invitation: the marker row goes away (so no further role
 * may be granted), and an account that was created here and never signed in is
 * deleted outright so the emailed link is dead.
 */
export async function withdrawInternalAccount(authUserId: string) {
  const { data: user } = await supabaseAdmin.auth.admin.getUserById(authUserId);
  const neverSignedIn = !user?.user?.last_sign_in_at;

  await supabaseAdmin.from("internal_accounts").delete().eq("auth_user_id", authUserId);
  if (neverSignedIn) {
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
  }
  return { deletedAccount: neverSignedIn };
}
