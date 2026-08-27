/**
 * Public certificate verification and print page (/verify/certificate/$token).
 *
 * The token is the credential and the page is the document: a verifier scans
 * the printed QR and lands here, and the holder prints from here. Nothing
 * beyond the presentation facts the database routine returns is shown — no
 * email address, no member number, no other event data.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, Logo } from "@/design-system/icf-welcome-design-system-a835df";
import { SiteFooter, SiteHeaderBar } from "@/components/site-chrome";
import { getCertificate } from "@/lib/certificates.functions";
import type { CertificateView } from "@/lib/certificates.server";
import {
  CERTIFICATE_LOCALES,
  certificateCopy,
  fillCopy,
  type CertificateCopy,
} from "@/lib/certificate-copy";
import { LOCALE_ORDER, type Locale } from "@/i18n/config";

export const Route = createFileRoute("/verify/certificate/$token")({
  loader: async ({ params }) => ({
    certificate: await getCertificate({ data: { token: params.token } }).catch(() => null),
  }),
  head: () => {
    const title = "Verify a certificate — The Switzerland Chapter of ICF";
    const description =
      "Check that a certificate of completion issued by The Switzerland Chapter of ICF is genuine, and print your own copy.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  errorComponent: () => <VerifyPage certificate={null} token="" />,
  component: VerifyRoute,
});

function VerifyRoute() {
  const { certificate } = Route.useLoaderData();
  const { token } = Route.useParams();
  return <VerifyPage certificate={certificate} token={token} />;
}

function formatDate(date: string, locale: Locale) {
  const tags: Record<Locale, string> = {
    en: "en-CH",
    de: "de-CH",
    fr: "fr-CH",
    it: "it-CH",
  };
  return new Intl.DateTimeFormat(tags[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function VerifyPage({
  certificate,
  token,
}: {
  certificate: CertificateView | null;
  token: string;
}) {
  const initial = (certificate?.locale ?? "en") as string;
  const [locale, setLocale] = useState<Locale>(
    (CERTIFICATE_LOCALES as readonly string[]).includes(initial) ? (initial as Locale) : "en",
  );
  const copy = certificateCopy(locale);

  if (!certificate || certificate.status === "revoked") {
    const revoked = certificate?.status === "revoked";
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeaderBar compact standalone />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {revoked ? copy.revokedTitle : copy.unknownTitle}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {revoked ? copy.revokedBody : copy.unknownBody}
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const hours: string[] = [];
  if (certificate.cc_hours) {
    hours.push(fillCopy(copy.ccHours, { hours: Number(certificate.cc_hours).toFixed(2) }));
  }
  if (certificate.rd_hours) {
    hours.push(fillCopy(copy.rdHours, { hours: Number(certificate.rd_hours).toFixed(2) }));
  }

  return (
    <div className="flex min-h-screen flex-col bg-background print:bg-white">
      <div className="print:hidden">
        <SiteHeaderBar compact standalone />
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 print:max-w-none print:px-0 print:py-0">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <LanguagePicker copy={copy} locale={locale} onChange={setLocale} />
          <Button size="pill" onClick={() => window.print()}>
            {copy.print}
          </Button>
        </div>

        <CertificateSheet
          copy={copy}
          locale={locale}
          token={token}
          certificate={certificate}
          hours={hours}
        />
      </main>

      <div className="print:hidden">
        <SiteFooter />
      </div>
    </div>
  );
}

function LanguagePicker({
  copy,
  locale,
  onChange,
}: {
  copy: CertificateCopy;
  locale: Locale;
  onChange: (next: Locale) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{copy.languageLabel}</span>
      <div className="flex gap-1">
        {LOCALE_ORDER.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            aria-current={code === locale ? "true" : undefined}
            className={
              code === locale
                ? "min-h-11 rounded-full bg-primary px-3 text-xs font-semibold uppercase text-primary-foreground"
                : "min-h-11 rounded-full border border-border px-3 text-xs font-semibold uppercase hover:bg-secondary"
            }
          >
            {code}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A4 portrait sheet. Print styles keep it to a single page. */
function CertificateSheet({
  copy,
  locale,
  token,
  certificate,
  hours,
}: {
  copy: CertificateCopy;
  locale: Locale;
  token: string;
  certificate: Extract<CertificateView, { status: "issued" }>;
  hours: string[];
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card print:rounded-none print:border-0">
      <header className="bg-hero px-10 py-8 text-hero-foreground">
        <Logo orientation="vertical" tone="negative" className="h-20 w-auto" />
        <p className="eyebrow eyebrow-accent mt-6">{copy.eyebrow}</p>
      </header>

      <div className="px-10 py-10">
        <h1 className="font-heading text-4xl leading-tight text-primary">{copy.title}</h1>
        <p className="mt-3 text-muted-foreground">{copy.intro}</p>

        <p className="eyebrow mt-10 text-muted-foreground">{copy.holderLabel}</p>
        <p className="font-heading text-3xl text-foreground">{certificate.holder_name}</p>

        <p className="eyebrow mt-8 text-muted-foreground">{copy.eventLabel}</p>
        <p className="text-lg font-semibold">{certificate.event_title_snapshot}</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="eyebrow text-muted-foreground">{copy.dateLabel}</p>
            <p className="font-semibold">{formatDate(certificate.completed_on, locale)}</p>
          </div>
          <div>
            <p className="eyebrow text-muted-foreground">{copy.serialLabel}</p>
            <p className="font-semibold">{certificate.serial}</p>
          </div>
          <div>
            <p className="eyebrow text-muted-foreground">{copy.hoursLabel}</p>
            <p className="font-semibold">
              {hours.length > 0 ? hours.join(" · ") : copy.attendanceOnly}
            </p>
          </div>
          <div>
            <p className="eyebrow text-muted-foreground">{copy.issuerLabel}</p>
            <p className="font-semibold">{copy.issuer}</p>
          </div>
        </div>

        <div className="mt-10 flex items-end justify-between gap-6 border-t border-border pt-6">
          <p className="max-w-xs text-xs text-muted-foreground">{copy.verifyNote}</p>
          <img
            src={`/api/public/certificate-qr/${token}.png`}
            alt=""
            aria-hidden
            width={112}
            height={112}
            className="size-28"
          />
        </div>
      </div>
    </article>
  );
}
