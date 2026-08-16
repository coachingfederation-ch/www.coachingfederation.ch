/**
 * Assistant knowledge management route (/manage/knowledge).
 * Exports: Route. Admin surface for the FAQs and knowledge notes the public
 * site assistant searches at answer time.
 *
 * Writes go through the browser Supabase client: the admin-only RLS policy on
 * `assistant_knowledge` is the real boundary, and `requireStaffAccess` only
 * keeps other roles out of a dead end. Entries are written in one language;
 * the assistant translates on the fly when it answers.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useCms } from "@/i18n/cms";
import { PLATFORM_ADMIN_ROLES, requireStaffAccess } from "@/lib/staff-guard";

export const Route = createFileRoute("/_staff/manage/knowledge")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, PLATFORM_ADMIN_ROLES),
  head: () => ({
    meta: [
      { title: "Assistant knowledge — The Switzerland Chapter of ICF CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: KnowledgePage,
});

type Kind = "faq" | "note";

type Row = {
  id: string;
  kind: Kind;
  title: string;
  body: string;
  keywords: string[];
  link_path: string | null;
  is_published: boolean;
  updated_at: string;
};

const COLUMNS = "id, kind, title, body, keywords, link_path, is_published, updated_at";

/** "membership, renewal" -> ["membership", "renewal"], lowercased and deduped. */
function parseKeywords(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 20);
}

function KnowledgePage() {
  const { t, locale } = useCms();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | Kind>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  const [kind, setKind] = useState<Kind>("faq");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [keywords, setKeywords] = useState("");
  const [linkPath, setLinkPath] = useState("");

  const load = async () => {
    const { data, error: err } = await supabase
      .from("assistant_knowledge")
      .select(COLUMNS)
      .order("updated_at", { ascending: false });
    if (err) {
      setError(err.message);
      return;
    }
    setRows((data ?? []) as Row[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const add = async () => {
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (!cleanTitle || !cleanBody) {
      setError(t("knowledge.needTitleBody"));
      return;
    }
    setBusy(true);
    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("assistant_knowledge").insert({
      kind,
      title: cleanTitle,
      body: cleanBody,
      keywords: parseKeywords(keywords),
      link_path: linkPath.trim() || null,
      created_by: auth.user?.id ?? null,
      updated_by: auth.user?.id ?? null,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setTitle("");
    setBody("");
    setKeywords("");
    setLinkPath("");
    await load();
  };

  const patch = async (id: string, values: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...values } : r)));
    const { data: auth } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from("assistant_knowledge")
      .update({ ...values, updated_by: auth.user?.id ?? null })
      .eq("id", id);
    if (err) setError(err.message);
  };

  const remove = async (row: Row) => {
    if (!window.confirm(t("knowledge.confirmDelete"))) return;
    const { error: err } = await supabase.from("assistant_knowledge").delete().eq("id", row.id);
    if (err) {
      setError(err.message);
      return;
    }
    await load();
  };

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (kindFilter !== "all" && row.kind !== kindFilter) return false;
      if (statusFilter === "published" && !row.is_published) return false;
      if (statusFilter === "draft" && row.is_published) return false;
      if (!term) return true;
      return (
        row.title.toLowerCase().includes(term) ||
        row.body.toLowerCase().includes(term) ||
        row.keywords.some((k) => k.includes(term))
      );
    });
  }, [rows, search, kindFilter, statusFilter]);

  const inputClass =
    "rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20";
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <Shell>
      <div className="mx-auto max-w-4xl px-10 py-10">
        <h1 className="text-2xl font-bold tracking-tight">{t("knowledge.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("knowledge.subtitle")}</p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {t("knowledge.addTitle")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
              aria-label={t("knowledge.fieldKind")}
              className={inputClass}
            >
              <option value="faq">{t("knowledge.kindFaq")}</option>
              <option value="note">{t("knowledge.kindNote")}</option>
            </select>
            <input
              value={linkPath}
              onChange={(e) => setLinkPath(e.target.value)}
              placeholder={t("knowledge.fieldLinkPath")}
              aria-label={t("knowledge.fieldLinkPath")}
              className={inputClass}
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                kind === "faq" ? t("knowledge.fieldQuestion") : t("knowledge.fieldTitle")
              }
              aria-label={kind === "faq" ? t("knowledge.fieldQuestion") : t("knowledge.fieldTitle")}
              className={`${inputClass} sm:col-span-2`}
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={kind === "faq" ? t("knowledge.fieldAnswer") : t("knowledge.fieldBody")}
              aria-label={kind === "faq" ? t("knowledge.fieldAnswer") : t("knowledge.fieldBody")}
              rows={4}
              className={`${inputClass} sm:col-span-2`}
            />
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder={t("knowledge.fieldKeywords")}
              aria-label={t("knowledge.fieldKeywords")}
              className={`${inputClass} sm:col-span-2`}
            />
          </div>
          <button
            onClick={() => void add()}
            disabled={busy}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {t("knowledge.add")}
          </button>
          <p className="mt-3 text-xs text-muted-foreground">{t("knowledge.languageHint")}</p>
          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("knowledge.search")}
            aria-label={t("knowledge.search")}
            className={`${inputClass} min-w-48 flex-1`}
          />
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as "all" | Kind)}
            aria-label={t("knowledge.fieldKind")}
            className={inputClass}
          >
            <option value="all">{t("knowledge.filterAll")}</option>
            <option value="faq">{t("knowledge.kindFaq")}</option>
            <option value="note">{t("knowledge.kindNote")}</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "published" | "draft")}
            aria-label={t("knowledge.filterStatus")}
            className={inputClass}
          >
            <option value="all">{t("knowledge.filterAll")}</option>
            <option value="published">{t("knowledge.published")}</option>
            <option value="draft">{t("knowledge.draft")}</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("knowledge.empty")}</p>
          ) : null}
          {visible.map((row) => (
            <div
              key={row.id}
              className={`rounded-2xl border border-border bg-card p-4 ${row.is_published ? "" : "opacity-70"}`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                  {row.kind === "faq" ? t("knowledge.kindFaq") : t("knowledge.kindNote")}
                </span>
                <input
                  value={row.title}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, title: e.target.value } : r)),
                    )
                  }
                  onBlur={(e) => void patch(row.id, { title: e.target.value })}
                  aria-label={t("knowledge.fieldTitle")}
                  className="min-w-48 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold outline-none hover:border-border focus:border-border"
                />
                <span className="text-xs text-muted-foreground">
                  {t("knowledge.updated")} {dateFormat.format(new Date(row.updated_at))}
                </span>
                <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={row.is_published}
                    onChange={(e) => void patch(row.id, { is_published: e.target.checked })}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  {t("knowledge.published")}
                </label>
                <button
                  onClick={() => void remove(row)}
                  aria-label={t("knowledge.delete")}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={row.body}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) => (r.id === row.id ? { ...r, body: e.target.value } : r)),
                  )
                }
                onBlur={(e) => void patch(row.id, { body: e.target.value })}
                aria-label={t("knowledge.fieldBody")}
                rows={3}
                className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
              />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  value={row.keywords.join(", ")}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) =>
                        r.id === row.id ? { ...r, keywords: e.target.value.split(",") } : r,
                      ),
                    )
                  }
                  onBlur={(e) => void patch(row.id, { keywords: parseKeywords(e.target.value) })}
                  aria-label={t("knowledge.fieldKeywords")}
                  placeholder={t("knowledge.fieldKeywords")}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
                />
                <input
                  value={row.link_path ?? ""}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, link_path: e.target.value } : r)),
                    )
                  }
                  onBlur={(e) => void patch(row.id, { link_path: e.target.value.trim() || null })}
                  aria-label={t("knowledge.fieldLinkPath")}
                  placeholder={t("knowledge.fieldLinkPath")}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
