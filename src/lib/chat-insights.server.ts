/**
 * Chat Agent Insights aggregation.
 *
 * Reads the metadata-only interaction log with the admin client (the table is
 * admin-read by policy and server-written only) and does the arithmetic here,
 * once, so the KPI cards, the charts, the table and the CSV export can never
 * disagree with each other.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CHAT_OUTCOMES,
  rate,
  type ChatCategory,
  type ChatInsightFilters,
  type ChatInsightReport,
  type ChatLogRow,
  type ChatOutcome,
} from "./chat-insights";

/** Aggregates cover every matching row; the table shows at most this many. */
const ROW_LIMIT = 500;
/** Hard ceiling on what one report pulls into memory. */
const SCAN_LIMIT = 20_000;

async function admin(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as SupabaseClient;
}

type Row = {
  id: string;
  occurred_at: string;
  session_id: string | null;
  category_slug: string;
  category_detail: string | null;
  locale: string;
  outcome: ChatOutcome;
  contact_shown: boolean;
  contact_clicked: boolean;
  escalation_reason: string | null;
  feedback: "helpful" | "not_helpful" | null;
};

function toRow(r: Row): ChatLogRow {
  return {
    id: r.id,
    occurredAt: r.occurred_at,
    sessionId: r.session_id,
    categorySlug: r.category_slug,
    categoryDetail: r.category_detail,
    locale: r.locale,
    outcome: r.outcome,
    contactShown: r.contact_shown,
    contactClicked: r.contact_clicked,
    escalationReason: r.escalation_reason,
    feedback: r.feedback,
  };
}

export async function listChatCategories(): Promise<ChatCategory[]> {
  const supabase = await admin();
  const { data, error } = await supabase
    .from("chat_question_categories")
    .select("id, slug, label_en, label_de, label_fr, label_it, sort_order, is_active")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    id: c.id as string,
    slug: c.slug as string,
    labelEn: (c.label_en as string) ?? "",
    labelDe: (c.label_de as string) ?? "",
    labelFr: (c.label_fr as string) ?? "",
    labelIt: (c.label_it as string) ?? "",
    sortOrder: (c.sort_order as number) ?? 0,
    isActive: Boolean(c.is_active),
  }));
}

/** Applies the filters PostgREST cannot express cheaply (free-text search). */
function matchesSearch(row: Row, term: string) {
  if (!term) return true;
  const haystack = `${row.category_detail ?? ""} ${row.escalation_reason ?? ""}`.toLowerCase();
  return haystack.includes(term);
}

async function loadRows(filters: ChatInsightFilters): Promise<Row[]> {
  const supabase = await admin();
  let q = supabase
    .from("chat_interaction_logs")
    .select(
      "id, occurred_at, session_id, category_slug, category_detail, locale, outcome, contact_shown, contact_clicked, escalation_reason, feedback",
    )
    .order("occurred_at", { ascending: false })
    .limit(SCAN_LIMIT);

  if (filters.from) q = q.gte("occurred_at", `${filters.from}T00:00:00.000Z`);
  if (filters.to) q = q.lte("occurred_at", `${filters.to}T23:59:59.999Z`);
  if (filters.category !== "all") q = q.eq("category_slug", filters.category);
  if (filters.outcome !== "all") q = q.eq("outcome", filters.outcome);
  if (filters.language !== "all") q = q.eq("locale", filters.language);
  if (filters.contact === "shown") q = q.eq("contact_shown", true);
  if (filters.contact === "not_shown") q = q.eq("contact_shown", false);
  if (filters.contact === "clicked") q = q.eq("contact_clicked", true);
  if (filters.feedback === "helpful") q = q.eq("feedback", "helpful");
  if (filters.feedback === "not_helpful") q = q.eq("feedback", "not_helpful");
  if (filters.feedback === "none") q = q.is("feedback", null);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const term = filters.search.trim().toLowerCase().slice(0, 80);
  return (data ?? []).filter((r) => matchesSearch(r as Row, term)) as Row[];
}

export async function buildChatInsightReport(
  filters: ChatInsightFilters,
): Promise<ChatInsightReport> {
  const supabase = await admin();
  const [rows, categories, totalAll] = await Promise.all([
    loadRows(filters),
    listChatCategories(),
    supabase
      .from("chat_interaction_logs")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => count ?? 0),
  ]);

  const total = rows.length;
  const successful = rows.filter((r) => r.outcome === "successful").length;
  const escalated = rows.filter((r) => r.outcome === "escalated").length;
  const contactShown = rows.filter((r) => r.contact_shown).length;
  const helpful = rows.filter((r) => r.feedback === "helpful").length;
  const notHelpful = rows.filter((r) => r.feedback === "not_helpful").length;
  const feedbackCount = helpful + notHelpful;

  const categoryCounts = new Map<string, number>();
  for (const r of rows) {
    categoryCounts.set(r.category_slug, (categoryCounts.get(r.category_slug) ?? 0) + 1);
  }

  const outcomeCounts = CHAT_OUTCOMES.map((outcome) => ({
    outcome,
    count: rows.filter((r) => r.outcome === outcome).length,
  }));

  const byDay = new Map<string, { shown: number; clicked: number; total: number }>();
  for (const r of rows) {
    const day = r.occurred_at.slice(0, 10);
    const bucket = byDay.get(day) ?? { shown: 0, clicked: 0, total: 0 };
    bucket.total += 1;
    if (r.contact_shown) bucket.shown += 1;
    if (r.contact_clicked) bucket.clicked += 1;
    byDay.set(day, bucket);
  }

  const languages = Array.from(new Set(rows.map((r) => r.locale))).sort();

  return {
    summary: {
      totalAllTime: totalAll,
      total,
      successRate: rate(successful, total),
      escalationRate: rate(escalated, total),
      contactShownRate: rate(contactShown, total),
      helpfulRate: rate(helpful, feedbackCount),
      feedbackCount,
    },
    byCategory: Array.from(categoryCounts.entries())
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count),
    byOutcome: outcomeCounts,
    contactSeries: Array.from(byDay.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    feedback: { helpful, notHelpful },
    categories,
    languages,
    rows: rows.slice(0, ROW_LIMIT).map(toRow),
    truncated: rows.length > ROW_LIMIT,
  };
}

function cell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function buildChatInsightCsv(
  filters: ChatInsightFilters,
): Promise<{ filename: string; csv: string; rows: number }> {
  const rows = await loadRows(filters);
  const header = [
    "occurred_at",
    "session_id",
    "category",
    "category_detail",
    "language",
    "outcome",
    "contact_shown",
    "contact_clicked",
    "feedback",
    "escalation_reason",
  ];
  const lines = rows.map((r) =>
    [
      r.occurred_at,
      r.session_id ?? "",
      r.category_slug,
      r.category_detail ?? "",
      r.locale,
      r.outcome,
      r.contact_shown ? "yes" : "no",
      r.contact_clicked ? "yes" : "no",
      r.feedback ?? "",
      r.escalation_reason ?? "",
    ]
      .map(cell)
      .join(","),
  );

  return {
    filename: `chat-agent-insights-${new Date().toISOString().slice(0, 10)}.csv`,
    csv: [header.join(","), ...lines].join("\n"),
    rows: rows.length,
  };
}

export type CategoryInput = {
  id?: string;
  slug: string;
  labelEn: string;
  labelDe: string;
  labelFr: string;
  labelIt: string;
  sortOrder: number;
  isActive: boolean;
};

export async function upsertChatCategory(input: CategoryInput): Promise<void> {
  const supabase = await admin();
  const payload = {
    slug: input.slug,
    label_en: input.labelEn,
    label_de: input.labelDe,
    label_fr: input.labelFr,
    label_it: input.labelIt,
    sort_order: input.sortOrder,
    is_active: input.isActive,
  };
  const { error } = input.id
    ? await supabase.from("chat_question_categories").update(payload).eq("id", input.id)
    : await supabase.from("chat_question_categories").insert(payload);
  if (error) throw new Error(error.message);
}
