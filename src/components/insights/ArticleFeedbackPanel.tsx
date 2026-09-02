/**
 * "Steer the editorial" — reader feedback at the end of an article.
 *
 * Two 1-5 dials, topic chips the reader can extend, an optional sentence and
 * an optional email. No sign-in: the submission goes to the public route,
 * which rate-limits per caller. One answer per article per browser, remembered
 * in localStorage so a reload shows the thank-you state instead of the form.
 * Exports: ArticleFeedbackPanel.
 */
import { useEffect, useState } from "react";
import {
  Button,
  Input,
  Label,
  Slider,
  Textarea,
} from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";
import {
  DIAL_MAX,
  DIAL_MID,
  DIAL_MIN,
  MAX_COMMENT_LENGTH,
  MAX_TOPICS,
  MAX_TOPIC_LENGTH,
  feedbackStorageKey,
  topicSlug,
} from "@/lib/article-feedback";
import { trackGoal } from "@/lib/plausible";

type Props = { articleId: string; suggestedTopics: string[] };

/** Reads the "already answered" marker without breaking SSR. */
function readStored(articleId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(feedbackStorageKey(articleId)) !== null;
  } catch {
    return false;
  }
}

function Dial({
  label,
  minLabel,
  maxLabel,
  value,
  valueLabel,
  onChange,
}: {
  label: string;
  minLabel: string;
  maxLabel: string;
  value: number;
  valueLabel: string;
  onChange: (next: number) => void;
}) {
  const id = `dial-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <Label htmlFor={id} className="text-base font-semibold text-foreground">
          {label}
        </Label>
        <span className="text-sm font-semibold text-primary">{valueLabel}</span>
      </div>
      <Slider
        id={id}
        className="mt-4"
        min={DIAL_MIN}
        max={DIAL_MAX}
        step={1}
        value={[value]}
        onValueChange={(next) => onChange(next[0] ?? DIAL_MID)}
        aria-label={label}
        aria-valuetext={valueLabel}
      />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

export function ArticleFeedbackPanel({ articleId, suggestedTopics }: Props) {
  const { t, locale } = useI18n();
  const [hydrated, setHydrated] = useState(false);
  const [done, setDone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [depth, setDepth] = useState(DIAL_MID);
  const [usefulness, setUsefulness] = useState(DIAL_MID);
  const [topics, setTopics] = useState<string[]>([]);
  const [ownTopic, setOwnTopic] = useState("");
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // localStorage is read after mount so the server and the first client render
  // agree; the panel simply appears once we know what this browser answered.
  useEffect(() => {
    setDone(readStored(articleId));
    setHydrated(true);
  }, [articleId]);

  const suggestions = Array.from(
    new Map(
      [...suggestedTopics, ...topics].filter(Boolean).map((topic) => [topicSlug(topic), topic]),
    ).values(),
  );

  const toggleTopic = (topic: string) => {
    setTopics((current) => {
      const key = topicSlug(topic);
      if (current.some((entry) => topicSlug(entry) === key)) {
        return current.filter((entry) => topicSlug(entry) !== key);
      }
      if (current.length >= MAX_TOPICS) return current;
      return [...current, topic];
    });
  };

  const addOwnTopic = () => {
    const value = ownTopic.trim().slice(0, MAX_TOPIC_LENGTH);
    if (!value) return;
    if (!topics.some((entry) => topicSlug(entry) === topicSlug(value))) toggleTopic(value);
    setOwnTopic("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      const response = await fetch("/api/public/article-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          locale,
          depth,
          usefulness,
          topics,
          comment: comment.trim() || undefined,
          email: email.trim() || undefined,
          website,
        }),
      });
      if (!response.ok) {
        setError(
          response.status === 429 ? t("insights.feedback.tooMany") : t("insights.feedback.failed"),
        );
        setSending(false);
        return;
      }
      try {
        window.localStorage.setItem(feedbackStorageKey(articleId), new Date().toISOString());
      } catch {
        /* private mode: the thank-you state simply does not survive a reload */
      }
      trackGoal("Article Feedback", { article_id: articleId });
      setDone(true);
      setEditing(false);
    } catch {
      setError(t("insights.feedback.failed"));
    } finally {
      setSending(false);
    }
  };

  if (!hydrated) return null;

  if (done && !editing) {
    return (
      <section className="mt-16 rounded-3xl border border-border bg-card p-8">
        <p className="eyebrow text-primary">{t("insights.feedback.eyebrow")}</p>
        <h2 className="mt-3 font-heading text-2xl leading-tight">
          {t("insights.feedback.thanksTitle")}
        </h2>
        <p className="mt-3 text-base text-muted-foreground">{t("insights.feedback.thanksBody")}</p>
        <Button variant="outline" size="pill" className="mt-6" onClick={() => setEditing(true)}>
          {t("insights.feedback.editAnswer")}
        </Button>
      </section>
    );
  }

  const dialLabel = (prefix: string, value: number) =>
    t(`insights.feedback.${prefix}Scale.${value}`);

  return (
    <section className="mt-16 rounded-3xl border border-border bg-card p-8">
      <p className="eyebrow text-primary">{t("insights.feedback.eyebrow")}</p>
      <h2 className="mt-3 font-heading text-2xl leading-tight">{t("insights.feedback.title")}</h2>
      <p className="mt-3 max-w-xl text-base text-muted-foreground">{t("insights.feedback.lede")}</p>

      <form onSubmit={submit} className="mt-8 space-y-8">
        <div className="grid gap-8 md:grid-cols-2">
          <Dial
            label={t("insights.feedback.depth")}
            minLabel={t("insights.feedback.depthMin")}
            maxLabel={t("insights.feedback.depthMax")}
            value={depth}
            valueLabel={dialLabel("depth", depth)}
            onChange={setDepth}
          />
          <Dial
            label={t("insights.feedback.usefulness")}
            minLabel={t("insights.feedback.usefulnessMin")}
            maxLabel={t("insights.feedback.usefulnessMax")}
            value={usefulness}
            valueLabel={dialLabel("usefulness", usefulness)}
            onChange={setUsefulness}
          />
        </div>

        <fieldset>
          <legend className="text-base font-semibold text-foreground">
            {t("insights.feedback.topicsTitle")}
          </legend>
          <p className="mt-1 text-sm text-muted-foreground">{t("insights.feedback.topicsHint")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((topic) => {
              const active = topics.some((entry) => topicSlug(entry) === topicSlug(topic));
              return (
                <button
                  key={topicSlug(topic)}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTopic(topic)}
                  className={
                    "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold text-chip-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
                    (active
                      ? "border-chip-active-border bg-chip"
                      : "border-border bg-card hover:border-chip-active-border/60")
                  }
                >
                  {topic}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Input
              value={ownTopic}
              maxLength={MAX_TOPIC_LENGTH}
              onChange={(event) => setOwnTopic(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addOwnTopic();
                }
              }}
              placeholder={t("insights.feedback.ownTopicPlaceholder")}
              aria-label={t("insights.feedback.ownTopicLabel")}
              className="max-w-xs"
            />
            <Button type="button" variant="outline" size="pill" onClick={addOwnTopic}>
              {t("insights.feedback.addTopic")}
            </Button>
          </div>
        </fieldset>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="feedback-comment" className="text-base font-semibold text-foreground">
              {t("insights.feedback.commentLabel")}
            </Label>
            <Textarea
              id="feedback-comment"
              rows={3}
              maxLength={MAX_COMMENT_LENGTH}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={t("insights.feedback.commentPlaceholder")}
              className="mt-3"
            />
          </div>
          <div>
            <Label htmlFor="feedback-email" className="text-base font-semibold text-foreground">
              {t("insights.feedback.emailLabel")}
            </Label>
            <Input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("insights.feedback.emailPlaceholder")}
              className="mt-3"
            />
            <p className="mt-2 text-xs text-muted-foreground">{t("insights.feedback.emailHint")}</p>
          </div>
        </div>

        {/* Honeypot: hidden from readers and from assistive technology. */}
        <div aria-hidden="true" className="hidden">
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </label>
        </div>

        {error ? (
          <p role="status" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="pill" disabled={sending}>
          {sending ? t("insights.feedback.sending") : t("insights.feedback.submit")}
        </Button>
      </form>
    </section>
  );
}
