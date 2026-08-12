/**
 * Trends over time. Registrations are bucketed by sign-up date, refunds by the
 * day the money went back, check-ins by the moment at the door — so each line
 * answers "when did this happen", not "when was the seat sold".
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportPoint } from "@/lib/event-reporting";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

export function ReportTrends({
  series,
  hasCheckIns,
  money,
  t,
}: {
  series: ReportPoint[];
  hasCheckIns: boolean;
  money: (cents: number) => string;
  t: (k: string) => string;
}) {
  if (series.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        {t("events.reporting.noData")}
      </div>
    );
  }

  const axis = { fontSize: 11 };
  const revenue = series.map((p) => ({
    ...p,
    gross: p.grossCents / 100,
    refunds: p.refundCents / 100,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={t("events.reporting.trendRegistrations")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="date" tick={axis} />
            <YAxis allowDecimals={false} tick={axis} />
            <Tooltip />
            <Legend wrapperStyle={axis} />
            <Bar
              dataKey="paid"
              stackId="r"
              name={t("events.reporting.seriesPaid")}
              fill="var(--color-primary)"
            />
            <Bar
              dataKey="free"
              stackId="r"
              name={t("events.reporting.seriesFree")}
              fill="var(--color-accent)"
            />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title={t("events.reporting.trendRevenue")}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={revenue}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="date" tick={axis} />
            <YAxis tick={axis} />
            <Tooltip formatter={(v: number) => money(Math.round(v * 100))} />
            <Legend wrapperStyle={axis} />
            <Line
              type="monotone"
              dataKey="gross"
              name={t("events.reporting.seriesGross")}
              stroke="var(--color-primary)"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="refunds"
              name={t("events.reporting.seriesRefunds")}
              stroke="var(--color-destructive)"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      {hasCheckIns ? (
        <Panel title={t("events.reporting.trendCheckIns")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={axis} />
              <YAxis allowDecimals={false} tick={axis} />
              <Tooltip />
              <Bar
                dataKey="checkedIn"
                name={t("events.reporting.seriesCheckIns")}
                fill="var(--color-primary)"
              />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      ) : null}
    </div>
  );
}
