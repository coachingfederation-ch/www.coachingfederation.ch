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
import { blockImagePreset } from "@/lib/block-image";
import { AiPhoto } from "@/design-system/icf-welcome-design-system-a835df";
import { listActivePlacements, type PublicPlacement } from "@/lib/ads.functions";

/** Page copy kept local: four short strings, no locale-file churn. */
const COPY = {
  en: {
    eyebrow: "Chapter newsletter",
    title: "Newsletter archive",
    lede: "Every monthly edition of our chapter newsletter, in one place.",
    empty: "No editions have been published yet.",
    loading: "Loading…",
    notFound: "This edition is not available.",
    back: "Back to the archive",
    ad: "Ad",
  },
  de: {
    eyebrow: "Chapter-Newsletter",
    title: "Newsletter-Archiv",
    lede: "Alle monatlichen Ausgaben unseres Chapter-Newsletters an einem Ort.",
    empty: "Es wurden noch keine Ausgaben veröffentlicht.",
    loading: "Wird geladen…",
    notFound: "Diese Ausgabe ist nicht verfügbar.",
    back: "Zurück zum Archiv",
    ad: "Ad",
  },
  fr: {
    eyebrow: "Newsletter du chapitre",
    title: "Archives de la newsletter",
    lede: "Toutes les éditions mensuelles de notre newsletter, au même endroit.",
    empty: "Aucune édition n'a encore été publiée.",
    loading: "Chargement…",
    notFound: "Cette édition n'est pas disponible.",
    back: "Retour aux archives",
    ad: "Ad",
  },
  it: {
    eyebrow: "Newsletter del chapter",
    title: "Archivio della newsletter",
    lede: "Tutte le edizioni mensili della nostra newsletter, in un unico posto.",
    empty: "Non è ancora stata pubblicata nessuna edizione.",
    loading: "Caricamento…",
    notFound: "Questa edizione non è disponibile.",
    back: "Torna all'archivio",
    ad: "Ad",
  },
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
  image_aspect: string | null;
  /** Set on advertisement blocks that carry an approved placement. */
  ad_placement_id: string | null;
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
      "id, title, content, position, featured_image_url, image_alt, image_source, image_credit_name, image_credit_url, image_aspect, ad_placement_id",
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
  // Advertisement blocks render the advertiser's own live content, so the
  // placement is read separately and matched by id.
  const { data: placements } = useQuery({
    queryKey: ["ad-placements", "newsletter"],
    queryFn: () => listActivePlacements({ data: { placementType: "newsletter" } }),
    staleTime: 5 * 60 * 1000,
  });
  const placementById = new Map((placements ?? []).map((p) => [p.id, p]));

  if (isLoading) {
    return (
      <main id="main" className="bg-background">
        <div className="mx-auto max-w-3xl px-6 py-24 text-muted-foreground">{copy.loading}</div>
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
              {block.ad_placement_id && placementById.get(block.ad_placement_id) ? (
                <AdBlock
                  placement={placementById.get(block.ad_placement_id)!}
                  locale={locale}
                  adLabel={copy.ad}
                />
              ) : null}
              {block.featured_image_url ? (
                block.image_source === "ai" ? (
                  <AiPhoto
                    src={block.featured_image_url}
                    alt={block.image_alt ?? block.title}
                    width={blockImagePreset(block.image_aspect).width}
                    height={blockImagePreset(block.image_aspect).height}
                    className="mt-4 w-full rounded-2xl object-cover"
                  />
                ) : (
                  <figure className="mt-4">
                    <img
                      src={block.featured_image_url}
                      alt={block.image_alt ?? ""}
                      loading="lazy"
                      width={blockImagePreset(block.image_aspect).width}
                      height={blockImagePreset(block.image_aspect).height}
                      className="w-full rounded-2xl object-cover"
                    />

                    {block.image_credit_name ? (
                      <figcaption className="mt-2 text-xs text-muted-foreground">
                        Photo by{" "}
                        {block.image_credit_url ? (
                          <a
                            href={block.image_credit_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2"
                          >
                            {block.image_credit_name}
                          </a>
                        ) : (
                          block.image_credit_name
                        )}{" "}
                        on Unsplash
                      </figcaption>
                    ) : null}
                  </figure>
                )
              ) : null}
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

/**
 * An approved advertising placement inside a newsletter edition.
 *
 * The "Ad" label is not optional: paid placement is always disclosed, and the
 * link goes through the click-counter route rather than straight out.
 */
function AdBlock({
  placement,
  locale,
  adLabel,
}: {
  placement: PublicPlacement;
  locale: string;
  adLabel: string;
}) {
  const description =
    placement[`description_${locale}` as "description_en"] ?? placement.description_en ?? "";
  return (
    <aside className="mt-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="font-heading text-lg text-foreground">{placement.advertiser_name}</p>
        <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-accent-foreground">
          {adLabel}
        </span>
      </div>
      {placement.logoUrl ? (
        <img
          src={placement.logoUrl}
          alt=""
          loading="lazy"
          className="mt-4 max-h-24 w-auto object-contain"
        />
      ) : null}
      {description ? <p className="mt-3 text-muted-foreground">{description}</p> : null}
      {placement.cta_url ? (
        <a
          href={`/goto/${placement.id}`}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="mt-4 inline-block text-primary underline underline-offset-2"
        >
          {placement.cta_url.replace(/^https?:\/\//, "")}
        </a>
      ) : null}
    </aside>
  );
}
