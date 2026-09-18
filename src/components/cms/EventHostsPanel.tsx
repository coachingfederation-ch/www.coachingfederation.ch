/**
 * Host picker for the event editor.
 *
 * Candidates come from the public coach directory, so a host is always a coach
 * the public event page can link to. Saving is immediate — hosts live in their
 * own table and are not part of the event form's save payload.
 *
 * Besides the profile link, each host carries two optional per-event fields: a
 * link address that replaces the coach profile link, and a short presentation
 * text shown under the name. Both belong to this event, not to the profile.
 */
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useCms } from "@/i18n/cms";
import { MAX_HOST_BLURB, type EventHost } from "@/lib/event-hosts";
import {
  listEventHosts,
  searchEventHostCandidates,
  setEventHosts,
} from "@/lib/events-admin.functions";

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

export function EventHostsPanel({ eventId }: { eventId: string }) {
  const { t } = useCms();
  const [hosts, setHosts] = useState<EventHost[]>([]);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<EventHost[]>([]);
  const [picked, setPicked] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draftUrl, setDraftUrl] = useState("");
  const [draftBlurb, setDraftBlurb] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listEventHosts({ data: { eventId } })
      .then((rows) => setHosts(rows as EventHost[]))
      .catch(() => setError(t("events.hosts.loadError")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Debounced name search — the directory holds hundreds of coaches.
  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setCandidates([]);
      return;
    }
    const timer = setTimeout(() => {
      void searchEventHostCandidates({ data: { term } })
        .then((rows) => setCandidates(rows as EventHost[]))
        .catch(() => setCandidates([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const commit = async (next: EventHost[]) => {
    setBusy(true);
    setError(null);
    try {
      const saved = await setEventHosts({
        data: {
          eventId,
          hosts: next.map((h) => ({
            profileId: h.profileId,
            linkUrl: h.linkUrl || null,
            blurb: h.blurb || null,
          })),
        },
      });
      setHosts(saved as EventHost[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.hosts.saveError"));
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    const found = candidates.find((c) => c.profileId === picked);
    if (!found || hosts.some((h) => h.profileId === found.profileId)) return;
    setPicked("");
    setSearch("");
    setCandidates([]);
    void commit([...hosts, found]);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= hosts.length) return;
    const next = [...hosts];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    void commit(next);
  };

  const openEdit = (host: EventHost) => {
    setEditing(host.profileId);
    setDraftUrl(host.linkUrl ?? "");
    setDraftBlurb(host.blurb ?? "");
  };

  const savePresentation = (profileId: string) => {
    const url = draftUrl.trim();
    setEditing(null);
    void commit(
      hosts.map((h) =>
        h.profileId === profileId
          ? { ...h, linkUrl: url ? url : null, blurb: draftBlurb.trim() || null }
          : h,
      ),
    );
  };

  return (
    <div>
      <ul className="divide-y divide-border">
        {hosts.map((host, index) => (
          <li key={host.profileId} className="py-2">
            <div className="flex items-center gap-3">
              {host.imageUrl ? (
                <img src={host.imageUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="h-9 w-9 rounded-full bg-secondary" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{host.fullName}</span>
                {host.blurb ? (
                  <span className="block truncate text-xs text-muted-foreground">{host.blurb}</span>
                ) : host.tagline ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {host.tagline}
                  </span>
                ) : null}
                {host.linkUrl ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {host.linkUrl}
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                disabled={busy || index === 0}
                onClick={() => move(index, -1)}
                aria-label={t("events.hosts.moveUp")}
                className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={busy || index === hosts.length - 1}
                onClick={() => move(index, 1)}
                aria-label={t("events.hosts.moveDown")}
                className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => openEdit(host)}
                aria-label={t("events.hosts.editPresentation")}
                className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void commit(hosts.filter((h) => h.profileId !== host.profileId))}
                aria-label={t("events.hosts.remove")}
                className="rounded p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {editing === host.profileId ? (
              <div className="mt-2 space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
                <input
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  placeholder={t("events.hosts.linkPlaceholder")}
                  aria-label={t("events.hosts.linkLabel")}
                  className={inputClass}
                />
                <textarea
                  value={draftBlurb}
                  onChange={(e) => setDraftBlurb(e.target.value.slice(0, MAX_HOST_BLURB))}
                  rows={3}
                  placeholder={t("events.hosts.blurbPlaceholder")}
                  aria-label={t("events.hosts.blurbLabel")}
                  className={inputClass}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => savePresentation(host.profileId)}
                    className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
                  >
                    {t("events.hosts.savePresentation")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {t("events.hosts.cancel")}
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
        {hosts.length === 0 ? (
          <li className="py-2 text-sm text-muted-foreground">{t("events.hosts.none")}</li>
        ) : null}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("events.hosts.search")}
          aria-label={t("events.hosts.search")}
          className={inputClass + " w-56"}
        />
        <select
          aria-label={t("events.hosts.select")}
          value={picked}
          onChange={(e) => setPicked(e.target.value)}
          className={inputClass + " w-56"}
        >
          <option value="">{t("events.hosts.select")}</option>
          {candidates.map((c) => (
            <option key={c.profileId} value={c.profileId}>
              {c.fullName}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={!picked || busy}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
        >
          {t("events.hosts.add")}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("events.hosts.hint")}</p>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
