/**
 * Staff review queue for advertising requests (/manage/ad-requests).
 * Exports: Route.
 *
 * The queue exists so that both halves of a request are visible before anyone
 * approves it: the content, and the commercial claim behind the price. The
 * claimed eligibility and the school attestation are therefore columns here,
 * not something buried in the detail view.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Shell } from "@/components/cms/Shell";
import { FeatureOffNotice } from "@/components/cms/FeatureOffNotice";
import { useCms } from "@/i18n/cms";
import { PLATFORM_ADMIN_ROLES, requireStaffAccess } from "@/lib/staff-guard";
import { Badge, Button } from "@/design-system/icf-welcome-design-system-a835df";
import { STATUS_ORDER, formatChf, type AdRequestStatus } from "@/lib/ads";
import { listAdRequestsFn } from "@/lib/ads-admin.functions";

export const Route = createFileRoute("/_staff/manage/ad-requests/")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, PLATFORM_ADMIN_ROLES),
  head: () => ({
    meta: [
      { title: "Advertising requests — The Switzerland Chapter of ICF CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdRequestsPage,
});

/** Statuses that still need someone to act; the queue opens on these. */
const OPEN_STATUSES: AdRequestStatus[] = [
  "submitted",
  "under_review",
  "approved",
  "contract_sent",
  "contract_signed",
];

function AdRequestsPage() {
  const { t } = useCms();
  const [statuses, setStatuses] = useState<AdRequestStatus[]>(OPEN_STATUSES);

  const { data, isLoading } = useQuery({
    queryKey: ["ad-requests", statuses],
    queryFn: () => listAdRequestsFn({ data: { statuses } }),
  });

  const toggle = (status: AdRequestStatus) =>
    setStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <FeatureOffNotice feature="advertising" />
        <h1 className="font-heading text-3xl">{t("advertise.staff.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("advertise.staff.lede")}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {STATUS_ORDER.filter((status) => status !== "draft").map((status) => (
            <label
              key={status}
              className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs"
            >
              <input
                type="checkbox"
                checked={statuses.includes(status)}
                onChange={() => toggle(status)}
              />
              {t(`advertise.status.${status}`)}
            </label>
          ))}
        </div>

        {isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">…</p>
        ) : data === null ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-heading text-xl">Advertising is not available yet</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              The advertising workspace will become available when the pending backend update is
              accepted.
            </p>
          </div>
        ) : data?.length ? (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("advertise.staff.advertiser")}</th>
                  <th className="px-4 py-3">{t("advertise.staff.offer")}</th>
                  <th className="px-4 py-3">{t("advertise.staff.eligibility")}</th>
                  <th className="px-4 py-3">{t("advertise.staff.price")}</th>
                  <th className="px-4 py-3">{t("advertise.staff.submittedAt")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.map((request) => (
                  <tr key={request.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold">
                      {request.advertiser_name || "—"}
                      <span className="ml-2">
                        <Badge variant="secondary">
                          {t(`advertise.status.${request.status}`)}
                        </Badge>
                      </span>
                      <span className="ml-2">
                        <Badge variant="outline">
                          {t(`advertiser.kind.${request.requester_kind ?? "member"}`)}
                        </Badge>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t(`advertise.offer.${request.offer_type}`)}
                      {request.package ? ` · ${request.package}` : ""}
                      {request.duration_months ? ` · ${request.duration_months}m` : ""}
                    </td>
                    <td className="px-4 py-3">
                      {request.eligibility_tier
                        ? t(`advertise.eligibility.${request.eligibility_tier}`)
                        : "—"}
                      {request.school_attestation ? (
                        <span className="ml-2">
                          <Badge variant="outline">
                            {request.school_attestation.programType}
                          </Badge>
                        </span>
                      ) : null}
                      {request.eligibility_source === "staff_override" ? (
                        <span className="ml-2 text-xs text-muted-foreground">★</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {formatChf(request.computed_price, request.currency)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {request.submitted_at?.slice(0, 10) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link to="/manage/ad-requests/$id" params={{ id: request.id }}>
                          {t("advertise.staff.open")}
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-8 text-sm text-muted-foreground">{t("advertise.staff.empty")}</p>
        )}
      </div>
    </Shell>
  );
}
