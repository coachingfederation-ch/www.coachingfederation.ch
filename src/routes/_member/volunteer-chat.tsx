/**
 * Volunteer live-chat console (/volunteer-chat), designed for a phone.
 *
 * Behind the Member Area gate, and additionally restricted to members an admin
 * activated as volunteers (`live_chat_volunteers`) — the same rule the RLS
 * policies enforce, mirrored here so a non-volunteer gets an explanation
 * instead of an empty console.
 *
 * The flow is deliberately linear: enter the name visitors see, go online,
 * then work the waiting list. Presence is a heartbeat row rather than an
 * ephemeral channel, so the public widget can read "is anyone on duty?"
 * server-side.
 *
 * Layout note: every screen is a 100dvh column (header / scrolling body /
 * pinned action) with safe-area padding, so on a phone the composer and the
 * primary button can never be pushed below the browser chrome.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellOff, ChevronDown, Loader2, Radio, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { getMyVolunteerStatus } from "@/lib/live-chat-volunteers.functions";
import {
  currentPushState,
  disablePush,
  enablePush,
  isStandalone,
  playWaitingChime,
  pushSupported,
} from "@/lib/volunteer-notifications";

export const Route = createFileRoute("/_member/volunteer-chat")({
  head: () => ({
    meta: [
      { title: "Volunteer chat — The Switzerland Chapter of ICF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VolunteerChatPage,
});

const HEARTBEAT_MS = 30_000;
const PRESENCE_TIMEOUT_MS = 90_000;

/** Full-height phone frame: safe-area aware, never taller than the viewport. */
const SCREEN = "flex h-[100dvh] flex-col overflow-hidden bg-background";
const HEADER =
  "shrink-0 bg-hero px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-hero-foreground";
const BODY = "min-h-0 flex-1 overflow-y-auto overscroll-contain";
const FOOTER =
  "shrink-0 border-t border-border bg-card px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]";

type Conversation = {
  id: string;
  visitor_name: string;
  status: "waiting" | "active" | "closed";
  volunteer_user_id: string | null;
  created_at: string;
  ended_at: string | null;
};

type Message = { id: string; sender: "visitor" | "volunteer" | "system"; body: string };

type Presence = { user_id: string; display_name: string; last_seen_at: string };

const CONVERSATION_COLUMNS = "id, visitor_name, status, volunteer_user_id, created_at, ended_at";

function VolunteerChatPage() {
  const { t } = useI18n();
  const [userId, setUserId] = useState<string | null>(null);
  const [activated, setActivated] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [online, setOnline] = useState(false);
  const [others, setOthers] = useState<Presence[]>([]);
  const [showOthers, setShowOthers] = useState(false);
  const [waiting, setWaiting] = useState<Conversation[]>([]);
  const [mine, setMine] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Record<string, Message[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [pushState, setPushState] = useState<"on" | "off" | "blocked">("off");
  const [pushBusy, setPushBusy] = useState(false);
  const waitingCountRef = useRef(0);

  useEffect(() => {
    if (!pushSupported()) return;
    void currentPushState().then(setPushState);
  }, []);

  // A new arrival while the console is open gets a chime as well as the badge.
  useEffect(() => {
    if (waiting.length > waitingCountRef.current) playWaitingChime();
    waitingCountRef.current = waiting.length;
  }, [waiting.length]);

  const togglePush = useCallback(async () => {
    setPushBusy(true);
    if (pushState === "on") {
      await disablePush().catch(() => undefined);
      setPushState("off");
    } else {
      const next = await enablePush().catch(() => "error" as const);
      setPushState(next === "on" ? "on" : next === "blocked" ? "blocked" : "off");
    }
    setPushBusy(false);
  }, [pushState]);

  // Identify the volunteer, confirm the activation and prefill the display name.
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      setUserId(user.id);
      const status = await getMyVolunteerStatus().catch(() => ({
        active: false,
        displayName: "",
      }));
      setActivated(status.active);
      if (!status.active) return;
      const { data: row } = await supabase
        .from("live_chat_presence")
        .select("display_name, is_online")
        .eq("user_id", user.id)
        .maybeSingle();
      setName(row?.display_name || status.displayName || (user.email ?? "").split("@")[0] || "");
      setOnline(Boolean(row?.is_online));
    })();
  }, []);

  const loadLists = useCallback(async () => {
    if (!userId || !activated) return;
    const [{ data: presence }, { data: conversations }] = await Promise.all([
      supabase
        .from("live_chat_presence")
        .select("user_id, display_name, last_seen_at")
        .eq("is_online", true),
      supabase
        .from("live_chat_conversations")
        .select(CONVERSATION_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    const fresh = (presence ?? []).filter(
      (row) => Date.now() - new Date(row.last_seen_at).getTime() < PRESENCE_TIMEOUT_MS,
    );
    setOthers(fresh as Presence[]);
    const rows = (conversations ?? []) as Conversation[];
    setWaiting(rows.filter((row) => row.status === "waiting"));
    setMine(rows.filter((row) => row.volunteer_user_id === userId));
    const current = rows.find((row) => row.volunteer_user_id === userId && row.status === "active");
    setActiveId((prev) => prev ?? current?.id ?? null);
  }, [activated, userId]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  // Heartbeat: a volunteer who closes the page drops offline within 90s.
  useEffect(() => {
    if (!userId || !online) return;
    const beat = async () => {
      await supabase.from("live_chat_presence").upsert({
        user_id: userId,
        display_name: name.trim().slice(0, 60),
        is_online: true,
        last_seen_at: new Date().toISOString(),
      });
    };
    void beat();
    const timer = window.setInterval(() => void beat(), HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [name, online, userId]);

  // Live updates for waiting requests, presence and the open thread.
  useEffect(() => {
    if (!userId || !activated) return;
    const channel = supabase
      .channel("live-chat-volunteer")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_chat_conversations" },
        () => void loadLists(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_chat_presence" },
        () => void loadLists(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages" },
        (payload) => {
          const row = payload.new as Message & { conversation_id: string };
          if (row.conversation_id !== activeId) return;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id)
              ? prev
              : [...prev, { id: row.id, sender: row.sender, body: row.body }],
          );
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activated, activeId, loadLists, userId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data } = await supabase
      .from("live_chat_messages")
      .select("id, sender, body")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    return (data ?? []) as Message[];
  }, []);

  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId).then(setMessages);
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const setPresence = useCallback(
    async (next: boolean) => {
      if (!userId) return;
      setOnline(next);
      setShowOthers(false);
      await supabase.from("live_chat_presence").upsert({
        user_id: userId,
        display_name: name.trim().slice(0, 60),
        is_online: next,
        last_seen_at: new Date().toISOString(),
      });
      void loadLists();
    },
    [loadLists, name, userId],
  );

  // First acceptance wins: the update only matches while the row is waiting.
  const accept = useCallback(
    async (conversationId: string) => {
      if (!userId) return;
      setBusy(true);
      setError(null);
      const { data, error: updateError } = await supabase
        .from("live_chat_conversations")
        .update({
          status: "active",
          volunteer_user_id: userId,
          volunteer_name: name.trim().slice(0, 60),
          accepted_at: new Date().toISOString(),
        })
        .eq("id", conversationId)
        .eq("status", "waiting")
        .select("id");
      setBusy(false);
      if (updateError || (data ?? []).length === 0) {
        setError(t("live-chat.volunteer.taken"));
        void loadLists();
        return;
      }
      setActiveId(conversationId);
      void loadLists();
    },
    [loadLists, name, t, userId],
  );

  const send = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const text = reply.trim();
      if (!activeId || !text) return;
      setReply("");
      const { error: insertError } = await supabase
        .from("live_chat_messages")
        .insert({ conversation_id: activeId, sender: "volunteer", body: text.slice(0, 2000) });
      if (insertError) setError(t("live-chat.volunteer.error"));
    },
    [activeId, reply, t],
  );

  const endChat = useCallback(async () => {
    if (!activeId) return;
    await supabase
      .from("live_chat_conversations")
      .update({ status: "closed", ended_at: new Date().toISOString() })
      .eq("id", activeId);
    setActiveId(null);
    setMessages([]);
    void loadLists();
  }, [activeId, loadLists]);

  const openTranscript = useCallback(
    async (conversationId: string) => {
      setExpanded((prev) => (prev === conversationId ? null : conversationId));
      if (!transcript[conversationId]) {
        const rows = await loadMessages(conversationId);
        setTranscript((prev) => ({ ...prev, [conversationId]: rows }));
      }
    },
    [loadMessages, transcript],
  );

  const activeConversation = mine.find((row) => row.id === activeId) ?? null;
  const recent = mine.filter((row) => row.status === "closed").slice(0, 3);

  if (activated === false) {
    return (
      <div className={SCREEN}>
        <header className={HEADER}>
          <h1 className="font-display text-xl font-semibold">{t("live-chat.volunteer.title")}</h1>
        </header>
        <div className={BODY}>
          <p className="mx-auto max-w-md p-4 text-sm text-muted-foreground">
            {t("live-chat.volunteer.notActivated")}
          </p>
        </div>
      </div>
    );
  }

  if (activeConversation) {
    return (
      <div className={SCREEN}>
        <header className={cn(HEADER, "flex items-center justify-between gap-3")}>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold">
              {activeConversation.visitor_name}
            </p>
            <p className="text-xs text-hero-foreground/80">{t("live-chat.volunteer.title")}</p>
          </div>
          <button
            type="button"
            onClick={() => void endChat()}
            className="min-h-11 rounded-full bg-hero-foreground/10 px-4 text-sm font-semibold"
          >
            {t("live-chat.volunteer.endChat")}
          </button>
        </header>
        <div className={cn(BODY, "space-y-3 p-4")}>
          {messages.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                entry.sender === "volunteer"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-card text-foreground",
              )}
            >
              <span className="whitespace-pre-wrap">{entry.body}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className={cn(FOOTER, "flex items-center gap-2")}>
          <input
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder={t("live-chat.volunteer.placeholder")}
            aria-label={t("live-chat.volunteer.placeholder")}
            className="min-h-11 w-full min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={reply.trim().length === 0}
            className="min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {t("live-chat.volunteer.send")}
          </button>
        </form>
      </div>
    );
  }

  // Start flow: nothing but the name and one button until the volunteer is on duty.
  if (!online) {
    return (
      <div className={SCREEN}>
        <header className={HEADER}>
          <h1 className="font-display text-xl font-semibold">{t("live-chat.volunteer.title")}</h1>
          <p className="mt-1 text-xs text-hero-foreground/80">
            {t("live-chat.volunteer.youAreOffline")}
          </p>
        </header>
        <div className={cn(BODY, "p-4")}>
          <section className="mx-auto max-w-md rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{t("live-chat.volunteer.startIntro")}</p>
            <label className="mt-3 block text-xs font-semibold text-foreground">
              {t("live-chat.volunteer.nameLabel")}
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-base font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </section>
          <NotificationRow
            state={pushState}
            busy={pushBusy}
            onToggle={() => void togglePush()}
            t={t}
          />
        </div>
        <div className={FOOTER}>
          <button
            type="button"
            onClick={() => void setPresence(true)}
            disabled={!name.trim() || activated === null}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            <Radio className="size-4" aria-hidden="true" />
            {t("live-chat.volunteer.goOnline")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={SCREEN}>
      <header className={HEADER}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-semibold">
              {t("live-chat.volunteer.title")}
            </h1>
            <p className="text-xs text-hero-foreground/80">
              {t("live-chat.volunteer.youAreOnline")} · {name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void setPresence(false)}
            className="min-h-11 shrink-0 rounded-full bg-hero-foreground/10 px-4 text-sm font-semibold"
          >
            {t("live-chat.volunteer.goOffline")}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowOthers((prev) => !prev)}
            aria-expanded={showOthers}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-hero-foreground/10 px-4 text-sm font-semibold"
          >
            <Users className="size-4" aria-hidden="true" />
            {t("live-chat.volunteer.onlineNow")} {others.length}
            <ChevronDown
              className={cn("size-4 transition-transform", showOthers && "rotate-180")}
              aria-hidden="true"
            />
          </button>
          {waiting.length > 0 && (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-bold text-accent-foreground">
              {t("live-chat.volunteer.waitingBadge")} {waiting.length}
            </span>
          )}
        </div>
        {showOthers && (
          <ul className="mt-2 space-y-1 rounded-2xl bg-hero-foreground/10 p-3 text-sm">
            {others.length === 0 && <li>{t("live-chat.volunteer.nobodyElse")}</li>}
            {others.map((person) => (
              <li key={person.user_id} className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
                {person.display_name}
              </li>
            ))}
          </ul>
        )}
      </header>

      <div
        className={cn(
          BODY,
          "mx-auto w-full max-w-md space-y-5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
        )}
      >
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("live-chat.volunteer.requests")}
          </h2>
          <div className="space-y-2">
            {waiting.length === 0 && (
              <p className="rounded-2xl border border-border bg-card p-3 text-sm text-muted-foreground">
                {t("live-chat.volunteer.noRequests")}
              </p>
            )}
            {waiting.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {request.visitor_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(request.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void accept(request.id)}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {t("live-chat.volunteer.accept")}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("live-chat.volunteer.recent")}
          </h2>
          <div className="space-y-2">
            {recent.length === 0 && (
              <p className="rounded-2xl border border-border bg-card p-3 text-sm text-muted-foreground">
                {t("live-chat.volunteer.noRecent")}
              </p>
            )}
            {recent.map((row) => (
              <div key={row.id} className="rounded-2xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => void openTranscript(row.id)}
                  aria-expanded={expanded === row.id}
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {row.visitor_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString()} ·{" "}
                      {t("live-chat.volunteer.closed")}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 transition-transform",
                      expanded === row.id && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>
                {expanded === row.id && (
                  <div className="space-y-2 border-t border-border px-3 py-2">
                    {(transcript[row.id] ?? []).map((entry) => (
                      <p key={entry.id} className="text-sm text-foreground">
                        <span className="font-semibold">
                          {entry.sender === "volunteer" ? name : row.visitor_name}:{" "}
                        </span>
                        <span className="whitespace-pre-wrap">{entry.body}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <p className="text-[11px] text-muted-foreground">{t("live-chat.volunteer.keepOpen")}</p>

        <NotificationRow
          state={pushState}
          busy={pushBusy}
          onToggle={() => void togglePush()}
          t={t}
        />
      </div>
    </div>
  );
}

/**
 * Push opt-in. On iOS the browser only exposes push once the site has been
 * added to the home screen, so we say that instead of showing a dead switch.
 */
function NotificationRow({
  state,
  busy,
  onToggle,
  t,
}: {
  state: "on" | "off" | "blocked";
  busy: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}) {
  const [supported, setSupported] = useState(true);
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    setSupported(pushSupported());
    setStandalone(isStandalone());
  }, []);

  return (
    <section className="mx-auto mt-4 max-w-md rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {state === "on" ? (
          <Bell className="size-4 text-primary" aria-hidden="true" />
        ) : (
          <BellOff className="size-4 text-muted-foreground" aria-hidden="true" />
        )}
        {t("live-chat.volunteer.alertsTitle")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {!supported
          ? t("live-chat.volunteer.alertsInstallFirst")
          : state === "blocked"
            ? t("live-chat.volunteer.alertsBlocked")
            : t("live-chat.volunteer.alertsBody")}
      </p>
      {supported && state !== "blocked" && (
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-foreground disabled:opacity-60"
        >
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {state === "on" ? t("live-chat.volunteer.alertsOff") : t("live-chat.volunteer.alertsOn")}
        </button>
      )}
      {supported && !standalone && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("live-chat.volunteer.alertsInstallHint")}
        </p>
      )}
    </section>
  );
}
