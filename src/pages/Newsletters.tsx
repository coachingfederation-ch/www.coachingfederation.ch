/**
 * Public newsletter archive listing.
 * Exports: NewslettersPage (default). Rendered by src/routes/newsletters.index.tsx
 * and the locale-prefixed equivalent.
 *
 * Reads through the browser client: RLS exposes published editions only, so
 * there is nothing to filter for here beyond ordering.
 */
import { useQuery } from "@tanstack/react-query";
import { CompactHero, SiteFooter, CARD_SHADOW } from "@/components/site-chrome";
import { supabase } from "@/integrations/supabase/client";
import { LocaleLink, useI18n } from "@/i18n";
import { formatIssueDate } from "@/lib/newsletters";

/** Page copy kept local: four short strings, no locale-file churn. */
const COPY = {
  en: { eyebrow: "Chapter newsletter", title: "Newsletter archive", lede: "Every monthly edition of our chapter newsletter, in one place.", empty: "No editions have been published yet.", loading: "Loading…", notFound: "This edition is not available.", back: "Back to the archive" },
  de: { eyebrow: "Chapter-Newsletter", title: "Newsletter-Archiv", lede: "Alle monatlichen Ausgaben unseres Chapter-Newsletters an einem Ort.", empty: "Es wurden noch keine Ausgaben veröffentlicht.", loading: "Wird geladen…", notFound: "Diese Ausgabe ist nicht verfügbar.", back: "Zurück zum Archiv" },
  fr: { eyebrow: "Newsletter du chapitre", title: "Archives de la newsletter", lede: "Toutes les éditions mensuelles de notre newsletter, au même endroit.", empty: "Aucune édition n'a encore été publiée.", loading: "Chargement…", notFound: "Cette édition n'est pas disponible.", back: "Retour aux archives" },
  it: { eyebrow: "Newsletter del chapter", title: "Archivio della newsletter", lede: "Tutte le edizioni mensili della nostra newsletter, in un unico posto.", empty: "Non è ancora stata pubblicata nessuna edizione.", loading: "Caricamento…", notFound: "Questa edizione non è disponibile.", back: "Torna all'archivio" },
} as const;


interface ArchiveRow {
  id: string;
  slug: string;
  title: string;
  issue_date: string;
  published_at: string | null;
}

async function fetchEditions(): Promise<ArchiveRow[]> {
  const { data, error } = await supabase
    .from("newsletters")
    .select("id, slug, title, issue_date, published_at")
    .eq("status", "published")
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ArchiveRow[];
}

export default function NewslettersPage() {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const { data, isLoading } = useQuery({ queryKey: ["newsletter-archive"], queryFn: fetchEditions });

  return (
    <>
      <CompactHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        lede={copy.lede}
      />
      <main id="main" className="bg-background">
        <div className="mx-auto max-w-4xl px-6 py-16">
          {isLoading ? (
            <p className="text-muted-foreground">{copy.loading}</p>
          ) : !data?.length ? (
            <p className="text-muted-foreground">{copy.empty}</p>
          ) : (
            <ul className="space-y-4">
              {data.map((edition) => (
                <li key={edition.id}>
                  <LocaleLink
                    to={`/newsletters/${edition.slug}`}
                    className={
                      "flex items-center justify-between gap-4 rounded-3xl border border-border bg-card px-6 py-5 transition-colors hover:bg-secondary/60 " +
                      CARD_SHADOW
                    }
                  >
                    <span className="min-w-0">
                      <span className="block font-heading text-lg text-foreground">
                        {edition.title}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {formatIssueDate(edition.issue_date, locale)}
                      </span>
                    </span>
                    <span aria-hidden className="text-primary">
                      →
                    </span>
                  </LocaleLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
