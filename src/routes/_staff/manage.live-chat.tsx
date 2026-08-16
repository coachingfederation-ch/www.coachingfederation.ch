/**
 * Activated live-chat volunteers (/manage/live-chat).
 * Exports: Route. Admins decide which members may take live chats; the
 * volunteers themselves go online from their phone, so this page never gates
 * availability — it only grants and removes the permission.
 *
 * Reads and writes go through admin-only server functions: listing other
 * accounts is exactly what member RLS forbids.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Plus, Trash2 } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useCms } from "@/i18n/cms";
import { PLATFORM_ADMIN_ROLES, requireStaffAccess } from "@/lib/staff-guard";
import {
  activateLiveChatVolunteer,
  deactivateLiveChatVolunteer,
  listLiveChatVolunteers,
} from "@/lib/live-chat-volunteers.functions";
import type {
  ActivatedVolunteer,
  EligibleMember,
} from "@/lib/live-chat-volunteers.server";

export const Route = createFileRoute("/_staff/manage/live-chat")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, PLATFORM_ADMIN_ROLES),
  head: () => ({
    meta: [
      { title: "Live chat volunteers — The Switzerland Chapter of ICF CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LiveChatPage,
});

type Presence = { user_id: string; display_name: string; last_seen_at: string };

const PRESENCE_TIMEOUT_MS = 90_000;

/** "Recent" for the last hour, then day-grained wording. */
function relativeDays(iso: string | null, locale: string, never: string, recent: string) {
  if (!iso) return never;
  const then = new Date(iso).getTime();
  if (Date.now() - then < 3_600_000) return recent;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.round((startOfToday.getTime() - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-days, "day");
}

function LiveChatPage() {
  const { t, locale } = useCms();
  const [volunteers, setVolunteers] = useState<ActivatedVolunteer[]>([]);
  const [eligible, setEligible] = useState<EligibleMember[]>([]);
  const [online, setOnline] = useState<Presence[]>([]);
  const [selected, setSelected] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ volunteers: rows, eligible: candidates }, { data: presence }] = await Promise.all([
        listLiveChatVolunteers(),
        supabase
          .from("live_chat_presence")
          .select("user_id, display_name, last_seen_at")
          .eq("is_online", true),
      ]);
      setVolunteers(rows);
      setEligible(candidates);
      setOnline(
        ((presence ?? []) as Presence[]).filter(
          (row) => Date.now() - new Date(row.last_seen_at).getTime() < PRESENCE_TIMEOUT_MS,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  // The QR target is same-origin, so it works from preview and production alike.
  useEffect(() => {
    const target = `${window.location.origin}/volunteer-chat`;
    setUrl(target);
    void QRCode.toDataURL(target, { width: 320, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, []);

  const add = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await activateLiveChatVolunteer({ data: { memberId: selected } });
      setSelected("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  };

  const remove = async (volunteer: ActivatedVolunteer) => {
    if (!window.confirm(t("liveChat.confirmRemove"))) return;
    setError(null);
    try {
      await deactivateLiveChatVolunteer({ data: { userId: volunteer.userId } });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const inputClass =
    "rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20";

  return (
    <Shell>
      <div className="mx-auto max-w-4xl px-10 py-10">
        <h1 className="text-2xl font-bold tracking-tight">{t("liveChat.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("liveChat.subtitle")}</p>

        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 grid gap-5 sm:grid-cols-[auto,1fr]">
          <div className="rounded-2xl border border-border bg-card p-5 text-center">
            {qr ? (
              <img src={qr} alt={t("liveChat.qrAlt")} className="mx-auto size-40" />
            ) : (
              <div className="mx-auto size-40 rounded-xl bg-secondary" />
            )}
            <p className="mt-3 break-all text-xs text-muted-foreground">{url}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {t("liveChat.onlineNow")}
            </h2>
            <ul className="mt-3 space-y-1">
              {online.length === 0 && (
                <li className="text-sm text-muted-foreground">{t("liveChat.nobodyOnline")}</li>
              )}
              {online.map((person) => (
                <li key={person.user_id} className="flex items-center gap-2 text-sm">
                  <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  {person.display_name}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">{t("liveChat.qrHint")}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {t("liveChat.activatedTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("liveChat.activatedHint")}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="volunteer-picker">
              {t("liveChat.pickMember")}
            </label>
            <select
              id="volunteer-picker"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className={`${inputClass} min-w-64`}
            >
              <option value="">{t("liveChat.pickMember")}</option>
              {eligible.map((member) => (
                <option key={member.memberId} value={member.memberId}>
                  {member.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void add()}
              disabled={busy || !selected}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Plus className="size-4" aria-hidden="true" />
              {t("liveChat.addVolunteer")}
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("liveChat.colVolunteer")}</th>
                <th className="px-4 py-3">{t("liveChat.colLastChat")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {volunteers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-muted-foreground">
                    {t("liveChat.noVolunteers")}
                  </td>
                </tr>
              )}
              {volunteers.map((volunteer) => (
                <tr key={volunteer.userId} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{volunteer.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {relativeDays(
                      volunteer.lastConversationAt,
                      locale,
                      t("liveChat.never"),
                      t("liveChat.recent"),
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void remove(volunteer)}
                      className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold text-destructive"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      {t("liveChat.remove")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
