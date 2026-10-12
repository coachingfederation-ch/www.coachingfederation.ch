/**
 * Coaching ROI Simulator — four guided steps on the left, live ledger on the
 * right. All arithmetic lives in src/lib/roi-model.ts.
 */
import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Label,
  Progress,
  ToggleGroup,
  ToggleGroupItem,
} from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";
import { askAssistant } from "@/lib/assistant-open";
import {
  computeRoi,
  convertCurrency,
  CURRENCIES,
  DEFAULT_INPUTS,
  formatMoney,
  formatNumber,
  PRESETS,
  PROGRAMMES,
  type CurrencyKey,
  type PresetKey,
  type RoiInputs,
} from "@/lib/roi-model";
import { fill } from "./format";
import { RoiLedger } from "./RoiLedger";
import { ProgrammePicker, ProgrammeSizing, SliderField } from "./RoiStepFields";

const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];
const CURRENCY_KEYS = Object.keys(CURRENCIES) as CurrencyKey[];

export function RoiSimulator() {
  const { t, tList } = useI18n();
  const [inputs, setInputs] = useState<RoiInputs>(DEFAULT_INPUTS);
  const [currency, setCurrency] = useState<CurrencyKey>("CHF");
  const [step, setStep] = useState(0);
  const result = useMemo(() => computeRoi(inputs), [inputs]);
  const steps = tList<{ title: string; note: string }>("roi.steps.items");
  const money = (v: number) => formatMoney(v, currency);
  const rate = CURRENCIES[currency].rate;

  const set = <K extends keyof RoiInputs>(key: K, value: RoiInputs[K]) =>
    setInputs((s) => ({ ...s, [key]: value }));

  const programmeLabel = t(`roi.programmes.${inputs.programme}.label`);
  const summaryVars = {
    programme: programmeLabel,
    participants: formatNumber(result.participants, currency),
    cost: money(result.cost),
    benefit: money(result.benefit),
    roi: result.roi.toFixed(1) + "×",
    net: money(result.benefit - result.cost),
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{t("roi.controls.preset")}</p>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={inputs.preset}
              onValueChange={(v) =>
                v && setInputs((s) => ({ ...s, preset: v as PresetKey, overlap: PRESETS[v as PresetKey].overlap }))
              }
              className="mt-1"
              aria-label={t("roi.controls.preset")}
            >
              {PRESET_KEYS.map((k) => (
                <ToggleGroupItem key={k} value={k} title={t(`roi.controls.presetNotes.${k}`)}>
                  {t(`roi.controls.presets.${k}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("roi.controls.currency")}</p>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={currency}
              onValueChange={(v) => {
                if (!v) return;
                setInputs((s) => convertCurrency(s, currency, v as CurrencyKey));
                setCurrency(v as CurrencyKey);
              }}
              className="mt-1"
              aria-label={t("roi.controls.currency")}
            >
              {CURRENCY_KEYS.map((k) => (
                <ToggleGroupItem key={k} value={k}>
                  {k}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs text-muted-foreground">{fill(t("roi.steps.progress"), { n: step + 1 })}</p>
          <Progress className="mt-2" value={((step + 1) / 4) * 100} aria-label={fill(t("roi.steps.progress"), { n: step + 1 })} />
          <h2 className="mt-5 font-heading text-2xl">{steps[step]?.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{steps[step]?.note}</p>
        </div>

        <div className="mt-6 space-y-6">
          {step === 0 && (
            <>
              <SliderField name="employees" value={inputs.employees} display={formatNumber(inputs.employees, currency)} min={50} max={20000} step={50} onChange={(v) => set("employees", v)} />
              <SliderField name="salary" value={inputs.salary} display={money(inputs.salary)} min={Math.round(40000 * rate)} max={Math.round(300000 * rate)} step={1000} onChange={(v) => set("salary", v)} />
              <SliderField name="turnover" value={inputs.turnover} display={inputs.turnover + "%"} min={2} max={35} step={0.5} onChange={(v) => set("turnover", v)} />
            </>
          )}
          {step === 1 && (
            <>
              <ProgrammePicker
                value={inputs.programme}
                onChange={(p) =>
                  setInputs((s) => ({ ...s, programme: p, costPer: Math.round(PROGRAMMES[p].cost * rate), duration: PROGRAMMES[p].months }))
                }
              />
              <ProgrammeSizing programme={inputs.programme} employees={inputs.employees} result={result} currency={currency} />
              <SliderField name="costPer" value={inputs.costPer} display={money(inputs.costPer)} min={Math.round(300 * rate)} max={Math.round(25000 * rate)} step={50} onChange={(v) => set("costPer", v)} />
              <SliderField name="duration" value={inputs.duration} display={fill(t("roi.units.months"), { v: inputs.duration })} min={3} max={24} step={1} onChange={(v) => set("duration", v)} />
              <div className="flex items-center gap-3">
                <Checkbox id="roi-internal" checked={inputs.internalTime} onCheckedChange={(c) => set("internalTime", c === true)} />
                <Label htmlFor="roi-internal">{t("roi.fields.internalTime")}</Label>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <SliderField name="engagement" value={inputs.engagement} display={inputs.engagement + "%"} min={20} max={85} step={1} onChange={(v) => set("engagement", v)} />
              <SliderField name="absence" value={inputs.absence} display={fill(t("roi.units.days"), { v: inputs.absence })} min={1} max={20} step={0.5} onChange={(v) => set("absence", v)} />
              <SliderField name="replacePct" value={inputs.replacePct} display={inputs.replacePct + "%"} min={30} max={200} step={5} onChange={(v) => set("replacePct", v)} />
            </>
          )}
          {step === 3 && (
            <div aria-live="polite">
              <p className="text-lg leading-relaxed">
                {fill(t("roi.summary.sentence"), summaryVars)}{" "}
                {result.payback
                  ? fill(t("roi.summary.payback"), { month: result.payback })
                  : t("roi.summary.noPayback")}
              </p>
              <Button
                className="mt-6"
                variant="pill"
                size="pill"
                onClick={() => askAssistant(fill(t("roi.summary.prompt"), summaryVars))}
              >
                {t("roi.summary.talk")}
              </Button>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-between gap-3 border-t border-border pt-5">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            ← {t("roi.steps.back")}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              {step === 2 ? t("roi.steps.seeCase") : t("roi.steps.next")} →
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => { setInputs(DEFAULT_INPUTS); setCurrency("CHF"); setStep(0); }}>
              {t("roi.steps.startOver")}
            </Button>
          )}
        </div>
      </Card>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <RoiLedger result={result} inputs={inputs} currency={currency} />
      </div>
    </div>
  );
}
