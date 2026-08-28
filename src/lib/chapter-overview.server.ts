/**
 * Chapter overview dashboard — aggregation.
 *
 * Reads with the admin client because the dashboard crosses every area of the
 * chapter (content, events, membership, directory, chat) and no single staff
 * RLS role can see all of it. The callers in `chapter-overview.functions.ts`
 * assert the administrator role before this module is ever loaded.
 *
 * Every number the UI shows and every row the CSV exports is produced here,
 * once, so the two can never disagree.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bucketFor,
  bucketKey,
  previousRange,
  rate,
  type ChapterOverview,
  type ContentPanelData,
  type CoachFinderPanelData,
  type ConversationsPanelData,
  type EventsPanelData,
  type MembersPanelData,
  type OverviewPanel,
  type OverviewRange,
  type SeriesPoint,
  type Slice,
} from "./chapter-overview";

/** Hard ceiling on rows any single source contributes to one dashboard. */
const SCAN_LIMIT = 20_000;

async function admin(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as SupabaseClient;
}

/** `.select()` strings are typed as plain strings to keep typecheck cheap. */
const sel = (s: string): string => s;

type Row = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0) || 0;
}

async function rows(
  supabase: SupabaseClient,
  table: string,
  select: string,
  build?: (q: any) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<Row[]> {
  let q = supabase.from(table).select(sel(select)).limit(SCAN_LIMIT);
  if (build) q = build(q);
  const { data, error } = await q;
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
  return (data ?? []) as unknown as Row[];
}

async function countIn(
  supabase: SupabaseClient,
  table: string,
  column: string,
  range: OverviewRange,
  build?: (q: any) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<number> {
  let q = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte(column, range.from)
    .lte(column, range.to);
  if (build) q = build(q);
  const { count, error } = await q;
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
  return count ?? 0;
}

function tally(values: (string | null)[]): Slice[] {
  const map = new Map<string, number>();
  for (const v of values) {
    const key = v && v.length > 0 ? v : "—";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/** Builds an empty, gap-free bucket axis so charts do not skip quiet weeks. */
function axis(range: OverviewRange, bucket: "day" | "month"): string[] {
  const out: string[] = [];
  const end = new Date(range.to);
  const cursor = new Date(range.from);
  if (bucket === "day") {
    while (cursor <= end && out.length < 400) {
      out.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  } else {
    cursor.setUTCDate(1);
    while (cursor <= end && out.length < 400) {
      out.push(cursor.toISOString().slice(0, 7));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }
  return out;
}

/** Folds dated rows into a gap-free series of named counters. */
function series(
  range: OverviewRange,
  bucket: "day" | "month",
  keys: string[],
  contributions: { iso: string | null; key: string; amount?: number }[],
): SeriesPoint[] {
  const base = new Map<string, SeriesPoint>();
  for (const date of axis(range, bucket)) {
    const point: SeriesPoint = { date };
    for (const k of keys) point[k] = 0;
    base.set(date, point);
  }
  for (const c of contributions) {
    const b = bucketKey(c.iso, bucket);
    if (!b) continue;
    const point = base.get(b);
    if (!point) continue;
    point[c.key] = num(point[c.key]) + (c.amount ?? 1);
  }
  return [...base.values()];
}

/* ------------------------------------------------------------------ panels */

async function loadContent(
  supabase: SupabaseClient,
  range: OverviewRange,
  bucket: "day" | "month",
): Promise<{ panel: ContentPanelData; detail: Row[] }> {
  const published = await rows(
    supabase,
    "articles",
    "id, title, language, status, published_at, created_at",
    (q) => q.gte("published_at", range.from).lte("published_at", range.to),
  );
  const created = await rows(supabase, "articles", "id, status", (q) =>
    q.gte("created_at", range.from).lte("created_at", range.to),
  );
  const letters = await rows(
    supabase,
    "newsletters",
    "id, title, language, status, published_at, issue_date",
    (q) => q.gte("published_at", range.from).lte("published_at", range.to),
  );

  const ids = letters.map((l) => String(l.id));
  const blocks = ids.length
    ? await rows(supabase, "newsletter_blocks", "id, newsletter_id", (q) =>
        q.in("newsletter_id", ids),
      )
    : [];
  const blocksBy = new Map<string, number>();
  for (const b of blocks) {
    const k = String(b.newsletter_id);
    blocksBy.set(k, (blocksBy.get(k) ?? 0) + 1);
  }

  const panel: ContentPanelData = {
    articlesPublished: published.length,
    newslettersSent: letters.length,
    articlesByBucket: series(
      range,
      bucket,
      ["articles", "newsletters"],
      [
        ...published.map((a) => ({ iso: str(a.published_at), key: "articles" })),
        ...letters.map((l) => ({ iso: str(l.published_at), key: "newsletters" })),
      ],
    ),
    articleStatus: tally(created.map((a) => str(a.status))),
    articleLanguages: tally(published.map((a) => str(a.language))),
    newsletters: letters.map((l) => ({
      id: String(l.id),
      title: str(l.title) ?? "",
      language: str(l.language) ?? "",
      publishedAt: str(l.published_at),
      blocks: blocksBy.get(String(l.id)) ?? 0,
    })),
  };

  const detail: Row[] = [
    ...published.map((a) => ({
      type: "article",
      id: a.id,
      title: a.title,
      language: a.language,
      status: a.status,
      published_at: a.published_at,
      blocks: "",
    })),
    ...letters.map((l) => ({
      type: "newsletter",
      id: l.id,
      title: l.title,
      language: l.language,
      status: l.status,
      published_at: l.published_at,
      blocks: blocksBy.get(String(l.id)) ?? 0,
    })),
  ];

  return { panel, detail };
}

async function loadEvents(
  supabase: SupabaseClient,
  range: OverviewRange,
  bucket: "day" | "month",
): Promise<{ panel: EventsPanelData; detail: Row[] }> {
  const events = await rows(
    supabase,
    "events",
    "id, title, starts_at, status, location_mode, registration_mode, tickets_enabled, cce_enabled, certificates_enabled, is_internal, capacity",
    (q) => q.gte("starts_at", range.from).lte("starts_at", range.to),
  );
  const regs = await rows(
    supabase,
    "event_registrations",
    "id, event_id, status, payment_status, amount_cents, refund_amount_cents, currency, checked_in_at, created_at, full_name, email",
    (q) => q.gte("created_at", range.from).lte("created_at", range.to),
  );
  const awards = await rows(supabase, "event_cce_awards", "id, cc_hours, rd_hours, status", (q) =>
    q.gte("awarded_at", range.from).lte("awarded_at", range.to),
  );
  const certs = await rows(supabase, "event_certificates", "id, status", (q) =>
    q.gte("issued_at", range.from).lte("issued_at", range.to),
  );
  const passes = await rows(supabase, "guest_passes", "id, status, created_at", (q) =>
    q.gte("created_at", range.from).lte("created_at", range.to),
  );

  const active = regs.filter((r) => str(r.status) !== "cancelled");
  const checkedIn = active.filter((r) => str(r.checked_in_at));
  const gross = active.reduce((s, r) => s + num(r.amount_cents), 0);
  const refunds = active.reduce((s, r) => s + num(r.refund_amount_cents), 0);
  const currency = str(active.find((r) => str(r.currency))?.currency ?? null) ?? "CHF";
  const liveAwards = awards.filter((a) => str(a.status) !== "revoked");
  const titleBy = new Map(events.map((e) => [String(e.id), str(e.title) ?? ""]));

  const passStatus = (s: string | null) => (s ?? "pending").toLowerCase();

  const panel: EventsPanelData = {
    events: events.length,
    registrations: active.length,
    checkIns: checkedIn.length,
    attendanceRate: rate(checkedIn.length, active.length),
    netCents: gross - refunds,
    currency,
    byBucket: series(
      range,
      bucket,
      ["events", "registrations", "checkIns"],
      [
        ...events.map((e) => ({ iso: str(e.starts_at), key: "events" })),
        ...active.map((r) => ({ iso: str(r.created_at), key: "registrations" })),
        ...checkedIn.map((r) => ({ iso: str(r.checked_in_at), key: "checkIns" })),
      ],
    ),
    statusMix: tally(events.map((e) => str(e.status))),
    modeMix: tally(events.map((e) => str(e.location_mode))),
    cce: {
      events: events.filter((e) => e.cce_enabled === true).length,
      awards: liveAwards.length,
      ccHours: Math.round(liveAwards.reduce((s, a) => s + num(a.cc_hours), 0) * 10) / 10,
      rdHours: Math.round(liveAwards.reduce((s, a) => s + num(a.rd_hours), 0) * 10) / 10,
      certificates: certs.filter((c) => str(c.status) !== "revoked").length,
      certificateEvents: events.filter((e) => e.certificates_enabled === true).length,
    },
    guestPasses: {
      issued: passes.length,
      approved: passes.filter((p) => passStatus(str(p.status)) === "approved").length,
      declined: passes.filter((p) => passStatus(str(p.status)) === "declined").length,
      pending: passes.filter((p) => passStatus(str(p.status)) === "pending").length,
    },
  };

  const detail: Row[] = regs.map((r) => ({
    registration_id: r.id,
    event_id: r.event_id,
    event_title: titleBy.get(String(r.event_id)) ?? "",
    created_at: r.created_at,
    full_name: r.full_name,
    email: r.email,
    status: r.status,
    payment_status: r.payment_status,
    gross: (num(r.amount_cents) / 100).toFixed(2),
    refunded: (num(r.refund_amount_cents) / 100).toFixed(2),
    currency: r.currency,
    checked_in_at: r.checked_in_at,
  }));

  return { panel, detail };
}

/**
 * The member roster, read once per dashboard: the directory panel needs the
 * same rows, and filtering it by 600+ ids through PostgREST would blow the
 * URL length limit (a 400 from the Data API).
 */
async function loadMemberRows(supabase: SupabaseClient): Promise<Row[]> {
  return rows(
    supabase,
    "members",
    "id, full_name, email, credential_slug, activity_state, auth_user_id, membership_join_date, created_at, city",
  );
}

async function loadMembers(
  all: Row[],
  supabase: SupabaseClient,
  range: OverviewRange,
  bucket: "day" | "month",
): Promise<{ panel: MembersPanelData; detail: Row[] }> {
  const joined = all.filter((m) => {
    const iso = str(m.created_at);
    return iso !== null && iso >= range.from && iso <= range.to;
  });

  const state = (m: Row) => str(m.activity_state) ?? "unknown";
  const { data: runRow } = await supabase
    .from("member_sync_runs")
    .select(sel("status, finished_at, created_count, updated_count, deactivated_count"))
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const run = (runRow ?? null) as unknown as Row | null;

  const panel: MembersPanelData = {
    total: all.length,
    active: all.filter((m) => state(m) === "active").length,
    grace: all.filter((m) => state(m) === "grace").length,
    inactive: all.filter((m) => state(m) === "inactive").length,
    anonymized: all.filter((m) => state(m) === "anonymized").length,
    claimed: all.filter((m) => str(m.auth_user_id)).length,
    unclaimed: all.filter((m) => !str(m.auth_user_id)).length,
    joined: joined.length,
    joinedByBucket: series(
      range,
      bucket,
      ["members"],
      joined.map((m) => ({ iso: str(m.created_at), key: "members" })),
    ),
    credentials: tally(all.map((m) => str(m.credential_slug))),
    lastSync: run
      ? {
          status: String(run.status ?? ""),
          finishedAt: str(run.finished_at),
          created: num(run.created_count),
          updated: num(run.updated_count),
          deactivated: num(run.deactivated_count),
        }
      : null,
  };

  const detail: Row[] = joined.map((m) => ({
    member_id: m.id,
    full_name: m.full_name,
    email: m.email,
    credential: m.credential_slug,
    activity_state: m.activity_state,
    claimed: str(m.auth_user_id) ? "yes" : "no",
    membership_join_date: m.membership_join_date,
    created_at: m.created_at,
  }));

  return { panel, detail };
}

async function loadCoachFinder(
  supabase: SupabaseClient,
  members: Row[],
): Promise<{ panel: CoachFinderPanelData; detail: Row[] }> {
  const profiles = await rows(
    supabase,
    "member_directory_profiles",
    "id, member_id, visibility, coaching_available, mentoring_available, supervision_available, updated_at",
  );
  const memberBy = new Map(members.map((m) => [String(m.id), m]));

  const publishedIds = new Set(
    profiles.filter((p) => str(p.visibility) === "published").map((p) => String(p.id)),
  );

  async function links(table: string, fk: string, vocab: string): Promise<Slice[]> {
    const data = await rows(supabase, table, `profile_id, ${vocab}(name)`);
    const labels = data
      .filter((l) => publishedIds.has(String(l.profile_id)))
      .map((l) => {
        const v = l[vocab] as { name?: string } | null;
        return v?.name ?? null;
      });
    void fk;
    return tally(labels).slice(0, 12);
  }

  const panel: CoachFinderPanelData = {
    published: publishedIds.size,
    hidden: profiles.length - publishedIds.size,
    visibility: tally(profiles.map((p) => str(p.visibility))),
    credentials: tally(
      profiles
        .filter((p) => publishedIds.has(String(p.id)))
        .map((p) => str(memberBy.get(String(p.member_id))?.credential_slug ?? null)),
    ),
    languages: await links("member_profile_languages", "language_id", "cf_languages"),
    regions: await links("member_profile_regions", "region_id", "cf_regions"),
    specialisations: await links(
      "member_profile_specialisations",
      "specialisation_id",
      "cf_specialisations",
    ),
  };

  const detail: Row[] = profiles.map((p) => {
    const m = memberBy.get(String(p.member_id));
    return {
      profile_id: p.id,
      member_id: p.member_id,
      full_name: m?.full_name ?? "",
      credential: m?.credential_slug ?? "",
      city: m?.city ?? "",
      visibility: p.visibility,
      coaching: p.coaching_available ? "yes" : "no",
      mentoring: p.mentoring_available ? "yes" : "no",
      supervision: p.supervision_available ? "yes" : "no",
      updated_at: p.updated_at,
    };
  });

  return { panel, detail };
}

async function loadConversations(
  supabase: SupabaseClient,
  range: OverviewRange,
  bucket: "day" | "month",
): Promise<{ panel: ConversationsPanelData; detail: Row[] }> {
  const logs = await rows(
    supabase,
    "chat_interaction_logs",
    "id, session_id, occurred_at, category_slug, locale, outcome, escalation_reason, feedback",
    (q) => q.gte("occurred_at", range.from).lte("occurred_at", range.to),
  );
  const chats = await rows(
    supabase,
    "live_chat_conversations",
    "id, created_at, status, accepted_at, ended_at, volunteer_name, locale, page_path",
    (q) => q.gte("created_at", range.from).lte("created_at", range.to),
  );
  const messageCount = await countIn(supabase, "live_chat_messages", "created_at", range);

  const sessions = new Set(logs.map((l) => str(l.session_id) ?? String(l.id)));
  const escalated = logs.filter((l) => str(l.outcome) === "escalated").length;
  const rated = logs.filter((l) => str(l.feedback));
  const helpful = rated.filter((l) => str(l.feedback) === "helpful").length;
  const answered = chats.filter((c) => str(c.accepted_at)).length;

  const panel: ConversationsPanelData = {
    agent: {
      conversations: sessions.size,
      interactions: logs.length,
      escalationRate: rate(escalated, logs.length),
      helpfulRate: rate(helpful, rated.length),
      outcomes: tally(logs.map((l) => str(l.outcome))),
      topCategories: tally(logs.map((l) => str(l.category_slug))).slice(0, 8),
      byBucket: series(
        range,
        bucket,
        ["interactions"],
        logs.map((l) => ({ iso: str(l.occurred_at), key: "interactions" })),
      ),
    },
    live: {
      conversations: chats.length,
      answered,
      messages: messageCount,
      answerRate: rate(answered, chats.length),
      byBucket: series(
        range,
        bucket,
        ["conversations", "answered"],
        [
          ...chats.map((c) => ({ iso: str(c.created_at), key: "conversations" })),
          ...chats
            .filter((c) => str(c.accepted_at))
            .map((c) => ({ iso: str(c.created_at), key: "answered" })),
        ],
      ),
    },
  };

  const detail: Row[] = [
    ...logs.map((l) => ({
      channel: "agent",
      occurred_at: l.occurred_at,
      session_id: l.session_id,
      locale: l.locale,
      category: l.category_slug,
      outcome: l.outcome,
      escalation_reason: l.escalation_reason,
      feedback: l.feedback,
      volunteer: "",
    })),
    ...chats.map((c) => ({
      channel: "live",
      occurred_at: c.created_at,
      session_id: c.id,
      locale: c.locale,
      category: c.page_path,
      outcome: c.status,
      escalation_reason: "",
      feedback: str(c.accepted_at) ? "answered" : "unanswered",
      volunteer: c.volunteer_name,
    })),
  ];

  return { panel, detail };
}

/* -------------------------------------------------------------- assembly */

async function kpiCounts(supabase: SupabaseClient, range: OverviewRange) {
  const [articles, newsletters, events, registrations, checkIns, newMembers, guestPasses, chat] =
    await Promise.all([
      countIn(supabase, "articles", "published_at", range),
      countIn(supabase, "newsletters", "published_at", range),
      countIn(supabase, "events", "starts_at", range),
      countIn(supabase, "event_registrations", "created_at", range, (q) =>
        q.neq("status", "cancelled"),
      ),
      countIn(supabase, "event_registrations", "checked_in_at", range),
      countIn(supabase, "members", "created_at", range),
      countIn(supabase, "guest_passes", "created_at", range),
      countIn(supabase, "live_chat_conversations", "created_at", range),
    ]);
  return { articles, newsletters, events, registrations, checkIns, newMembers, guestPasses, chat };
}

/** Builds the whole dashboard payload for one range. */
export async function buildChapterOverview(range: OverviewRange): Promise<ChapterOverview> {
  const supabase = await admin();
  const bucket = bucketFor(range);
  const prev = previousRange(range);
  const memberRows = await loadMemberRows(supabase);

  const [content, events, members, coachFinder, conversations, current, before] = await Promise.all(
    [
      loadContent(supabase, range, bucket),
      loadEvents(supabase, range, bucket),
      loadMembers(memberRows, supabase, range, bucket),
      loadCoachFinder(supabase, memberRows),
      loadConversations(supabase, range, bucket),
      kpiCounts(supabase, range),
      kpiCounts(supabase, prev),
    ],
  );

  const delta = (k: keyof typeof current) => ({ current: current[k], previous: before[k] });

  return {
    range,
    previousRange: prev,
    bucket,
    generatedAt: new Date().toISOString(),
    kpis: {
      articles: delta("articles"),
      newsletters: delta("newsletters"),
      events: delta("events"),
      registrations: delta("registrations"),
      checkIns: delta("checkIns"),
      newMembers: delta("newMembers"),
      guestPasses: delta("guestPasses"),
      chatConversations: delta("chat"),
    },
    content: content.panel,
    events: events.panel,
    members: members.panel,
    coachFinder: coachFinder.panel,
    conversations: conversations.panel,
  };
}

/* -------------------------------------------------------------------- CSV */

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Visitor- and member-supplied text is untrusted: neutralise spreadsheet formulas.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(detail: Row[]): string {
  if (detail.length === 0) return "";
  const headers = Object.keys(detail[0]!);
  return [headers.join(","), ...detail.map((r) => headers.map((h) => cell(r[h])).join(","))].join(
    "\n",
  );
}

/** The detail rows behind one panel, as a CSV file. */
export async function buildPanelCsv(
  panel: OverviewPanel,
  range: OverviewRange,
): Promise<{ filename: string; csv: string; rows: number }> {
  const supabase = await admin();
  const bucket = bucketFor(range);

  const detail =
    panel === "content"
      ? (await loadContent(supabase, range, bucket)).detail
      : panel === "events"
        ? (await loadEvents(supabase, range, bucket)).detail
        : panel === "members"
          ? (await loadMembers(await loadMemberRows(supabase), supabase, range, bucket)).detail
          : panel === "coachFinder"
            ? (await loadCoachFinder(supabase, await loadMemberRows(supabase))).detail
            : (await loadConversations(supabase, range, bucket)).detail;

  const preamble = [
    ["panel", panel].map(cell).join(","),
    ["range_from", range.from].map(cell).join(","),
    ["range_to", range.to].map(cell).join(","),
    ["exported_at", new Date().toISOString()].map(cell).join(","),
    "",
  ].join("\n");

  return {
    filename: `chapter-overview-${panel}-${range.from.slice(0, 10)}_${range.to.slice(0, 10)}.csv`,
    csv: `${preamble}\n${toCsv(detail)}`,
    rows: detail.length,
  };
}
