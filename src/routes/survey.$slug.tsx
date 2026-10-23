/**
 * Public survey (/survey/$slug). Anyone with the link may answer while the
 * survey is open; the server re-checks status, dates, limit and answers.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button, Input, Label } from "@/design-system/icf-welcome-design-system-a835df";
import { SiteFooter, SiteHeaderBar, CARD_SHADOW } from "@/components/site-chrome";
import { FormQuestionFields } from "@/components/forms/FormQuestionFields";
import { getPublicSurvey, submitSurveyResponse } from "@/lib/surveys.functions";
import { surveyQuestions, type SurveyAvailability } from "@/lib/surveys";
import { useLocale } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";

const inputClass =
  "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Lang = "en" | "de" | "fr" | "it";

const COPY: Record<Lang, Record<string, string>> = {
  en: {
    membersOnly: "This survey is for members of The Switzerland Chapter of ICF. Please sign in to answer.",
    signIn: "Sign in",
    alreadyMember: "You have already answered this survey. Thank you.",
    eyebrow: "Survey",
    thanks: "Thank you",
    thanksBody: "Your answers have been recorded.",
    submit: "Submit",
    sending: "Sending…",
    invalid: "Some answers are missing or not valid. Please check the form and try again.",
    rate: "Too many attempts. Please try again in a few minutes.",
    error: "Something went wrong. Please try again.",
    unavailable: "This survey is not accepting answers right now.",
    not_open: "This survey has not opened yet. Please come back later.",
    closed: "This survey has closed. Thank you for your interest.",
    full: "This survey has reached its number of answers. Thank you for your interest.",
    already: "You have already answered this survey from this browser. Thank you.",
    name: "Your name",
    email: "Your email",
    contactNote:
      "We use your name and email only to follow up on this survey. See our privacy policy for details.",
  },
  de: {
    membersOnly: "Diese Umfrage richtet sich an Mitglieder von The Switzerland Chapter of ICF. Bitte melden Sie sich an, um zu antworten.",
    signIn: "Anmelden",
    alreadyMember: "Sie haben diese Umfrage bereits beantwortet. Vielen Dank.",
    eyebrow: "Umfrage",
    thanks: "Vielen Dank",
    thanksBody: "Ihre Antworten wurden gespeichert.",
    submit: "Absenden",
    sending: "Wird gesendet…",
    invalid: "Einige Antworten fehlen oder sind ungültig. Bitte prüfen Sie das Formular.",
    rate: "Zu viele Versuche. Bitte versuchen Sie es in einigen Minuten erneut.",
    error: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
    unavailable: "Diese Umfrage nimmt derzeit keine Antworten entgegen.",
    not_open: "Diese Umfrage ist noch nicht geöffnet. Bitte schauen Sie später wieder vorbei.",
    closed: "Diese Umfrage ist geschlossen. Danke für Ihr Interesse.",
    full: "Diese Umfrage hat die maximale Anzahl Antworten erreicht. Danke für Ihr Interesse.",
    already: "Sie haben diese Umfrage in diesem Browser bereits beantwortet. Vielen Dank.",
    name: "Ihr Name",
    email: "Ihre E-Mail",
    contactNote:
      "Wir verwenden Ihren Namen und Ihre E-Mail nur für Rückfragen zu dieser Umfrage. Details in unserer Datenschutzerklärung.",
  },
  fr: {
    membersOnly: "Ce sondage s'adresse aux membres de The Switzerland Chapter of ICF. Veuillez vous connecter pour répondre.",
    signIn: "Se connecter",
    alreadyMember: "Vous avez déjà répondu à ce sondage. Merci.",
    eyebrow: "Sondage",
    thanks: "Merci",
    thanksBody: "Vos réponses ont été enregistrées.",
    submit: "Envoyer",
    sending: "Envoi…",
    invalid: "Certaines réponses manquent ou ne sont pas valides. Veuillez vérifier le formulaire.",
    rate: "Trop de tentatives. Veuillez réessayer dans quelques minutes.",
    error: "Une erreur est survenue. Veuillez réessayer.",
    unavailable: "Ce sondage n'accepte pas de réponses pour le moment.",
    not_open: "Ce sondage n'est pas encore ouvert. Revenez plus tard.",
    closed: "Ce sondage est clos. Merci de votre intérêt.",
    full: "Ce sondage a atteint son nombre de réponses. Merci de votre intérêt.",
    already: "Vous avez déjà répondu à ce sondage depuis ce navigateur. Merci.",
    name: "Votre nom",
    email: "Votre e-mail",
    contactNote:
      "Nous utilisons votre nom et votre e-mail uniquement pour le suivi de ce sondage. Voir notre politique de confidentialité.",
  },
  it: {
    membersOnly: "Questo sondaggio è riservato ai membri di The Switzerland Chapter of ICF. Acceda per rispondere.",
    signIn: "Accedi",
    alreadyMember: "Ha già risposto a questo sondaggio. Grazie.",
    eyebrow: "Sondaggio",
    thanks: "Grazie",
    thanksBody: "Le sue risposte sono state registrate.",
    submit: "Invia",
    sending: "Invio…",
    invalid: "Alcune risposte mancano o non sono valide. Controlli il modulo.",
    rate: "Troppi tentativi. Riprovi tra qualche minuto.",
    error: "Qualcosa è andato storto. Riprovi.",
    unavailable: "Questo sondaggio non accetta risposte al momento.",
    not_open: "Questo sondaggio non è ancora aperto. Torni più tardi.",
    closed: "Questo sondaggio è chiuso. Grazie per l'interesse.",
    full: "Questo sondaggio ha raggiunto il numero di risposte. Grazie per l'interesse.",
    already: "Ha già risposto a questo sondaggio da questo browser. Grazie.",
    name: "Il suo nome",
    email: "La sua e-mail",
    contactNote:
      "Usiamo nome ed e-mail solo per seguire questo sondaggio. Dettagli nella nostra informativa sulla privacy.",
  },
};

export const Route = createFileRoute("/survey/$slug")({
  loader: async ({ params }) => {
    const survey = await getPublicSurvey({ data: { slug: params.slug } });
    if (!survey) throw notFound();
    return { survey };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.survey
      ? `${loaderData.survey.name} — The Switzerland Chapter of ICF`
      : "Survey — The Switzerland Chapter of ICF";
    const description = "Share your view with The Switzerland Chapter of ICF.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  errorComponent: () => <SurveyFallback />,
  notFoundComponent: () => <SurveyFallback />,
  component: SurveyRoute,
});

function SurveyFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderBar compact standalone />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-24">
        <h1 className="font-heading text-3xl font-normal">This link is not valid</h1>
        <p className="mt-3 text-muted-foreground">
          The survey may have been removed. Write to office@coachingfederation.ch and we will help.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

function SurveyRoute() {
  const { survey } = Route.useLoaderData();
  const locale = useLocale() as Lang;
  const c = COPY[locale] ?? COPY.en;
  const questions = useMemo(() => surveyQuestions(survey.questions, locale), [survey, locale]);
  const pick = (m: Record<Lang, string | null>) => m[locale] || m.en;
  const storageKey = `survey-done:${survey.slug}`;

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "already" | "already_member">("idle");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!survey.membersOnly) return;
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, [survey.membersOnly]);
  const [blocked, setBlocked] = useState<SurveyAvailability | "unavailable" | null>(
    survey.availability === "open" ? null : survey.availability,
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (survey.onePerBrowser && window.localStorage.getItem(storageKey)) setState("already");
  }, [survey.onePerBrowser, storageKey]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    setMessage(null);
    try {
      const result = await submitSurveyResponse({
        data: {
          slug: survey.slug,
          locale,
          answers,
          contactName: survey.collectContact ? name : undefined,
          contactEmail: survey.collectContact ? email : undefined,
        },
      });
      if (result.ok) {
        if (survey.onePerBrowser) window.localStorage.setItem(storageKey, "1");
        setState("done");
        return;
      }
      setState("idle");
      if (result.reason === "unavailable") setBlocked("unavailable");
      else if (result.reason === "already") setState("already_member");
      else if (result.reason === "members_only") setSignedIn(false);
      else setMessage(result.reason === "rate_limited" ? c.rate : c.invalid);
    } catch {
      setState("idle");
      setMessage(c.error);
    }
  }

  const intro = pick(survey.texts.intro);
  const panel = `mt-6 rounded-2xl border border-border bg-card p-6 ${CARD_SHADOW}`;
  const notice =
    state === "already"
      ? c.already
      : state === "already_member"
        ? c.alreadyMember
      : blocked
        ? (c[blocked === "draft" ? "unavailable" : blocked] ?? c.unavailable)
        : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderBar compact standalone />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <p className="eyebrow text-muted-foreground">{c.eyebrow}</p>
        <h1 className="mt-2 font-heading text-3xl font-normal">
          {state === "done" ? c.thanks : survey.name}
        </h1>

        {state === "done" ? (
          <div className={panel}>
            <p className="text-sm text-muted-foreground">
              {pick(survey.texts.thankYou) ?? c.thanksBody}
            </p>
          </div>
        ) : !notice && survey.membersOnly && signedIn === false ? (
          <div className={panel}>
            <p className="text-sm text-muted-foreground">{c.membersOnly}</p>
            <Button asChild className="mt-4">
              <a href={`/auth?next=${encodeURIComponent(`/survey/${survey.slug}`)}`}>{c.signIn}</a>
            </Button>
          </div>
        ) : notice ? (
          <div className={panel}>
            <p className="text-sm text-muted-foreground">{notice}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className={`${panel} space-y-4`}>
            {intro ? <p className="text-sm text-muted-foreground">{intro}</p> : null}
            {survey.collectContact ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="sv-name">{c.name} *</Label>
                  <Input
                    id="sv-name"
                    className="mt-1"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="sv-email">{c.email} *</Label>
                  <Input
                    id="sv-email"
                    className="mt-1"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{c.contactNote}</p>
              </div>
            ) : null}
            <FormQuestionFields
              questions={questions}
              answers={answers}
              onChange={(key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
              idPrefix="survey"
              inputClass={inputClass}
              disabled={state === "sending"}
            />
            {message ? <p className="text-sm text-destructive">{message}</p> : null}
            <Button type="submit" variant="pill" size="pill" disabled={state === "sending"}>
              {state === "sending" ? c.sending : c.submit}
            </Button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
