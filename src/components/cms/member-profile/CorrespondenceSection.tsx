/**
 * Member Area — correspondence language.
 *
 * Distinct from the coaching languages above: this is the language the chapter
 * uses when writing to the member. Stored on the member record, not the public
 * directory profile, and never shown publicly.
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/icf-welcome-design-system-a835df";
import { LOCALE_ORDER } from "@/i18n/config";
import { Section } from "./shared";

const LOCALE_LABELS: Record<string, string> = {
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  en: "English",
};

/** Radix has no empty-string option value, so "none" stands for no preference. */
const NONE = "none";

export function CorrespondenceSection({
  t,
  value,
  onChange,
}: {
  t: (key: string) => string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Section title={t("member.correspondenceTitle")} note={t("member.correspondenceNote")}>
      <div className="mt-3 max-w-xs">
        <Select value={value || NONE} onValueChange={(next) => onChange(next === NONE ? "" : next)}>
          <SelectTrigger aria-label={t("member.correspondenceTitle")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("member.correspondenceNone")}</SelectItem>
            {LOCALE_ORDER.map((locale) => (
              <SelectItem key={locale} value={locale}>
                {LOCALE_LABELS[locale] ?? locale.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Section>
  );
}
