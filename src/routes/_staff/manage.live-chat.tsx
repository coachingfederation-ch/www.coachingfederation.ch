/**
 * Volunteer live-chat roster (/manage/live-chat).
 * Exports: Route. Admin surface for the informational shift roster plus the QR
 * code volunteers scan to open the mobile console.
 *
 * The roster does not gate anything — going online happens on the volunteer's
 * phone — so this page is deliberately a plain schedule. Writes go through the
 * browser client against the admin-only RLS policy on `live_chat_shifts`.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Plus, Trash2 } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useCms } from "@/i18n/cms";
import { PLATFORM_ADMIN_ROLES, requireStaffAccess } from "@/lib/staff-guard";

export const Route = createFileRoute("/_staff/manage/live-chat")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, PLATFORM_ADMIN_ROLES),
  head: () => ({
    meta: [
      { title: "Live chat roster — The Switzerland Chapter of ICF CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LiveChatPage,
});

type Shift = {
  id: string;
  starts_at: string;
  ends_at: string;
  volunteer_name: string;
  note: string | null;
};

type Presence = { user_id: string; display_name: string; last_seen_at: string };

const COLUMNS = "id, starts_at, ends_at, volunteer_name, note";
const PRESENCE_TIMEOUT_MS = 90_000;

function LiveChatPage() {
  const { t, locale } = useCms();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [online, setOnline] = useState<Presence[]>([]);
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [volunteerName, setVolunteerName] = useState("");
  const [note, setNote] = useState("");

  const load = async () => {
    const [{ data: rows, error: err }, { data: presence }] = await Promise.all([
      supabase.from("live_chat_shifts").select(COLUMNS).order("starts_at", { ascending: true }),
      supabase
        .from("live_chat_presence")
        .select("user_id, display_name, last_seen_at")
        .eq("is_online", true),
    ]);
    if (err) {
      setError(err.message);
      return;
    }
    setShifts((rows ?? []) as Shift[]);
    setOnline(
      ((presence ?? []) as Presence[]).filter(
        (row) => Date.now() - new Date(row.last_seen_at).getTime() < PRESENCE_TIMEOUT_MS,
      ),
    );
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // The QR target is same-origin, so it works from preview and production alike.
  useEffect(() => {
    const target = `${window.location.origin}/volunteer-chat`;
    setUrl(target);
    void QRCode.toDataURL(target, { width: 320, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, []);

  const add = async () => {
    if (!startsAt || !endsAt) {
      setError(t("liveChat.needTimes"));
      return;
    }
    setBusy(true);
    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("live_chat_shifts").insert({
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      volunteer_name: volunteerName.trim(),
      note: note.trim() || null,
      created_by: auth.user?.id ?? null,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setStartsAt("");
    setEndsAt("");
    setVolunteerName("");
    setNote("");
    await load();
  };

  const remove = async (shift: Shift) => {
    if (!window.confirm(t("liveChat.confirmDelete"))) return;
    const { error: err } = await supabase.from("live_chat_shifts").delete().eq("id", shift.id);
    if (err) {
      setError(err.message);
      return;
    }
    await load();
  };

  const inputClass =
    "rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20";
  const dateTimeFormat = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

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
            {t("liveChat.addTitle")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold">
              {t("liveChat.fieldStart")}
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              {t("liveChat.fieldEnd")}
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className={inputClass}
              />
            </label>
            <input
              value={volunteerName}
              onChange={(e) => setVolunteerName(e.target.value)}
              placeholder={t("liveChat.fieldVolunteer")}
              aria-label={t("liveChat.fieldVolunteer")}
              className={inputClass}
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("liveChat.fieldNote")}
              aria-label={t("liveChat.fieldNote")}
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={() => void add()}
            disabled={busy}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("liveChat.add")}
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("liveChat.colWhen")}</th>
                <th className="px-4 py-3">{t("liveChat.fieldVolunteer")}</th>
                <th className="px-4 py-3">{t("liveChat.fieldNote")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                    {t("liveChat.noShifts")}
                  </td>
                </tr>
              )}
              {shifts.map((shift) => (
                <tr key={shift.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    {dateTimeFormat.format(new Date(shift.starts_at))} –{" "}
                    {dateTimeFormat.format(new Date(shift.ends_at))}
                  </td>
                  <td className="px-4 py-3">{shift.volunteer_name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{shift.note || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void remove(shift)}
                      aria-label={t("liveChat.delete")}
                      className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-destructive"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
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
