/**
 * Member vote page (/member/votes/:slug): the proposal, downloads, the secret
 * ballot, then — once the member has voted or the vote has closed — the tally
 * and the anonymous rationale wall grouped by option.
 */
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Download, Lock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Label,
  RadioGroup,
  RadioGroupItem,
  Textarea,
} from "@/design-system/icf-welcome-design-system-a835df";
import { Markdown } from "@/components/markdown";
import { MemberShell } from "@/components/member/MemberShell";
import { VoteResults } from "@/components/votes/VoteResults";
import { useCms } from "@/i18n/cms";
import { castVote, getMemberVote } from "@/lib/votes.functions";
import { RATIONALE_MAX, castErrorKey, localized, voteOptionLabel, votePhase, type VoteOption } from "@/lib/votes";

export function VotePage({ slug, preview = false }: { slug: string; preview?: boolean }) {
  const { t, locale } = useCms();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["member-vote", slug, preview],
    queryFn: () => getMemberVote({ data: { slug, preview } }),
  });
  const [choice, setChoice] = useState<string>("");
  const [rationale, setRationale] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(locale === "en" ? "en-US" : `${locale}-CH`, {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Europe/Zurich",
    });

  if (isLoading) return <MemberShell>{null}</MemberShell>;
  if (!data) {
    return (
      <MemberShell>
        <div className="mx-auto max-w-3xl px-6 py-16">
          <p className="text-muted-foreground">{t("votes.page.notFound")}</p>
          <Link to="/member/votes" className="mt-4 inline-block text-sm font-semibold text-primary">
            ← {t("votes.page.back")}
          </Link>
        </div>
      </MemberShell>
    );
  }

  const { vote, voted, attachments, tally, rationales } = data;
  const phase = votePhase(vote);
  const options = (vote.options as VoteOption[]).map((option) => ({ ...option, label: voteOptionLabel(option, locale) }));
  const labelOf = (k: string) => options.find((o) => o.key === k)?.label ?? k;
  const description = localized(vote, "description", locale);

  const submit = async () => {
    if (preview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await castVote({
        data: { voteId: vote.id, option: choice, rationale: rationale.trim() || null },
      });
      setReceipt(res.receipt);
      setConfirming(false);
      await queryClient.invalidateQueries({ queryKey: ["member-vote", slug] });
      await queryClient.invalidateQueries({ queryKey: ["member-votes"] });
    } catch (e) {
      const key = castErrorKey(e instanceof Error ? e.message : String(e));
      setError(t(`votes.errors.${key}`));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <MemberShell>
      {preview ? (
        <div className="bg-card px-6 py-4 text-sm text-foreground" role="status">
          {t("votes.admin.previewNotice")}
        </div>
      ) : null}
      <header className="bg-hero text-hero-foreground">
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
          <Link to="/member/votes" className="text-sm font-semibold text-hero-foreground/80">
            ← {t("votes.page.back")}
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="eyebrow eyebrow-accent">{t(`votes.phase.${phase}`)}</span>
            {vote.category ? (
              <span className="eyebrow eyebrow-inverse">· {vote.category}</span>
            ) : null}
          </div>
          <h1 className="mt-3 font-heading text-4xl leading-tight">
            {localized(vote, "title", locale)}
          </h1>
          {localized(vote, "summary", locale) ? (
            <p className="mt-3 text-hero-foreground/80">{localized(vote, "summary", locale)}</p>
          ) : null}
          <p className="mt-4 text-sm text-hero-foreground/80">
            {t("votes.page.window")}: {fmt(vote.opens_at)} – {fmt(vote.closes_at)} (Zurich)
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-10 px-6 py-10 sm:px-10">
        {description ? (
          <section className="text-foreground">
            <Markdown>{description}</Markdown>
          </section>
        ) : null}

        {attachments.length ? (
          <section>
            <h2 className="font-heading text-2xl text-primary">{t("votes.page.downloads")}</h2>
            <ul className="mt-4 space-y-2">
              {attachments.map((f) =>
                f.url ? (
                  <li key={f.id}>
                    <a
                      href={f.url}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-primary hover:border-primary/40"
                    >
                      <Download className="h-4 w-4" aria-hidden />
                      {f.name}
                    </a>
                  </li>
                ) : null,
              )}
            </ul>
          </section>
        ) : null}

        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-heading text-2xl text-primary">{t("votes.page.ballotTitle")}</h2>
          {voted || receipt ? (
            <div className="mt-4 flex items-start gap-3">
              <Check className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
              <div>
                <p className="font-semibold">
                  {receipt ? t("votes.page.thanks") : t("votes.page.alreadyVoted")}
                </p>
                {receipt ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("votes.page.receipt")}: <span className="font-mono">{receipt}</span>
                  </p>
                ) : null}
              </div>
            </div>
          ) : !preview && phase === "scheduled" ? (
            <p className="mt-4 text-muted-foreground">
              {t("votes.page.notOpenYet").replace("{date}", fmt(vote.opens_at))}
            </p>
          ) : !preview && phase !== "open" ? (
            <p className="mt-4 text-muted-foreground">{t("votes.page.closed")}</p>
          ) : (
            <div className="mt-4 space-y-5">
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {t("votes.page.ballotHint")}
              </p>
              <RadioGroup value={choice} onValueChange={setChoice} className="gap-3">
                {options.map((o) => (
                  <Label
                    key={o.key}
                    htmlFor={`opt-${o.key}`}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-border px-4 py-3 text-base font-medium"
                  >
                    <RadioGroupItem id={`opt-${o.key}`} value={o.key} />
                    {o.label}
                  </Label>
                ))}
              </RadioGroup>
              {vote.rationale_enabled ? (
                <div className="space-y-2">
                  <Label htmlFor="rationale">{t("votes.page.rationaleLabel")}</Label>
                  <Textarea
                    id="rationale"
                    value={rationale}
                    maxLength={RATIONALE_MAX}
                    onChange={(e) => setRationale(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("votes.page.rationaleHint")} ({rationale.length}/{RATIONALE_MAX})
                  </p>
                </div>
              ) : null}
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button
                size="pill"
                disabled={preview || !choice || busy}
                onClick={() => setConfirming(true)}
              >
                {t("votes.page.submit")}
              </Button>
            </div>
          )}
        </section>

        <VoteResults
          tally={tally}
          options={options}
          closed={phase === "closed" || phase === "archived"}
          t={t}
        />

        <section>
          <h2 className="font-heading text-2xl text-primary">{t("votes.page.wallTitle")}</h2>
          {!(voted || receipt) && phase === "open" ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("votes.page.wallLocked")}</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">{t("votes.page.wallIntro")}</p>
              {rationales.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">{t("votes.page.wallEmpty")}</p>
              ) : (
                <div className="mt-6 grid gap-6 md:grid-cols-3">
                  {options.map((o) => {
                    const items = rationales.filter((r) => r.option_key === o.key);
                    if (!items.length) return null;
                    return (
                      <div key={o.key}>
                        <h3 className="flex items-center gap-2 font-semibold">
                          {labelOf(o.key)}
                          <Badge variant="secondary">{items.length}</Badge>
                        </h3>
                        <ul className="mt-3 space-y-3">
                          {items.map((r, i) => (
                            <li
                              key={i}
                              className="rounded-2xl border border-border bg-card p-4 text-sm italic"
                            >
                              {r.rationale}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("votes.page.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("votes.page.confirmBody").replace("{option}", labelOf(choice))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("votes.page.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {t("votes.page.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MemberShell>
  );
}
