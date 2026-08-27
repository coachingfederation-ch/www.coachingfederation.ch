/**
 * Governance documents section for the About page. Lists key chapter
 * governance links such as AGM, Code of Ethics, DEIB statement, charter
 * status and annual report.
 */
import { ArrowRight, ExternalLink } from "lucide-react";
import { LocaleLink, useI18n } from "@/i18n";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";

const GOVERNANCE_URLS: Record<string, string> = {
  "Annual General Meeting (AGM)":
    "https://coachingfederation.org/about/icf-membership/chapter-membership",
  "Code of Ethics": "https://coachingfederation.org/ethics/code-of-ethics",
  "DEIB Commitment Statement": "https://coachingfederation.org/about/diversity-equity-inclusion",
  "ICF Global Charter Chapter status": "https://coachingfederation.org/chapters",
  "Annual Report / Impact Review": "https://coachingfederation.org/about/annual-report",
};

export function Governance() {
  const { t, tList } = useI18n();
  const documents = tList<{ title: string; desc: string }>("about.governance.documents");

  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-8">
        <p className="eyebrow">{t("about.governance.eyebrow")}</p>
        <h2 className="mt-3 max-w-2xl display-lg">{t("about.governance.title")}</h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {t("about.governance.lede")}
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => {
            const url = GOVERNANCE_URLS[doc.title] ?? "#";
            return (
              <a
                key={doc.title}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-6 shadow-soft transition"
              >
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {doc.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{doc.desc}</p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  {t("about.governance.link")}
                  <ExternalLink className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </a>
            );
          })}
        </div>

        <div className="mt-10">
          {/* Light surface, so the design-system button applies as-is. */}
          <Button asChild variant="default" size="pill">
            <LocaleLink to="/governance">
              {t("governance.archiveCta")}
              <ArrowRight aria-hidden />
            </LocaleLink>
          </Button>
        </div>
      </div>
    </section>
  );
}
