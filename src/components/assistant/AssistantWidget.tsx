/**
 * Floating AI assistant widget with persistent chat history and link safety warnings.
 * Exports: AssistantWidget. Rendered in the root layout to be available across all public pages.
 */
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "@tanstack/react-router";
import { MessageCircle, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCanonicalPath, useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "icf-assistant-conversation";

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
  const [pendingExternal, setPendingExternal] = useState<string | null>(null);
  const [initialMessages] = useState<UIMessage[]>(() => loadStoredMessages());
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
        return { body: { messages: outgoing, locale }, headers };
      },
    }),
  });

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
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    textareaRef.current?.focus();
  }, [setMessages, stop]);

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
          {t("assistant.launcher")}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={t("assistant.title")}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[min(80vh,40rem)] flex-col overflow-hidden border border-border bg-card shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[26rem] sm:rounded-2xl"
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
                        <>
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
                        </>
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
            <PromptInput onSubmit={(_message, event) => submit(event)}>
              <PromptInputTextarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t("assistant.placeholder")}
              />
              <PromptInputFooter className="justify-end">
                <PromptInputSubmit
                  status={status}
                  disabled={!busy && input.trim().length === 0}
                  onStop={stop}
                />
              </PromptInputFooter>
            </PromptInput>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              {t("assistant.disclaimer")}
            </p>
          </div>
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
