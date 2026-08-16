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

/** Recent grant/revoke history, resolved to human-readable names. */
export async function listRoleGrantAudit(limit = 50): Promise<RoleGrantEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("role_grants")
    .select("id, user_id, role, action, actor_user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
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

  return (data ?? []).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    role: row.role as string,
    action: row.action as string,
    actorUserId: (row.actor_user_id as string | null) ?? null,
    createdAt: row.created_at as string,
    subjectName: names.get(row.user_id as string) ?? null,
    actorName: row.actor_user_id ? (names.get(row.actor_user_id as string) ?? null) : null,
  }));
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
    .in("role", ["admin", "editor", "organizer", "publisher"]);
  if (error) throw error;

  const byUser = new Map<string, string[]>();
  for (const row of roleRows ?? []) {
    const key = row.user_id as string;
    byUser.set(key, [...(byUser.get(key) ?? []), row.role as string]);
  }
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
    .map((id) => ({
      authUserId: id,
      name: names.get(id) ?? null,
      email: emails.get(id) ?? null,
      roles: (byUser.get(id) ?? []).sort(),
    }))
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
