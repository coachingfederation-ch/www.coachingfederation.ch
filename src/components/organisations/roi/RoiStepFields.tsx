/**
 * One labelled slider row for the ROI Simulator, plus the programme-type picker
 * and its sizing explainer.
 */
import { useId } from "react";
import { Label, Slider, ToggleGroup, ToggleGroupItem } from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";
import {
  formatNumber,
  PROGRAMMES,
  type CurrencyKey,
  type ProgrammeKey,
  type RoiResult,
} from "@/lib/roi-model";
import { fill } from "./format";

export function SliderField({
  name,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  name: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{t(`roi.fields.${name}.label`)}</Label>
        <span className="text-sm font-bold tabular-nums">{display}</span>
      </div>
      <Slider
        id={id}
        className="mt-3"
        value={[value]}
        min={min}
        max={max}
        step={step}
        aria-label={t(`roi.fields.${name}.label`)}
        aria-valuetext={display}
        onValueChange={([v]) => onChange(v)}
      />
      <p className="mt-2 text-xs text-muted-foreground">{t(`roi.fields.${name}.hint`)}</p>
    </div>
  );
}

const PROGRAMME_KEYS = Object.keys(PROGRAMMES) as ProgrammeKey[];

export function ProgrammePicker({
  value,
  onChange,
}: {
  value: ProgrammeKey;
  onChange: (v: ProgrammeKey) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <p className="text-sm font-medium">{t("roi.programmes.label")}</p>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as ProgrammeKey)}
        className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
        aria-label={t("roi.programmes.label")}
      >
        {PROGRAMME_KEYS.map((k) => (
          <ToggleGroupItem
            key={k}
            value={k}
            variant="outline"
            className="h-auto flex-col items-start gap-1 p-4 text-left"
          >
            <span className="text-sm font-semibold">{t(`roi.programmes.${k}.label`)}</span>
            <span className="text-xs text-muted-foreground">{t(`roi.programmes.${k}.note`)}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

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
  const rows = [
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
