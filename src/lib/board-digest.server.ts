/**
 * Board digest — data assembly and sending (server only).
 *
 * Reads with the admin client because the digest crosses every area of the
 * chapter. Callers (admin server functions, the cron route) authorise first.
 * Reuses the Overview dashboard aggregation for the headline numbers and the
 * assistant insights report for the conversation block, so the email and the
 * dashboards never disagree.
 *
 * Exports: loadDigestSettings, saveDigestSettings, buildBoardDigest,
 * sendBoardDigest, runScheduledDigest.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  capList,
  cadenceDays,
  isDigestDue,
  normaliseSections,
  type BoardDigestData,
  type BoardDigestSettings,
  type DigestListItem,
} from "./board-digest";
import { EMPTY_CHAT_FILTERS } from "./chat-insights";

const DAY_MS = 86_400_000;

async function admin(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as SupabaseClient;
}

const COLS =
  "board_digest_enabled, board_digest_recipient, board_digest_cadence, board_digest_weekday, board_digest_hour, board_digest_sections, board_digest_last_sent_at, board_digest_last_status";

export async function loadDigestSettings(): Promise<BoardDigestSettings> {
  const db = await admin();
  const { data, error } = await db.from("integration_config").select(COLS).eq("id", true).single();
  if (error) throw error;
  const r = data as Record<string, unknown>;
  return {
    enabled: Boolean(r["board_digest_enabled"]),
    recipient: String(r["board_digest_recipient"] ?? ""),
    cadence: r["board_digest_cadence"] === "biweekly" ? "biweekly" : "weekly",
    weekday: Number(r["board_digest_weekday"] ?? 1),
    hour: Number(r["board_digest_hour"] ?? 7),
    sections: normaliseSections(r["board_digest_sections"]),
    lastSentAt: (r["board_digest_last_sent_at"] as string | null) ?? null,
    lastStatus: (r["board_digest_last_status"] as string | null) ?? null,
  };
}

export async function saveDigestSettings(
  s: Omit<BoardDigestSettings, "lastSentAt" | "lastStatus">,
): Promise<void> {
  const db = await admin();
  const { error } = await db
    .from("integration_config")
    .update({
      board_digest_enabled: s.enabled,
      board_digest_recipient: s.recipient,
      board_digest_cadence: s.cadence,
      board_digest_weekday: s.weekday,
      board_digest_hour: s.hour,
      board_digest_sections: s.sections,
    })
    .eq("id", true);
  if (error) throw error;
}

async function recordStatus(status: string, sentAt: string | null) {
  const db = await admin();
  const patch: Record<string, unknown> = { board_digest_last_status: status.slice(0, 300) };
  if (sentAt) patch["board_digest_last_sent_at"] = sentAt;
  await db.from("integration_config").update(patch).eq("id", true);
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Zurich",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

const CHANGE_LABELS: Record<string, string> = {
  welcome_new_member: "Welcome emails",
  credential_upgrade: "Credential upgrades",
  credential_specialisation: "New specialisations",
  grace_reengagement: "Returned from grace period",
  grace_first_warning: "First grace warnings",
  grace_final_warning: "Final grace warnings",
};

async function profileNames(db: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const out = new Map<string, string>();
  if (!unique.length) return out;
  const { data } = await db.from("profiles").select("id, first_name, last_name").in("id", unique);
  for (const p of (data ?? []) as {
    id: string;
    first_name: string | null;
    last_name: string | null;
  }[]) {
    out.set(p.id, [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown");
  }
  return out;
}

async function memberNames(db: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const out = new Map<string, string>();
  if (!unique.length) return out;
  const { data } = await db.from("members").select("id, full_name").in("id", unique.slice(0, 500));
  for (const m of (data ?? []) as { id: string; full_name: string | null }[]) {
    out.set(m.id, m.full_name || "Member");
  }
  return out;
}

async function membersBlock(db: SupabaseClient, from: string, to: string) {
  const [created, sends, deactivated, grace] = await Promise.all([
    db
      .from("members")
      .select("full_name, city, credential_slug, created_at")
      .gte("created_at", from)
      .lte("created_at", to)
      .is("anonymized_at", null)
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("member_engagement_sends")
      .select("campaign_key, member_id, created_at")
      .gte("created_at", from)
      .lte("created_at", to)
      .limit(2000),
    db
      .from("member_sync_events")
      .select("member_id, created_at")
      .eq("event_type", "member_deactivated")
      .gte("created_at", from)
      .lte("created_at", to)
      .limit(500),
    db
      .from("member_lifecycle_queue")
      .select("member_id, scheduled_deletion_at")
      .gte("entered_grace_at", from)
      .lte("entered_grace_at", to)
      .limit(500),
  ]);

  const sendRows = (sends.data ?? []) as { campaign_key: string; member_id: string }[];
  const deRows = (deactivated.data ?? []) as { member_id: string | null }[];
  const graceRows = (grace.data ?? []) as { member_id: string; scheduled_deletion_at: string }[];
  const names = await memberNames(db, [
    ...sendRows.map((r) => r.member_id),
    ...deRows.map((r) => r.member_id ?? ""),
    ...graceRows.map((r) => r.member_id),
  ]);

  const counts = new Map<string, number>();
  for (const r of sendRows) counts.set(r.campaign_key, (counts.get(r.campaign_key) ?? 0) + 1);

  const changed: DigestListItem[] = sendRows
    .filter(
      (r) =>
        r.campaign_key === "credential_upgrade" ||
        r.campaign_key === "credential_specialisation" ||
        r.campaign_key === "grace_reengagement",
    )
    .map((r) => ({
      primary: names.get(r.member_id) ?? "Member",
      secondary: CHANGE_LABELS[r.campaign_key],
    }));

  const { loadRetentionSummary } = await import("./member-lifecycle.server");
  const retention = await loadRetentionSummary();

  return {
    newMembers: capList(
      (
        (created.data ?? []) as {
          full_name: string | null;
          city: string | null;
          credential_slug: string | null;
        }[]
      ).map((m) => ({
        primary: m.full_name || "Member",
        secondary: m.credential_slug ? m.credential_slug.toUpperCase() : undefined,
        tertiary: m.city ?? undefined,
      })),
    ),
    changes: [...counts.entries()].map(([k, count]) => ({ label: CHANGE_LABELS[k] ?? k, count })),
    changedMembers: capList(changed),
    deactivated: capList(
      deRows.map((r) => ({ primary: names.get(r.member_id ?? "") ?? "Member" })),
    ),
    enteredGrace: capList(
      graceRows.map((r) => ({
        primary: names.get(r.member_id) ?? "Member",
        secondary: `Removal due ${fmtDate(r.scheduled_deletion_at)}`,
      })),
    ),
    retention: { inGrace: retention.inGrace, due: retention.due, pastExpiry: retention.pastExpiry },
  };
}

async function articlesBlock(db: SupabaseClient, from: string, to: string) {
  const { data } = await db
    .from("articles")
    .select("title, status, author_id, created_by, created_at")
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []) as {
    title: string;
    status: string;
    author_id: string | null;
    created_by: string | null;
  }[];
  const names = await profileNames(
    db,
    rows.map((r) => r.author_id ?? r.created_by ?? ""),
  );
  return capList(
    rows.map((r) => ({
      primary: r.title || "Untitled",
      secondary: names.get(r.author_id ?? r.created_by ?? "") ?? "Unknown author",
      tertiary: r.status,
    })),
  );
}

async function eventsBlock(db: SupabaseClient, from: string, to: string) {
  const { data } = await db
    .from("events")
    .select(
      "title, organizer_id, created_by, community_id, city, venue_name, location_mode, starts_at, status, series_id",
    )
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []) as {
    title: string;
    organizer_id: string | null;
    created_by: string | null;
    community_id: string | null;
    city: string | null;
    venue_name: string | null;
    location_mode: string | null;
    starts_at: string | null;
    status: string;
  }[];
  const names = await profileNames(
    db,
    rows.map((r) => r.organizer_id ?? r.created_by ?? ""),
  );
  const communityIds = [...new Set(rows.map((r) => r.community_id).filter(Boolean))] as string[];
  const communities = new Map<string, string>();
  if (communityIds.length) {
    const { data: c } = await db.from("op_projects").select("id, name").in("id", communityIds);
    for (const p of (c ?? []) as { id: string; name: string }[]) communities.set(p.id, p.name);
  }
  return capList(
    rows.map((r) => {
      const place =
        (r.community_id && communities.get(r.community_id)) ||
        r.city ||
        r.venue_name ||
        (r.location_mode === "online" ? "Online" : "No location");
      const when = r.starts_at ? fmtDate(r.starts_at) : "Date to be set";
      return {
        primary: r.title || "Untitled",
        secondary: `${names.get(r.organizer_id ?? r.created_by ?? "") ?? "No organizer"} · ${place}`,
        tertiary: `${when} · ${r.status}`,
      };
    }),
  );
}

async function assistantBlock(fromDay: string, toDay: string) {
  const { buildChatInsightReport } = await import("./chat-insights.server");
  const report = await buildChatInsightReport({ ...EMPTY_CHAT_FILTERS, from: fromDay, to: toDay });
  const label = new Map(report.categories.map((c) => [c.slug, c.labelEn]));
  return {
    total: report.summary.total,
    successRate: report.summary.successRate,
    escalationRate: report.summary.escalationRate,
    helpfulRate: report.summary.helpfulRate,
    topCategories: [...report.byCategory]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((c) => ({ label: label.get(c.slug) ?? c.slug, count: c.count })),
    escalations: capList(
      report.rows
        .filter((r) => r.outcome === "escalated")
        .map((r) => ({
          primary: label.get(r.categorySlug) ?? r.categorySlug,
          secondary: r.escalationReason ?? r.categoryDetail ?? undefined,
        })),
      10,
    ),
  };
}

/** Builds the digest for the period ending `now`. */
export async function buildBoardDigest(
  settings: BoardDigestSettings,
  now = new Date(),
): Promise<BoardDigestData> {
  const db = await admin();
  const days = cadenceDays(settings.cadence);
  const to = now.toISOString();
  const from = new Date(now.getTime() - days * DAY_MS).toISOString();
  const { buildChapterOverview } = await import("./chapter-overview.server");
  const { SITE_URL } = await import("@/i18n/config");
  const overview = await buildChapterOverview({ from, to });
  const s = settings.sections;

  const [members, articles, events, assistant] = await Promise.all([
    s.members ? membersBlock(db, from, to) : undefined,
    s.articles ? articlesBlock(db, from, to) : undefined,
    s.events ? eventsBlock(db, from, to) : undefined,
    s.assistant ? assistantBlock(from.slice(0, 10), to.slice(0, 10)) : undefined,
  ]);

  return {
    periodLabel: `${fmtDate(from)} to ${fmtDate(to)}`,
    from,
    to,
    kpis: overview.kpis,
    sections: s,
    members,
    articles,
    events,
    assistant,
    overviewUrl: `${SITE_URL}/manage`,
  };
}

/** Sends one digest. `test` sends regardless of schedule and keeps the cadence clock. */
export async function sendBoardDigest(opts: {
  test: boolean;
}): Promise<{ sent: boolean; status: string }> {
  const settings = await loadDigestSettings();
  if (!settings.recipient) return { sent: false, status: "No recipient set" };
  const now = new Date();
  const digest = await buildBoardDigest(settings, now);
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  try {
    const result = await sendTemplateEmail("board-digest", settings.recipient, {
      templateData: { digest, test: opts.test },
      idempotencyKey: opts.test
        ? `board-digest-test-${now.getTime()}`
        : `board-digest-${now.toISOString().slice(0, 10)}`,
    });
    const status = result.sent
      ? `${opts.test ? "Test sent" : "Sent"} to ${settings.recipient}`
      : "Recipient has unsubscribed";
    await recordStatus(status, result.sent && !opts.test ? now.toISOString() : null);
    return { sent: result.sent, status };
  } catch (err) {
    const status = `Failed: ${err instanceof Error ? err.message : "unknown error"}`;
    await recordStatus(status, null);
    throw new Error(status);
  }
}

/** Hourly cron entry point. */
export async function runScheduledDigest(): Promise<{
  due: boolean;
  sent?: boolean;
  status?: string;
}> {
  const settings = await loadDigestSettings();
  if (!isDigestDue(settings, new Date())) return { due: false };
  const r = await sendBoardDigest({ test: false });
  return { due: true, ...r };
}
