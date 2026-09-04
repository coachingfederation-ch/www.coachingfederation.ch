/**
 * Member Area — correspondence language.
 *
 * Distinct from the coaching languages above: this is the language the chapter
 * uses when writing to the member. Stored on the member record, not the public
 * directory profile, and never shown publicly.
 */
import { LOCALE_ORDER } from "@/i18n/config";
import { Section } from "./shared";

const LOCALE_LABELS: Record<string, string> = {
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  en: "English",
};

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
      <select
        id="correspondence-locale"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={t("member.correspondenceTitle")}
        className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="">{t("member.correspondenceNone")}</option>
        {LOCALE_ORDER.map((locale) => (
          <option key={locale} value={locale}>
            {LOCALE_LABELS[locale] ?? locale.toUpperCase()}
          </option>
        ))}
      </select>
    </Section>
  );
}
