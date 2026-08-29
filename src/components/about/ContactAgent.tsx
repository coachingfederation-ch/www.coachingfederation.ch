"use client";

/**
 * Contact section of /about: a conversation instead of a form.
 *
 * The visitor talks to the assistant, presses "Review and send", and gets an
 * editable summary of what will be sent. Their edits — not the model output —
 * are what leaves the page, and even that only reaches our office once they
 * click the confirmation link in their own inbox.
 *
 * Exports: ContactAgent. Rendered by src/pages/About.tsx.
 */
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowLeft, Mail } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Textarea,
} from "@/design-system/icf-welcome-design-system-a835df";
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
import { draftContactSummary, submitContactEnquiry } from "@/lib/contact-agent.functions";
import { cn } from "@/lib/utils";

type Stage = "chat" | "review" | "done";

function textOf(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ContactAgent() {
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
      api: "/api/contact-agent",
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
        setProblem(t("about.contact.errors.empty"));
        return;
      }
      const draft = await draftContactSummary({ data: { locale, transcript } });
      if (!draft.ok) {
        setProblem(t("about.contact.errors.draft"));
        return;
      }
      setName(draft.name);
      setEmail(draft.email);
      setSubject(draft.subject);
      setBody(draft.body);
      setStage("review");
    } catch {
      setProblem(t("about.contact.errors.draft"));
    } finally {
      setDrafting(false);
    }
  };

  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProblem(null);
    if (!name.trim() || !subject.trim() || !body.trim()) {
      setProblem(t("about.contact.errors.required"));
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setProblem(t("about.contact.errors.email"));
      return;
    }
    setSending(true);
    try {
      const result = await submitContactEnquiry({
        data: {
          locale,
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          body: body.trim(),
          website,
        },
      });
      if (result.status === "verification_sent") {
        setStage("done");
        return;
      }
      setProblem(
        result.status === "rate_limited"
          ? t("about.contact.errors.rateLimited")
          : t("about.contact.errors.send"),
      );
    } catch {
      setProblem(t("about.contact.errors.send"));
    } finally {
      setSending(false);
    }
  };

  const suggestions = [
    t("about.contact.suggestions.coach"),
    t("about.contact.suggestions.organisation"),
    t("about.contact.suggestions.membership"),
  ];

  return (
    <section id="contact" className="bg-card py-24" aria-label={t("about.contact.eyebrow")}>
      <div className="mx-auto max-w-7xl px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-primary">{t("about.contact.eyebrow")}</p>
          <h2 className="mt-3 display-lg">{t("about.contact.title")}</h2>
          <p className="mt-4 text-muted-foreground">{t("about.contact.lede")}</p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-border bg-background">
          {stage === "chat" && (
            <div className="flex h-[32rem] flex-col">
              <Conversation className="flex-1">
                <ConversationContent className="gap-4 px-5 py-5">
                  {messages.length === 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">{t("about.contact.empty")}</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => void sendMessage({ text: suggestion })}
                            className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary"
                          >
                            {suggestion}
                          </button>
                        ))}
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

                  {status === "submitted" && (
                    <Shimmer className="text-sm">{t("about.contact.thinking")}</Shimmer>
                  )}
                  {error && (
                    <p role="alert" className="text-sm text-destructive">
                      {t("about.contact.errors.chat")}
                    </p>
                  )}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>

              <div className="border-t border-border p-4">
                <PromptInput className="relative" onSubmit={(_message, event) => submitTurn(event)}>
                  <PromptInputTextarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={t("about.contact.placeholder")}
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
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    {t("about.contact.disclaimer")}
                  </p>
                  <Button
                    type="button"
                    size="pill"
                    onClick={() => void startReview()}
                    disabled={drafting || busy || messages.length === 0}
                  >
                    <Mail aria-hidden="true" />
                    {drafting ? t("about.contact.preparing") : t("about.contact.review")}
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
            <form onSubmit={send} className="space-y-5 p-6 sm:p-8">
              <div>
                <h3 className="font-display text-xl font-bold tracking-tight">
                  {t("about.contact.reviewTitle")}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("about.contact.reviewLede")}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contact-name">{t("about.contact.nameLabel")}</Label>
                <Input
                  id="contact-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("about.contact.namePlaceholder")}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contact-email">{t("about.contact.emailLabel")}</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t("about.contact.emailPlaceholder")}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contact-subject">{t("about.contact.subjectLabel")}</Label>
                <Input
                  id="contact-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contact-body">{t("about.contact.messageLabel")}</Label>
                <Textarea
                  id="contact-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={9}
                  required
                />
              </div>

              {/* Honeypot — visually hidden, never announced, always empty. */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
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
                  {sending ? t("about.contact.sending") : t("about.contact.send")}
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
                  {t("about.contact.back")}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {t("about.contact.privacy")}{" "}
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
              <h3 className="font-display text-xl font-bold tracking-tight">
                {t("about.contact.doneTitle")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("about.contact.doneBody").replace("{email}", email)}
              </p>
              <p className="text-xs text-muted-foreground">{t("about.contact.doneHint")}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
