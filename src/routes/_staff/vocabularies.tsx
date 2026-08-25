/**
 * CMS vocabulary management route (/_staff/vocabularies).
 * Exports: Route. Renders the admin interface for managing directory
 * taxonomy terms (Regions, Credentials, etc.) and translations.
 */

import { createFileRoute } from "@tanstack/react-router";
import { requireStaffAccess, PLATFORM_ADMIN_ROLES } from "@/lib/staff-guard";
import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowDown, ArrowUp } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useCms } from "@/i18n/cms";
import { translateTaxonomyLabels } from "@/lib/label-translations.functions";
import {
  VOCAB_COLUMNS,
  VOCAB_DESCRIPTORS,
  slugifyVocab,
  type VocabRow,
  type VocabTable,
} from "@/lib/vocabularies";

export const Route = createFileRoute("/_staff/vocabularies")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, PLATFORM_ADMIN_ROLES),
  head: () => ({
    meta: [
      { title: "Coach Finder vocabularies — The Switzerland Chapter of ICF CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VocabulariesPage,
});

function VocabulariesPage() {
  const { t } = useCms();
  const [table, setTable] = useState<VocabTable>(VOCAB_DESCRIPTORS[0]!.table);
  const [rows, setRows] = useState<VocabRow[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [translating, setTranslating] = useState<string | null>(null);

  const load = async (target: VocabTable) => {
    const { data, error: err } = await supabase
      .from(target)
      .select(VOCAB_COLUMNS)
      .order("sort_order", { ascending: true });
    if (err) {
      setError(err.message);
      return;
    }
    setRows((data ?? []) as VocabRow[]);
  };

  useEffect(() => {
    setError(null);
    void load(table);
  }, [table]);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    const { data: created, error: err } = await supabase
      .from(table)
      .insert({
        name,
        slug: slugifyVocab(name) || `term-${Date.now()}`,
        sort_order: (rows.at(-1)?.sort_order ?? 0) + 10,
      })
      .select("id")
      .maybeSingle();
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    setNewName("");
    // The term exists already — a failing AI call only leaves the locale
    // fields empty, it never blocks creation.
    if (created?.id) await fillTranslations(created.id, name, {});
    setBusy(false);
    await load(table);
  };

  /** Fill only the locale fields that are still empty — manual wording wins. */
  const fillTranslations = async (id: string, name: string, current: Partial<VocabRow>) => {
    setTranslating(id);
    try {
      const [labels] = await translateTaxonomyLabels({
        data: { scope: "vocabulary", names: [name] },
      });
      if (!labels) throw new Error("empty");
      const values: Partial<VocabRow> = {};
      for (const l of ["de", "fr", "it"] as const) {
        const key = `name_${l}` as const;
        if (!current[key]) values[key] = labels[l];
      }
      if (Object.keys(values).length === 0) return;
      const { error: err } = await supabase.from(table).update(values).eq("id", id);
      if (err) throw new Error(err.message);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...values } : r)));
    } catch {
      setError(t("taxonomy.translateFailed"));
    } finally {
      setTranslating(null);
    }
  };

  const patch = async (id: string, values: Partial<VocabRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...values } : r)));
    const { error: err } = await supabase.from(table).update(values).eq("id", id);
    if (err) setError(err.message);
  };

  const move = async (index: number, direction: -1 | 1) => {
    const a = rows[index];
    const b = rows[index + direction];
    if (!a || !b) return;
    await Promise.all([
      supabase.from(table).update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from(table).update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    await load(table);
  };

  const remove = async (row: VocabRow) => {
    if (!window.confirm(t("vocab.confirmDelete"))) return;
    const { error: err } = await supabase.from(table).delete().eq("id", row.id);
    if (err) {
      setError(err.message);
      return;
    }
    await load(table);
  };

  return (
    <Shell>
      <div className="mx-auto max-w-4xl px-10 py-10">
        <h1 className="text-2xl font-bold tracking-tight">{t("vocab.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("vocab.subtitle")}</p>

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label={t("vocab.title")}>
          {VOCAB_DESCRIPTORS.map((d) => (
            <button
              key={d.table}
              type="button"
              role="tab"
              aria-selected={d.table === table}
              onClick={() => setTable(d.table)}
              className={
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition " +
                (d.table === table
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground")
              }
            >
              {t(`vocab.tables.${d.key}`)}
            </button>
          ))}
        </div>

        <div className="mt-6 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("vocab.namePlaceholder")}
            className="w-72 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
          />
          <button
            onClick={() => void add()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {t("vocab.add")}
          </button>
        </div>
        {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

        <div className="mt-6 space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("vocab.empty")}</p>
          ) : null}
          {rows.map((row, index) => (
            <div
              key={row.id}
              className={
                "rounded-2xl border border-border bg-card p-4 " +
                (row.is_active ? "" : "opacity-60")
              }
            >
              <div className="flex items-center gap-3">
                <input
                  value={row.name}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)),
                    )
                  }
                  onBlur={(e) => void patch(row.id, { name: e.target.value })}
                  className="flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold outline-none hover:border-border focus:border-border"
                />
                <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={row.is_active}
                    onChange={(e) => void patch(row.id, { is_active: e.target.checked })}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  {t("vocab.active")}
                </label>
                <button
                  onClick={() => void move(index, -1)}
                  disabled={index === 0}
                  aria-label={t("vocab.moveUp")}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => void move(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label={t("vocab.moveDown")}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void fillTranslations(row.id, row.name, row)}
                  disabled={translating === row.id}
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
                >
                  {translating === row.id ? t("taxonomy.translating") : t("taxonomy.translate")}
                </button>
                <button
                  onClick={() => void remove(row)}
                  aria-label={t("vocab.delete")}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("vocab.localeNames")}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["de", "fr", "it"] as const).map((l) => {
                    const key = `name_${l}` as const;
                    return (
                      <label key={l} className="text-xs text-muted-foreground">
                        {l.toUpperCase()}
                        <input
                          value={row[key] ?? ""}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, [key]: e.target.value } : r,
                              ),
                            )
                          }
                          onBlur={(e) =>
                            void patch(row.id, {
                              [key]: e.target.value || null,
                            } as Partial<VocabRow>)
                          }
                          className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/20"
                        />
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t("vocab.slug")}: {row.slug}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
