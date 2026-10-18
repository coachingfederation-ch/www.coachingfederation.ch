/**
 * Social sharing links and clipboard copy buttons for article pages.
 * Exports: ShareInline, ShareBlock. Rendered in the article detail layout.
 */
import { useState } from "react";
import { Linkedin, Mail, Link2, Check } from "lucide-react";
import { useI18n } from "@/i18n";

/** X (formerly Twitter) has no lucide glyph, so the mark is inlined. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function shareTargets(url: string, title: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    x: `https://x.com/intent/post?url=${u}&text=${t}`,
    email: `mailto:?subject=${t}&body=${t}%0A%0A${u}`,
  };
}

const ICON_BTN =
  "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Compact icon row used next to the article byline. */
export function ShareInline({ url, title }: { url: string; title: string }) {
  const { t } = useI18n();
  const links = shareTargets(url, title);
  return (
    <div className="flex items-center gap-2">
      <a
        href={links.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("insights.share.linkedin")}
        className={ICON_BTN}
      >
        <Linkedin className="h-4 w-4" />
      </a>
      <a
        href={links.x}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("insights.share.x")}
        className={ICON_BTN}
      >
        <XIcon className="h-4 w-4" />
      </a>
      <a
        href={links.email}
        target="_top"
        aria-label={t("insights.share.email")}
        className={ICON_BTN}
      >
        <Mail className="h-4 w-4" />
      </a>
    </div>
  );
}

const LABEL_BTN =
  "inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card";

/** Stronger closing block shown after the article body. */
export function ShareBlock({ url, title }: { url: string; title: string }) {
  const { t } = useI18n();
  const links = shareTargets(url, title);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the explicit share links remain available */
    }
  };

  return (
    <section className="mt-14 rounded-2xl border border-border/70 bg-card p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">{t("insights.share.title")}</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={links.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className={LABEL_BTN}
        >
          <Linkedin className="h-4 w-4" />
          {t("insights.share.linkedin")}
        </a>
        <a
          href={links.x}
          target="_blank"
          rel="noopener noreferrer"
          className={LABEL_BTN}
        >
          <XIcon className="h-4 w-4" />
          {t("insights.share.x")}
        </a>
        <a
          href={links.email}
          target="_top"
          className={LABEL_BTN}
        >
          <Mail className="h-4 w-4" />
          {t("insights.share.email")}
        </a>
        <button type="button" onClick={copy} className={LABEL_BTN}>
          {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          {copied ? t("insights.share.copied") : t("insights.share.copy")}
        </button>
      </div>
    </section>
  );
}
