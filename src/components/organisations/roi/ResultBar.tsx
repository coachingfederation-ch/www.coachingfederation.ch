/**
 * Slim live result shown while answering: a side card on desktop, a bar
 * fixed to the bottom of the screen on phones.
 */
import { Card } from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";
import { formatMoney, type CurrencyKey, type RoiResult } from "@/lib/roi-model";
import { fill } from "./format";

function Figures({ result, currency }: { result: RoiResult; currency: CurrencyKey }) {
  const { t } = useI18n();
  const items = [
    { label: t("roi.bar.return"), value: result.roi.toFixed(1) + "×" },
    {
      label: t("roi.bar.payback"),
      value: result.payback ? fill(t("roi.ledger.monthShort"), { m: result.payback }) : "—",
    },
    { label: t("roi.bar.net"), value: formatMoney(result.benefit - result.cost, currency) },
  ];
  return (
    <dl className="grid grid-cols-3 gap-3">
      {items.map((i) => (
        <div key={i.label}>
          <dt className="text-xs text-muted-foreground">{i.label}</dt>
          <dd className="whitespace-nowrap font-heading text-lg tabular-nums text-foreground lg:text-2xl">
            {i.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ResultBar({ result, currency }: { result: RoiResult; currency: CurrencyKey }) {
  const { t } = useI18n();
  return (
    <>
      <Card className="hidden p-6 lg:block" aria-live="polite">
        <p className="eyebrow text-primary">{t("roi.bar.title")}</p>
        <div className="mt-4">
          <Figures result={result} currency={currency} />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t("roi.bar.note")}</p>
      </Card>
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 py-3 shadow-soft lg:hidden"
        aria-live="polite"
      >
        <Figures result={result} currency={currency} />
      </div>
    </>
  );
}
