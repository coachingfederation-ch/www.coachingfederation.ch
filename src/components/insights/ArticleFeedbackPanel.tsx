/**
 * "Steer the editorial" — reader feedback at the end of an article.
 *
 * The invitation is a highlight banner below the share block plus a slim sticky
 * bar once the reader is deep into the piece; both open the form in a responsive
 * modal. Readers who look like they are leaving without answering get one gentle
 * prompt, once per article per browser.
 *
 * The form itself is unchanged: two 1-5 dials, topic chips the reader can extend,
 * an optional sentence and an optional email. No sign-in — the submission goes to
 * the public route, which rate-limits per caller. One answer per article per
 * browser, remembered in localStorage.
 *
 * Exports: ArticleFeedbackPanel, ArticleFeedbackForm.
 */
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Slider,
  Textarea,
} from "@/design-system/icf-welcome-design-system-a835df";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";
import { useExitIntent } from "@/hooks/use-exit-intent";
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

/** Where the reader opened the form from — reported to analytics. */
type OpenSource = "banner" | "sticky" | "exit";

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function writeFlag(key: string) {
  try {
    window.localStorage.setItem(key, new Date().toISOString());
  } catch {
    /* private mode: the state simply does not survive a reload */
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

export function ArticleFeedbackForm({
  articleId,
  suggestedTopics,
  onSent,
}: Props & { onSent: () => void }) {
  const { t, locale } = useI18n();
  const [depth, setDepth] = useState(DIAL_MID);
  const [usefulness, setUsefulness] = useState(DIAL_MID);
  const [topics, setTopics] = useState<string[]>([]);
  const [ownTopic, setOwnTopic] = useState("");
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      writeFlag(feedbackStorageKey(articleId));
      trackGoal("Article Feedback", { article_id: articleId });
      onSent();
    } catch {
      setError(t("insights.feedback.failed"));
    } finally {
      setSending(false);
    }
  };

  const dialLabel = (prefix: string, value: number) =>
    t(`insights.feedback.${prefix}Scale.${value}`);

  return (
    <form onSubmit={submit} className="space-y-8">
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
  );
}

export function ArticleFeedbackPanel({ articleId, suggestedTopics }: Props) {
  const { t } = useI18n();
  const [hydrated, setHydrated] = useState(false);
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<OpenSource>("banner");
  const [stickyVisible, setStickyVisible] = useState(false);
  const [stickyDismissed, setStickyDismissed] = useState(false);
  const [bannerInView, setBannerInView] = useState(false);
  /** Remounts the form after a completed answer, so "change my answer" starts clean. */
  const [session, setSession] = useState(0);
  const bannerRef = useRef<HTMLElement | null>(null);
  const askedKey = `${feedbackStorageKey(articleId)}:asked`;

  useEffect(() => {
    setDone(readFlag(feedbackStorageKey(articleId)));
    setHydrated(true);
  }, [articleId]);

  // The sticky bar joins once the reader is well into the piece, and steps aside
  // whenever the banner itself is on screen.
  useEffect(() => {
    if (!hydrated || done || stickyDismissed) return;
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      setStickyVisible(scrollable > 0 && window.scrollY / scrollable >= 0.6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hydrated, done, stickyDismissed]);

  useEffect(() => {
    const node = bannerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setBannerInView(Boolean(entry?.isIntersecting)),
      { rootMargin: "-80px 0px -80px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hydrated]);

  const openWith = (next: OpenSource) => {
    setSource(next);
    setOpen(true);
    trackGoal("Article Feedback Open", { article_id: articleId, source: next });
  };

  useExitIntent({
    enabled: hydrated && !done && !open && !readFlag(askedKey),
    onTrigger: () => {
      writeFlag(askedKey);
      openWith("exit");
    },
  });

  if (!hydrated) return null;

  const isExit = source === "exit";
  const showSticky = stickyVisible && !stickyDismissed && !bannerInView && !done;

  return (
    <>
      <section ref={bannerRef} className="mt-16 rounded-3xl bg-hero p-8 text-hero-foreground">
        <p className="eyebrow eyebrow-accent">{t("insights.feedback.eyebrow")}</p>
        <div className="mt-3 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-heading text-2xl leading-tight">
              {done ? t("insights.feedback.thanksTitle") : t("insights.feedback.title")}
            </h2>
            <p className="mt-3 text-base text-hero-foreground/80">
              {done ? t("insights.feedback.thanksBody") : t("insights.feedback.bannerLede")}
            </p>
          </div>
          <Button
            variant={done ? "inverse-ghost" : "inverse"}
            size="pill"
            className="shrink-0"
            onClick={() => openWith("banner")}
          >
            {done ? t("insights.feedback.editAnswer") : t("insights.feedback.bannerCta")}
          </Button>
        </div>
      </section>

      {showSticky ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 print:hidden">
          <div className="pointer-events-auto grid w-full max-w-xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-3xl border border-border bg-card p-3 pl-5 shadow-soft sm:flex sm:justify-between">
            <p className="min-w-0 truncate text-sm font-semibold text-foreground">
              {t("insights.feedback.stickyLede")}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <Button size="pill" onClick={() => openWith("sticky")}>
                {t("insights.feedback.stickyCta")}
              </Button>
              <button
                type="button"
                onClick={() => setStickyDismissed(true)}
                aria-label={t("insights.feedback.stickyDismiss")}
                className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <FeedbackDialog
        open={open}
        onOpenChange={setOpen}
        title={isExit ? t("insights.feedback.exitTitle") : t("insights.feedback.title")}
        description={isExit ? t("insights.feedback.exitLede") : t("insights.feedback.lede")}
      >
        <ArticleFeedbackForm
          key={session}
          articleId={articleId}
          suggestedTopics={suggestedTopics}
          onSent={() => {
            setDone(true);
            setOpen(false);
            setSession((n) => n + 1);
          }}
        />
      </FeedbackDialog>
    </>
  );
}
