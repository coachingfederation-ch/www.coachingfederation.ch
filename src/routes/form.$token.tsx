/**
 * Attendee follow-up form (/form/$token).
 *
 * Public by design: the emailed token is the credential, exactly as the
 * ticket page works. The page shows the organizer's questions in the
 * attendee's own language and never reveals anything about other attendees.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import { SiteFooter, SiteHeaderBar, CARD_SHADOW } from "@/components/site-chrome";
import { FormQuestionFields } from "@/components/forms/FormQuestionFields";
import { getFollowUpForm, submitFollowUpForm } from "@/lib/event-forms.functions";

const inputClass =
  "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const Route = createFileRoute("/form/$token")({
  loader: async ({ params }) => {
    const form = await getFollowUpForm({ data: { token: params.token } });
    if (!form) throw notFound();
    return { form };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.form
      ? `Your feedback — ${loaderData.form.eventTitle}`
      : "Your feedback — The Switzerland Chapter of ICF";
    const description = "Share your feedback on the event you attended.";
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
  errorComponent: () => <FormFallback />,
  notFoundComponent: () => <FormFallback />,
  component: FollowUpFormRoute,
});

function FormFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderBar compact standalone />
      <main className="flex-1 mx-auto w-full max-w-2xl px-6 py-24">
        <h1 className="font-display text-3xl font-bold tracking-tight">This link is not valid</h1>
        <p className="mt-3 text-muted-foreground">
          The form may have closed. Write to office@coachingfederation.ch and we will help.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

function FollowUpFormRoute() {
  const { form } = Route.useLoaderData();
  const { token } = Route.useParams();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    form.state === "completed" ? "done" : "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  const done = state === "done";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    setMessage(null);
    try {
      const result = await submitFollowUpForm({ data: { token, answers } });
      if (result.ok) {
        setState("done");
      } else {
        setState("error");
        setMessage(
          result.reason === "rate_limited"
            ? "Too many attempts. Please try again in a few minutes."
            : "Some answers are missing or not valid. Please check the form and try again.",
        );
      }
    } catch {
      setState("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderBar compact standalone />
      <main className="flex-1 mx-auto w-full max-w-2xl px-6 py-16">
        <p className="eyebrow text-muted-foreground">{form.eventTitle}</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
          {done ? "Thank you" : "Your feedback"}
        </h1>

        {done ? (
          <div className={`mt-6 rounded-2xl border border-border bg-card p-6 ${CARD_SHADOW}`}>
            <p className="text-sm text-muted-foreground">
              {form.thankYou ?? "Thank you — your answers have been recorded."}
            </p>
            <div className="mt-4">
              <Button asChild variant="pill-ghost" size="pill">
                <a href={form.eventUrl}>Back to the event</a>
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className={`mt-6 space-y-4 rounded-2xl border border-border bg-card p-6 ${CARD_SHADOW}`}
          >
            {form.intro ? <p className="text-sm text-muted-foreground">{form.intro}</p> : null}

            <FormQuestionFields
              questions={form.questions}
              answers={answers}
              onChange={(key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
              idPrefix="followup"
              inputClass={inputClass}
              disabled={state === "sending"}
            />

            {message ? <p className="text-sm text-destructive">{message}</p> : null}

            <Button type="submit" variant="pill" size="pill" disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Submit"}
            </Button>
          </form>
        )}

      </main>
      <SiteFooter />
    </div>
  );
}
