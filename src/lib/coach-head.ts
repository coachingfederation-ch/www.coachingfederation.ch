/**
 * Helper to generate SEO meta tags and canonical links for coach profile pages.
 * Exports: coachHead. Called by coach profile routes.
 */
import { localizePath, SITE_URL, type Locale } from "@/i18n/config";
import { makeT } from "@/i18n";

type ProfileLike = {
  full_name: string | null;
  tagline: string | null;
  city: string | null;
  image_url?: string | null;
};

export function coachHead(
  loaderData: { profile: ProfileLike } | undefined,
  locale: Locale,
  profileId: string,
) {
  const { t } = makeT(locale);
  if (!loaderData) {
    return {
      meta: [
        { title: t("directory.detail.notFoundTitle") },
        { name: "robots", content: "noindex" },
      ],
    };
  }
  const p = loaderData.profile;
  const name = p.full_name ?? t("directory.detail.notFoundTitle");
  const title = `${name} — The Switzerland Chapter of ICF`;
  const description = p.tagline || t("directory.detail.metaFallback").replace("{name}", name);
  const url = `${SITE_URL}${localizePath(`/coach/${profileId}`, locale)}`;
  const image = p.image_url?.startsWith("https://") ? p.image_url : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    headline: title,
    mainEntity: {
      "@type": "Person",
      name,
      description,
      url,
      ...(image ? { image } : {}),
      ...(p.city ? { homeLocation: { "@type": "Place", name: p.city } } : {}),
    },
  };

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: url },
      ...(image
        ? [
            { property: "og:image", content: image },
            { name: "twitter:image", content: image },
          ]
        : []),
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
  };
}
