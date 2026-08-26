/**
 * Attendee ticket page (/ticket/$token).
 *
 * Public: the ticket code is the credential. Everything on the page is either
 * the holder's own name or public event content, and the page is never
 * indexed. The QR encodes this same URL, so a door scan and a tap land on the
 * same registration.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteFooter, SiteHeaderBar } from "@/components/site-chrome";
import { getTicket } from "@/lib/ticket.functions";

export const Route = createFileRoute("/ticket/$token")({
  loader: async ({ params }) => {
    const ticket = await getTicket({ data: { token: params.token } });
    if (!ticket) throw notFound();
    return { ticket };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.ticket
      ? `Your ticket — ${loaderData.ticket.eventTitle}`
      : "Your ticket — The Switzerland Chapter of ICF";
    const description =
      "Show this ticket at the door. It holds your event details and your personal check-in code.";
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
  errorComponent: () => <TicketFallback />,
  notFoundComponent: () => <TicketFallback />,
  component: TicketRoute,
});

function TicketFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderBar compact standalone />
      <main className="flex-1 mx-auto max-w-2xl px-6 py-24">
        <h1 className="font-display text-3xl font-bold tracking-tight">Ticket not found</h1>
        <p className="mt-3 text-muted-foreground">
          This ticket link is no longer valid. If your registration was cancelled, the ticket stops
          working. Write to office@coachingfederation.ch and we will help.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

function TicketRoute() {
  const { ticket } = Route.useLoaderData();
  const cancelled = ticket.status === "cancelled";
  const unpaid = ticket.paymentStatus === "pending" || ticket.paymentStatus === "expired";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderBar compact standalone />
      <main className="flex-1 mx-auto max-w-2xl px-6 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {ticket.tierName ?? "Registration"}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {ticket.eventTitle}
        </h1>

        <div className="mt-8 rounded-3xl border border-border bg-card p-6 sm:p-8">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Attendee</dt>
              <dd className="mt-1 font-semibold">{ticket.attendeeName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">When</dt>
              <dd className="mt-1">{ticket.when}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Where</dt>
              <dd className="mt-1">{ticket.location}</dd>
            </div>
            {ticket.onlineUrl ? (
              <div className="min-w-0">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Online link
                </dt>
                <dd className="mt-1 break-words">
                  <a href={ticket.onlineUrl} className="text-primary underline">
                    {ticket.onlineUrl}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-8 flex flex-col items-center gap-3 border-t border-border pt-8">
            {cancelled || unpaid ? (
              <p className="text-center text-sm font-semibold text-destructive">
                {cancelled
                  ? "This registration was cancelled, so the code below will not open the door."
                  : "This ticket is not paid yet. Please complete payment before the event."}
              </p>
            ) : (
              <>
                <img
                  src={ticket.qrUrl}
                  alt="Your personal check-in code"
                  width={240}
                  height={240}
                  className="rounded-2xl border border-border bg-white p-3"
                />
                <p className="text-center text-sm text-muted-foreground">
                  Show this code at the door.
                  {ticket.checkedIn ? " You are already checked in." : ""}
                </p>
              </>
            )}
          </div>
        </div>

        {ticket.practicalNotes ? (
          <section className="mt-8 rounded-3xl border border-border bg-card p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold tracking-tight">Good to know</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
              {ticket.practicalNotes}
            </p>
          </section>
        ) : null}

        <p className="mt-8 text-sm">
          <a href={ticket.eventUrl} className="text-primary underline">
            View the event page
          </a>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
