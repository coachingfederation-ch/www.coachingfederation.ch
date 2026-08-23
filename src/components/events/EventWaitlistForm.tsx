/**
 * Waitlist sign-up for a full event or a sold-out ticket tier.
 *
 * A waitlist entry is not a registration and holds no seat: it is a request to
 * be told when a place frees up. The organizer decides who is invited, and the
 * invitation arrives by email with a single-use link.
 */
import { useState } from "react";
import { useI18n } from "@/i18n";
import { joinEventWaitlist } from "@/lib/waitlist.functions";

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

type Status = "idle" | "saving" | "done" | "already" | "closed" | "rate_limited" | "error";

export function EventWaitlistForm({
  eventId,
  tierId = null,
  soldOutTier = false,
  defaultName = "",
  defaultEmail = "",
}: {
  eventId: string;
  tierId?: string | null;
  /** Wording differs between "the event is full" and "this ticket is gone". */
  soldOutTier?: boolean;
  defaultName?: string;
  defaultEmail?: string;
}) {
  const { t, locale } = useI18n();
  const [fullName, setFullName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      const result = await joinEventWaitlist({
        data: { eventId, tierId, fullName, email, locale, note: note || null },
      });
      if (result.ok) {
        setStatus(result.alreadyOn ? "already" : "done");
        return;
      }
      setStatus(
        result.reason === "closed"
          ? "closed"
          : result.reason === "rate_limited"
            ? "rate_limited"
            : "error",
      );
    } catch {
      setStatus("error");
    }
  };

  if (status === "done" || status === "already") {
    return (
      <p className="mt-4 rounded-xl bg-teal-soft px-3 py-2 text-xs leading-relaxed text-teal-foreground">
        {t(status === "done" ? "events.detail.waitlist.done" : "events.detail.waitlist.already")}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl bg-secondary px-3 py-4">
      <p className="text-sm font-semibold">{t("events.detail.waitlist.title")}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {t(soldOutTier ? "events.detail.waitlist.introTier" : "events.detail.waitlist.intro")}
      </p>

      <label className="mt-4 block text-xs font-semibold" htmlFor="waitlist-name">
        {t("events.detail.waitlist.name")}
      </label>
      <input
        id="waitlist-name"
        required
        minLength={2}
        maxLength={120}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className={`mt-1 ${inputClass}`}
      />

      <label className="mt-3 block text-xs font-semibold" htmlFor="waitlist-email">
        {t("events.detail.waitlist.email")}
      </label>
      <input
        id="waitlist-email"
        type="email"
        required
        maxLength={200}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={`mt-1 ${inputClass}`}
      />

      <label className="mt-3 block text-xs font-semibold" htmlFor="waitlist-note">
        {t("events.detail.waitlist.note")}
      </label>
      <textarea
        id="waitlist-note"
        rows={2}
        maxLength={500}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className={`mt-1 ${inputClass}`}
      />

      {status === "closed" || status === "error" || status === "rate_limited" ? (
        <p className="mt-3 text-xs text-[color:var(--warn)]">
          {t(
            status === "closed"
              ? "events.detail.waitlist.closed"
              : status === "rate_limited"
                ? "events.detail.waitlist.rateLimited"
                : "events.detail.waitlist.error",
          )}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-4 min-h-11 w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {status === "saving"
          ? t("events.detail.waitlist.saving")
          : t("events.detail.waitlist.submit")}
      </button>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        {t("events.detail.waitlist.privacy")}
      </p>
    </form>
  );
}
