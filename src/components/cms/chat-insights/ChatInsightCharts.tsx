/**
 * Visual insights for the chat agent: what visitors ask, how the answers land,
 * how often we hand people over to the office, and what they tell us about it.
 *
 * Rates are deliberately absent from the charts — a bar chart of raw counts
 * cannot mislead the way a percentage over a tiny denominator can.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { categoryLabel } from "@/lib/chat-insights";
import type {
  ChatCategory,
  ChatCategoryPoint,
  ChatContactPoint,
  ChatFeedbackPoint,
  ChatOutcomePoint,
} from "@/lib/chat-insights";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

const OUTCOME_COLORS: Record<string, string> = {
  successful: "var(--color-primary)",
  partially_successful: "var(--color-accent)",
  escalated: "var(--color-secondary-foreground)",
  unsuccessful: "var(--color-destructive)",
  unknown: "var(--color-muted-foreground)",
};

export function ChatInsightCharts({
  byCategory,
  byOutcome,
  contactSeries,
  feedback,
  categories,
  locale,
  t,
}: {
  byCategory: ChatCategoryPoint[];
  byOutcome: ChatOutcomePoint[];
  contactSeries: ChatContactPoint[];
  feedback: ChatFeedbackPoint;
  categories: ChatCategory[];
  locale: string;
  t: (k: string) => string;
}) {
  const axis = { fontSize: 11 };
  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  const categoryData = byCategory.map((p) => ({
    name: categoryLabel(bySlug.get(p.slug), p.slug, locale),
    count: p.count,
  }));
  const outcomeData = byOutcome
    .filter((p) => p.count > 0)
    .map((p) => ({ name: t(`chatInsights.outcome.${p.outcome}`), value: p.count, key: p.outcome }));
  const feedbackData = [
    { name: t("chatInsights.feedback.helpful"), value: feedback.helpful, key: "successful" },
    { name: t("chatInsights.feedback.notHelpful"), value: feedback.notHelpful, key: "unsuccessful" },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={t("chatInsights.charts.categories")}>
        {categoryData.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("chatInsights.noData")}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" allowDecimals={false} tick={axis} />
              <YAxis type="category" dataKey="name" width={140} tick={axis} />
              <Tooltip />
              <Bar
                dataKey="count"
                name={t("chatInsights.charts.interactions")}
                fill="var(--color-primary)"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel title={t("chatInsights.charts.outcomes")}>
        {outcomeData.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("chatInsights.noData")}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={outcomeData} dataKey="value" nameKey="name" outerRadius={90} label>
                {outcomeData.map((entry) => (
                  <Cell key={entry.key} fill={OUTCOME_COLORS[entry.key]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={axis} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel title={t("chatInsights.charts.contactOverTime")}>
        {contactSeries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("chatInsights.noData")}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={contactSeries}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={axis} />
              <YAxis allowDecimals={false} tick={axis} />
              <Tooltip />
              <Legend wrapperStyle={axis} />
              <Line
                type="monotone"
                dataKey="shown"
                name={t("chatInsights.charts.contactShown")}
                stroke="var(--color-primary)"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="clicked"
                name={t("chatInsights.charts.contactClicked")}
                stroke="var(--color-accent)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel title={t("chatInsights.charts.feedback")}>
        {feedbackData.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("chatInsights.noFeedback")}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={feedbackData} dataKey="value" nameKey="name" outerRadius={90} label>
                {feedbackData.map((entry) => (
                  <Cell key={entry.key} fill={OUTCOME_COLORS[entry.key]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={axis} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  );
}
