/**
 * Visitor side of the live volunteer chat, shown inside the assistant widget
 * once the visitor asks to talk to a person.
 *
 * The visitor is anonymous, so the browser never touches the chat tables: it
 * talks to `/api/public/live-chat` with the opaque conversation key it was
 * given at start, kept in localStorage so a reload rejoins the same thread.
 * Updates arrive by short polling — an anonymous Realtime subscription would
 * require read access to the tables, which we deliberately do not grant.
 *
 * Exports: LiveChatPanel.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "icf-live-chat-session";
/** How long we wait for someone to pick up before offering the fallback. */
const NO_ANSWER_MS = 120_000;
const POLL_MS = 3000;

type Message = { id: string; sender: "visitor" | "volunteer" | "system"; body: string };

type View = {
  status: "waiting" | "active" | "closed";
  volunteerName: string | null;
  messages: Message[];
};

type Session = { conversationId: string; visitorKey: string; startedAt: number };

function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Session;
    return value.conversationId && value.visitorKey ? value : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode: the chat still works for this page view.
  }
}

async function call(body: Record<string, unknown>) {
  const response = await fetch("/api/public/live-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response;
}

export function LiveChatPanel({ onBack, pagePath }: { onBack: () => void; pagePath: string }) {
  const { t, locale } = useI18n();
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [view, setView] = useState<View | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Poll while a conversation is open; stop once it is closed.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const tick = async () => {
      const response = await call({
        action: "poll",
        conversationId: session.conversationId,
        visitorKey: session.visitorKey,
      }).catch(() => null);
      if (cancelled) return;
      if (!response || response.status === 404) {
        saveSession(null);
        setSession(null);
        setView(null);
        return;
      }
      if (!response.ok) return;
      setView((await response.json()) as View);
    };

    void tick();
    const timer = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [view?.messages.length, view?.status]);

  const start = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (busy || !name.trim() || !message.trim()) return;
      setBusy(true);
      setError(null);
      const response = await call({
        action: "start",
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        locale,
        pagePath,
      }).catch(() => null);
      setBusy(false);
      if (!response || !response.ok) {
        setError(response?.status === 409 ? t("live-chat.offlineNotice") : t("live-chat.error"));
        return;
      }
      const started = (await response.json()) as { conversationId: string; visitorKey: string };
      const next = { ...started, startedAt: Date.now() };
      saveSession(next);
      setSession(next);
      setMessage("");
    },
    [busy, email, locale, message, name, pagePath, t],
  );

  const send = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const text = reply.trim();
      if (!session || !text) return;
      setReply("");
      // Optimistic echo keeps the thread responsive between polls.
      setView((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...prev.messages,
                { id: `local-${Date.now()}`, sender: "visitor", body: text },
              ],
            }
          : prev,
      );
      await call({
        action: "send",
        conversationId: session.conversationId,
        visitorKey: session.visitorKey,
        body: text,
      }).catch(() => null);
    },
    [reply, session],
  );

  const end = useCallback(async () => {
    if (session) {
      await call({
        action: "end",
        conversationId: session.conversationId,
        visitorKey: session.visitorKey,
      }).catch(() => null);
    }
    saveSession(null);
    setSession(null);
    setView(null);
    onBack();
  }, [onBack, session]);

  const waitedTooLong =
    session && view?.status === "waiting" && Date.now() - session.startedAt > NO_ANSWER_MS;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("live-chat.back")}
        </button>
        {session && (
          <button
            type="button"
            onClick={() => void end()}
            className="min-h-9 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("live-chat.endChat")}
          </button>
        )}
      </div>

      {!session ? (
        <form onSubmit={start} className="flex-1 space-y-3 overflow-y-auto p-4">
          <p className="text-sm text-muted-foreground">{t("live-chat.intro")}</p>
          <label className="block text-xs font-semibold text-foreground">
            {t("live-chat.nameLabel")}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("live-chat.namePlaceholder")}
              required
              maxLength={80}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="block text-xs font-semibold text-foreground">
            {t("live-chat.emailLabel")}
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("live-chat.emailPlaceholder")}
              type="email"
              maxLength={160}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="block text-xs font-semibold text-foreground">
            {t("live-chat.messageLabel")}
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t("live-chat.messagePlaceholder")}
              required
              rows={3}
              maxLength={2000}
              className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {busy ? t("live-chat.starting") : t("live-chat.start")}
          </button>
          <p className="text-[11px] leading-snug text-muted-foreground">{t("live-chat.privacy")}</p>
        </form>
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {view?.status === "waiting" && (
              <p className="text-sm text-muted-foreground">
                {waitedTooLong ? t("live-chat.noAnswer") : t("live-chat.waiting")}
              </p>
            )}
            {view?.status === "active" && view.volunteerName && (
              <p className="text-xs text-muted-foreground">
                {t("live-chat.connected")} {view.volunteerName}
              </p>
            )}
            {(view?.messages ?? []).map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  entry.sender === "visitor"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : entry.sender === "system"
                      ? "mx-auto bg-secondary text-center text-xs text-muted-foreground"
                      : "bg-secondary text-foreground",
                )}
              >
                <span className="whitespace-pre-wrap">{entry.body}</span>
              </div>
            ))}
            {view?.status === "closed" && (
              <p className="text-sm text-muted-foreground">{t("live-chat.ended")}</p>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={send} className="flex items-end gap-2 border-t border-border p-3">
            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(event as unknown as React.FormEvent);
                }
              }}
              rows={2}
              maxLength={2000}
              disabled={view?.status === "closed"}
              placeholder={t("live-chat.placeholder")}
              aria-label={t("live-chat.placeholder")}
              className="min-h-11 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={view?.status === "closed" || reply.trim().length === 0}
              className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {t("live-chat.send")}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
