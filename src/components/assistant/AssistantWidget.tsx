/**
 * Floating AI assistant widget with persistent chat history and link safety warnings.
 * Exports: AssistantWidget. Rendered in the root layout to be available across all public pages.
 */
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "@tanstack/react-router";
import { MessageCircle, RotateCcw, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { LiveChatPanel } from "@/components/assistant/LiveChatPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/design-system/icf-welcome-design-system-a835df";
import { useCanonicalPath, useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ASSISTANT_ASK_EVENT, type AssistantAskDetail } from "@/lib/assistant-open";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "icf-assistant-conversation";
const SESSION_KEY = "icf-assistant-session";

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`.padEnd(36, "0").slice(0, 36);
}

/**
 * An opaque per-visit identifier so the insights report can tell "one person
 * asked five questions" from "five people asked one". It is generated in the
 * browser, kept in sessionStorage and never linked to an account.
 */
function currentSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh = randomId();
    window.sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return null;
  }
}

/** Fire-and-forget telemetry: a failure here must never disturb the chat. */
function sendSignal(body: {
  interactionId: string;
  feedback?: "helpful" | "not_helpful";
  contactClicked?: boolean;
}) {
  void fetch("/api/public/chat-signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
}

/** The human fallback the assistant offers; a click on it counts as a referral. */
function isContactHref(href: string) {
  return /office@coachingfederation\.ch/i.test(href) || /\/contact\b/i.test(href);
}

/**
 * Links the assistant writes are relative site paths; only a full URL to
 * another origin counts as external. Streamdown's "open external link?"
 * confirmation is therefore reserved for those.
 */
function isExternalHref(href: string) {
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href)) return false; // relative path or hash
  if (typeof window === "undefined") return true;
  try {
    return new URL(href, window.location.href).origin !== window.location.origin;
  } catch {
    return true;
  }
}

/** One rolling conversation per browser — no server-side chat history. */
function loadStoredMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as UIMessage[]) : [];
  } catch {
    return [];
  }
}

function textOf(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

/** Tool activity the visitor sees as a status line rather than raw JSON. */
function isToolPart(part: UIMessage["parts"][number]) {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

/** Staff CMS and member workspace paths keep their own focused UI. */
const HIDDEN_PREFIXES = [
  "/articles",
  "/manage",
  "/members",
  "/roles",
  "/vocabularies",
  "/integration",
  "/coach-finder",
  "/operational-structure",
  "/my-profile",
];

export function AssistantWidget() {
  const { t, locale } = useI18n();
  const path = useCanonicalPath();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  /** Number of volunteers on duty; drives the launcher dot and the handover. */
  const [volunteersOnline, setVolunteersOnline] = useState(0);
  const [liveChat, setLiveChat] = useState(false);
  const [pendingExternal, setPendingExternal] = useState<string | null>(null);
  const [initialMessages] = useState<UIMessage[]>(() => loadStoredMessages());
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  /** Interaction id of the turn currently in flight, if any. */
  const pendingInteraction = useRef<string | null>(null);
  /** Assistant message id → interaction id, so feedback finds the right row. */
  const [turnIds, setTurnIds] = useState<Record<string, string>>({});
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, "helpful" | "not_helpful">>({});

  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // The route reads the locale for its answer language, and treats the
      // bearer token as optional extra context for signed-in members.
      prepareSendMessagesRequest: async ({ messages: outgoing }) => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const interactionId = randomId();
        pendingInteraction.current = interactionId;
        return {
          body: {
            messages: outgoing,
            locale,
            interactionId,
            sessionId: currentSessionId(),
          },
          headers,
        };
      },
    }),
  });

  // Once a turn settles, remember which answer belongs to which logged
  // interaction so the "was this helpful?" buttons can report against it.
  useEffect(() => {
    if (status !== "ready") return;
    const id = pendingInteraction.current;
    if (!id) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    pendingInteraction.current = null;
    setTurnIds((prev) => (prev[last.id] ? prev : { ...prev, [last.id]: id }));
  }, [messages, status]);

  // Persist after every change so a reload keeps the conversation.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Private mode or a full quota: the chat still works for this session.
    }
  }, [messages]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open, status]);

  // On phones the panel is a full-screen sheet. iOS Safari does not shrink
  // 100dvh when the on-screen keyboard opens, so the composer would slide
  // under it; visualViewport tells us the part of the screen that is really
  // visible and we pin the sheet to exactly that box.
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const vv = window.visualViewport;
    const isMobile = () => window.matchMedia("(max-width: 639px)").matches;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    if (isMobile()) body.style.overflow = "hidden";

    const apply = () => {
      const root = document.documentElement;
      if (!vv || !isMobile()) {
        root.style.removeProperty("--assistant-vh");
        root.style.removeProperty("--assistant-offset");
        return;
      }
      root.style.setProperty("--assistant-vh", `${vv.height}px`);
      root.style.setProperty(
        "--assistant-offset",
        `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`,
      );
    };

    apply();
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("orientationchange", apply);
      body.style.overflow = previousOverflow;
      document.documentElement.style.removeProperty("--assistant-vh");
      document.documentElement.style.removeProperty("--assistant-offset");
    };
  }, [open]);

  // Poll the volunteer count so the launcher can promise a human only when one
  // is actually there. Cheap (a single integer) and paused while hidden.
  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const response = await fetch("/api/public/live-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status" }),
        });
        if (!response.ok || cancelled) return;
        const body = (await response.json()) as { online?: number };
        setVolunteersOnline(typeof body.online === "number" ? body.online : 0);
      } catch {
        // Offline or blocked: keep the AI-only launcher.
      }
    };
    void read();
    const timer = window.setInterval(() => void read(), open ? 20_000 : 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open]);

  const busy = status === "submitted" || status === "streaming";

  const submit = useCallback(
    (event?: React.FormEvent) => {
      event?.preventDefault();
      const text = input.trim();
      if (!text || busy) return;
      setInput("");
      void sendMessage({ text });
    },
    [busy, input, sendMessage],
  );

  const reset = useCallback(() => {
    stop();
    setMessages([]);
    setInput("");
    setTurnIds({});
    setFeedbackGiven({});
    pendingInteraction.current = null;
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    textareaRef.current?.focus();
  }, [setMessages, stop]);

  // A page CTA can open the panel with a question already asked (see
  // src/lib/assistant-open.ts). The question is queued rather than sent
  // directly so a turn that is still streaming is never interrupted.
  const [queuedAsk, setQueuedAsk] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const text = (event as CustomEvent<AssistantAskDetail>).detail?.text?.trim();
      if (!text) return;
      setLiveChat(false);
      setOpen(true);
      setQueuedAsk(text);
    };
    window.addEventListener(ASSISTANT_ASK_EVENT, handler);
    return () => window.removeEventListener(ASSISTANT_ASK_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!queuedAsk || status !== "ready") return;
    setQueuedAsk(null);
    void sendMessage({ text: queuedAsk });
  }, [queuedAsk, sendMessage, status]);


  const suggestions = [
    t("assistant.suggestions.coach"),
    t("assistant.suggestions.events"),
    t("assistant.suggestions.credentials"),
  ];

  // Internal links navigate straight away; only off-site links get a warning.
  const markdownComponents = useMemo(
    () => ({
      a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
        const target = href ?? "";
        if (!target || isExternalHref(target)) {
          return (
            <a
              {...props}
              href={target || undefined}
              onClick={(event) => {
                if (!target) return;
                event.preventDefault();
                setPendingExternal(target);
              }}
            >
              {children}
            </a>
          );
        }
        return (
          <a
            {...props}
            href={target}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
              event.preventDefault();
              setOpen(false);
              void router.navigate({ to: target });
            }}
          >
            {children}
          </a>
        );
      },
    }),
    [router],
  );

  if (HIDDEN_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return null;
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-lg transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          {volunteersOnline > 0 ? t("live-chat.launcher") : t("assistant.launcher")}
          {volunteersOnline > 0 && (
            <span
              className="size-2.5 rounded-full bg-emerald-500 ring-2 ring-accent"
              title={t("live-chat.online")}
              aria-label={t("live-chat.online")}
            />
          )}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={t("assistant.title")}
          style={
            {
              // Mobile only: pinned to the visible viewport so the keyboard
              // never covers the composer. Ignored from `sm:` upwards.
              "--assistant-sheet-height": "var(--assistant-vh, 100dvh)",
              "--assistant-sheet-bottom": "var(--assistant-offset, 0px)",
            } as React.CSSProperties
          }
          className="fixed inset-x-0 bottom-[var(--assistant-sheet-bottom)] z-50 flex h-[var(--assistant-sheet-height)] flex-col overflow-hidden border border-border bg-card shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[min(80vh,40rem)] sm:w-[26rem] sm:rounded-2xl"
        >
          <header className="flex items-start justify-between gap-3 bg-hero px-4 py-3 text-hero-foreground">
            <div>
              <p className="font-display text-base font-semibold">{t("assistant.title")}</p>
              <p className="text-xs text-hero-foreground/80">{t("assistant.subtitle")}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={reset}
                aria-label={t("assistant.reset")}
                className="rounded-full p-2 transition-colors hover:bg-hero-foreground/10"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("assistant.close")}
                className="rounded-full p-2 transition-colors hover:bg-hero-foreground/10"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          {liveChat ? (
            <LiveChatPanel onBack={() => setLiveChat(false)} pagePath={path} />
          ) : (
            <>
              <Conversation className="flex-1">
                <ConversationContent className="gap-4 px-4 py-4">
                  {messages.length === 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">{t("assistant.empty")}</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => void sendMessage({ text: suggestion })}
                            className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message) => {
                    const text = textOf(message);
                    const usedTool = message.parts.some(isToolPart);
                    if (!text && !usedTool) return null;
                    const interactionId = turnIds[message.id];
                    return (
                      <Message key={message.id} from={message.role}>
                        <MessageContent
                          className={cn(
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-transparent p-0 text-foreground",
                          )}
                        >
                          {message.role === "assistant" ? (
                            <div
                              onClickCapture={(event) => {
                                // A click on the contact address is the signal that
                                // the referral actually landed.
                                const anchor = (event.target as HTMLElement).closest("a");
                                const href = anchor?.getAttribute("href") ?? "";
                                if (interactionId && href && isContactHref(href)) {
                                  sendSignal({ interactionId, contactClicked: true });
                                }
                              }}
                            >
                              {!text && usedTool && (
                                <Shimmer className="text-sm">{t("assistant.searching")}</Shimmer>
                              )}
                              {text && (
                                <MessageResponse
                                  components={markdownComponents}
                                  linkSafety={{ enabled: false }}
                                  className="text-sm leading-relaxed [&_a]:cursor-pointer [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:my-2 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
                                >
                                  {text}
                                </MessageResponse>
                              )}
                              {text && interactionId && (
                                <div className="mt-2 flex items-center gap-2">
                                  {feedbackGiven[interactionId] ? (
                                    <span className="text-[11px] text-muted-foreground">
                                      {t("assistant.feedback.thanks")}
                                    </span>
                                  ) : (
                                    <>
                                      <span className="text-[11px] text-muted-foreground">
                                        {t("assistant.feedback.question")}
                                      </span>
                                      {(["helpful", "not_helpful"] as const).map((value) => (
                                        <button
                                          key={value}
                                          type="button"
                                          aria-label={t(
                                            `assistant.feedback.${value === "helpful" ? "yes" : "no"}`,
                                          )}
                                          onClick={() => {
                                            setFeedbackGiven((prev) => ({
                                              ...prev,
                                              [interactionId]: value,
                                            }));
                                            sendSignal({ interactionId, feedback: value });
                                          }}
                                          className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                          {value === "helpful" ? (
                                            <ThumbsUp className="size-3.5" aria-hidden="true" />
                                          ) : (
                                            <ThumbsDown className="size-3.5" aria-hidden="true" />
                                          )}
                                        </button>
                                      ))}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-sm">{text}</p>
                          )}
                        </MessageContent>
                      </Message>
                    );
                  })}

                  {status === "submitted" && (
                    <Shimmer className="text-sm">{t("assistant.thinking")}</Shimmer>
                  )}
                  {error && (
                    <p role="alert" className="text-sm text-destructive">
                      {t("assistant.error")}
                    </p>
                  )}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>

              <div className="border-t border-border p-3">
                {/* Single-line composer that grows with the text; the send button
                sits inside the field so the bar stays one row tall. */}
                <PromptInput className="relative" onSubmit={(_message, event) => submit(event)}>
                  <PromptInputTextarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={t("assistant.placeholder")}
                    rows={1}
                    className="max-h-40 min-h-11 py-2.5 pr-14"
                  />
                  <PromptInputSubmit
                    status={status}
                    disabled={!busy && input.trim().length === 0}
                    onStop={stop}
                    className="absolute bottom-1.5 right-1.5 z-10 size-11 sm:size-9"
                  />
                </PromptInput>

                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  {t("assistant.disclaimer")}
                </p>
                {volunteersOnline > 0 && (
                  <button
                    type="button"
                    onClick={() => setLiveChat(true)}
                    className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-full border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                  >
                    <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
                    {t("live-chat.handover")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <AlertDialog
        open={pendingExternal !== null}
        onOpenChange={(next: boolean) => {
          if (!next) setPendingExternal(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("assistant.externalLink.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("assistant.externalLink.body")}
              <span className="mt-2 block break-all font-medium text-foreground">
                {pendingExternal}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("assistant.externalLink.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingExternal) window.open(pendingExternal, "_blank", "noopener,noreferrer");
                setPendingExternal(null);
              }}
            >
              {t("assistant.externalLink.open")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
