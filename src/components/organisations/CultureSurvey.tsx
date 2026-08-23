/**
 * Interactive organisational culture assessment tool with score calculation and lead capture.
 * Exports: CultureSurvey. Rendered on the organisations landing page.
 */
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CARD_SHADOW } from "@/components/site-chrome";
import { useI18n } from "@/i18n";
import { submitOrganisationSurvey } from "@/lib/organisation-survey.functions";
import { trackGoal } from "@/lib/plausible";
import {
  bandFor,
  DIMENSIONS,
  dimensionScores,
  QUESTIONS,
  SCALE,
  totalScore,
  type Answers,
} from "@/lib/organisation-survey";

type Step = "pressure" | "questions" | "result" | "done";

export function CultureSurvey() {
  const { t, tList, locale } = useI18n();
  const submit = useServerFn(submitOrganisationSurvey);

  const pressures = tList<{ id: string; label: string; insight: string }>(
    "organisations.survey.pressure.options",
  );
  const scale = tList<{ label: string; desc: string }>("organisations.survey.scale");
  const questionCopy = tList<{ id: string; text: string }>("organisations.survey.questions");

  const [step, setStep] = useState<Step>("pressure");
  const [pressure, setPressure] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [form, setForm] = useState({
    contactName: "",
    contactEmail: "",
    contactOrganisation: "",
    message: "",
    consent: false,
    website: "",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scores = useMemo(() => dimensionScores(answers), [answers]);
  const total = useMemo(() => totalScore(answers), [answers]);
  const band = bandFor(total);

  const question = QUESTIONS[current];
  const text = questionCopy.find((q) => q.id === question?.id)?.text ?? "";
  const progress = Math.round(((current + 1) / QUESTIONS.length) * 100);

  function answer(value: number) {
    setAnswers((a) => ({ ...a, [question.id]: value }));
    if (current + 1 < QUESTIONS.length) setCurrent((c) => c + 1);
    else setStep("result");
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.consent) {
      setError(t("organisations.survey.form.consentRequired"));
      return;
    }
    setSending(true);
    try {
      const res = await submit({
        data: {
          locale,
          primaryPressure: pressure,
          answers,
          dimensionScores: scores,
          totalScore: total,
          maturityBand: band,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactOrganisation: form.contactOrganisation,
          message: form.message,
          consent: form.consent,
          website: form.website,
        },
      });
      if (res.ok) {
        trackGoal("Organisation Survey", { maturity_band: band, locale });
        setStep("done");
      } else setError(t("organisations.survey.form.error"));
    } catch {
      setError(t("organisations.survey.form.error"));
    } finally {
      setSending(false);
    }
  }

  const selectedInsight = pressures.find((p) => p.id === pressure)?.insight;

  const intro = step === "pressure";

  return (
    <section id="assessment" className="bg-hero py-24 text-hero-foreground">
      <div
        className={
          "mx-auto px-8 " +
          (intro ? "grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center" : "max-w-4xl")
        }
      >
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
              {t("organisations.survey.freeBadge")}
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-hero-foreground/70">
              {t("organisations.survey.effort")}
            </span>
          </div>
          <p className="eyebrow mt-6 !text-hero-foreground">{t("organisations.survey.eyebrow")}</p>
          <h2 className="mt-3 display-lg">{t("organisations.survey.title")}</h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-hero-foreground/90">
            {t("organisations.survey.lede")}
          </p>
          {intro ? (
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {DIMENSIONS.map((d) => (
                <li
                  key={d}
                  className="flex items-center gap-3 rounded-xl border border-hero-foreground/15 bg-hero-foreground/5 px-4 py-3 text-sm font-medium"
                >
                  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                  {t(`organisations.survey.dimensions.${d}`)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div
          className={
            "rounded-2xl border border-accent/40 bg-card p-6 text-foreground shadow-lg md:p-10 " +
            (intro ? "" : "mt-10 ") +
            CARD_SHADOW
          }
        >
          {step === "pressure" ? (
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                {t("organisations.survey.pressure.question")}
              </h3>
              <p className="mt-2 text-sm text-foreground/70">
                {t("organisations.survey.pressure.hint")}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {pressures.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={pressure === p.id}
                    onClick={() => setPressure(p.id)}
                    className={
                      "rounded-xl border px-5 py-4 text-left text-sm font-semibold transition " +
                      (pressure === p.id
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                        : "border-foreground/20 text-foreground/90 hover:border-primary/50 hover:bg-muted")
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {selectedInsight ? (
                <p className="mt-6 rounded-xl border border-accent/50 bg-accent/15 p-5 text-sm leading-relaxed text-foreground/90">
                  {selectedInsight}
                </p>
              ) : null}
              <button
                type="button"
                disabled={!pressure}
                onClick={() => setStep("questions")}
                className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
              >
                {t("organisations.survey.start")} →
              </button>
              <p className="mt-4 text-center text-xs text-foreground/60">
                {t("organisations.survey.privacy")}
              </p>
            </div>
          ) : null}

          {step === "questions" && question ? (
            <div>
              <div className="flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-wider text-foreground/70">
                <span>
                  {t("organisations.survey.progress")
                    .replace("{n}", String(current + 1))
                    .replace("{total}", String(QUESTIONS.length))}
                </span>
                <span>{progress}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t("organisations.survey.eyebrow")}
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-foreground/10"
              >
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-8 section-label">
                {t(`organisations.survey.dimensions.${question.dimension}`)}
              </p>
              <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight md:text-xl">
                {text}
              </h3>
              <div className="mt-6 grid gap-2">
                {SCALE.map((value, i) => {
                  const option = scale[i];
                  const selected = answers[question.id] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => answer(value)}
                      className={
                        "flex min-h-[56px] items-center gap-4 rounded-xl border px-5 py-3 text-left transition " +
                        (selected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                          : "border-foreground/20 hover:border-primary/50 hover:bg-muted")
                      }
                    >
                      <span className="btn-mono text-xs font-bold text-primary">{value}</span>
                      <span>
                        <span className="block text-sm font-semibold text-foreground">
                          {option?.label}
                        </span>
                        <span className="block text-xs text-foreground/70">{option?.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => (current === 0 ? setStep("pressure") : setCurrent((c) => c - 1))}
                  className="inline-flex h-10 items-center rounded-full border border-foreground/25 px-5 text-sm font-semibold text-foreground/90 transition hover:border-primary/50 hover:bg-muted"
                >
                  ← {t("organisations.survey.back")}
                </button>
                {answers[question.id] ? (
                  <button
                    type="button"
                    onClick={() =>
                      current + 1 < QUESTIONS.length ? setCurrent((c) => c + 1) : setStep("result")
                    }
                    className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                  >
                    {t("organisations.survey.next")} →
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === "result" ? (
            <div>
              <p className="section-label">{t("organisations.survey.result.eyebrow")}</p>
              <div className="mt-3 flex flex-wrap items-baseline gap-4">
                <span className="text-5xl font-bold tracking-tight text-primary">{total}%</span>
                <span className="text-lg font-semibold tracking-tight">
                  {t(`organisations.survey.bands.${band}.title`)}
                </span>
              </div>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/80">
                {t(`organisations.survey.bands.${band}.desc`)}
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {DIMENSIONS.map((d) => (
                  <div key={d} className="rounded-xl border border-foreground/20 p-5">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>{t(`organisations.survey.dimensions.${d}`)}</span>
                      <span className="text-primary">{scores[d]}%</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={scores[d]}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={t(`organisations.survey.dimensions.${d}`)}
                      className="mt-3 h-2 w-full overflow-hidden rounded-full bg-foreground/10"
                    >
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${scores[d]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <form
                id="organisation-contact"
                onSubmit={send}
                className="mt-10 border-t border-foreground/20 pt-8"
              >
                <h3 className="text-lg font-semibold tracking-tight">
                  {t("organisations.survey.form.title")}
                </h3>
                <p className="mt-2 text-sm text-foreground/70">
                  {t("organisations.survey.form.lede")}
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    {t("organisations.survey.form.name")}
                    <input
                      value={form.contactName}
                      onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                      maxLength={120}
                      className="mt-1.5 h-11 w-full rounded-xl border border-foreground/25 bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    {t("organisations.survey.form.email")}
                    <input
                      type="email"
                      required
                      value={form.contactEmail}
                      onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                      maxLength={255}
                      className="mt-1.5 h-11 w-full rounded-xl border border-foreground/25 bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">
                    {t("organisations.survey.form.organisation")}
                    <input
                      value={form.contactOrganisation}
                      onChange={(e) => setForm({ ...form, contactOrganisation: e.target.value })}
                      maxLength={160}
                      className="mt-1.5 h-11 w-full rounded-xl border border-foreground/25 bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">
                    {t("organisations.survey.form.message")}
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      maxLength={2000}
                      rows={4}
                      className="mt-1.5 w-full rounded-xl border border-foreground/25 bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                </div>
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="hidden"
                />
                <label className="mt-5 flex items-start gap-3 text-sm text-foreground/80">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                    className="mt-1 h-4 w-4"
                  />
                  <span>{t("organisations.survey.form.consent")}</span>
                </label>
                {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
                <button
                  type="submit"
                  disabled={sending}
                  className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {sending
                    ? t("organisations.survey.form.sending")
                    : t("organisations.survey.form.submit")}
                </button>
              </form>
            </div>
          ) : null}

          {step === "done" ? (
            <div className="py-6 text-center">
              <p className="text-5xl" aria-hidden>
                ✓
              </p>
              <h3 className="mt-4 text-xl font-semibold tracking-tight">
                {t("organisations.survey.thanks.title")}
              </h3>
              <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-foreground/80">
                {t("organisations.survey.thanks.desc")}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
