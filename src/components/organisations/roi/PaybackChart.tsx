/** Cumulative net position over 36 months, with the break-even month marked. */
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";
import { formatMoney, type CurrencyKey, type RoiResult } from "@/lib/roi-model";
import { fill } from "./format";

export function PaybackChart({ result, currency }: { result: RoiResult; currency: CurrencyKey }) {
  const { t } = useI18n();
  const config: ChartConfig = { net: { label: t("roi.chart.series"), color: "var(--primary)" } };
  const data = result.paybackCurve.map((net, i) => ({ month: i + 1, net: Math.round(net) }));

  return (
    <figure>
      <ChartContainer config={config} className="aspect-auto h-64 w-full">
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            ticks={[1, 6, 12, 18, 24, 30, 36]}
            tickFormatter={(m) => fill(t("roi.chart.monthTick"), { m })}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={90}
            tickFormatter={(v) => formatMoney(v, currency)}
          />
          <ReferenceLine y={0} stroke="var(--border)" />
          {result.payback ? (
            <ReferenceLine
              x={result.payback}
              stroke="var(--accent)"
              strokeWidth={3}
              label={{ value: t("roi.chart.breakEven"), position: "insideTopLeft", fill: "var(--foreground)" }}
            />
          ) : null}
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, p) => fill(t("roi.chart.monthTick"), { m: p?.[0]?.payload?.month ?? "" })}
                formatter={(v) => formatMoney(Number(v), currency)}
              />
            }
          />
          <Area
            dataKey="net"
            type="monotone"
            stroke="var(--color-net)"
            fill="var(--color-net)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
      <figcaption className="mt-2 text-xs text-muted-foreground">
        {result.payback
          ? fill(t("roi.chart.caption"), { m: result.payback })
          : t("roi.chart.captionNone")}
      </figcaption>
    </figure>
  );
}
