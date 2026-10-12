/**
 * "How we size this" explainer for the ROI Simulator programme screen.
 */
import { useI18n } from "@/i18n";
import {
  formatNumber,
  PROGRAMMES,
  type CurrencyKey,
  type ProgrammeKey,
  type RoiResult,
} from "@/lib/roi-model";
import { fill } from "./format";

export function ProgrammeSizing({
  programme,
  employees,
  result,
  currency,
}: {
  programme: ProgrammeKey;
  employees: number;
  result: RoiResult;
  currency: CurrencyKey;
}) {
  const { t } = useI18n();
  const P = PROGRAMMES[programme];
  const n = (v: number) => formatNumber(v, currency);
  const rows: { key: string; value: number; vars: Record<string, string | number> }[] = [
    { key: "direct", value: result.participants, vars: { employees: n(employees), reach: Math.round(P.reach * 100) } },
    {
      key: "leaders",
      value: result.leaders,
      vars: { participants: n(result.participants), share: Math.round(P.leaderShare * 100), seniority: P.seniority },
    },
    { key: "indirect", value: result.indirect, vars: { participants: n(result.participants), radius: P.radius } },
    {
      key: "weighted",
      value: result.eff,
      vars: { participants: n(result.participants), indirect: n(result.indirect), spill: Math.round(P.spill * 100) },
    },
  ];
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-sm font-semibold">
        {fill(t("roi.sizing.title"), { programme: t(`roi.programmes.${programme}.label`) })}
      </p>
      <dl className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="flex items-start justify-between gap-3 text-sm">
            <div>
              <dt>{t(`roi.sizing.${r.key}.label`)}</dt>
              <dd className="text-xs text-muted-foreground">{fill(t(`roi.sizing.${r.key}.calc`), r.vars)}</dd>
            </div>
            <dd className="font-bold tabular-nums">{n(r.value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">{t("roi.sizing.note")}</p>
    </div>
  );
}
