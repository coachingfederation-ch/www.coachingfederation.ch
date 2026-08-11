/**
 * True-to-life render of the public event hero for the CMS hero designer.
 * Exports: EventHeroPreview.
 *
 * It renders the very same EventHeroSurface the public page uses, fed from the
 * record being edited, so hand-placed brush marks land where visitors see them.
 */
import { CalendarDays, Clock, Languages, MapPin, Users } from "lucide-react";
import { EventHeroSurface, type EventHeroMetaItem } from "@/components/events/EventHeroSurface";
import { useI18n } from "@/i18n";
import { formatEventDate, formatEventTimeRange, eventPlace } from "@/lib/events";

export type EventHeroPreviewData = {
  title: string | null;
  summary: string | null;
  image_url: string | null;
  image_credit_name?: string | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone?: string | null;
  language?: string | null;
  location_mode: "in_person" | "online" | "hybrid" | null;
  venue_name?: string | null;
  city?: string | null;
  capacity?: number | null;
};

export function EventHeroPreview({
  event,
  pills,
  untitledLabel,
}: {
  event: EventHeroPreviewData;
  /** Category / region labels, already resolved to the CMS language. */
  pills: string[];
  untitledLabel: string;
}) {
  const { t, locale } = useI18n();
  const tz = event.timezone ?? "Europe/Zurich";

  const meta: EventHeroMetaItem[] = [];
  if (event.starts_at) {
    meta.push({
      id: "date",
      icon: CalendarDays,
      label: formatEventDate(event.starts_at, locale, tz),
    });
    meta.push({
      id: "time",
      icon: Clock,
      label: formatEventTimeRange(event.starts_at, event.ends_at, locale, tz),
    });
  }
  meta.push({
    id: "place",
    icon: MapPin,
    label: eventPlace(
      {
        location_mode: event.location_mode,
        venue_name: event.venue_name ?? null,
        city: event.city ?? null,
      },
      t("events.tag.online"),
    ),
  });
  meta.push({
    id: "language",
    icon: Languages,
    label: t(`common.languageNames.${event.language ?? "en"}`),
  });
  if (event.capacity) {
    meta.push({
      id: "seats",
      icon: Users,
      label: t("events.detail.seatsLeft").replace("{n}", String(event.capacity)),
    });
  }

  return (
    <EventHeroSurface
      title={event.title || untitledLabel}
      summary={event.summary}
      imageUrl={event.image_url}
      meta={meta}
      pills={pills}
      back={
        <span className="btn-mono !text-hero-foreground/70">← {t("events.detail.backToEvents")}</span>
      }
      credit={
        event.image_url && event.image_credit_name ? (
          <p className="text-xs text-hero-foreground/60">
            {t("events.detail.photoCredit").replace("{name}", event.image_credit_name)}
          </p>
        ) : null
      }
    />
  );
}
