/**
 * Shown on /find-a-coach when every Coach Finder mode is switched off in the
 * CMS. Replaces the filters and the results grid so visitors get an honest
 * explanation plus a look at the hard-coded demo profile, instead of an empty
 * search that still lists real coaches.
 */
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/icf-welcome-design-system-a835df";
import { LocaleLink, useI18n } from "@/i18n";
import { DEMO_PROFILE_ID } from "@/lib/demo-coach";

export function CoachFinderInactive() {
  const { t } = useI18n();
  return (
    <section className="bg-card py-16">
      <div className="mx-auto max-w-3xl px-8">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>{t("directory.inactive.title")}</CardTitle>
            <CardDescription>{t("directory.inactive.body")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button asChild variant="pill" size="pill">
              <LocaleLink to={`/coach/${DEMO_PROFILE_ID}`}>
                {t("directory.inactive.cta")}
              </LocaleLink>
            </Button>
            <CardDescription>{t("directory.inactive.contact")}</CardDescription>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
