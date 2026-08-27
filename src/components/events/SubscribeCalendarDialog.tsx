/**
 * "Subscribe to calendar" for the events listing.
 *
 * Hands out the public feed at `/api/public/events-feed.ics` as three things a
 * calendar client understands: a Google "add by URL" link, a `webcal://` link
 * for Apple and Outlook, and the raw URL to paste anywhere else. The feed keeps
 * updating on its own, so this is a one-time action for the visitor.
 */
import { useState } from "react";
import { CalendarPlus, Check, Link2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
} from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";
import { SITE_URL } from "@/i18n/config";

export type FeedFilters = {
  community?: string;
  category?: string;
  region?: string;
  lang?: string;
};

function feedUrl(filters: FeedFilters) {
  const params = new URLSearchParams();
  for (const key of ["community", "category", "region", "lang"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return `${SITE_URL}/api/public/events-feed.ics${query ? `?${query}` : ""}`;
}

export function SubscribeCalendarDialog({ filters }: { filters: FeedFilters }) {
  const { t } = useI18n();
  const [filtered, setFiltered] = useState(true);
  const [copied, setCopied] = useState(false);

  const hasFilters = Boolean(
    filters.community || filters.category || filters.region || filters.lang,
  );
  const url = feedUrl(hasFilters && filtered ? filters : {});
  const webcal = url.replace(/^https?:\/\//, "webcal://");
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;

  const copy = async () => {
    if (!navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the URL stays visible and selectable */
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarPlus aria-hidden />
          {t("events.subscribe.action")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("events.subscribe.title")}</DialogTitle>
          <DialogDescription>{t("events.subscribe.lede")}</DialogDescription>
        </DialogHeader>

        {hasFilters ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={filtered ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltered(true)}
            >
              {t("events.subscribe.scopeFiltered")}
            </Button>
            <Button
              type="button"
              variant={filtered ? "outline" : "default"}
              size="sm"
              onClick={() => setFiltered(false)}
            >
              {t("events.subscribe.scopeAll")}
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a href={google} target="_blank" rel="noopener noreferrer">
              {t("events.subscribe.google")}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={webcal}>{t("events.subscribe.webcal")}</a>
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">{t("events.subscribe.urlLabel")}</p>
          <div className="flex gap-2">
            <Input readOnly value={url} aria-label={t("events.subscribe.urlLabel")} />
            <Button type="button" variant="outline" onClick={copy}>
              {copied ? <Check aria-hidden /> : <Link2 aria-hidden />}
              {copied ? t("events.subscribe.copied") : t("events.subscribe.copy")}
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{t("events.subscribe.note")}</p>
      </DialogContent>
    </Dialog>
  );
}
