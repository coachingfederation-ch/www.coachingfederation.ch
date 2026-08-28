/**
 * Support agent for the internal CMS screens.
 * Exports: StaffAssistant. Mounted once by the `_staff` layout, so it only
 * ever exists behind the staff gate.
 *
 * An orb launcher expands into a compact chat panel. The agent explains the
 * screen you are on and can read the record open in it; it has no write path.
 * The conversation is one rolling thread kept in this browser only — nothing
 * about these chats is stored in the backend.
 */
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouterState } from "@tanstack/react-router";
import { RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useCms } from "@/i18n/cms";
import { supabase } from "@/integrations/supabase/client";
import { screenFor, starterQuestionsFor, type StaffRecordKind } from "@/lib/assistant/staff-help";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "icfs-staff-agent-conversation";

/** Which record — if any — the current path has open. */
function openRecord(pathname: string): { kind: StaffRecordKind; id: string } | undefined {
  const screen = screenFor(pathname);
  if (!screen?.record) return undefined;
  const rest = pathname.replace(/^\/(de|fr|it|en)(?=\/|$)/, "").slice(screen.prefix.length);
  const id = rest.split("/").filter(Boolean)[0];
  if (!id || !/^[0-9a-f-]{16,64}$/i.test(id)) return undefined;
  return { kind: screen.record, id };
}

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

export function StaffAssistant() {
  const { t, locale } = useCms();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [initialMessages] = useState<UIMessage[]>(() => loadStoredMessages());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const contextRef = useRef({ pathname, locale });
  contextRef.current = { pathname, locale };

  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/staff-assistant",
      prepareSendMessagesRequest: async ({ messages: outgoing }) => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const { pathname: path, locale: lang } = contextRef.current;
        const record = openRecord(path);
        return {
          body: {
            messages: outgoing,
            locale: lang,
            path,
            recordKind: record?.kind,
            recordId: record?.id,
          },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        };
      },
    }),
  });

  const busy = status === "submitted" || status === "streaming";
  const starters = useMemo(() => starterQuestionsFor(pathname), [pathname]);

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

  const ask = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    void sendMessage({ text: value });
  };

  const reset = () => {
    setMessages([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clean up.
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("staffAgent.open")}
        className="group fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-hero text-hero-foreground shadow-soft outline-none transition focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-accent/40 motion-safe:animate-ping motion-reduce:hidden"
        />
        <span
          aria-hidden
          className="relative grid h-7 w-7 place-items-center rounded-full bg-accent/90"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-hero" />
        </span>
      </button>
    );
  }

  return (
    <section
      aria-label={t("staffAgent.title")}
      className="fixed bottom-6 right-6 z-50 flex h-[32rem] w-[min(24rem,calc(100vw-3rem))] max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
    >
      <header className="flex items-center gap-3 bg-hero px-4 py-3 text-hero-foreground">
        <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-accent/90">
          <span className="h-2.5 w-2.5 rounded-full bg-hero" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{t("staffAgent.title")}</p>
          <p className="truncate text-xs opacity-80">
            {screenFor(pathname)?.title ?? t("staffAgent.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          aria-label={t("staffAgent.reset")}
          className="rounded-full p-1.5 opacity-80 transition hover:bg-white/10 hover:opacity-100"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("staffAgent.close")}
          className="rounded-full p-1.5 opacity-80 transition hover:bg-white/10 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <Conversation className="flex-1">
        <ConversationContent className="gap-3">
          {messages.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("staffAgent.greeting")}</p>
              <div className="flex flex-col items-start gap-2">
                {starters.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => ask(question)}
                    className="rounded-2xl border border-border px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-secondary"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) => {
            const text = message.parts
              .map((part) => (part.type === "text" ? part.text : ""))
              .join("")
              .trim();
            if (!text) return null;
            return (
              <Message key={message.id} from={message.role}>
                <MessageContent
                  className={cn(
                    message.role === "assistant" && "bg-transparent p-0 text-foreground",
                  )}
                >
                  <MessageResponse>{text}</MessageResponse>
                </MessageContent>
              </Message>
            );
          })}

          {status === "submitted" ? <Shimmer>{t("staffAgent.thinking")}</Shimmer> : null}
          {error ? <p className="text-xs text-destructive">{t("staffAgent.error")}</p> : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-3">
        <PromptInput
          onSubmit={(_message, event) => {
            event.preventDefault();
            ask(input);
          }}
        >
          <PromptInputTextarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("staffAgent.placeholder")}
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit size="icon-sm" status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
        <p className="mt-2 text-[11px] text-muted-foreground">{t("staffAgent.disclaimer")}</p>
      </div>
    </section>
  );
}
