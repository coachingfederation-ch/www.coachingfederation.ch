/**
 * Read-only list of approved guest passes for one event.
 * Exports: ApprovedGuestsPanel. Rendered inside the event editor.
 *
 * Community/Project Leaders see who is coming and which member invited them —
 * nothing more. Approving, declining and the guests' contact details stay with
 * Membership & Engagement; the server function projects the row down before it
 * ever reaches this component.
 */
import { useEffect, useState } from "react";
import { useCms } from "@/i18n/cms";
import { listApprovedGuestsForEvent, type ApprovedGuest } from "@/lib/guest-passes.functions";

export function ApprovedGuestsPanel({ eventId }: { eventId: string }) {
  const { t } = useCms();
  const [guests, setGuests] = useState<ApprovedGuest[] | null>(null);

  useEffect(() => {
    let active = true;
    listApprovedGuestsForEvent({ data: { eventId } })
      .then((rows) => {
        if (active) setGuests(rows);
      })
      .catch(() => {
        if (active) setGuests([]);
      });
    return () => {
      active = false;
    };
  }, [eventId]);

  if (guests === null) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-heading text-lg text-primary">{t("guestPasses.leaderPanel.title")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("guestPasses.leaderPanel.description")}
      </p>
      {guests.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("guestPasses.leaderPanel.empty")}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {guests.map((guest) => (
            <li
              key={guest.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0 last:pb-0"
            >
              <span className="font-medium text-foreground">{guest.guestName}</span>
              <span className="text-muted-foreground">
                {t("guestPasses.leaderPanel.invitedBy")}: {guest.invitedBy ?? "—"} ·{" "}
                {t(`guestPasses.status.${guest.status}`)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
