/**
 * CMS article categories management route (/_staff/articles/categories).
 * Exports: Route. Renders the admin interface for managing Insights
 * categories and their localized names.
 */

import { createFileRoute } from "@tanstack/react-router";
import { requireStaffAccess, CATEGORY_ROLES } from "@/lib/staff-guard";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { supabase } from "@/integrations/supabase/client";
import { slugify, type CategoryRow } from "@/lib/articles";
import { useCms } from "@/i18n/cms";
import { translateTaxonomyLabels } from "@/lib/label-translations.functions";

export const Route = createFileRoute("/_staff/articles/categories")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, CATEGORY_ROLES),
  head: () => ({
    meta: [
      { title: "Categories — The Switzerland Chapter of ICF Insights CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CategoriesPage,
});

const COLUMNS = "id, slug, name, name_de, name_fr, name_it, sort_order";

function CategoriesPage() {
  const { t } = useCms();
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [translating, setTranslating] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("categories")
      .select(COLUMNS)
      .order("sort_order", { ascending: true });
    setRows((data ?? []) as CategoryRow[]);
    const { data: articles } = await supabase.from("articles").select("category_id");
    const map: Record<string, number> = {};
    for (const a of articles ?? []) {
      if (a.category_id) map[a.category_id] = (map[a.category_id] ?? 0) + 1;
    }
    setCounts(map);
  };

  useEffect(() => {
    void load();
  }, []);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    const { data: created, error: err } = await supabase
      .from("categories")
      .insert({
        name,
        slug: slugify(name) || `category-${Date.now()}`,
        sort_order: rows.length,
      })
      .select("id")
      .maybeSingle();
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    setNewName("");
    // Creation must never block on the AI call: the row already exists, so a
    // translation failure only leaves the locale fields empty.
    if (created?.id) await fillTranslations(created.id, name, {});
    setBusy(false);
    await load();
  };

  /** Fill only the locale fields that are still empty — manual wording wins. */
  const fillTranslations = async (id: string, name: string, current: Partial<CategoryRow>) => {
    setTranslating(id);
    try {
      const [labels] = await translateTaxonomyLabels({
        data: { scope: "category", names: [name] },
      });
      if (!labels) throw new Error("empty");
      const values: Partial<CategoryRow> = {};
      for (const l of ["de", "fr", "it"] as const) {
        const key = `name_${l}` as const;
        if (!current[key]) values[key] = labels[l];
      }
      if (Object.keys(values).length === 0) return;
      const { error: err } = await supabase.from("categories").update(values).eq("id", id);
      if (err) throw new Error(err.message);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...values } : r)));
    } catch {
      setError(t("taxonomy.translateFailed"));
    } finally {
      setTranslating(null);
    }
  };

  const patch = async (id: string, values: Partial<CategoryRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...values } : r)));
    const { error: err } = await supabase.from("categories").update(values).eq("id", id);
    if (err) setError(err.message);
  };

  const remove = async (row: CategoryRow) => {
    const count = counts[row.id] ?? 0;
    if (count > 0) {
      setError(t("categories.inUse").replace("{count}", String(count)));
      return;
    }
    if (!window.confirm(t("categories.confirmDelete"))) return;
    const { error: err } = await supabase.from("categories").delete().eq("id", row.id);
    if (err) {
      setError(err.message);
      return;
    }
    await load();
  };

  return (
    <Shell>
      <div className="mx-auto max-w-4xl px-10 py-10">
        <h1 className="text-2xl font-bold tracking-tight">{t("categories.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("categories.subtitle")}</p>

        <div className="mt-6 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("categories.namePlaceholder")}
            className="w-72 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
          />
          <button
            onClick={() => void add()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {t("categories.add")}
          </button>
        </div>
        {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

        <div className="mt-6 space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("categories.empty")}</p>
          ) : null}
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-border bg-card p-4">
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
                <span className="text-xs text-muted-foreground">
                  {counts[row.id] ?? 0} {t("categories.articles")}
                </span>
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
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={t("categories.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("categories.localeNames")}
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
                            } as Partial<CategoryRow>)
                          }
                          className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/20"
                        />
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t("categories.slug")}: {row.slug}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
