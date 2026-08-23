/**
 * Governance document management route (/manage/governance).
 * Exports: Route. Staff surface for uploading, describing, publishing and
 * removing the documents shown on the public /governance archive.
 *
 * Writes go through the browser Supabase client: RLS ("governance editors
 * write") plus the storage policy on the private bucket are the real boundary,
 * and `requireStaffAccess` only keeps other roles out of a dead end.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, Upload, ExternalLink } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useCms } from "@/i18n/cms";
import { requireStaffAccess, PLATFORM_ADMIN_ROLES } from "@/lib/staff-guard";
import { GOVERNANCE_DOCUMENT_BUCKET } from "@/lib/storage";
import { GOVERNANCE_CATEGORIES, formatFileSize, type GovernanceCategory } from "@/lib/governance";

export const Route = createFileRoute("/_staff/manage/governance")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, PLATFORM_ADMIN_ROLES),
  head: () => ({
    meta: [
      { title: "Governance documents — The Switzerland Chapter of ICF CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GovernanceCmsPage,
});

type Row = {
  id: string;
  title: string;
  description: string | null;
  category: GovernanceCategory;
  year: number | null;
  language: (typeof LANGUAGES)[number];
  file_path: string | null;
  external_url: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  is_published: boolean;
  sort_order: number;
};

const LANGUAGES = ["en", "de", "fr", "it"] as const;

const COLUMNS =
  "id, title, description, category, year, language, file_path, external_url, file_size_bytes, mime_type, is_published, sort_order";

function GovernanceCmsPage() {
  const { t } = useCms();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<GovernanceCategory>("agm");
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>("en");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    const { data, error: err } = await supabase
      .from("governance_documents")
      .select(COLUMNS)
      .order("year", { ascending: false, nullsFirst: false })
      .order("sort_order", { ascending: true });
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
    const clean = title.trim();
    if (!clean) return;
    if (!file && !externalUrl.trim()) {
      setError(t("governance.needSource"));
      return;
    }
    setBusy(true);
    setError(null);

    let filePath: string | null = null;
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${category}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from(GOVERNANCE_DOCUMENT_BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) {
        setBusy(false);
        setError(upErr.message);
        return;
      }
      filePath = path;
    }

    const parsedYear = Number.parseInt(year, 10);
    const { error: err } = await supabase.from("governance_documents").insert({
      title: clean,
      description: description.trim() || null,
      category,
      year: Number.isFinite(parsedYear) ? parsedYear : null,
      language,
      file_path: filePath,
      external_url: filePath ? null : externalUrl.trim() || null,
      file_size_bytes: file ? file.size : null,
      mime_type: file ? file.type || null : null,
      sort_order: (rows.at(-1)?.sort_order ?? 0) + 10,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setTitle("");
    setDescription("");
    setExternalUrl("");
    setFile(null);
    await load();
  };

  const patch = async (id: string, values: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...values } : r)));
    const { error: err } = await supabase.from("governance_documents").update(values).eq("id", id);
    if (err) setError(err.message);
  };

  const remove = async (row: Row) => {
    if (!window.confirm(t("governance.confirmDelete"))) return;
    if (row.file_path) {
      await supabase.storage.from(GOVERNANCE_DOCUMENT_BUCKET).remove([row.file_path]);
    }
    const { error: err } = await supabase.from("governance_documents").delete().eq("id", row.id);
    if (err) {
      setError(err.message);
      return;
    }
    await load();
  };

  const openFile = async (row: Row) => {
    if (row.external_url) {
      window.open(row.external_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (!row.file_path) return;
    const { data, error: err } = await supabase.storage
      .from(GOVERNANCE_DOCUMENT_BUCKET)
      .createSignedUrl(row.file_path, 300);
    if (err || !data?.signedUrl) {
      setError(err?.message ?? t("governance.signFailed"));
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const inputClass =
    "rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20";

  return (
    <Shell>
      <div className="mx-auto max-w-4xl px-10 py-10">
        <h1 className="text-2xl font-bold tracking-tight">{t("governance.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("governance.subtitle")}</p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {t("governance.addTitle")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("governance.fieldTitle")}
              aria-label={t("governance.fieldTitle")}
              className={inputClass}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as GovernanceCategory)}
              aria-label={t("governance.fieldCategory")}
              className={inputClass}
            >
              {GOVERNANCE_CATEGORIES.map((slug) => (
                <option key={slug} value={slug}>
                  {slug}
                </option>
              ))}
            </select>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              inputMode="numeric"
              placeholder={t("governance.fieldYear")}
              aria-label={t("governance.fieldYear")}
              className={inputClass}
            />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as (typeof LANGUAGES)[number])}
              aria-label={t("governance.fieldLanguage")}
              className={inputClass}
            >
              {LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {code.toUpperCase()}
                </option>
              ))}
            </select>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("governance.fieldDescription")}
              aria-label={t("governance.fieldDescription")}
              rows={2}
              className={`${inputClass} sm:col-span-2`}
            />
            <input
              type="file"
              accept="application/pdf,application/msword,.docx,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              aria-label={t("governance.fieldFile")}
              className={`${inputClass} file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs`}
            />
            <input
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder={t("governance.fieldExternalUrl")}
              aria-label={t("governance.fieldExternalUrl")}
              className={inputClass}
            />
          </div>
          <button
            onClick={() => void add()}
            disabled={busy}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {t("governance.add")}
          </button>
          {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
        </div>

        <div className="mt-8 space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("governance.empty")}</p>
          ) : null}
          {rows.map((row) => (
            <div
              key={row.id}
              className={`rounded-2xl border border-border bg-card p-4 ${row.is_published ? "" : "opacity-70"}`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={row.title}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, title: e.target.value } : r)),
                    )
                  }
                  onBlur={(e) => void patch(row.id, { title: e.target.value })}
                  aria-label={t("governance.fieldTitle")}
                  className="min-w-48 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold outline-none hover:border-border focus:border-border"
                />
                <span className="text-xs text-muted-foreground">
                  {[
                    row.category,
                    row.year,
                    row.language.toUpperCase(),
                    formatFileSize(row.file_size_bytes),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={row.is_published}
                    onChange={(e) => void patch(row.id, { is_published: e.target.checked })}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  {t("governance.published")}
                </label>
                <button
                  onClick={() => void openFile(row)}
                  aria-label={t("governance.preview")}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button
                  onClick={() => void remove(row)}
                  aria-label={t("governance.delete")}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={row.description ?? ""}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) => (r.id === row.id ? { ...r, description: e.target.value } : r)),
                  )
                }
                onBlur={(e) => void patch(row.id, { description: e.target.value || null })}
                aria-label={t("governance.fieldDescription")}
                rows={2}
                className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
