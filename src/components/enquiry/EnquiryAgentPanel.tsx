"use client";

/**
 * Shared conversation panel behind the two AI enquiry flows: the contact
 * conversation on /about and the event proposal on /events.
 *
 * Both work the same way — the visitor talks it through, presses "Review and
 * send", and edits the summary the assistant drafts. Their edited text, never
 * the model output, is what is submitted, and even that only reaches our office
 * once they click the confirmation link in their own inbox. Everything that
 * differs between the two flows (endpoint, copy, enquiry kind) is a prop, so
 * the behaviour can never drift apart.
 *
 * Exports: EnquiryAgentPanel, EnquiryCopy.
 */
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowLeft, Mail } from "lucide-react";
import { Button, Input, Label, Textarea } from "@/design-system/icf-welcome-design-system-a835df";
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
import { useI18n } from "@/i18n";
import {
  draftContactSummary,
  submitContactEnquiry,
  type EnquiryKind,
} from "@/lib/contact-agent.functions";
import { cn } from "@/lib/utils";

type Stage = "chat" | "review" | "done";

function textOf(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type EnquiryAgentPanelProps = {
  /** Streaming chat endpoint for this flow. */
  api: string;
  /** Which kind of enquiry the summary becomes. */
  kind: EnquiryKind;
  /** Unique id prefix so two panels can never collide on one page. */
  idPrefix: string;
  /** Reads one copy key of this flow, e.g. `(k) => t(\`events.propose.${k}\`)`. */
  tp: (key: string) => string;
  /** Copy keys of the starter chips shown on the empty conversation. */
  suggestionKeys: string[];
  /** "overlay" fills the height of a dialog or sheet and drops the outer frame. */
  variant?: "inline" | "overlay";
  /** Fires once the verification email is on its way. */
  onComplete?: () => void;
  className?: string;
};

export function EnquiryAgentPanel({
  api,
  kind,
  idPrefix,
  tp,
  suggestionKeys,
  variant = "inline",
  onComplete,
  className,
}: EnquiryAgentPanelProps) {
  const { t, locale } = useI18n();
  const [stage, setStage] = useState<Stage>("chat");
  const [input, setInput] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  /** Honeypot: a real visitor never fills this in. */
  const [website, setWebsite] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({
      api,
      prepareSendMessagesRequest: ({ messages: outgoing }) => ({
        body: { messages: outgoing, locale },
      }),
    }),
  });

  const busy = status === "submitted" || status === "streaming";

  // Keep the composer ready between turns, the way a chat is expected to behave.
  useEffect(() => {
    if (stage === "chat" && status === "ready") textareaRef.current?.focus();
  }, [stage, status]);

  const submitTurn = (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void sendMessage({ text });
  };

  const startReview = async () => {
    setProblem(null);
    setDrafting(true);
    try {
      const transcript = messages
        .map((message) => ({ role: message.role, text: textOf(message) }))
        .filter(
          (turn): turn is { role: "user" | "assistant"; text: string } =>
            (turn.role === "user" || turn.role === "assistant") && turn.text.length > 0,
        )
        .slice(-24);
      if (transcript.length === 0) {
        setProblem(tp("errors.empty"));
        return;
      }
      const draft = await draftContactSummary({ data: { locale, kind, transcript } });
      if (!draft.ok) {
        setProblem(tp("errors.draft"));
        return;
      }
      setName(draft.name);
      setEmail(draft.email);
      setSubject(draft.subject);
      setBody(draft.body);
      setStage("review");
    } catch {
      setProblem(tp("errors.draft"));
    } finally {
      setDrafting(false);
    }
  };

  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProblem(null);
    if (!name.trim() || !subject.trim() || !body.trim()) {
      setProblem(tp("errors.required"));
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setProblem(tp("errors.email"));
      return;
    }
    setSending(true);
    try {
      const result = await submitContactEnquiry({
        data: {
          locale,
          kind,
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          body: body.trim(),
          website,
        },
      });
      if (result.status === "verification_sent") {
        setStage("done");
        onComplete?.();
        return;
      }
      setProblem(result.status === "rate_limited" ? tp("errors.rateLimited") : tp("errors.send"));
    } catch {
      setProblem(tp("errors.send"));
    } finally {
      setSending(false);
    }
  };

  const overlay = variant === "overlay";

  return (
    <div
      className={cn(
        "flex flex-col bg-background text-foreground",
        overlay ? "overflow-hidden" : "rounded-3xl border border-border",
        className,
      )}
    >
      {stage === "chat" && (
        <div className={cn("flex min-h-0 flex-col", overlay ? "flex-1" : "h-128")}>
          <Conversation className="flex-1">
            <ConversationContent className={cn("gap-6", overlay ? "px-8 py-6" : "px-6 py-6")}>
              {messages.length === 0 && (
                <div className="space-y-4">
                  <p className="text-base leading-relaxed text-muted-foreground">{tp("empty")}</p>
                  <div className="flex flex-col items-start gap-2">
                    {suggestionKeys.map((key) => {
                      const suggestion = tp(`suggestions.${key}`);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => void sendMessage({ text: suggestion })}
                          className="rounded-full border border-border px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {suggestion}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {messages.map((message) => {
                const text = textOf(message);
                if (!text) return null;
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
                        <MessageResponse>{text}</MessageResponse>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">{text}</p>
                      )}
                    </MessageContent>
                  </Message>
                );
              })}

              {status === "submitted" && <Shimmer className="text-sm">{tp("thinking")}</Shimmer>}
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {tp("errors.chat")}
                </p>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className={cn("border-t border-border", overlay ? "px-8 py-5" : "p-4")}>
            <PromptInput className="relative" onSubmit={(_message, event) => submitTurn(event)}>
              <PromptInputTextarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={tp("placeholder")}
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

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-snug text-muted-foreground">{tp("disclaimer")}</p>
              <Button
                type="button"
                size="pill"
                onClick={() => void startReview()}
                disabled={drafting || busy || messages.length === 0}
              >
                <Mail aria-hidden="true" />
                {drafting ? tp("preparing") : tp("review")}
              </Button>
            </div>
            {problem && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {problem}
              </p>
            )}
          </div>
        </div>
      )}

      {stage === "review" && (
        <form onSubmit={send} className="space-y-5 p-6 text-left sm:p-8">
          <div>
            <h3 className="font-display text-xl font-bold tracking-tight">{tp("reviewTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{tp("reviewLede")}</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-name`}>{tp("nameLabel")}</Label>
            <Input
              id={`${idPrefix}-name`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={tp("namePlaceholder")}
              autoComplete="name"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-email`}>{tp("emailLabel")}</Label>
            <Input
              id={`${idPrefix}-email`}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={tp("emailPlaceholder")}
              autoComplete="email"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-subject`}>{tp("subjectLabel")}</Label>
            <Input
              id={`${idPrefix}-subject`}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-body`}>{tp("messageLabel")}</Label>
            <Textarea
              id={`${idPrefix}-body`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={9}
              required
            />
          </div>

          {/* Honeypot — visually hidden, never announced, always empty. */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor={`${idPrefix}-website`}>Website</label>
            <input
              id={`${idPrefix}-website`}
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>

          {problem && (
            <p role="alert" className="text-sm text-destructive">
              {problem}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="pill" disabled={sending}>
              {sending ? tp("sending") : tp("send")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="pill"
              onClick={() => {
                setProblem(null);
                setStage("chat");
              }}
              disabled={sending}
            >
              <ArrowLeft aria-hidden="true" />
              {tp("back")}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {tp("privacy")}{" "}
            <a
              href="/privacy"
              target="_top"
              className="underline underline-offset-2 hover:text-primary"
            >
              {t("common.footer.privacy")}
            </a>
            .
          </p>
        </form>
      )}

      {stage === "done" && (
        <div className="space-y-4 p-8 text-center" role="status">
          <h3 className="font-display text-xl font-bold tracking-tight">{tp("doneTitle")}</h3>
          <p className="text-sm text-muted-foreground">
            {tp("doneBody").replace("{email}", email)}
          </p>
          <p className="text-xs text-muted-foreground">{tp("doneHint")}</p>
        </div>
      )}
    </div>
  );
}
