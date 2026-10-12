/** One question per screen: big headline, big value, slider, "what this means". */
import { useId, useState } from "react";
import { Award, ChevronDown, Lightbulb, Network, UserCog, Users } from "lucide-react";
import {
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Label,
  Slider,
  ToggleGroup,
  ToggleGroupItem,
} from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";
import {
  CURRENCIES,
  formatMoney,
  formatNumber,
  PROGRAMMES,
  type CurrencyKey,
  type ProgrammeKey,
  type RoiInputs,
  type RoiResult,
} from "@/lib/roi-model";
import { fill } from "./format";
import { ProgrammeSizing } from "./RoiStepFields";
import { RANGES, type ScreenId } from "./screens";

const PROGRAMME_ICONS: Record<ProgrammeKey, typeof Users> = {
  exec: Award,
  team: Users,
  manager: UserCog,
  culture: Network,
};

type NumericKey = "employees" | "salary" | "turnover" | "costPer" | "duration" | "engagement" | "absence" | "replacePct";

function display(key: NumericKey, v: number, cur: CurrencyKey, t: (k: string) => string) {
  if (key === "salary" || key === "costPer") return formatMoney(v, cur);
  if (key === "employees") return formatNumber(v, cur);
  if (key === "duration") return fill(t("roi.units.months"), { v });
  if (key === "absence") return fill(t("roi.units.days"), { v });
  return v + "%";
}

function BigSlider({
  field,
  inputs,
  currency,
  onChange,
  compact,
}: {
  field: NumericKey;
  inputs: RoiInputs;
  currency: CurrencyKey;
  onChange: (k: NumericKey, v: number) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  const r = RANGES[field]!;
  const rate = r.money ? CURRENCIES[currency].rate : 1;
  const value = inputs[field];
  const shown = display(field, value, currency, t);
  return (
    <div>
      {compact ? (
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor={id}>{t(`roi.fields.${field}.label`)}</Label>
          <span className="text-2xl font-bold tabular-nums">{shown}</span>
        </div>
      ) : (
        <p className="font-heading text-6xl tabular-nums text-primary sm:text-7xl" aria-hidden="true">
          {shown}
        </p>
      )}
      <Slider
        id={id}
        className="mt-6 py-3"
        value={[value]}
        min={Math.round(r.min * rate)}
        max={Math.round(r.max * rate)}
        step={r.step}
        aria-label={t(`roi.fields.${field}.label`)}
        aria-valuetext={shown}
        onValueChange={([v]) => onChange(field, v)}
      />
      <div className="mt-1 flex justify-between text-xs text-muted-foreground" aria-hidden="true">
        <span>{display(field, Math.round(r.min * rate), currency, t)}</span>
        <span>{display(field, Math.round(r.max * rate), currency, t)}</span>
      </div>
    </div>
  );
}

export function QuestionScreen({
  screen,
  inputs,
  result,
  currency,
  onField,
  onProgramme,
  onInternalTime,
}: {
  screen: ScreenId;
  inputs: RoiInputs;
  result: RoiResult;
  currency: CurrencyKey;
  onField: (k: NumericKey, v: number) => void;
  onProgramme: (p: ProgrammeKey) => void;
  onInternalTime: (v: boolean) => void;
}) {
  const { t } = useI18n();
  const [sizingOpen, setSizingOpen] = useState(false);
  const money = (v: number) => formatMoney(v, currency);
  const n = (v: number) => formatNumber(v, currency);
  const programme = t(`roi.programmes.${inputs.programme}.label`);

  const hints: Record<ScreenId, string> = {
    employees: fill(t("roi.hints.employees"), { participants: n(result.participants), programme }),
    salary: fill(t("roi.hints.salary"), { dayRate: money(inputs.salary / 220) }),
    turnover: fill(t("roi.hints.turnover"), { leavers: n((inputs.employees * inputs.turnover) / 100) }),
    programme: fill(t("roi.hints.programme"), { participants: n(result.participants), eff: n(result.eff) }),
    investment: fill(t("roi.hints.investment"), { cost: money(result.cost) }),
    engagement: t("roi.hints.engagement"),
    absence: fill(t("roi.hints.absence"), { total: n(inputs.employees * inputs.absence) }),
    replacePct: fill(t("roi.hints.replacePct"), { cost: money((inputs.salary * inputs.replacePct) / 100) }),
  };

  return (
    <div>
      <h2 className="font-heading text-3xl leading-tight sm:text-4xl">{t(`roi.questions.${screen}`)}</h2>
      <p className="mt-2 text-muted-foreground">{t(`roi.questionNotes.${screen}`)}</p>

      <div className="mt-8">
        {screen === "programme" ? (
          <>
            <ToggleGroup
              type="single"
              value={inputs.programme}
              onValueChange={(v) => v && onProgramme(v as ProgrammeKey)}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              aria-label={t("roi.programmes.label")}
            >
              {(Object.keys(PROGRAMMES) as ProgrammeKey[]).map((k) => {
                const Icon = PROGRAMME_ICONS[k];
                return (
                  <ToggleGroupItem
                    key={k}
                    value={k}
                    variant="outline"
                    className="h-auto items-start justify-start gap-3 p-4 text-left"
                  >
                    <Icon className="mt-1 size-5 shrink-0" aria-hidden="true" />
                    <span className="flex flex-col gap-1">
                      <span className="text-base font-semibold">{t(`roi.programmes.${k}.label`)}</span>
                      <span className="text-xs text-muted-foreground">{t(`roi.programmes.${k}.note`)}</span>
                    </span>
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
            <Collapsible open={sizingOpen} onOpenChange={setSizingOpen} className="mt-4">
              <CollapsibleTrigger className="group flex min-h-11 items-center gap-1 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {t("roi.sizing.toggle")}
                <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <ProgrammeSizing programme={inputs.programme} employees={inputs.employees} result={result} currency={currency} />
              </CollapsibleContent>
            </Collapsible>
          </>
        ) : screen === "investment" ? (
          <div className="space-y-8">
            <BigSlider field="costPer" inputs={inputs} currency={currency} onChange={onField} compact />
            <BigSlider field="duration" inputs={inputs} currency={currency} onChange={onField} compact />
            <div className="flex min-h-11 items-center gap-3">
              <Checkbox id="roi-internal" checked={inputs.internalTime} onCheckedChange={(c) => onInternalTime(c === true)} />
              <Label htmlFor="roi-internal">{t("roi.fields.internalTime")}</Label>
            </div>
          </div>
        ) : (
          <BigSlider field={screen} inputs={inputs} currency={currency} onChange={onField} />
        )}
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-2xl bg-background p-4" aria-live="polite">
        <Lightbulb className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm">
          <span className="font-semibold">{t("roi.hints.label")} </span>
          {hints[screen]}
        </p>
      </div>
    </div>
  );
}
