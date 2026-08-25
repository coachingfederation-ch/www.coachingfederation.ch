/**
 * Admin member detail: read model and staff-controlled writes.
 *
 * Two kinds of data meet here and must never blur into each other:
 *
 *  - **Imported ICF fields** (name, email, address, credential, membership
 *    dates) are read-only reference data. They are replaced wholesale on every
 *    sync, so any local edit would be silently lost.
 *  - **Local directory fields** (service-area regions, accreditation flags,
 *    administrative suppression) are owned here, and later by the member.
 *
 * In particular the imported city/state/zip is *not* a service area. Regions
 * describe where a member offers in-person work and are multi-select and
 * self-declared; they are only ever written by an explicit staff or member
 * action, never derived from an address.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { MemberVisibility } from "./directory-eligibility";

/**
 * Keep the account's `profiles` row (the byline identity used across the CMS
 * and public article pages) in step with the imported member name.
 *
 * The row is auto-created from sign-up metadata, so it is only correct when
 * the caller supplied names. Writing it explicitly after the bind makes the
 * outcome independent of that trigger path. Never overwrites a non-empty
 * stored name — staff may have corrected it by hand.
 */
export async function syncAccountProfileName(
  authUserId: string,
  firstName: string | null,
  lastName: string | null,
): Promise<void> {
  const first = (firstName ?? "").trim();
  const last = (lastName ?? "").trim();
  if (!first && !last) return;

  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("id", authUserId)
    .maybeSingle();

  const patch = {
    id: authUserId,
    first_name: (existing?.first_name ?? "").trim() || first,
    last_name: (existing?.last_name ?? "").trim() || last,
  };
  if (
    existing &&
    patch.first_name === existing.first_name &&
    patch.last_name === existing.last_name
  ) {
    return;
  }
  await supabaseAdmin.from("profiles").upsert(patch, { onConflict: "id" });
}

export type MemberDetail = {
  /** Coach Finder switch, so the screen explains the rule that is actually in force. */
  allowNonCredentialed: boolean;
  member: {
    id: string;
    cst_recno: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    country: string | null;
    organisation: string | null;
    credential_slug: string | null;
    credential_awarded_on: string | null;
    credential_expires_on: string | null;
    member_type: string | null;
    membership_join_date: string | null;
    membership_expiration_date: string | null;
    activity_state: string;
    auth_user_id: string | null;
    scheduled_deletion_at: string | null;
    last_synced_at: string | null;
    /** Feed extras with no column of their own (zip, state, ACTC, …). */
    diagnostics: Record<string, string>;
  };
  profile: {
    id: string;
    visibility: MemberVisibility;
    tagline: string | null;
    coaching_available: boolean;
    mentor_accredited: boolean;
    mentoring_available: boolean;
    supervision_accredited: boolean;
    supervision_available: boolean;
    region_ids: string[];
  } | null;
};

const MEMBER_COLUMNS =
  "id, auth_user_id, cst_recno, full_name, first_name, last_name, email, phone, city, country, organisation, credential_slug, credential_awarded_on, credential_expires_on, member_type, membership_join_date, membership_expiration_date, activity_state, scheduled_deletion_at, last_synced_at, diagnostics";

/**
 * Staff members list.
 *
 * Reads through the admin client on purpose: `anon`/`authenticated` only hold
 * column-level SELECT on the directory-safe columns of `members`, so contact
 * details are unreachable from the browser client. Staff identity is proven by
 * the caller (`assertStaff`) before this runs.
 */
export async function listMembersForStaff() {
  const { data, error } = await supabaseAdmin
    .from("members")
    .select(
      "id, cst_recno, full_name, email, city, credential_slug, credential_expires_on, activity_state, last_synced_at",
    )
    .order("last_name", { ascending: true })
    .limit(2000);
  if (error) throw error;
  return data ?? [];
}

export async function loadMemberDetail(memberId: string): Promise<MemberDetail> {
  const { data: member, error } = await supabaseAdmin
    .from("members")
    .select(MEMBER_COLUMNS)
    .eq("id", memberId)
    .single();
  if (error) throw error;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("member_directory_profiles")
    .select(
      "id, visibility, tagline, coaching_available, mentor_accredited, mentoring_available, supervision_accredited, supervision_available",
    )
    .eq("member_id", memberId)
    .maybeSingle();
  if (profileError) throw profileError;

  let regionIds: string[] = [];
  if (profile) {
    const { data: regions, error: regionError } = await supabaseAdmin
      .from("member_profile_regions")
      .select("region_id")
      .eq("profile_id", profile.id);
    if (regionError) throw regionError;
    regionIds = (regions ?? []).map((row) => row.region_id as string);
  }

  const { directoryRules } = await import("./directory-config.server");
  const rules = await directoryRules();

  return {
    allowNonCredentialed: rules.allowNonCredentialed,
    member: member as unknown as MemberDetail["member"],
    profile: profile
      ? ({ ...profile, region_ids: regionIds } as unknown as MemberDetail["profile"])
      : null,
  };
}

export type MemberAdminUpdate = {
  memberId: string;
  visibility?: MemberVisibility;
  mentor_accredited?: boolean;
  supervision_accredited?: boolean;
  region_ids?: string[];
};

export async function updateMemberDirectoryAdmin(
  actorUserId: string,
  input: MemberAdminUpdate,
): Promise<MemberDetail> {
  const { data: profile, error } = await supabaseAdmin
    .from("member_directory_profiles")
    .select("id, visibility, mentor_accredited, supervision_accredited")
    .eq("member_id", input.memberId)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new Error("This member has no directory profile yet. Run a sync first.");

  const patch: Record<string, unknown> = {};
  if (input.visibility && input.visibility !== profile.visibility)
    patch.visibility = input.visibility;
  if (
    input.mentor_accredited !== undefined &&
    input.mentor_accredited !== profile.mentor_accredited
  ) {
    patch.mentor_accredited = input.mentor_accredited;
  }
  if (
    input.supervision_accredited !== undefined &&
    input.supervision_accredited !== profile.supervision_accredited
  ) {
    patch.supervision_accredited = input.supervision_accredited;
  }

  if (Object.keys(patch).length) {
    // The eligibility trigger is the real boundary: a `published` write for an
    // ineligible member is rejected here, not just discouraged in the UI.
    const { error: updateError } = await supabaseAdmin
      .from("member_directory_profiles")
      .update(patch as never)
      .eq("id", profile.id);
    if (updateError) throw updateError;
  }

  if (input.region_ids) {
    // Full replace: staff sets the complete declared service area in one go.
    const { error: deleteError } = await supabaseAdmin
      .from("member_profile_regions")
      .delete()
      .eq("profile_id", profile.id);
    if (deleteError) throw deleteError;
    if (input.region_ids.length) {
      const { error: insertError } = await supabaseAdmin
        .from("member_profile_regions")
        .insert(
          input.region_ids.map((regionId) => ({ profile_id: profile.id, region_id: regionId })),
        );
      if (insertError) throw insertError;
    }
    patch.region_ids = input.region_ids;
  }

  if (Object.keys(patch).length) {
    await supabaseAdmin.from("member_sync_events").insert({
      event_type: "directory_profile_admin_update",
      severity: "info",
      message: `Staff updated directory profile fields: ${Object.keys(patch).join(", ")}.`,
      member_id: input.memberId,
      actor_user_id: actorUserId,
      details: patch as never,
    });
  }

  return await loadMemberDetail(input.memberId);
}

/**
 * Staff-support binding of an existing auth account to a member record.
 *
 * This is deliberately NOT the future account-claim flow: claim is
 * email-verified, member-initiated and gated by `account_claim_enabled`.
 * This path is manual, admin-only, audited, and exists so a single controlled
 * test member can exercise the Member Area before claim opens.
 */
export async function bindMemberToAuthUser(
  actorUserId: string,
  memberId: string,
  email: string,
): Promise<{ authUserId: string; email: string }> {
  const normalised = email.trim().toLowerCase();
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => (u.email ?? "").toLowerCase() === normalised);
  if (!user)
    throw new Error(`No account found for ${normalised}. The user must sign in once first.`);

  // Email is only how staff *locate* the account. The binding itself — and
  // every later access decision — rests on this explicit auth_user_id link
  // plus the granted `member` role, never on an email match.
  const { data: emailMatches, error: matchError } = await supabaseAdmin
    .from("members")
    .select("id")
    .eq("email", normalised);
  if (matchError) throw matchError;
  if ((emailMatches ?? []).length > 1 && !(emailMatches ?? []).some((m) => m.id === memberId)) {
    throw new Error(
      "Several member records share this email address. Pick the intended member record explicitly.",
    );
  }

  // One account may only ever back one member (also a unique index).
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("members")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing && existing.id !== memberId) {
    throw new Error("This account is already linked to another member record.");
  }

  const { error: updateError } = await supabaseAdmin
    .from("members")
    .update({ auth_user_id: user.id })
    .eq("id", memberId);
  if (updateError) throw updateError;

  // The Member Area gate is role-based, so the link and the role are granted
  // together. A staff account keeps its staff roles alongside this one.
  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: user.id, role: "member" }, { onConflict: "user_id,role" });
  if (roleError) throw roleError;

  await supabaseAdmin.from("member_sync_events").insert({
    member_id: memberId,
    event_type: "member_account_bound_by_staff",
    severity: "warning",
    message: `Staff bound ${normalised} to this member record (support/testing path).`,
    actor_user_id: actorUserId,
    details: { email: normalised, auth_user_id: user.id },
  });

  return { authUserId: user.id, email: normalised };
}

export async function unbindMemberAuthUser(actorUserId: string, memberId: string): Promise<void> {
  const { data: current, error: readError } = await supabaseAdmin
    .from("members")
    .select("auth_user_id")
    .eq("id", memberId)
    .maybeSingle();
  if (readError) throw readError;

  const { error } = await supabaseAdmin
    .from("members")
    .update({ auth_user_id: null })
    .eq("id", memberId);
  if (error) throw error;

  // Revoke the member role unless the account is still linked elsewhere.
  if (current?.auth_user_id) {
    const { data: stillLinked, error: linkError } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("auth_user_id", current.auth_user_id)
      .limit(1);
    if (linkError) throw linkError;
    if (!stillLinked?.length) {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", current.auth_user_id)
        .eq("role", "member");
    }
  }

  await supabaseAdmin.from("member_sync_events").insert({
    member_id: memberId,
    event_type: "member_account_unbound_by_staff",
    severity: "warning",
    message: "Staff removed the account link from this member record.",
    actor_user_id: actorUserId,
    details: {},
  });
}

/**
 * Claim readiness for the members list.
 *
 * Derived, never stored: a member is `claimed` once the explicit `auth_user_id`
 * binding exists (never by email equality), `invited` while an unconsumed link
 * is still inside its TTL, `expired` when the last link lapsed unused, and
 * `never` when no link was ever issued. Operators use this to chase the tail of
 * an invitation wave.
 */
export type MemberClaimStatus = "claimed" | "invited" | "expired" | "never";

export async function loadClaimStatuses(): Promise<Record<string, MemberClaimStatus>> {
  const status: Record<string, MemberClaimStatus> = {};

  const { data: bound, error: boundError } = await supabaseAdmin
    .from("members")
    .select("id, auth_user_id")
    .not("auth_user_id", "is", null);
  if (boundError) throw boundError;
  for (const row of bound ?? []) status[row.id as string] = "claimed";

  // Oldest first, so the newest link for a member overwrites earlier ones — a
  // freshly issued link supersedes a lapsed one in the operator's view too.
  const { data: links, error: linkError } = await supabaseAdmin
    .from("member_profile_links")
    .select("member_id, consumed_at, expires_at")
    .order("requested_at", { ascending: true });
  if (linkError) throw linkError;

  const now = Date.now();
  for (const link of links ?? []) {
    const memberId = link.member_id as string;
    if (status[memberId] === "claimed") continue;
    const expired = link.expires_at ? new Date(link.expires_at as string).getTime() < now : true;
    status[memberId] = link.consumed_at ? "claimed" : expired ? "expired" : "invited";
  }

  return status;
}
