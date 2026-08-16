/**
 * Activated live-chat volunteers: the admin read/write model.
 *
 * Eligibility is deliberately narrow — a member with a claimed account
 * (`members.auth_user_id`), an active membership and a valid ACC/PCC/MCC
 * credential. Listing *other* accounts is exactly what member RLS forbids, so
 * these reads use the admin client; the calling server function verifies the
 * caller is a platform admin first.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type EligibleMember = {
  memberId: string;
  authUserId: string;
  name: string;
};

export type ActivatedVolunteer = {
  userId: string;
  memberId: string | null;
  name: string;
  lastConversationAt: string | null;
};

const CREDENTIALS = ["ACC", "PCC", "MCC"];

function displayName(row: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): string {
  const full = (row.full_name ?? "").trim();
  if (full) return full;
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
}

/** Claimed, active members holding a valid ICF Credential, minus those already activated. */
export async function listEligibleMembers(): Promise<EligibleMember[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin
    .from("members")
    .select(
      "id, auth_user_id, full_name, first_name, last_name, credential_slug, credential_expires_on",
    )
    .not("auth_user_id", "is", null)
    .eq("activity_state", "active")
    .order("last_name", { ascending: true });
  if (error) throw error;

  const { data: active } = await supabaseAdmin.from("live_chat_volunteers").select("user_id");
  const taken = new Set((active ?? []).map((row) => row.user_id as string));

  return (data ?? [])
    .filter((row) => {
      const slug = (row.credential_slug ?? "").toUpperCase();
      if (!CREDENTIALS.includes(slug)) return false;
      const expires = row.credential_expires_on as string | null;
      if (expires && expires < today) return false;
      return !taken.has(row.auth_user_id as string);
    })
    .map((row) => ({
      memberId: row.id as string,
      authUserId: row.auth_user_id as string,
      name: displayName(row) || "—",
    }))
    .filter((row) => row.name !== "—" || true);
}

/** Everyone currently activated, with the time of their most recent conversation. */
export async function listActivatedVolunteers(): Promise<ActivatedVolunteer[]> {
  const { data, error } = await supabaseAdmin
    .from("live_chat_volunteers")
    .select("user_id, member_id, display_name")
    .order("display_name", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const userIds = rows.map((row) => row.user_id as string);
  const { data: conversations } = await supabaseAdmin
    .from("live_chat_conversations")
    .select("volunteer_user_id, last_message_at, created_at")
    .in("volunteer_user_id", userIds);

  const latest = new Map<string, string>();
  for (const row of conversations ?? []) {
    const key = row.volunteer_user_id as string;
    const at = (row.last_message_at as string | null) ?? (row.created_at as string);
    const current = latest.get(key);
    if (!current || at > current) latest.set(key, at);
  }

  return rows.map((row) => ({
    userId: row.user_id as string,
    memberId: (row.member_id as string | null) ?? null,
    name: (row.display_name as string) || "—",
    lastConversationAt: latest.get(row.user_id as string) ?? null,
  }));
}

export async function activateVolunteer(memberId: string, actorUserId: string): Promise<void> {
  const { data: member, error } = await supabaseAdmin
    .from("members")
    .select("id, auth_user_id, full_name, first_name, last_name, activity_state, credential_slug, credential_expires_on")
    .eq("id", memberId)
    .maybeSingle();
  if (error) throw error;
  if (!member?.auth_user_id) throw new Error("This member has not claimed an account yet.");
  if (member.activity_state !== "active") throw new Error("This member is not active.");
  const slug = (member.credential_slug ?? "").toUpperCase();
  const expires = member.credential_expires_on as string | null;
  const today = new Date().toISOString().slice(0, 10);
  if (!CREDENTIALS.includes(slug) || (expires && expires < today)) {
    throw new Error("This member does not hold a valid ICF Credential.");
  }

  const { error: insertError } = await supabaseAdmin.from("live_chat_volunteers").upsert({
    user_id: member.auth_user_id as string,
    member_id: member.id as string,
    display_name: displayName(member).split(" ")[0] || displayName(member),
    activated_by: actorUserId,
  });
  if (insertError) throw insertError;
}

/** Removing an activation also drops the volunteer offline. */
export async function deactivateVolunteer(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("live_chat_volunteers")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
  await supabaseAdmin
    .from("live_chat_presence")
    .update({ is_online: false })
    .eq("user_id", userId);
}
