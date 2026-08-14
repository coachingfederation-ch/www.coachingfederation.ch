/**
 * The detailed log. One row per answered question, metadata only — no visitor
 * wording is stored, so there is nothing personal to reveal here.
 */
import { categoryLabel, formatDateTime } from "@/lib/chat-insights";
import type { ChatCategory, ChatLogRow } from "@/lib/chat-insights";

function Yes({ value, t }: { value: boolean; t: (k: string) => string }) {
  return (
    <span className={value ? "font-semibold text-foreground" : "text-muted-foreground"}>
      {t(value ? "chatInsights.yes" : "chatInsights.no")}
    </span>
  );
}

export function ChatInsightTable({
  rows,
  categories,
  locale,
  truncated,
  t,
}: {
  rows: ChatLogRow[];
  categories: ChatCategory[];
  locale: string;
  truncated: boolean;
  t: (k: string) => string;
}) {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        {t("chatInsights.noData")}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[60rem] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">{t("chatInsights.table.when")}</th>
              <th className="px-4 py-3 font-semibold">{t("chatInsights.table.category")}</th>
              <th className="px-4 py-3 font-semibold">{t("chatInsights.table.detail")}</th>
              <th className="px-4 py-3 font-semibold">{t("chatInsights.table.language")}</th>
              <th className="px-4 py-3 font-semibold">{t("chatInsights.table.outcome")}</th>
              <th className="px-4 py-3 font-semibold">{t("chatInsights.table.contactShown")}</th>
              <th className="px-4 py-3 font-semibold">{t("chatInsights.table.contactClicked")}</th>
              <th className="px-4 py-3 font-semibold">{t("chatInsights.table.feedback")}</th>
              <th className="px-4 py-3 font-semibold">{t("chatInsights.table.escalation")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-0">
                <td className="whitespace-nowrap px-4 py-3">
                  {formatDateTime(row.occurredAt, locale)}
                </td>
                <td className="px-4 py-3">
                  {categoryLabel(bySlug.get(row.categorySlug), row.categorySlug, locale)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.categoryDetail ?? "—"}</td>
                <td className="px-4 py-3">{row.locale.toUpperCase()}</td>
                <td className="px-4 py-3">{t(`chatInsights.outcome.${row.outcome}`)}</td>
                <td className="px-4 py-3">
                  <Yes value={row.contactShown} t={t} />
                </td>
                <td className="px-4 py-3">
                  <Yes value={row.contactClicked} t={t} />
                </td>
                <td className="px-4 py-3">
                  {row.feedback
                    ? t(
                        row.feedback === "helpful"
                          ? "chatInsights.feedback.helpful"
                          : "chatInsights.feedback.notHelpful",
                      )
                    : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.escalationReason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {truncated ? (
        <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          {t("chatInsights.truncated")}
        </p>
      ) : null}
    </div>
  );
}
