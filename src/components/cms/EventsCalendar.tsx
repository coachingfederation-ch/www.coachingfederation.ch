/**
 * Month calendar for the staff events list. Purely presentational: it receives
 * the rows the list has already filtered, so both views always agree.
 * Days are keyed in each event's own timezone (default Europe/Zurich) so an
 * evening event never slides onto the next day.
 */
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";

export type CalendarEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string | null;
  location_mode: string;
  venue_name: string | null;
  city: string | null;
  category_id: string | null;
  category_name: string | null;
  community_name: string | null;
  statusLabel: string;
};

type Props = {
  events: CalendarEvent[];
  month: string; // YYYY-MM
  onMonthChange: (month: string) => void;
  onOpen: (id: string) => void;
  t: (key: string) => string;
  passedHidden: boolean;
  onShowPassed: () => void;
};

const DOTS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];
const DAY_MS = 86_400_000;

function dayKey(iso: string | Date, tz: string) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function currentMonth() {
  return dayKey(new Date(), "Europe/Zurich").slice(0, 7);
}

export function EventsCalendar({
  events,
  month,
  onMonthChange,
  onOpen,
  t,
  passedHidden,
  onShowPassed,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const today = dayKey(new Date(), "Europe/Zurich");

  const categoryDot = useMemo(() => {
    const ids = [...new Set(events.map((e) => e.category_id ?? ""))].sort();
    return (id: string | null) => DOTS[ids.indexOf(id ?? "") % DOTS.length];
  }, [events]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const tz = e.timezone ?? "Europe/Zurich";
      const startKey = dayKey(e.starts_at, tz);
      const endKey = e.ends_at ? dayKey(e.ends_at, tz) : startKey;
      // Multi-day events appear on every day they span (capped at 60 days).
      let cursor = new Date(`${startKey}T12:00:00Z`).getTime();
      const end = new Date(`${endKey}T12:00:00Z`).getTime();
      for (let i = 0; cursor <= end && i < 60; i++, cursor += DAY_MS) {
        const key = new Date(cursor).toISOString().slice(0, 10);
        const list = map.get(key) ?? [];
        list.push(e);
        map.set(key, list);
      }
    }
    return map;
  }, [events]);

  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
    ),
  ];
  while (cells.length % 7) cells.push(null);

  const monthLabel = first.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(undefined, {
      weekday: "short",
      timeZone: "UTC",
    }),
  );

  const place = (e: CalendarEvent) =>
    e.location_mode === "online" || !e.city ? t("events.onlineLabel") : e.city;
  const time = (e: CalendarEvent) =>
    new Date(e.starts_at).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: e.timezone ?? "Europe/Zurich",
    });

  const selectedEvents = selected ? (byDay.get(selected) ?? []) : [];

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t("events.calendar.previous")}
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border hover:bg-secondary/60"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(currentMonth())}
            className="inline-flex h-11 items-center rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary/60"
          >
            {t("events.calendar.today")}
          </button>
          <button
            type="button"
            aria-label={t("events.calendar.next")}
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border hover:bg-secondary/60"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {weekdays.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((key, i) => {
          if (!key) return <div key={`empty-${i}`} />;
          const list = byDay.get(key) ?? [];
          const isToday = key === today;
          const isSelected = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(isSelected ? null : key)}
              aria-pressed={isSelected}
              aria-label={`${key}: ${list.length}`}
              className={`flex min-h-16 flex-col items-stretch gap-1 rounded-lg border p-1.5 text-left align-top md:min-h-28 ${
                list.length ? "border-border bg-highlight/20" : "border-border/60 bg-background"
              } ${isToday ? "ring-2 ring-ring" : ""} ${isSelected ? "border-primary" : ""}`}
            >
              <span className={`text-xs font-semibold ${list.length ? "" : "text-muted-foreground"}`}>
                {Number(key.slice(8))}
              </span>
              {/* Small screens: dots only */}
              <span className="flex flex-wrap gap-1 md:hidden">
                {list.slice(0, 4).map((e) => (
                  <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${categoryDot(e.category_id)}`} />
                ))}
              </span>
              <span className="hidden flex-col gap-1 md:flex">
                {list.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className="block truncate rounded-md bg-card px-1.5 py-0.5 text-[11px] leading-tight"
                    title={`${time(e)} ${e.title} · ${e.category_name ?? ""} · ${place(e)}`}
                  >
                    <span
                      className={`mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle ${categoryDot(e.category_id)}`}
                    />
                    <span className="font-semibold">{time(e)}</span> {e.title}
                    <span className="block truncate text-muted-foreground">{place(e)}</span>
                  </span>
                ))}
                {list.length > 3 ? (
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {t("events.calendar.more").replace("{count}", String(list.length - 3))}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {passedHidden ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("events.calendar.passedHidden")}{" "}
          <button
            type="button"
            onClick={onShowPassed}
            className="font-semibold text-primary hover:opacity-80"
          >
            {t("events.calendar.showPassed")}
          </button>
        </p>
      ) : null}

      {selected ? (
        <div className="mt-4 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">
            {new Date(`${selected}T12:00:00Z`).toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            })}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("events.calendar.noEvents")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {selectedEvents.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(e.id)}
                    className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 py-2 text-left text-sm hover:bg-secondary/40"
                  >
                    <span className="font-semibold">{time(e)}</span>
                    <span className="font-medium">{e.title}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <span className={`h-1.5 w-1.5 rounded-full ${categoryDot(e.category_id)}`} />
                      {e.category_name ?? "—"}
                    </span>
                    {e.community_name ? (
                      <span className="text-xs text-muted-foreground">{e.community_name}</span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {[e.venue_name, place(e)].filter(Boolean).join(", ")}
                    </span>
                    <span className="text-xs text-muted-foreground">{e.statusLabel}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
