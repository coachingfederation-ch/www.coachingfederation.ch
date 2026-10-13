/**
 * Value drivers grouped into People, Performance and Leadership. Each card
 * shows its total and expands to reveal every formula.
 */
import { ChevronDown, HeartHandshake, TrendingUp, Users } from "lucide-react";
import {
  Card,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";
import { formatMoney, type CurrencyKey, type RoiResult } from "@/lib/roi-model";
import { DRIVER_GROUPS, type DriverGroupKey } from "./driver-groups";
import { driverFormula, fill } from "./format";

const ICONS: Record<DriverGroupKey, typeof Users> = {
  people: Users,
  performance: TrendingUp,
  leadership: HeartHandshake,
};

export function RoiLedger({ result, currency }: { result: RoiResult; currency: CurrencyKey }) {
  const { t } = useI18n();
  const money = (v: number) => formatMoney(v, currency);
  const byKey = new Map(result.drivers.map((d) => [d.key, d]));
  const gross = Math.max(1, result.gross);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {DRIVER_GROUPS.map((g) => {
        const items = g.drivers.map((k) => byKey.get(k)!);
        const total = items.reduce((s, d) => s + d.value, 0);
        const Icon = ICONS[g.key];
        return (
          <Card key={g.key} className="p-6">
            <Collapsible>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground" aria-hidden="true">
                  <Icon className="size-5" />
                </span>
                <h3 className="font-heading text-lg">{t(`roi.groups.${g.key}`)}</h3>
              </div>
              <p className="mt-4 text-3xl font-bold tabular-nums">{money(total)}</p>
              <p className="text-xs text-muted-foreground">
                {fill(t("roi.ledger.share"), { pct: Math.round((total / gross) * 100) })}
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                {/* Data-driven width: the one inline style, by necessity. */}
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (total / gross) * 100)}%` }} />
              </div>
              <CollapsibleTrigger className="group mt-4 flex min-h-11 items-center gap-1 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {t("roi.groups.showMaths")}
                <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-2 space-y-3 border-t border-border pt-3">
                  {items.map((d) => (
                    <li key={d.key}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-semibold">{t(`roi.drivers.${d.key}.label`)}</span>
                        <span className="font-bold tabular-nums">{money(d.value)}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {driverFormula(t(`roi.drivers.${d.key}.formula`), d, currency)}
                      </p>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}
