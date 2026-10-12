/**
 * Live ledger for the ROI Simulator: investment, the seven value drivers with
 * their visible formulas, the overlap discount, net and payback.
 */
import { Card } from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";
import {
  formatMoney,
  formatNumber,
  type CurrencyKey,
  type RoiInputs,
  type RoiResult,
} from "@/lib/roi-model";
import { fill, driverFormula } from "./format";

const BAR_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5", "bg-primary", "bg-highlight"];

export function RoiLedger({
  result,
  inputs,
  currency,
}: {
  result: RoiResult;
  inputs: RoiInputs;
  currency: CurrencyKey;
}) {
  const { t } = useI18n();
  const money = (v: number) => formatMoney(v, currency);
  const max = Math.max(1, ...result.drivers.map((d) => d.value));

  return (
    <Card className="p-6" aria-labelledby="roi-ledger-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="roi-ledger-title" className="font-heading text-xl">
          {t("roi.ledger.title")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {fill(t("roi.ledger.reach"), { eff: formatNumber(result.eff, currency) })}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-b border-border pb-5">
        <div>
          <dt className="text-xs text-muted-foreground">{t("roi.ledger.investment")}</dt>
          <dd className="mt-1 text-2xl font-bold text-foreground">{money(result.cost)}</dd>
          <dd className="text-xs text-muted-foreground">
            {inputs.internalTime ? t("roi.ledger.investmentNote") : t("roi.ledger.investmentNoteOff")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("roi.ledger.return")}</dt>
          <dd className="mt-1 text-2xl font-bold text-primary">{money(result.gross)}</dd>
          <dd className="text-xs text-muted-foreground">
            {fill(t("roi.ledger.grossNote"), { pct: inputs.overlap })}
          </dd>
        </div>
      </dl>

      <ul className="mt-5 space-y-4">
        {result.drivers.map((d, i) => (
          <li key={d.key}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold">{t(`roi.drivers.${d.key}.label`)}</p>
              <p className="text-sm font-bold tabular-nums">{money(d.value)}</p>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className={"h-full rounded-full " + BAR_COLORS[i % BAR_COLORS.length]}
                style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {driverFormula(t(`roi.drivers.${d.key}.formula`), d, currency)}
              {" · "}
              {fill(t("roi.ledger.share"), {
                pct: Math.round((d.value / Math.max(1, result.gross)) * 100),
              })}
            </p>
          </li>
        ))}
      </ul>

      <dl className="mt-5 space-y-2 border-t border-border pt-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t("roi.ledger.overlap")}</dt>
          <dd className="tabular-nums">−{money(result.gross - result.benefit)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="font-semibold">{t("roi.ledger.net")}</dt>
          <dd className="font-bold tabular-nums">{money(result.benefit - result.cost)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="font-semibold">{t("roi.ledger.roiPayback")}</dt>
          <dd className="font-bold tabular-nums">
            {result.roi.toFixed(1)}× ·{" "}
            {result.payback
              ? fill(t("roi.ledger.monthShort"), { m: result.payback })
              : t("roi.ledger.none")}
          </dd>
        </div>
      </dl>

      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">{t("roi.ledger.footnote")}</p>
    </Card>
  );
}
