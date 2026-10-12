/**
 * Coaching ROI Simulator — guided story: one question per screen with a live
 * result bar, ending on a visual results page. All arithmetic lives in
 * src/lib/roi-model.ts; screen order lives in ./screens.ts.
 */
import { useMemo, useState } from "react";
import {
  Button,
  Card,
  ToggleGroup,
  ToggleGroupItem,
} from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";
import {
  computeRoi,
  convertCurrency,
  CURRENCIES,
  DEFAULT_INPUTS,
  PRESETS,
  PROGRAMMES,
  type CurrencyKey,
  type PresetKey,
  type RoiInputs,
} from "@/lib/roi-model";
import { fill } from "./format";
import { QuestionScreen } from "./QuestionScreen";
import { ResultBar } from "./ResultBar";
import { ResultsView } from "./ResultsView";
import { firstScreenOfGroup, groupOf, RESULTS_INDEX, SCREENS } from "./screens";
import { StepGuide } from "./StepGuide";

const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];
const CURRENCY_KEYS = Object.keys(CURRENCIES) as CurrencyKey[];

export function RoiSimulator() {
  const { t } = useI18n();
  const [inputs, setInputs] = useState<RoiInputs>(DEFAULT_INPUTS);
  const [currency, setCurrency] = useState<CurrencyKey>("CHF");
  const [index, setIndex] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const result = useMemo(() => computeRoi(inputs), [inputs]);

  const go = (i: number) => {
    setIndex(i);
    setFurthest((f) => Math.max(f, i));
  };
  const restart = () => {
    setInputs(DEFAULT_INPUTS);
    setCurrency("CHF");
    setIndex(0);
    setFurthest(0);
  };
  const isResults = index >= RESULTS_INDEX;
  const screen = SCREENS[index];
  const groupScreens = isResults ? [] : SCREENS.filter((s) => s.group === screen.group);
  const posInGroup = isResults ? 0 : groupScreens.indexOf(screen) + 1;

  return (
    <div className="space-y-8 pb-24 lg:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-6">
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
        {!isResults && (
          <Button variant="link" onClick={() => go(RESULTS_INDEX)}>
            {t("roi.guide.skip")}
          </Button>
        )}
      </div>

      <StepGuide
        current={groupOf(index)}
        furthest={groupOf(furthest)}
        onSelect={(g) => go(firstScreenOfGroup(g))}
      />

      {isResults ? (
        <ResultsView
          result={result}
          inputs={inputs}
          currency={currency}
          onAdjust={() => go(0)}
          onRestart={restart}
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="p-6 sm:p-10">
            <p className="text-xs text-muted-foreground">
              {fill(t("roi.guide.position"), {
                group: t(`roi.guide.${["organisation", "programme", "baseline"][screen.group]}`),
                n: posInGroup,
                total: groupScreens.length,
              })}
            </p>
            <div className="mt-4" key={screen.id}>
              <QuestionScreen
                screen={screen.id}
                inputs={inputs}
                result={result}
                currency={currency}
                onField={(k, v) => setInputs((s) => ({ ...s, [k]: v }))}
                onProgramme={(p) =>
                  setInputs((s) => ({
                    ...s,
                    programme: p,
                    costPer: Math.round(PROGRAMMES[p].cost * CURRENCIES[currency].rate),
                    duration: PROGRAMMES[p].months,
                  }))
                }
                onInternalTime={(v) => setInputs((s) => ({ ...s, internalTime: v }))}
              />
            </div>
            <div className="mt-10 flex justify-between gap-3 border-t border-border pt-6">
              <Button variant="outline" size="lg" onClick={() => go(index - 1)} disabled={index === 0}>
                ← {t("roi.steps.back")}
              </Button>
              <Button size="lg" onClick={() => go(index + 1)}>
                {index === RESULTS_INDEX - 1 ? t("roi.steps.seeCase") : t("roi.steps.next")} →
              </Button>
            </div>
          </Card>
          <div className="lg:sticky lg:top-6 lg:self-start">
            <ResultBar result={result} currency={currency} />
          </div>
        </div>
      )}
    </div>
  );
}
