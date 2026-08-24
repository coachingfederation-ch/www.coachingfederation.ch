/**
 * Visitor side of the live volunteer chat.
 *
 * Visitors are anonymous, so none of the `live_chat_*` tables grant anything
 * to `anon`. Every visitor read and write goes through this module with the
 * service-role client, and the caller must present the opaque conversation
 * key handed out at `start` — only its SHA-256 hash is stored, so a database
 * reader cannot replay it. The key is the whole authorisation: without it no
 * conversation is reachable.
 *
 * Exports: onlineVolunteerCount, startConversation, postVisitorMessage,
 * readConversation, endConversation, purgeOldConversations.
 */
import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** A volunteer whose heartbeat is older than this counts as gone. */
export const PRESENCE_TIMEOUT_SECONDS = 90;
/** Transcripts are deleted this long after the conversation ended. */
export const TRANSCRIPT_RETENTION_DAYS = 30;

const MESSAGE_MAX = 2000;

export type VisitorMessage = {
  id: string;
  sender: "visitor" | "volunteer" | "system";
  body: string;
  createdAt: string;
};

export type VisitorView = {
  status: "waiting" | "active" | "closed";
  volunteerName: string | null;
  messages: VisitorMessage[];
};

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export async function onlineVolunteerCount(): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("live_chat_online_count");
  if (error) return 0;
  return typeof data === "number" ? data : 0;
}

async function conversationByKey(conversationId: string, visitorKey: string) {
  const { data } = await supabaseAdmin
    .from("live_chat_conversations")
    .select("id, status, volunteer_name, visitor_key_hash")
    .eq("id", conversationId)
    .maybeSingle();
  if (!data || data.visitor_key_hash !== hashKey(visitorKey)) return null;
  return data;
}

export async function startConversation(input: {
  name: string;
  email: string | null;
  locale: string;
  pagePath: string | null;
  message: string;
}): Promise<{ conversationId: string; visitorKey: string } | null> {
  const visitorKey = randomBytes(24).toString("base64url");
  const { data, error } = await supabaseAdmin
    .from("live_chat_conversations")
    .insert({
      visitor_key_hash: hashKey(visitorKey),
      visitor_name: input.name.slice(0, 80),
      visitor_email: input.email ? input.email.slice(0, 160) : null,
      locale: input.locale,
      page_path: input.pagePath ? input.pagePath.slice(0, 200) : null,
      status: "waiting",
    })
    .select("id")
    .single();
  if (error || !data) return null;

  await supabaseAdmin.from("live_chat_messages").insert({
    conversation_id: data.id,
    sender: "visitor",
    body: input.message.slice(0, MESSAGE_MAX),
  });

  // Best effort: wake volunteers who enabled notifications on their phone.
  try {
    const { notifyWaitingVisitor } = await import("./live-chat-push.server");
    await notifyWaitingVisitor(input.name.slice(0, 80));
  } catch {
    // A push outage must never stop a visitor from queueing.
  }

  // Best effort: wake volunteers on iOS via APNs, parallel to web push.
  try {
    const { notifyWaitingVisitorApns } = await import("./live-chat-apns.server");
    await notifyWaitingVisitorApns(input.name.slice(0, 80));
  } catch {
    // An APNs outage must never stop a visitor from queueing.
  }

  return { conversationId: data.id, visitorKey };
}

export async function postVisitorMessage(
  conversationId: string,
  visitorKey: string,
  body: string,
): Promise<boolean> {
  const conversation = await conversationByKey(conversationId, visitorKey);
  if (!conversation || conversation.status === "closed") return false;
  const { error } = await supabaseAdmin.from("live_chat_messages").insert({
    conversation_id: conversationId,
    sender: "visitor",
    body: body.slice(0, MESSAGE_MAX),
  });
  if (error) return false;
  await supabaseAdmin
    .from("live_chat_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
  return true;
}

export async function readConversation(
  conversationId: string,
  visitorKey: string,
): Promise<VisitorView | null> {
  const conversation = await conversationByKey(conversationId, visitorKey);
  if (!conversation) return null;
  const { data } = await supabaseAdmin
    .from("live_chat_messages")
    .select("id, sender, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  return {
    status: conversation.status as VisitorView["status"],
    volunteerName: conversation.volunteer_name,
    messages: (data ?? []).map((row) => ({
      id: row.id,
      sender: row.sender as VisitorMessage["sender"],
      body: row.body,
      createdAt: row.created_at,
    })),
  };
}

export async function endConversation(
  conversationId: string,
  visitorKey: string,
): Promise<boolean> {
  const conversation = await conversationByKey(conversationId, visitorKey);
  if (!conversation) return false;
  await supabaseAdmin
    .from("live_chat_conversations")
    .update({ status: "closed", ended_at: new Date().toISOString() })
    .eq("id", conversationId);
  return true;
}

/** Retention job: drop ended conversations (messages cascade) after 30 days. */
export async function purgeOldConversations(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - TRANSCRIPT_RETENTION_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("live_chat_conversations")
    .delete()
    .lt("last_message_at", cutoff)
    .select("id");
  if (error) throw new Error(error.message);
  return { deleted: (data ?? []).length };
}
