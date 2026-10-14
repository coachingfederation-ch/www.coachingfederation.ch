/**
 * Public (signed-out) face of /advertise: what can be booked and one CTA.
 * Prices are not shown here — they are derived per advertiser after sign-in.
 */
import { Link } from "@tanstack/react-router";
import { Button, Card, CardContent } from "@/design-system/icf-welcome-design-system-a835df";
import { useCms } from "@/i18n/cms";
import { SiteFooter, SiteHeaderBar } from "@/components/site-chrome";

const OFFERS = ["partner_package", "eannouncement", "school"] as const;

export function AdvertiseLanding() {
  const { t } = useCms();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-hero text-hero-foreground">
        <SiteHeaderBar compact />
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-10">
          <p className="eyebrow eyebrow-accent">{t("advertiser.landing.eyebrow")}</p>
          <h1 className="mt-3 max-w-3xl font-heading text-4xl md:text-5xl">
            {t("advertiser.landing.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-lg">{t("advertiser.landing.intro")}</p>
          <div className="mt-8">
            <Button asChild variant="inverse" size="pill">
              <Link to="/advertise/sign-in">{t("advertiser.landing.cta")}</Link>
            </Button>
          </div>
        </section>
      </div>
      <main id="main" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-heading text-3xl">{t("advertiser.landing.offersTitle")}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {OFFERS.map((o) => (
            <Card key={o}>
              <CardContent className="py-6">
                <h3 className="font-heading text-xl">{t(`advertise.offer.${o}`)}</h3>
                <p className="mt-2 text-muted-foreground">{t(`advertiser.landing.offer.${o}`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-10 text-muted-foreground">
          {t("advertiser.landing.memberNote")}{" "}
          <Link to="/auth" search={{ next: "/advertise" }} className="font-semibold text-primary">
            {t("advertiser.landing.memberLink")}
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
