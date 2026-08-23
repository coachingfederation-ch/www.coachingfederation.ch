/**
 * Editor administration: the read model behind the admin "Roles" screen.
 *
 * `editor` is an ADDITIVE grant on top of an existing, claimed member account.
 * Nothing here touches `members.auth_user_id`, the `member` grant, or Member
 * Area access — revoking `editor` only removes CMS access.
 *
 * Reads use the admin client because listing *other* accounts is exactly what
 * the `user_roles` "read own roles" policy forbids. The caller is verified as
 * an admin by the server function before any of this runs.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ClaimedMemberRole = {
  memberId: string;
  authUserId: string;
  cstRecno: string;
  name: string;
  email: string | null;
  activityState: string;
  isAdministrator: boolean;
  isEditor: boolean;
  isOrganizer: boolean;
  isPublisher: boolean;
  isAdmin: boolean;
};

export type RoleGrantEntry = {
  id: string;
  userId: string;
  role: string;
  action: string;
  actorUserId: string | null;
  createdAt: string;
  subjectName: string | null;
  actorName: string | null;
};

/**
 * An internal account: holds a privileged role but has no imported ICF member
 * record. Admins are legitimately in this shape — chapter staff who administer
 * the system are not necessarily ICF members. Every non-admin role still
 * requires a claim-linked `members.auth_user_id`.
 */
export type InternalStaffAccount = {
  authUserId: string;
  name: string | null;
  email: string | null;
  roles: string[];
  /** Invited through the Roles screen and not yet activated. */
  pending: boolean;
  invitedAt: string | null;
};

/** Every claimed member (an account exists), with their current CMS grant. */
export async function listClaimedMemberRoles(): Promise<ClaimedMemberRole[]> {
  const { data: members, error } = await supabaseAdmin
    .from("members")
    .select("id, cst_recno, auth_user_id, full_name, first_name, last_name, email, activity_state")
    .not("auth_user_id", "is", null)
    .order("last_name", { ascending: true });
  if (error) throw error;

  const userIds = (members ?? []).map((m) => m.auth_user_id as string);
  const roleByUser = await rolesByUser(userIds);

  return (members ?? []).map((m) => {
    const roles = roleByUser.get(m.auth_user_id as string) ?? [];
    return {
      memberId: m.id as string,
      authUserId: m.auth_user_id as string,
      cstRecno: m.cst_recno as string,
      name: displayName(m),
      email: (m.email as string | null) ?? null,
      activityState: m.activity_state as string,
      isAdministrator: roles.includes("administrator"),
      isEditor: roles.includes("editor"),
      isOrganizer: roles.includes("organizer"),
      isPublisher: roles.includes("publisher"),
      isAdmin: roles.includes("admin"),
    };
  });
}

/** Grant/revoke history for one account — shown in the per-account detail view. */
export async function countSuperAdmins(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw error;
  return count ?? 0;
}

/** Grant/revoke history for one account — shown in the per-account detail view. */
export async function listRoleGrantAuditForUser(
  authUserId: string,
  limit = 20,
): Promise<RoleGrantEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("role_grants")
    .select("id, user_id, role, action, actor_user_id, created_at")
    .eq("user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const actorIds = [
    ...new Set((data ?? []).map((r) => r.actor_user_id as string | null).filter(Boolean)),
  ] as string[];
  const names = await namesByAuthUser(actorIds);
  const unnamed = actorIds.filter((id) => !names.has(id));
  if (unnamed.length) {
    const emails = await emailsByAuthUser(unnamed);
    for (const [id, email] of emails) names.set(id, email);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    role: row.role as string,
    action: row.action as string,
    actorUserId: (row.actor_user_id as string | null) ?? null,
    createdAt: row.created_at as string,
    subjectName: null,
    actorName: row.actor_user_id ? (names.get(row.actor_user_id as string) ?? null) : null,
  }));
}

export type RoleGrantFilters = {
  /** Free-text match on the subject's name or email. */
  search?: string;
  role?: string;
  action?: string;
};

/**
 * Recent grant/revoke history, resolved to human-readable names.
 *
 * Paged and filtered in the database so a search reaches the whole history,
 * not just the page currently on screen. Name search resolves ids first
 * (members, then profiles, then auth email) because `role_grants` stores only
 * the auth user id.
 */
export async function listRoleGrantAudit(
  limit = 10,
  offset = 0,
  filters: RoleGrantFilters = {},
): Promise<{ entries: RoleGrantEntry[]; total: number }> {
  let query = supabaseAdmin
    .from("role_grants")
    .select("id, user_id, role, action, actor_user_id, created_at", { count: "exact" });

  if (filters.role) query = query.eq("role", filters.role as never);
  if (filters.action) query = query.eq("action", filters.action);

  const search = (filters.search ?? "").trim();
  if (search) {
    const ids = await authUserIdsMatching(search);
    if (!ids.length) return { entries: [], total: 0 };
    query = query.in("user_id", ids);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;

  const ids = new Set<string>();
  for (const row of data ?? []) {
    ids.add(row.user_id as string);
    if (row.actor_user_id) ids.add(row.actor_user_id as string);
  }
  const names = await namesByAuthUser([...ids]);
  // Internal admins have no member/profile name; fall back to their email so
  // the history never shows a raw UUID.
  const unnamed = [...ids].filter((id) => !names.has(id));
  if (unnamed.length) {
    const emails = await emailsByAuthUser(unnamed);
    for (const [id, email] of emails) names.set(id, email);
  }

  return {
    total: count ?? 0,
    entries: (data ?? []).map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      role: row.role as string,
      action: row.action as string,
      actorUserId: (row.actor_user_id as string | null) ?? null,
      createdAt: row.created_at as string,
      subjectName: names.get(row.user_id as string) ?? null,
      actorName: row.actor_user_id ? (names.get(row.actor_user_id as string) ?? null) : null,
    })),
  };
}

/**
 * Auth user ids whose member record, profile name or account email matches the
 * search term. Used to translate a human name into the ids `role_grants` keys
 * on.
 */
async function authUserIdsMatching(search: string): Promise<string[]> {
  const like = `%${search.replace(/[%_]/g, (c) => `\\${c}`)}%`;
  const ids = new Set<string>();

  const { data: members } = await supabaseAdmin
    .from("members")
    .select("auth_user_id")
    .not("auth_user_id", "is", null)
    .or(
      `full_name.ilike.${like},first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`,
    );
  for (const row of members ?? []) ids.add(row.auth_user_id as string);

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .or(`first_name.ilike.${like},last_name.ilike.${like}`);
  for (const row of profiles ?? []) ids.add(row.id as string);

  // Internal accounts have neither a member row nor always a profile name, so
  // fall back to the auth email of the accounts that appear in the history.
  const { data: roleRows } = await supabaseAdmin.from("user_roles").select("user_id");
  const needle = search.toLowerCase();
  await Promise.all(
    [...new Set((roleRows ?? []).map((r) => r.user_id as string))]
      .filter((id) => !ids.has(id))
      .map(async (id) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(id);
        if ((data?.user?.email ?? "").toLowerCase().includes(needle)) ids.add(id);
      }),
  );

  return [...ids];
}

/**
 * Retention: moves history entries older than the given number of months into
 * `role_grants_archive`. Nothing is lost — the archive is service-role only.
 */
export async function archiveOldRoleGrants(months = 24): Promise<{ archived: number }> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  // Copy first, delete second: a failed insert must leave the source intact.
  const { data: due, error } = await supabaseAdmin
    .from("role_grants")
    .select("id, user_id, role, action, actor_user_id, created_at")
    .lt("created_at", cutoff.toISOString())
    .limit(1000);
  if (error) throw error;
  if (!due?.length) return { archived: 0 };

  const { error: insertError } = await supabaseAdmin
    .from("role_grants_archive")
    .upsert(due, { onConflict: "id" });
  if (insertError) throw insertError;

  const { error: deleteError } = await supabaseAdmin
    .from("role_grants")
    .delete()
    .in(
      "id",
      due.map((row) => row.id as string),
    );
  if (deleteError) throw deleteError;

  return { archived: due.length };
}

/**
 * Resolves the auth account behind a member record. Grants are always made
 * against a claimed member, never against a bare email address.
 */
export async function authUserIdForMember(memberId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("members")
    .select("auth_user_id")
    .eq("id", memberId)
    .maybeSingle();
  if (error) throw error;
  const authUserId = data?.auth_user_id as string | null | undefined;
  if (!authUserId) throw new Error("This member has not claimed an account yet.");
  return authUserId;
}

async function rolesByUser(userIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!userIds.length) return map;
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", userIds);
  if (error) throw error;
  for (const row of data ?? []) {
    const key = row.user_id as string;
    map.set(key, [...(map.get(key) ?? []), row.role as string]);
  }
  return map;
}

async function namesByAuthUser(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!userIds.length) return map;
  const { data } = await supabaseAdmin
    .from("members")
    .select("auth_user_id, full_name, first_name, last_name")
    .in("auth_user_id", userIds);
  for (const row of data ?? []) {
    map.set(row.auth_user_id as string, displayName(row));
  }
  const missing = userIds.filter((id) => !map.has(id));
  if (missing.length) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", missing);
    for (const p of profiles ?? []) {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      if (name) map.set(p.id as string, name);
    }
  }
  return map;
}

/**
 * Internal admins have no member row and often no profile name either, so the
 * audit log would otherwise render a bare UUID. Email is the last resort.
 */
async function emailsByAuthUser(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      const email = data?.user?.email;
      if (email) map.set(id, email);
    }),
  );
  return map;
}

/**
 * Accounts holding a privileged role that are NOT bound to an imported member
 * record. Read-only in the UI: `admin` is provisioned by migration, and the
 * database still refuses to grant `editor` to a non-member.
 */
export async function listInternalStaffAccounts(): Promise<InternalStaffAccount[]> {
  const { data: roleRows, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["admin", "administrator", "editor", "organizer", "publisher"]);
  if (error) throw error;

  const byUser = new Map<string, string[]>();
  for (const row of roleRows ?? []) {
    const key = row.user_id as string;
    byUser.set(key, [...(byUser.get(key) ?? []), row.role as string]);
  }

  // Invited accounts belong in this table from the moment the invitation goes
  // out, even before any role is granted or the password is set.
  const { data: invited } = await supabaseAdmin
    .from("internal_accounts")
    .select("auth_user_id, display_name, email, invited_at, accepted_at")
    .is("revoked_at", null);
  const inviteByUser = new Map((invited ?? []).map((row) => [row.auth_user_id as string, row]));
  for (const id of inviteByUser.keys()) if (!byUser.has(id)) byUser.set(id, []);

  if (!byUser.size) return [];

  const { data: bound } = await supabaseAdmin
    .from("members")
    .select("auth_user_id")
    .in("auth_user_id", [...byUser.keys()]);
  for (const row of bound ?? []) byUser.delete(row.auth_user_id as string);
  if (!byUser.size) return [];

  const ids = [...byUser.keys()];
  const [names, emails] = await Promise.all([namesByAuthUser(ids), emailsByAuthUser(ids)]);

  return ids
    .map((id) => {
      const invite = inviteByUser.get(id);
      return {
        authUserId: id,
        name: (invite?.display_name as string | undefined) || names.get(id) || null,
        email: (invite?.email as string | undefined) || emails.get(id) || null,
        roles: (byUser.get(id) ?? []).sort(),
        pending: Boolean(invite && !invite.accepted_at),
        invitedAt: (invite?.invited_at as string | null | undefined) ?? null,
      };
    })
    .sort((a, b) => (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? ""));
}

function displayName(row: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): string {
  const joined = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return (row.full_name || joined || "Unnamed member").trim();
}
