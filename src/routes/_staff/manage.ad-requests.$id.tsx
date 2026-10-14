/**
 * Advertising request review (/manage/ad-requests/:id).
 * Exports: Route.
 *
 * One screen for the whole decision: what the advertiser submitted, the claim
 * behind their price, the actions the state machine currently allows, the
 * contract, and the audit trail. Actions are rendered from the same transition
 * table the server enforces, so a button that is not legal is not shown — and
 * pressing one that races another reviewer fails in the database, not here.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { useCms } from "@/i18n/cms";
import { PLATFORM_ADMIN_ROLES, requireStaffAccess } from "@/lib/staff-guard";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
} from "@/design-system/icf-welcome-design-system-a835df";
import { formatChf, type AdRequestStatus } from "@/lib/ads";
import {
  getAdRequestFn,
  saveAdContractFn,
  transitionAdRequestFn,
  updateAdRequestNotesFn,
} from "@/lib/ads-admin.functions";

export const Route = createFileRoute("/_staff/manage/ad-requests/$id")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, PLATFORM_ADMIN_ROLES),
  head: () => ({
    meta: [
      { title: "Advertising request — The Switzerland Chapter of ICF CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdRequestDetailPage,
});

/** Which actions the current status allows — mirrors `LEGAL_FROM` on the server. */
function actionsFor(status: AdRequestStatus): readonly string[] {
  switch (status) {
    case "submitted":
      return ["start_review", "approve", "decline", "cancel"] as const;
    case "under_review":
      return ["approve", "decline", "cancel"] as const;
    case "approved":
      return ["send_contract", "mark_signed", "cancel"] as const;
    case "contract_sent":
      return ["mark_signed", "cancel"] as const;
    case "contract_signed":
      return ["activate", "cancel"] as const;
    case "active":
      return ["expire", "cancel"] as const;
    default:
      return [] as const;
  }
}

const ACTION_LABEL: Record<string, string> = {
  start_review: "advertise.staff.startReview",
  approve: "advertise.staff.approve",
  decline: "advertise.staff.decline",
  send_contract: "advertise.staff.sendContract",
  mark_signed: "advertise.staff.markSigned",
  activate: "advertise.staff.activate",
  expire: "advertise.staff.expire",
  cancel: "advertise.staff.cancel",
};

function AdRequestDetailPage() {
  const { id } = Route.useParams();
  const { t } = useCms();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [priceOverride, setPriceOverride] = useState("");
  const [tierOverride, setTierOverride] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [address, setAddress] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [error, setError] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ["ad-request", id],
    queryFn: () => getAdRequestFn({ data: { id } }),
  });

  const request = detail.data?.request ?? null;
  const contract = detail.data?.contract ?? null;
  const advertiserProfile = detail.data?.advertiserProfile ?? null;

  useEffect(() => {
    if (request) {
      setNotes(request.staff_notes ?? "");
      setStartDate(request.active_from ?? request.requested_start ?? "");
      setEndDate(request.active_until ?? "");
    }
    if (contract) {
      setAddress(contract.advertiser_address ?? "");
      setPaymentTerms(contract.payment_terms ?? "");
    }
  }, [request, contract]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["ad-request", id] });
    void queryClient.invalidateQueries({ queryKey: ["ad-requests"] });
  };

  const transition = useMutation({
    mutationFn: (action: string) => {
      if (action === "decline") {
        return transitionAdRequestFn({
          data: { id, transition: { action: "decline", reason: declineReason } },
        });
      }
      if (action === "approve") {
        return transitionAdRequestFn({
          data: {
            id,
            transition: {
              action: "approve",
              ...(priceOverride ? { price: Number(priceOverride) } : {}),
              ...(tierOverride ? { tier: tierOverride as "icfs_member" | "icf_global" } : {}),
              ...(startDate ? { startDate } : {}),
              ...(endDate ? { endDate } : {}),
            },
          },
        });
      }
      return transitionAdRequestFn({
        // The remaining actions carry no payload.
        data: { id, transition: { action } as { action: "activate" } },
      });
    },
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err: Error) => setError(err.message),
  });

  const saveNotes = useMutation({
    mutationFn: () => updateAdRequestNotesFn({ data: { id, notes } }),
    onSuccess: invalidate,
    onError: (err: Error) => setError(err.message),
  });

  const saveContract = useMutation({
    mutationFn: () =>
      saveAdContractFn({
        data: { requestId: id, advertiserAddress: address, paymentTerms },
      }),
    onSuccess: invalidate,
    onError: (err: Error) => setError(err.message),
  });

  if (!request) {
    return (
      <Shell>
        <div className="mx-auto max-w-4xl px-6 py-8 text-sm text-muted-foreground">…</div>
      </Shell>
    );
  }

  const descriptions = [
    ["DE", request.description_de],
    ["FR", request.description_fr],
    ["IT", request.description_it],
    ["EN", request.description_en],
  ] as const;

  return (
    <Shell>
      <div className="mx-auto max-w-4xl px-6 py-8 print:max-w-none">
        <div className="print:hidden">
          <Button asChild variant="ghost" size="sm">
            <Link to="/manage/ad-requests">
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
              {t("advertise.staff.queue")}
            </Link>
          </Button>
        </div>

        <header className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl">{request.advertiser_name || "—"}</h1>
          <Badge variant="secondary">{t(`advertise.status.${request.status}`)}</Badge>
          <Badge variant="outline">
            {t(`advertiser.kind.${request.requester_kind ?? "member"}`)}
          </Badge>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-6">
            <Card>
              <CardContent className="grid gap-2 py-6 text-sm">
                <Row
                  label={t("advertise.staff.offer")}
                  value={`${t(`advertise.offer.${request.offer_type}`)}${
                    request.package ? ` · ${request.package}` : ""
                  }${request.duration_months ? ` · ${request.duration_months} months` : ""}`}
                />
                <Row
                  label={t("advertise.staff.price")}
                  value={formatChf(request.computed_price, request.currency)}
                />
                <Row
                  label={t("advertise.staff.eligibility")}
                  value={
                    request.eligibility_tier
                      ? `${t(`advertise.eligibility.${request.eligibility_tier}`)} (${request.eligibility_source})`
                      : "—"
                  }
                />
                <Row
                  label={t("advertise.review.period")}
                  value={
                    request.active_from ? `${request.active_from} – ${request.active_until}` : "—"
                  }
                />
                {advertiserProfile ? (
                  <>
                    <Row
                      label={t("advertiser.profile.organisation")}
                      value={advertiserProfile.organisation}
                    />
                    <Row
                      label={t("advertiser.profile.contactName")}
                      value={advertiserProfile.contact_name}
                    />
                    <Row
                      label={t("advertiser.profile.phone")}
                      value={advertiserProfile.phone ?? "—"}
                    />
                    <Row
                      label={t("advertiser.profile.billingAddress")}
                      value={`${advertiserProfile.billing_street}, ${advertiserProfile.billing_postcode} ${advertiserProfile.billing_city}, ${advertiserProfile.billing_country}`}
                    />
                    <Row
                      label={t("advertiser.profile.vatNumber")}
                      value={advertiserProfile.vat_number ?? "—"}
                    />
                  </>
                ) : null}
                <Row
                  label={t("advertise.content.contactEmail")}
                  value={request.contact_email ?? "—"}
                />
                {request.contact_name ? (
                  <Row label={t("advertise.contract.contactName")} value={request.contact_name} />
                ) : null}
                {request.contact_phone ? (
                  <Row label={t("advertise.contract.phone")} value={request.contact_phone} />
                ) : null}
                {request.billing_street ? (
                  <Row
                    label={t("advertise.contract.street")}
                    value={`${request.billing_street}, ${request.billing_postcode ?? ""} ${request.billing_city ?? ""}, ${request.billing_country ?? ""}`}
                  />
                ) : null}
                {request.vat_number ? (
                  <Row label={t("advertise.contract.vat")} value={request.vat_number} />
                ) : null}
                {request.headline_en || request.headline_de ? (
                  <Row
                    label={t("advertise.content.headline")}
                    value={request.headline_en || request.headline_de || ""}
                  />
                ) : null}
                <Row label={t("advertise.content.ctaUrl")} value={request.cta_url ?? "—"} />
                <Row
                  label={t("advertise.design.title")}
                  value={t(`advertise.design.${resolveAdDesignVariant(request.design_variant)}.name`)}
                />
                {request.announcement_date ? (
                  <Row
                    label={t("advertise.content.announcementDate")}
                    value={request.announcement_date}
                  />
                ) : null}
                <Row
                  label={t("advertise.content.newsletterMentions")}
                  value={String(request.newsletter_mentions)}
                />
              </CardContent>
            </Card>

            {request.school_attestation ? (
              <Card>
                <CardContent className="grid gap-2 py-6 text-sm">
                  <p className="font-semibold">{t("advertise.staff.schoolAttestation")}</p>
                  <p className="text-muted-foreground">{t("advertise.staff.verifyFirst")}</p>
                  <Row
                    label={t("advertise.school.organisation")}
                    value={request.school_attestation.organisation}
                  />
                  <Row
                    label={t("advertise.school.programType")}
                    value={request.school_attestation.programType}
                  />
                  <Row
                    label={t("advertise.school.accreditation")}
                    value={request.school_attestation.accreditationReference}
                  />
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardContent className="grid gap-3 py-6 text-sm">
                <p className="font-semibold">{t("advertise.content.title")}</p>
                {detail.data?.logoUrl ? (
                  <img
                    src={detail.data.logoUrl}
                    alt={`${request.advertiser_name ?? ""} logo`}
                    className="h-16 w-auto"
                  />
                ) : null}
                {descriptions.map(([code, text]) => (
                  <p key={code}>
                    <span className="text-xs uppercase text-muted-foreground">{code}</span>{" "}
                    {text || "—"}
                  </p>
                ))}
              </CardContent>
            </Card>

            <Card className="print:hidden">
              <CardContent className="grid gap-3 py-6">
                <Label htmlFor="staff-notes">{t("advertise.staff.notes")}</Label>
                <Textarea
                  id="staff-notes"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
                <div>
                  <Button size="sm" variant="outline" onClick={() => saveNotes.mutate()}>
                    {t("advertise.staff.saveNotes")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {contract ? (
              <Card>
                <CardContent className="grid gap-3 py-6 text-sm">
                  <p className="font-semibold">{t("advertise.staff.contract")}</p>
                  <div className="print:hidden">
                    <Label htmlFor="advertiser-address">{t("advertise.staff.address")}</Label>
                    <Textarea
                      id="advertiser-address"
                      rows={3}
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                    />
                    <Label htmlFor="payment-terms" className="mt-3 block">
                      {t("advertise.staff.paymentTerms")}
                    </Label>
                    <Textarea
                      id="payment-terms"
                      rows={2}
                      value={paymentTerms}
                      onChange={(event) => setPaymentTerms(event.target.value)}
                    />
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => saveContract.mutate()}>
                        {t("advertise.saveDraft")}
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/manage/ad-requests/$id/contract" params={{ id }}>
                          <Printer className="mr-1 h-4 w-4" aria-hidden />
                          {t("advertise.staff.printContract")}
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="font-heading text-lg">
                      Advertising agreement — The Switzerland Chapter of ICF
                    </p>
                    <p className="mt-2 whitespace-pre-line">
                      {`${contract.advertiser_name}\n${address}`}
                    </p>
                    <p className="mt-3">
                      {t("advertise.staff.offer")}: {t(`advertise.offer.${request.offer_type}`)}
                      {request.package ? ` — ${request.package}` : ""}
                    </p>
                    <p>
                      {t("advertise.review.period")}: {request.active_from ?? "—"} –{" "}
                      {request.active_until ?? "—"}
                    </p>
                    <p>
                      {t("advertise.review.price")}: {formatChf(contract.price, contract.currency)}
                    </p>
                    <p className="mt-2">{paymentTerms}</p>
                    <div className="mt-8 grid grid-cols-2 gap-8 text-xs text-muted-foreground">
                      <p>
                        __________________________
                        <br />
                        Advertiser
                      </p>
                      <p>
                        __________________________
                        <br />
                        The Switzerland Chapter of ICF
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <aside className="grid gap-4 print:hidden">
            <Card>
              <CardContent className="grid gap-3 py-6">
                {actionsFor(request.status).includes("approve") ? (
                  <div className="grid gap-2 text-sm">
                    <Label htmlFor="price-override">{t("advertise.staff.adjustPrice")}</Label>
                    <Input
                      id="price-override"
                      type="number"
                      min={0}
                      placeholder={String(request.computed_price)}
                      value={priceOverride}
                      onChange={(event) => setPriceOverride(event.target.value)}
                    />
                    <Label htmlFor="tier-override">{t("advertise.staff.adjustTier")}</Label>
                    <select
                      id="tier-override"
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      value={tierOverride}
                      onChange={(event) => setTierOverride(event.target.value)}
                    >
                      <option value="">—</option>
                      <option value="icfs_member">{t("advertise.eligibility.icfs_member")}</option>
                      <option value="icf_global">{t("advertise.eligibility.icf_global")}</option>
                    </select>
                    <Label htmlFor="start-date">{t("advertise.staff.startDate")}</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                    <Label htmlFor="end-date">{t("advertise.staff.endDate")}</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                    />
                  </div>
                ) : null}

                {actionsFor(request.status).includes("decline") ? (
                  <div className="grid gap-2 text-sm">
                    <Label htmlFor="decline-reason">{t("advertise.staff.declineReason")}</Label>
                    <Textarea
                      id="decline-reason"
                      rows={3}
                      value={declineReason}
                      onChange={(event) => setDeclineReason(event.target.value)}
                    />
                  </div>
                ) : null}

                <div className="grid gap-2">
                  {actionsFor(request.status).map((action) => (
                    <Button
                      key={action}
                      size="sm"
                      variant={action === "decline" || action === "cancel" ? "outline" : "default"}
                      disabled={
                        transition.isPending ||
                        (action === "decline" && declineReason.trim().length < 3)
                      }
                      onClick={() => transition.mutate(action)}
                    >
                      {t(ACTION_LABEL[action] ?? action)}
                    </Button>
                  ))}
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </CardContent>
            </Card>

            {detail.data?.placements.length ? (
              <Card>
                <CardContent className="py-6 text-sm">
                  <p className="font-semibold">{t("advertise.staff.placements")}</p>
                  <ul className="mt-2 grid gap-1 text-muted-foreground">
                    {detail.data.placements.map((placement) => (
                      <li key={placement.id}>
                        {t(`advertise.placement.${placement.placement_type}`)} ·{" "}
                        {placement.start_date} – {placement.end_date}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardContent className="py-6 text-sm">
                <p className="font-semibold">{t("advertise.staff.history")}</p>
                <ul className="mt-2 grid gap-1 text-muted-foreground">
                  {detail.data?.events.map((event) => (
                    <li key={event.id}>
                      {event.created_at.slice(0, 16).replace("T", " ")} · {event.event}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-border pb-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
