/**
 * Shown on /find-a-coach when every Coach Finder mode is switched off in the
 * CMS. Replaces the filters and the results grid so visitors get an honest
 * explanation plus a look at the hard-coded demo profile, instead of an empty
 * search that still lists real coaches.
 */
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import { LocaleLink, useI18n } from "@/i18n";
import { DEMO_PROFILE_ID } from "@/lib/demo-coach";

export function CoachFinderInactive() {
  const { t } = useI18n();
  return (
    <section className="bg-card py-16">
      <div className="mx-auto max-w-3xl px-8">
        <div className="rounded-3xl border border-border bg-background px-8 py-12 text-center sm:px-12">
          <h2 className="font-heading text-2xl tracking-tight text-foreground sm:text-3xl">
            {t("directory.inactive.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t("directory.inactive.body")}
          </p>
          <Button asChild variant="pill" size="pill" className="mt-8">
            <LocaleLink to={`/coach/${DEMO_PROFILE_ID}`}>{t("directory.inactive.cta")}</LocaleLink>
          </Button>
          <p className="mt-6 text-xs text-muted-foreground">{t("directory.inactive.contact")}</p>
        </div>
      </div>
    </section>
  );
}
