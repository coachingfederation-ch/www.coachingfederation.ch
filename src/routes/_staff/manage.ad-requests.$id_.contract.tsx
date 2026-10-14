/**
 * Printable advertising agreement (/manage/ad-requests/:id/contract).
 * Exports: Route.
 *
 * Staff-only and deliberately paper-shaped: staff print it to PDF, send it,
 * and mark it signed in the review screen. There is no e-signature — the
 * signature blocks at the bottom are the contract's execution.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { useCms } from "@/i18n/cms";
import { PLATFORM_ADMIN_ROLES, requireStaffAccess } from "@/lib/staff-guard";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import { formatChf } from "@/lib/ads";
import { getAdRequestFn } from "@/lib/ads-admin.functions";

export const Route = createFileRoute("/_staff/manage/ad-requests/$id_/contract")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, PLATFORM_ADMIN_ROLES),
  head: () => ({
    meta: [
      { title: "Advertising agreement — The Switzerland Chapter of ICF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContractPage,
});

const CLAUSES: { heading: string; body: string }[] = [
  {
    heading: "1. Scope",
    body: "The Switzerland Chapter of ICF places the advertising described above on the surfaces and for the period stated. Placement begins once both parties have signed this agreement.",
  },
  {
    heading: "2. Content responsibility",
    body: "The advertiser is responsible for the accuracy, legality and rights clearance of all supplied content, including logos, images, text and links, and holds The Switzerland Chapter of ICF harmless against third-party claims arising from that content.",
  },
  {
    heading: "3. ICF ethics",
    body: "The advertiser confirms that the advertised offer is compatible with the ICF Code of Ethics and the ICF Core Competencies, and that no claim in the content is misleading about coaching, credentials or outcomes.",
  },
  {
    heading: "4. No endorsement",
    body: "A placement is paid advertising. It is not an endorsement, recommendation, accreditation or certification by The Switzerland Chapter of ICF or by the International Coaching Federation, and it may not be presented as one.",
  },
  {
    heading: "5. Editorial control",
    body: "The Switzerland Chapter of ICF may decline, pause or remove content that conflicts with its mission, brand, ethics or legal obligations, and informs the advertiser of the reason. Where content is removed without fault of the advertiser, the unused part of the fee is refunded pro rata.",
  },
  {
    heading: "6. Term and termination",
    body: "This agreement runs for the period stated above and ends without notice. Either party may terminate for material breach with written notice and 14 days to remedy.",
  },
  {
    heading: "7. Payment",
    body: "Fees are stated in Swiss francs, excluding VAT where applicable, and are invoiced on the terms noted above. There is no online payment for advertising.",
  },
  {
    heading: "8. No exclusivity",
    body: "Advertising is non-exclusive. The Switzerland Chapter of ICF may place advertising for other advertisers, including competitors, on the same surfaces.",
  },
  {
    heading: "9. Data protection",
    body: "Both parties process personal data in line with the Swiss Federal Act on Data Protection. Placement performance is reported as aggregate click counts only.",
  },
  {
    heading: "10. Governing law and jurisdiction",
    body: "This agreement is governed by Swiss law. The ordinary courts at the seat of The Switzerland Chapter of ICF have exclusive jurisdiction.",
  },
];

function ContractPage() {
  const { id } = Route.useParams();
  const { t } = useCms();
  const detail = useQuery({
    queryKey: ["ad-request", id],
    queryFn: () => getAdRequestFn({ data: { id } }),
  });

  const request = detail.data?.request ?? null;
  const contract = detail.data?.contract ?? null;

  return (
    <main className="min-h-screen bg-background py-10 print:bg-card print:py-0">
      <div className="mx-auto max-w-3xl px-6 print:max-w-none print:px-0">
        <div className="flex items-center justify-between print:hidden">
          <Button variant="outline" size="sm" asChild>
            <Link to="/manage/ad-requests/$id" params={{ id }}>
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
              {t("advertise.staff.queue")}
            </Link>
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" aria-hidden />
            {t("advertise.staff.printContract")}
          </Button>
        </div>

        {!request || !contract ? (
          <p className="mt-10 text-sm text-muted-foreground">
            {detail.isLoading ? "…" : t("advertise.staff.noContract")}
          </p>
        ) : (
          <article className="mt-8 rounded-3xl border border-border bg-card p-10 text-sm leading-relaxed text-foreground print:rounded-none print:border-0 print:bg-card print:p-0">
            <h1 className="font-heading text-2xl">Advertising agreement</h1>
            <p className="mt-1 text-muted-foreground">The Switzerland Chapter of ICF</p>

            <section className="mt-8 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="font-semibold">Advertiser</p>
                <p className="mt-1 whitespace-pre-line">
                  {`${contract.advertiser_name}\n${contract.advertiser_address ?? ""}`}
                </p>
              </div>
              <div>
                <p className="font-semibold">Chapter</p>
                <p className="mt-1 whitespace-pre-line">
                  {"The Switzerland Chapter of ICF\noffice@coachingfederation.ch"}
                </p>
              </div>
            </section>

            <section className="mt-8 grid gap-1">
              <p>
                <strong>{t("advertise.staff.offer")}:</strong>{" "}
                {t(`advertise.offer.${request.offer_type}`)}
                {request.package ? ` — ${request.package}` : ""}
              </p>
              <p>
                <strong>{t("advertise.review.period")}:</strong> {request.active_from ?? "—"} –{" "}
                {request.active_until ?? "—"}
              </p>
              <p>
                <strong>{t("advertise.review.price")}:</strong>{" "}
                {formatChf(contract.price, contract.currency)}
              </p>
              <p>
                <strong>{t("advertise.staff.paymentTerms")}:</strong> {contract.payment_terms}
              </p>
            </section>

            <section className="mt-8 grid gap-4">
              {CLAUSES.map((clause) => (
                <div key={clause.heading}>
                  <p className="font-semibold">{clause.heading}</p>
                  <p className="mt-1 text-muted-foreground print:text-foreground">{clause.body}</p>
                </div>
              ))}
            </section>

            <section className="mt-12 grid grid-cols-2 gap-10 text-xs text-muted-foreground print:text-foreground">
              <div>
                <p className="border-t border-foreground pt-2">Place, date — for the advertiser</p>
              </div>
              <div>
                <p className="border-t border-foreground pt-2">
                  Place, date — for The Switzerland Chapter of ICF
                </p>
              </div>
            </section>
          </article>
        )}
      </div>
    </main>
  );
}
