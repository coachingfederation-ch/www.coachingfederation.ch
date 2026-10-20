/**
 * Guest list management for an invitation-only event.
 *
 * On these events the list comes before the registration: only the people
 * added here receive a personal link, and only that link opens the form. The
 * search is deliberately restricted to active members, so a guest list can
 * never be assembled from arbitrary email addresses.
 */
import { useCallback, useEffect, useState } from "react";
import { Section } from "./EventEditorSections";
import {
  addEventInvitation,
  listEventInvitations,
  removeEventInvitation,
  resendEventInvitation,
  searchInvitableMembers,
  previewBulkInvitations,
  addBulkInvitations,
  addGuestEventInvitation,
} from "@/lib/event-invitations.functions";
import { parseInviteList, MAX_BULK_INVITES } from "@/lib/invite-list-parse";
import { Button, Input, Textarea } from "@/design-system/icf-welcome-design-system-a835df";

type BulkPreview = {
  matched: Candidate[];
  guests: { email: string; name: string }[];
  alreadyInvited: string[];
  notFound: string[];
  invalid: string[];
};

type Invitation = {
  id: string;
  member_id: string | null;
  full_name: string;
  email: string;
  locale: string;
  status: "invited" | "registered" | "declined" | "revoked" | "expired";
  invited_at: string | null;
  responded_at: string | null;
};

type Candidate = { memberId: string; name: string; email: string };

const badge: Record<Invitation["status"], string> = {
  invited: "bg-teal-soft text-teal-foreground",
  registered: "bg-teal-soft text-teal-foreground",
  declined: "bg-secondary text-muted-foreground",
  revoked: "bg-secondary text-muted-foreground",
  expired: "bg-warn-soft text-[color:var(--warn)]",
};

const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—";

export function EventInvitationsSection({
  eventId,
  t,
  allowGuests = false,
}: {
  eventId: string;
  t: (k: string) => string;
  /** Open guest list: non-members may be invited too. */
  allowGuests?: boolean;
}) {
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestLocale, setGuestLocale] = useState<"de" | "fr" | "it" | "en">("de");

  const [rows, setRows] = useState<Invitation[]>([]);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [bulkText, setBulkText] = useState("");
  const [preview, setPreview] = useState<BulkPreview | null>(null);

  const checkBulk = async () => {
    setMessage(null);
    setError(null);
    setPreview(null);
    const { emails, invalid, names } = parseInviteList(bulkText);
    if (emails.length === 0) {
      setError(t("events.invitations.bulkNone"));
      return;
    }
    if (emails.length > MAX_BULK_INVITES) {
      setError(t("events.invitations.bulkTooMany"));
      return;
    }
    setBusy("bulk");
    try {
      const r = await previewBulkInvitations({ data: { eventId, emails, names } });
      setPreview({ ...r, invalid });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const sendBulk = async () => {
    if (!preview || preview.matched.length + preview.guests.length === 0) return;
    setBusy("bulk");
    setError(null);
    try {
      const r = await addBulkInvitations({
        data: {
          eventId,
          memberIds: preview.matched.map((m) => m.memberId),
          guests: preview.guests,
        },
      });
      setMessage(
        t("events.invitations.bulkDone")
          .replace("{sent}", String(r.sent))
          .replace("{failed}", String(r.failed)),
      );
      setPreview(null);
      setBulkText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const addGuest = async () => {
    setBusy("guest");
    setMessage(null);
    setError(null);
    try {
      const r = await addGuestEventInvitation({
        data: { eventId, fullName: guestName, email: guestEmail, locale: guestLocale },
      });
      if (r.ok) {
        setMessage(t("events.invitations.sent"));
        setGuestName("");
        setGuestEmail("");
      } else setError(t(`events.invitations.error.${r.reason}`));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBulkText(String(reader.result ?? ""));
      setPreview(null);
    };
    reader.readAsText(file);
  };

  const load = useCallback(async () => {
    try {
      setRows((await listEventInvitations({ data: { eventId } })) as Invitation[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Debounced so typing a name does not fire a member search per keystroke.
  useEffect(() => {
    if (query.trim().length < 2) {
      setCandidates([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        setCandidates(await searchInvitableMembers({ data: { eventId, query } }));
      } catch {
        setCandidates([]);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, eventId]);

  const add = async (candidate: Candidate) => {
    setBusy(candidate.memberId);
    setMessage(null);
    setError(null);
    try {
      const result = await addEventInvitation({ data: { eventId, memberId: candidate.memberId } });
      if (result.ok) {
        setMessage(t("events.invitations.sent"));
        setQuery("");
        setCandidates([]);
      } else {
        setError(t(`events.invitations.error.${result.reason}`));
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const act = async (id: string, kind: "resend" | "remove") => {
    setBusy(id);
    setMessage(null);
    setError(null);
    try {
      if (kind === "resend") {
        const result = await resendEventInvitation({ data: { eventId, invitationId: id } });
        setMessage(
          result.ok
            ? t("events.invitations.resent")
            : t(`events.invitations.error.${result.reason}`),
        );
      } else {
        await removeEventInvitation({ data: { eventId, invitationId: id } });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section title={t("events.invitations.title")} hint={t("events.invitations.hint")}>
      <div className="space-y-4">
        <div>
          <label
            className="mb-1 block text-xs font-semibold text-muted-foreground"
            htmlFor="invite-search"
          >
            {t("events.invitations.search")}
          </label>
          <input
            id="invite-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("events.invitations.searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          {candidates.length > 0 ? (
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
              {candidates.map((candidate) => (
                <li
                  key={candidate.memberId}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-semibold">{candidate.name}</span>{" "}
                    <span className="text-muted-foreground">{candidate.email}</span>
                  </span>
                  <button
                    type="button"
                    disabled={busy === candidate.memberId}
                    onClick={() => void add(candidate)}
                    className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {busy === candidate.memberId
                      ? t("events.invitations.sending")
                      : t("events.invitations.invite")}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {allowGuests ? (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground">
              {t("events.invitations.guestTitle")}
            </p>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
              <Input
                aria-label={t("events.colName")}
                placeholder={t("events.colName")}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
              <Input
                type="email"
                aria-label={t("events.colEmail")}
                placeholder={t("events.colEmail")}
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
              />
              <select
                aria-label={t("events.invitations.guestLanguage")}
                value={guestLocale}
                onChange={(e) => setGuestLocale(e.target.value as typeof guestLocale)}
                className="rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="de">DE</option>
                <option value="fr">FR</option>
                <option value="it">IT</option>
                <option value="en">EN</option>
              </select>
              <Button
                type="button"
                size="sm"
                disabled={busy === "guest" || !guestName.trim() || !guestEmail.includes("@")}
                onClick={() => void addGuest()}
              >
                {t("events.invitations.invite")}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2 rounded-lg border border-border p-3">
          <label className="block text-xs font-semibold text-muted-foreground" htmlFor="invite-bulk">
            {t("events.invitations.bulkTitle")}
          </label>
          <p className="text-xs text-muted-foreground">{t("events.invitations.bulkHint")}</p>
          <Textarea
            id="invite-bulk"
            rows={4}
            value={bulkText}
            onChange={(e) => {
              setBulkText(e.target.value);
              setPreview(null);
            }}
            placeholder={t("events.invitations.bulkPlaceholder")}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                {t("events.invitations.bulkUpload")}
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="sr-only"
                  onChange={(e) => {
                    onFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy === "bulk" || !bulkText.trim()}
              onClick={() => void checkBulk()}
            >
              {t("events.invitations.bulkCheck")}
            </Button>
          </div>
          {preview ? (
            <div className="space-y-2 text-sm">
              {(
                [
                  ["bulkMatched", preview.matched.map((m) => `${m.name} (${m.email})`)],
                  ["bulkGuests", preview.guests.map((g) => `${g.name} (${g.email})`)],
                  ["bulkAlready", preview.alreadyInvited],
                  ["bulkNotFound", preview.notFound],
                  ["bulkInvalid", preview.invalid],
                ] as const
              ).map(([key, list]) =>
                list.length > 0 ? (
                  <div key={key}>
                    <p className="font-semibold">
                      {t(`events.invitations.${key}`)} ({list.length})
                    </p>
                    <p className="text-muted-foreground">{list.join(", ")}</p>
                  </div>
                ) : null,
              )}
              {preview.matched.length + preview.guests.length > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy === "bulk"}
                  onClick={() => void sendBulk()}
                >
                  {busy === "bulk"
                    ? t("events.invitations.sending")
                    : t("events.invitations.bulkSend").replace("{n}", String(preview.matched.length + preview.guests.length))}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {message ? <p className="text-sm text-teal-foreground">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("events.invitations.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">{t("events.colName")}</th>
                  <th className="py-2">{t("events.colEmail")}</th>
                  <th className="py-2">{t("events.invitations.status")}</th>
                  <th className="py-2">{t("events.invitations.invitedAt")}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 font-semibold">
                      {row.full_name}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ·{" "}
                        {row.member_id
                          ? t("events.invitations.kindMember")
                          : t("events.invitations.kindGuest")}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground">{row.email}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge[row.status]}`}
                      >
                        {t(`events.invitations.state.${row.status}`)}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground">{shortDate(row.invited_at)}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-2">
                        {row.status !== "registered" ? (
                          <button
                            type="button"
                            disabled={busy === row.id}
                            onClick={() => void act(row.id, "resend")}
                            className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                          >
                            {t("events.invitations.resend")}
                          </button>
                        ) : null}
                        {row.status !== "registered" ? (
                          <button
                            type="button"
                            disabled={busy === row.id}
                            onClick={() => void act(row.id, "remove")}
                            className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                          >
                            {t("events.invitations.remove")}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Section>
  );
}
