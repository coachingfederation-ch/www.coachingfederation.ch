/**
 * Waitlist management for one event.
 *
 * A waitlist entry holds no seat. Inviting somebody opens a time-boxed window
 * in which that one email may register past the capacity check, and sends them
 * a localized invitation. When the window lapses the entry expires and the
 * place returns to the list.
 */
import { useCallback, useEffect, useState } from "react";
import { Section } from "./EventEditorSections";
import {
  inviteFromWaitlist,
  listEventWaitlist,
  withdrawWaitlistEntry,
} from "@/lib/waitlist.functions";
import type { WaitlistStatus } from "@/lib/waitlist";

type Entry = {
  id: string;
  tier_id: string | null;
  full_name: string;
  email: string;
  locale: string;
  status: WaitlistStatus;
  note: string | null;
  invited_at: string | null;
  invite_expires_at: string | null;
  created_at: string;
};

const badge: Record<WaitlistStatus, string> = {
  waiting: "bg-secondary text-muted-foreground",
  invited: "bg-teal-soft text-teal-foreground",
  converted: "bg-teal-soft text-teal-foreground",
  expired: "bg-warn-soft text-[color:var(--warn)]",
  withdrawn: "bg-secondary text-muted-foreground",
};

const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—";

export function EventWaitlistSection({
  eventId,
  t,
}: {
  eventId: string;
  t: (k: string) => string;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = (await listEventWaitlist({ data: { eventId } })) as Entry[];
      setEntries(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = async (entry: Entry) => {
    setBusyId(entry.id);
    setMessage(null);
    setError(null);
    try {
      const result = await inviteFromWaitlist({ data: { entryId: entry.id } });
      if (result.ok) setMessage(t("events.waitlist.invited"));
      else setError(t("events.waitlist.inviteFailed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusyId(null);
    await load();
  };

  const withdraw = async (entry: Entry) => {
    setBusyId(entry.id);
    setError(null);
    try {
      await withdrawWaitlistEntry({ data: { entryId: entry.id } });
      setMessage(t("events.waitlist.withdrawn"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusyId(null);
    await load();
  };

  const waiting = entries.filter((e) => e.status === "waiting").length;

  return (
    <Section title={t("events.waitlist.title")} hint={t("events.waitlist.hint")}>
      {message ? <p className="mb-3 text-xs text-teal-foreground">{message}</p> : null}
      {error ? <p className="mb-3 text-xs text-destructive">{error}</p> : null}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("events.waitlist.empty")}</p>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            {t("events.waitlist.waitingCount").replace("{n}", String(waiting))}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">{t("events.waitlist.colName")}</th>
                  <th className="py-2 pr-3">{t("events.waitlist.colEmail")}</th>
                  <th className="py-2 pr-3">{t("events.waitlist.colStatus")}</th>
                  <th className="py-2 pr-3">{t("events.waitlist.colRequested")}</th>
                  <th className="py-2 pr-3">{t("events.waitlist.colDeadline")}</th>
                  <th className="py-2 text-right">{t("events.waitlist.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3">
                      <span className="font-semibold">{entry.full_name}</span>
                      {entry.note ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {entry.note}
                        </span>
                      ) : null}
                    </td>
                    <td className="max-w-[220px] truncate py-2 pr-3">{entry.email}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${badge[entry.status]}`}
                      >
                        {t(`events.waitlist.status.${entry.status}`)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {shortDate(entry.created_at)}
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {shortDate(entry.invite_expires_at)}
                    </td>
                    <td className="py-2 text-right">
                      {entry.status === "waiting" ||
                      entry.status === "invited" ||
                      entry.status === "expired" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={busyId === entry.id}
                            onClick={() => void invite(entry)}
                            className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                          >
                            {entry.status === "waiting"
                              ? t("events.waitlist.invite")
                              : t("events.waitlist.reinvite")}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === entry.id}
                            onClick={() => void withdraw(entry)}
                            className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                          >
                            {t("events.waitlist.withdraw")}
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}
