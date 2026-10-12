/** Final step: headline result band, payback chart, summary and grouped drivers. */
import { Button, Card } from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";
import { askAssistant } from "@/lib/assistant-open";
import { formatMoney, formatNumber, type CurrencyKey, type RoiInputs, type RoiResult } from "@/lib/roi-model";
import { fill } from "./format";
import { PaybackChart } from "./PaybackChart";
import { RoiLedger } from "./RoiLedger";

export function ResultsView({
  result,
  inputs,
  currency,
  onAdjust,
  onRestart,
}: {
  result: RoiResult;
  inputs: RoiInputs;
  currency: CurrencyKey;
  onAdjust: () => void;
  onRestart: () => void;
}) {
  const { t } = useI18n();
  const money = (v: number) => formatMoney(v, currency);
  const vars = {
    programme: t(`roi.programmes.${inputs.programme}.label`),
    participants: formatNumber(result.participants, currency),
    cost: money(result.cost),
    benefit: money(result.benefit),
    roi: result.roi.toFixed(1) + "×",
    net: money(result.benefit - result.cost),
  };
  const stats = [
    { label: t("roi.ledger.net"), value: vars.net },
    { label: t("roi.ledger.investment"), value: vars.cost },
    {
      label: t("roi.bar.payback"),
      value: result.payback ? fill(t("roi.ledger.monthShort"), { m: result.payback }) : t("roi.ledger.none"),
    },
  ];

  return (
    <div className="space-y-8" aria-live="polite">
      <section className="rounded-3xl bg-hero p-8 text-hero-foreground sm:p-12">
        <p className="eyebrow-accent">{t("roi.results.eyebrow")}</p>
        <p className="mt-4 font-heading text-7xl tabular-nums sm:text-8xl">{vars.roi}</p>
        <p className="mt-2 max-w-xl text-lg">{t("roi.results.multipleNote")}</p>
        <dl className="mt-8 grid gap-6 border-t border-hero-foreground/20 pt-6 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-sm text-hero-foreground/80">{s.label}</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="p-6">
          <h2 className="font-heading text-2xl">{t("roi.chart.title")}</h2>
          <div className="mt-4">
            <PaybackChart result={result} currency={currency} />
          </div>
        </Card>
        <Card className="flex flex-col justify-between gap-6 p-6">
          <div>
            <h2 className="font-heading text-2xl">{t("roi.results.caseTitle")}</h2>
            <p className="mt-3 leading-relaxed">
              {fill(t("roi.summary.sentence"), vars)}{" "}
              {result.payback ? fill(t("roi.summary.payback"), { month: result.payback }) : t("roi.summary.noPayback")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="pill" size="pill" onClick={() => askAssistant(fill(t("roi.summary.prompt"), vars))}>
              {t("roi.summary.talk")}
            </Button>
            <Button variant="outline" onClick={onAdjust}>
              {t("roi.results.adjust")}
            </Button>
            <Button variant="ghost" onClick={onRestart}>
              {t("roi.steps.startOver")}
            </Button>
          </div>
        </Card>
      </div>

      <section>
        <h2 className="font-heading text-2xl">{t("roi.results.driversTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {fill(t("roi.ledger.grossNote"), { pct: inputs.overlap })} · {money(result.gross)}
        </p>
        <div className="mt-4">
          <RoiLedger result={result} currency={currency} />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t("roi.ledger.footnote")}</p>
      </section>
    </div>
  );
}
