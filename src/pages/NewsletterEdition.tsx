/**
 * Public single newsletter edition.
 * Exports: NewsletterEditionPage (default). Renders the enabled blocks of a
 * published edition in order; RLS hides everything else.
 */
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Markdown } from "@/components/markdown";
import { CompactHero, SiteFooter } from "@/components/site-chrome";
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


interface EditionBlock {
  id: string;
  title: string;
  content: string;
  position: number;
  featured_image_url: string | null;
  image_alt: string | null;
  image_source: string | null;
  image_credit_name: string | null;
  image_credit_url: string | null;
}

async function fetchEdition(slug: string) {
  const { data, error } = await supabase
    .from("newsletters")
    .select("id, title, issue_date")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const edition = data as unknown as { id: string; title: string; issue_date: string };

  const { data: blocks, error: blockError } = await supabase
    .from("newsletter_blocks")
    .select(
      "id, title, content, position, featured_image_url, image_alt, image_source, image_credit_name, image_credit_url",
    )
    .eq("newsletter_id", edition.id)
    .eq("enabled", true)
    .order("position", { ascending: true });
  if (blockError) throw blockError;
  return { edition, blocks: (blocks ?? []) as unknown as EditionBlock[] };
}

export default function NewsletterEditionPage() {
  const params = useParams({ strict: false }) as { slug?: string };
  const slug = params.slug ?? "";
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const { data, isLoading } = useQuery({
    queryKey: ["newsletter-edition", slug],
    queryFn: () => fetchEdition(slug),
  });

  if (isLoading) {
    return (
      <main id="main" className="bg-background">
        <div className="mx-auto max-w-3xl px-6 py-24 text-muted-foreground">
          {copy.loading}
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <>
        <main id="main" className="bg-background">
          <div className="mx-auto max-w-3xl px-6 py-24">
            <p className="text-muted-foreground">{copy.notFound}</p>
            <LocaleLink to="/newsletters" className="text-primary underline">
              {copy.back}
            </LocaleLink>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <CompactHero
        eyebrow={formatIssueDate(data.edition.issue_date, locale)}
        title={data.edition.title}
        lede=""
      />
      <main id="main" className="bg-background">
        <div className="mx-auto max-w-3xl space-y-12 px-6 py-16">
          {data.blocks.map((block) => (
            <section key={block.id}>
              <h2 className="font-heading text-2xl text-foreground">{block.title}</h2>
              <div className="mt-3">
                <Markdown>{block.content}</Markdown>
              </div>
            </section>
          ))}
          <LocaleLink to="/newsletters" className="inline-block text-primary underline">
            {copy.back}
          </LocaleLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
