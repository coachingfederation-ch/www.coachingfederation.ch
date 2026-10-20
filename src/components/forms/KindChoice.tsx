/** Registration vs follow-up choice, used when creating a form. */
import { RadioGroup, RadioGroupItem } from "@/design-system/icf-welcome-design-system-a835df";

type Kind = "registration" | "follow_up";

export function KindChoice({
  value,
  onChange,
  disableRegistration = false,
  t,
}: {
  value: Kind;
  onChange: (k: Kind) => void;
  disableRegistration?: boolean;
  t: (k: string) => string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{t("forms.kindQuestion")}</legend>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as Kind)} className="mt-2">
        <label className="flex items-start gap-2">
          <RadioGroupItem value="registration" disabled={disableRegistration} className="mt-1" />
          <span>
            <span className="block text-sm font-semibold">
              {t("events.forms.kindRegistration")}
            </span>
            <span className="block text-xs text-muted-foreground">
              {t("forms.kindRegistrationHint")}
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <RadioGroupItem value="follow_up" className="mt-1" />
          <span>
            <span className="block text-sm font-semibold">{t("events.forms.kindFollowUp")}</span>
            <span className="block text-xs text-muted-foreground">
              {t("forms.kindFollowUpHint")}
            </span>
          </span>
        </label>
      </RadioGroup>
    </fieldset>
  );
}
