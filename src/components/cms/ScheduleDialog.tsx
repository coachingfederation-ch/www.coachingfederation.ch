/**
 * Article scheduling dialog (staff CMS).
 *
 * Replaces the former `window.prompt` scheduler: a calendar plus a 15-minute
 * time picker, quick presets, and one plain-language confirmation line. The
 * picked moment is always interpreted in the chapter's time zone
 * (Europe/Zurich) and converted to UTC exactly once, at confirm — the old
 * prompt mixed a UTC default with local parsing and shifted the schedule.
 */
import { useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import {
  Button,
  Calendar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/icf-welcome-design-system-a835df";

const TZ = "Europe/Zurich";

/** Calendar-day parts of a timestamp, as seen in the chapter's time zone. */
type Parts = { year: number; month: number; day: number; hour: number; minute: number };

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function zonedParts(date: Date): Parts & { second: number } {
  const map: Record<string, number> = {};
  for (const part of partsFormatter.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = Number(part.value);
  }
  return {
    year: map.year!,
    month: map.month!,
    day: map.day!,
    hour: map.hour! % 24,
    minute: map.minute!,
    second: map.second!,
  };
}

/** Offset of the chapter time zone at a given instant, in milliseconds. */
function zoneOffset(ts: number): number {
  const p = zonedParts(new Date(ts));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ts;
}

/** Turn a wall-clock moment in the chapter time zone into a real instant. */
function zonedToUtc({ year, month, day, hour, minute }: Parts): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let ts = guess - zoneOffset(guess);
  ts = guess - zoneOffset(ts);
  return new Date(ts);
}

/** "09:00" style options in 15-minute steps. */
const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** A local (non-UTC) Date carrying only the calendar day the picker shows. */
function dayFromParts(p: Parts) {
  return new Date(p.year, p.month - 1, p.day);
}

function roundUpToQuarter(date: Date): Parts {
  const p = zonedParts(date);
  let minute = Math.ceil(p.minute / 15) * 15;
  let hour = p.hour;
  if (minute === 60) {
    minute = 0;
    hour += 1;
  }
  if (hour === 24) {
    const next = zonedParts(new Date(date.getTime() + 24 * 3600_000));
    return { year: next.year, month: next.month, day: next.day, hour: 0, minute: 0 };
  }
  return { year: p.year, month: p.month, day: p.day, hour, minute };
}

export function ScheduleDialog({
  open,
  onOpenChange,
  currentScheduledAt,
  onConfirm,
  locale,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing schedule, when the article is already scheduled. */
  currentScheduledAt: string | null;
  onConfirm: (isoUtc: string) => void | Promise<void>;
  locale: string;
  t: (key: string) => string;
}) {
  const initial = useMemo<Parts>(() => {
    const base = currentScheduledAt
      ? new Date(currentScheduledAt)
      : new Date(Date.now() + 3600_000);
    const valid = isNaN(base.getTime()) ? new Date(Date.now() + 3600_000) : base;
    return roundUpToQuarter(valid);
  }, [currentScheduledAt]);

  const [day, setDay] = useState<Date | undefined>(() => dayFromParts(initial));
  const [time, setTime] = useState(() => `${pad(initial.hour)}:${pad(initial.minute)}`);
  const [busy, setBusy] = useState(false);

  const today = useMemo(() => {
    const p = zonedParts(new Date());
    return dayFromParts(p);
  }, []);

  const picked = useMemo(() => {
    if (!day) return null;
    const [hour, minute] = time.split(":").map(Number);
    return zonedToUtc({
      year: day.getFullYear(),
      month: day.getMonth() + 1,
      day: day.getDate(),
      hour: hour ?? 0,
      minute: minute ?? 0,
    });
  }, [day, time]);

  const isFuture = !!picked && picked.getTime() > Date.now();

  // Times already gone are not offered when the chosen day is today.
  const options = useMemo(() => {
    if (!day || day.getTime() !== today.getTime()) return TIME_OPTIONS;
    const now = zonedParts(new Date());
    const nowMinutes = now.hour * 60 + now.minute;
    return TIME_OPTIONS.filter((option) => {
      const [h, m] = option.split(":").map(Number);
      return h! * 60 + m! > nowMinutes;
    });
  }, [day, today]);

  const sentence = useMemo(() => {
    if (!picked || !isFuture) return null;
    const date = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: TZ,
    }).format(picked);
    const clock = new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: TZ,
    }).format(picked);
    const diffMinutes = Math.round((picked.getTime() - Date.now()) / 60_000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const relative =
      diffMinutes < 60
        ? rtf.format(diffMinutes, "minute")
        : diffMinutes < 60 * 24
          ? rtf.format(Math.round(diffMinutes / 60), "hour")
          : rtf.format(Math.round(diffMinutes / (60 * 24)), "day");
    return `${t("editor.scheduleDialog.goesLive")} ${date}, ${clock} (${t("editor.scheduleDialog.zurich")}) — ${relative}.`;
  }, [picked, isFuture, locale, t]);

  const applyPreset = (target: Date) => {
    const p = roundUpToQuarter(target);
    setDay(dayFromParts(p));
    setTime(`${pad(p.hour)}:${pad(p.minute)}`);
  };

  const presetAt = (daysAhead: number, hour: number) => {
    const now = zonedParts(new Date());
    return zonedToUtc({
      year: now.year,
      month: now.month,
      day: now.day + daysAhead,
      hour,
      minute: 0,
    });
  };

  const nextMondayOffset = () => {
    const weekday = dayFromParts(zonedParts(new Date())).getDay(); // 0 = Sunday
    return ((8 - weekday) % 7 || 7) as number;
  };

  const confirm = async () => {
    if (!picked || !isFuture) return;
    setBusy(true);
    try {
      await onConfirm(picked.toISOString());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editor.scheduleDialog.title")}</DialogTitle>
          <DialogDescription>{t("editor.scheduleDialog.lede")}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={day}
            onSelect={setDay}
            disabled={{ before: today }}
            defaultMonth={day}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{t("editor.scheduleDialog.timeLabel")}</span>
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t("editor.scheduleDialog.quickLabel")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyPreset(new Date(Date.now() + 3600_000))}
          >
            {t("editor.scheduleDialog.inAnHour")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset(presetAt(1, 9))}>
            {t("editor.scheduleDialog.tomorrowMorning")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyPreset(presetAt(nextMondayOffset(), 9))}
          >
            {t("editor.scheduleDialog.nextMonday")}
          </Button>
        </div>

        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{sentence ?? t("editor.scheduleDialog.pickFuture")}</span>
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("editor.scheduleDialog.cancel")}
          </Button>
          <Button onClick={confirm} disabled={!isFuture || busy}>
            {currentScheduledAt
              ? t("editor.scheduleDialog.update")
              : t("editor.scheduleDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
