/**
 * Rate card editor (/manage/ad-rate-cards).
 * Exports: Route.
 *
 * The board owns the prices, so every figure is data. Saving never edits the
 * live card: it writes a new version and activates it, which is why a request
 * already priced against version N keeps its price for ever.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Shell } from "@/components/cms/Shell";
import { useCms } from "@/i18n/cms";
import { PLATFORM_ADMIN_ROLES, requireStaffAccess } from "@/lib/staff-guard";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@/design-system/icf-welcome-design-system-a835df";
import {
  PACKAGE_DURATIONS,
  PARTNER_PACKAGES,
  SCHOOL_DURATIONS,
  SCHOOL_PLACEMENTS,
  formatChf,
  isRateCardLocked,
  rateCardChangeableFrom,
  type AdPlacementType,
  type AdRateCard,
} from "@/lib/ads";
import {
  getAdRateCardFn,
  getAdRateCardHistoryFn,
  saveAdRateCardFn,
} from "@/lib/ads-admin.functions";

export const Route = createFileRoute("/_staff/manage/ad-rate-cards")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, PLATFORM_ADMIN_ROLES),
  head: () => ({
    meta: [
      { title: "Advertising rate card — The Switzerland Chapter of ICF CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RateCardPage,
  errorComponent: RateCardUnavailable,
});

/** Editable copy of the card: every price is a string while it is being typed. */
type Draft = {
  packages: Record<string, Record<string, string>>;
  eannouncement: Record<string, string>;
  school: Record<string, Record<string, string>>;
  guard: string;
};

function toDraft(card: AdRateCard): Draft {
  const packages: Draft["packages"] = {};
  for (const key of PARTNER_PACKAGES) {
    packages[key] = {};
    for (const months of PACKAGE_DURATIONS) {
      packages[key]![String(months)] = String(card.packages[key]?.prices?.[String(months)] ?? "");
    }
  }
  const school: Draft["school"] = {};
  for (const placement of SCHOOL_PLACEMENTS) {
    school[placement] = {};
    for (const months of SCHOOL_DURATIONS[placement]) {
      school[placement]![String(months)] = String(
        card.school_prices[placement]?.[String(months)] ?? "",
      );
    }
  }
  return {
    packages,
    eannouncement: {
      icfs_member: String(card.eannouncement_prices.icfs_member ?? ""),
      icf_global: String(card.eannouncement_prices.icf_global ?? ""),
    },
    school,
    guard: String(card.newsletter_mentions_guard ?? 0),
  };
}

function numbersOf(prices: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(prices)) {
    const parsed = Number(value);
    if (value !== "" && Number.isFinite(parsed) && parsed >= 0) out[key] = parsed;
  }
  return out;
}

function RateCardPage() {
  const { t } = useCms();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const card = useQuery({ queryKey: ["ad-rate-card"], queryFn: () => getAdRateCardFn() });
  const history = useQuery({
    queryKey: ["ad-rate-card-history"],
    queryFn: () => getAdRateCardHistoryFn(),
  });
  const [isCorrection, setIsCorrection] = useState(false);
  const [reason, setReason] = useState("");
  const activeEntry = history.data?.find((entry) => entry.is_active);
  const today = new Date().toISOString().slice(0, 10);
  const lockedUntil =
    activeEntry && isRateCardLocked(activeEntry.valid_from, today)
      ? rateCardChangeableFrom(activeEntry.valid_from)
      : null;

  useEffect(() => {
    if (card.data) setDraft(toDraft(card.data));
  }, [card.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!draft || !card.data) throw new Error("Nothing to save.");
      const packages: Record<string, unknown> = {};
      for (const key of PARTNER_PACKAGES) {
        const existing = card.data.packages[key];
        packages[key] = {
          label: existing?.label ?? key,
          placements: existing?.placements ?? [],
          prices: numbersOf(draft.packages[key] ?? {}),
        };
      }
      const schoolPrices: Record<string, Record<string, number>> = {};
      for (const placement of SCHOOL_PLACEMENTS) {
        schoolPrices[placement] = numbersOf(draft.school[placement] ?? {});
      }
      return saveAdRateCardFn({
        data: {
          packages,
          eannouncementPrices: numbersOf(draft.eannouncement),
          schoolPrices,
          newsletterMentionsGuard: Number(draft.guard) || 0,
          correctionReason: isCorrection ? reason : undefined,
        },
      });
    },
    onSuccess: () => {
      setError(null);
      setSaved(true);
      setIsCorrection(false);
      setReason("");
      void queryClient.invalidateQueries({ queryKey: ["ad-rate-card"] });
      void queryClient.invalidateQueries({ queryKey: ["ad-rate-card-history"] });
    },
    onError: (err: Error) => {
      setSaved(false);
      setError(err.message);
    },
  });

  const setPackagePrice = (pkg: string, months: string, value: string) =>
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            packages: { ...prev.packages, [pkg]: { ...prev.packages[pkg], [months]: value } },
          }
        : prev,
    );

  const setSchoolPrice = (placement: string, months: string, value: string) =>
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            school: { ...prev.school, [placement]: { ...prev.school[placement], [months]: value } },
          }
        : prev,
    );

  return (
    <Shell>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-heading text-3xl">{t("advertise.rateCard.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("advertise.rateCard.lede")}
        </p>

        {card.isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">…</p>
        ) : card.data === null ? (
          <p className="mt-8 text-sm text-muted-foreground">
            The rate card becomes editable once the advertising setup is live.
          </p>
        ) : !draft ? (
          <p className="mt-8 text-sm text-destructive">
            The advertising rate card could not be loaded.
          </p>
        ) : (
          <div className="mt-8 grid gap-6">
            <p className="text-xs text-muted-foreground">
              {t("advertise.rateCard.version")}: {card.data?.version} · {card.data?.currency}
            </p>

            <Card>
              <CardContent className="grid gap-4 py-6">
                <p className="font-semibold">{t("advertise.rateCard.packages")}</p>
                {PARTNER_PACKAGES.map((pkg) => (
                  <div key={pkg} className="grid gap-3 sm:grid-cols-3 sm:items-end">
                    <p className="text-sm font-semibold capitalize">
                      {card.data?.packages[pkg]?.label ?? pkg}
                    </p>
                    {PACKAGE_DURATIONS.map((months) => (
                      <div key={months}>
                        <Label htmlFor={`pkg-${pkg}-${months}`}>
                          {t("advertise.offer.months").replace("{n}", String(months))}
                        </Label>
                        <Input
                          id={`pkg-${pkg}-${months}`}
                          inputMode="numeric"
                          value={draft.packages[pkg]?.[String(months)] ?? ""}
                          onChange={(event) =>
                            setPackagePrice(pkg, String(months), event.target.value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="grid gap-4 py-6 sm:grid-cols-2">
                <p className="font-semibold sm:col-span-2">
                  {t("advertise.rateCard.eannouncement")}
                </p>
                {(["icfs_member", "icf_global"] as const).map((tier) => (
                  <div key={tier}>
                    <Label htmlFor={`tier-${tier}`}>{t(`advertise.eligibility.${tier}`)}</Label>
                    <Input
                      id={`tier-${tier}`}
                      inputMode="numeric"
                      value={draft.eannouncement[tier] ?? ""}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                eannouncement: {
                                  ...prev.eannouncement,
                                  [tier]: event.target.value,
                                },
                              }
                            : prev,
                        )
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="grid gap-4 py-6">
                <p className="font-semibold">{t("advertise.rateCard.schools")}</p>
                {SCHOOL_PLACEMENTS.map((placement: AdPlacementType) => (
                  <div key={placement} className="grid gap-3 sm:grid-cols-4 sm:items-end">
                    <p className="text-sm font-semibold">{t(`advertise.placement.${placement}`)}</p>
                    {SCHOOL_DURATIONS[placement].map((months) => (
                      <div key={months}>
                        <Label htmlFor={`school-${placement}-${months}`}>
                          {months === 1
                            ? t("advertise.offer.oneMonth")
                            : t("advertise.offer.months").replace("{n}", String(months))}
                        </Label>
                        <Input
                          id={`school-${placement}-${months}`}
                          inputMode="numeric"
                          value={draft.school[placement]?.[String(months)] ?? ""}
                          onChange={(event) =>
                            setSchoolPrice(placement, String(months), event.target.value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="grid gap-2 py-6">
                <Label htmlFor="mentions-guard">{t("advertise.rateCard.mentionsGuard")}</Label>
                <Input
                  id="mentions-guard"
                  inputMode="numeric"
                  className="max-w-xs"
                  value={draft.guard}
                  onChange={(event) =>
                    setDraft((prev) => (prev ? { ...prev, guard: event.target.value } : prev))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("advertise.rateCard.mentionsHint")}
                </p>
              </CardContent>
            </Card>

            {lockedUntil ? (
              <Card>
                <CardContent className="grid gap-3 py-6">
                  <p className="text-sm">
                    Prices are locked until <strong>{lockedUntil}</strong> (three-month price
                    guard). Publish earlier only to correct an error.
                  </p>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="is-correction"
                      checked={isCorrection}
                      onCheckedChange={(value) => setIsCorrection(value === true)}
                    />
                    <Label htmlFor="is-correction">This is an error correction</Label>
                  </div>
                  {isCorrection ? (
                    <div className="grid gap-2">
                      <Label htmlFor="correction-reason">What was wrong?</Label>
                      <Textarea
                        id="correction-reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {saved ? (
              <p className="text-sm text-muted-foreground">{t("advertise.rateCard.saved")}</p>
            ) : null}

            <div className="flex items-center gap-3">
              <Button
                onClick={() => save.mutate()}
                disabled={
                  save.isPending ||
                  (!!lockedUntil && (!isCorrection || reason.trim().length < 10))
                }
              >
                {lockedUntil ? "Publish correction" : t("advertise.rateCard.publish")}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t("advertise.rateCard.example")}: {formatChf(2500, card.data?.currency ?? "CHF")}
              </p>
            </div>

            <Card>
              <CardContent className="grid gap-4 py-6">
                <p className="font-semibold">Version history</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Valid from</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(history.data ?? []).map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>v{entry.version}</TableCell>
                        <TableCell>{entry.valid_from}</TableCell>
                        <TableCell>
                          {entry.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Retired</Badge>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{entry.notes ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Shell>
  );
}

/** The advertising tables arrive with the staged migration; until then, say so. */
function RateCardUnavailable() {
  return (
    <Shell>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-heading text-3xl">Advertising rate card</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The rate card becomes editable once the advertising setup is live.
        </p>
      </div>
    </Shell>
  );
}
