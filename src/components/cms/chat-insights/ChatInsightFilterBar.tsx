/**
 * The single filter set every figure on the Chat Agent Insights screen obeys —
 * KPI cards, charts, table and the CSV export all read this state.
 */
import { CHAT_OUTCOMES, isoDaysAgo, todayIso } from "@/lib/chat-insights";
import type { ChatCategory, ChatInsightFilters } from "@/lib/chat-insights";
import { categoryLabel } from "@/lib/chat-insights";

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const PRESETS = [7, 30, 90] as const;

export function ChatInsightFilterBar({
  filters,
  setFilters,
  categories,
  languages,
  locale,
  onExport,
  exporting,
  t,
}: {
  filters: ChatInsightFilters;
  setFilters: (next: ChatInsightFilters) => void;
  categories: ChatCategory[];
  languages: string[];
  locale: string;
  onExport: () => void | Promise<void>;
  exporting: boolean;
  t: (k: string) => string;
}) {
  const patch = (next: Partial<ChatInsightFilters>) => setFilters({ ...filters, ...next });
  const activePreset = PRESETS.find(
    (days) => filters.from === isoDaysAgo(days) && filters.to === todayIso(),
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PRESETS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => patch({ from: isoDaysAgo(days), to: todayIso() })}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              activePreset === days
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {t(`chatInsights.period.last${days}`)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => patch({ from: "", to: "" })}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
            !filters.from && !filters.to
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground hover:bg-secondary"
          }`}
        >
          {t("chatInsights.period.all")}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Labelled label={t("chatInsights.filters.from")}>
          <input
            type="date"
            className={inputClass}
            value={filters.from}
            onChange={(e) => patch({ from: e.target.value })}
          />
        </Labelled>
        <Labelled label={t("chatInsights.filters.to")}>
          <input
            type="date"
            className={inputClass}
            value={filters.to}
            onChange={(e) => patch({ to: e.target.value })}
          />
        </Labelled>
        <Labelled label={t("chatInsights.filters.category")}>
          <select
            className={inputClass}
            value={filters.category}
            onChange={(e) => patch({ category: e.target.value })}
          >
            <option value="all">{t("chatInsights.filters.all")}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {categoryLabel(c, c.slug, locale)}
              </option>
            ))}
          </select>
        </Labelled>
        <Labelled label={t("chatInsights.filters.outcome")}>
          <select
            className={inputClass}
            value={filters.outcome}
            onChange={(e) => patch({ outcome: e.target.value })}
          >
            <option value="all">{t("chatInsights.filters.all")}</option>
            {CHAT_OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {t(`chatInsights.outcome.${o}`)}
              </option>
            ))}
          </select>
        </Labelled>
        <Labelled label={t("chatInsights.filters.contact")}>
          <select
            className={inputClass}
            value={filters.contact}
            onChange={(e) => patch({ contact: e.target.value })}
          >
            <option value="all">{t("chatInsights.filters.all")}</option>
            <option value="shown">{t("chatInsights.filters.contactShown")}</option>
            <option value="not_shown">{t("chatInsights.filters.contactNotShown")}</option>
            <option value="clicked">{t("chatInsights.filters.contactClicked")}</option>
          </select>
        </Labelled>
        <Labelled label={t("chatInsights.filters.language")}>
          <select
            className={inputClass}
            value={filters.language}
            onChange={(e) => patch({ language: e.target.value })}
          >
            <option value="all">{t("chatInsights.filters.all")}</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </Labelled>
        <Labelled label={t("chatInsights.filters.feedback")}>
          <select
            className={inputClass}
            value={filters.feedback}
            onChange={(e) => patch({ feedback: e.target.value })}
          >
            <option value="all">{t("chatInsights.filters.all")}</option>
            <option value="helpful">{t("chatInsights.feedback.helpful")}</option>
            <option value="not_helpful">{t("chatInsights.feedback.notHelpful")}</option>
            <option value="none">{t("chatInsights.feedback.none")}</option>
          </select>
        </Labelled>
        <Labelled label={t("chatInsights.filters.search")}>
          <input
            type="search"
            className={inputClass}
            value={filters.search}
            placeholder={t("chatInsights.filters.searchPlaceholder")}
            onChange={(e) => patch({ search: e.target.value })}
          />
        </Labelled>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setFilters({
              from: "",
              to: "",
              category: "all",
              outcome: "all",
              contact: "all",
              language: "all",
              feedback: "all",
              search: "",
            })
          }
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary"
        >
          {t("chatInsights.filters.reset")}
        </button>
        <button
          type="button"
          onClick={() => void onExport()}
          disabled={exporting}
          className="ml-auto rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
        >
          {exporting ? t("chatInsights.exporting") : t("chatInsights.exportCsv")}
        </button>
      </div>
    </div>
  );
}
