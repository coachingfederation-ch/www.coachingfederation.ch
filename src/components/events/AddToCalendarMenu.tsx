/**
 * "Add to calendar" for a public event.
 *
 * Google and Microsoft take a deep link with the times in UTC; Apple and every
 * desktop client take the .ics file served by
 * `/api/public/event-calendar/<event-id>.ics`, which is built from the same
 * event row and carries the event's own timezone. Invite-only events never
 * leave through that public download, so for them the same file is built in
 * the browser from the event the viewer is already allowed to see.
 */
import { CalendarPlus } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";
import { localizePath, SITE_URL } from "@/i18n/config";
import {
  buildEventIcs,
  googleCalendarUrl,
  outlookCalendarUrl,
  type CalendarLinkInput,
} from "@/lib/event-calendar";
import { eventPlace, isInvitedMode, type PublicEvent } from "@/lib/events";

/** Markdown noise never belongs in a calendar description. */
function toPlainText(value: string | null | undefined, max = 400) {
  if (!value) return "";
  const text = value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function AddToCalendarMenu({
  event,
  className,
}: {
  event: PublicEvent;
  className?: string;
}) {
  const { t, locale } = useI18n();
  if (!event.id || !event.starts_at) return null;

  const eventUrl = `${SITE_URL}${localizePath(`/events/${event.slug}`, locale)}`;
  const place =
    event.location_mode === "online" ? event.online_url : eventPlace(event, t("events.tag.online"));

  const link: CalendarLinkInput = {
    title: event.title ?? "",
    details: [toPlainText(event.summary ?? event.description), eventUrl]
      .filter(Boolean)
      .join("\n\n"),
    location: place,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
  };

  let icsHref = `/api/public/event-calendar/${event.id}.ics?lang=${locale}`;
  if (isInvitedMode(event.registration_mode)) {
    try {
      const ics = buildEventIcs({
        // Same uid as the server-built file, so a re-download updates the entry.
        uid: `event-${event.id}@coachingfederation.ch`,
        sequence: 0,
        title: event.title ?? "",
        description: toPlainText(event.summary ?? event.description),
        timezone: event.timezone ?? "Europe/Zurich",
        startsAt: event.starts_at,
        endsAt: event.ends_at,
        location: place,
        url: eventUrl,
      });
      icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
    } catch {
      // Keep the public link; it answers "not found" rather than a broken file.
    }
  }

  const options = [
    { id: "google", label: t("events.detail.calendar.google"), href: googleCalendarUrl(link) },
    { id: "apple", label: t("events.detail.calendar.apple"), href: icsHref, download: true },
    { id: "outlook", label: t("events.detail.calendar.outlook"), href: outlookCalendarUrl(link) },
    {
      id: "office",
      label: t("events.detail.calendar.office365"),
      href: outlookCalendarUrl(link, "office"),
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <CalendarPlus aria-hidden />
          {t("events.detail.calendar.add")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option) => (
          <DropdownMenuItem key={option.id} asChild>
            <a
              href={option.href}
              {...(option.download
                ? { download: "event.ics" }
                : { target: "_blank", rel: "noopener noreferrer" })}
            >
              {option.label}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
