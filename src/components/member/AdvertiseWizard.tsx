/**
 * Member-facing "Advertise with us" configurator.
 *
 * Four steps: what you want to book, how it is configured, your content, and a
 * review. The price shown here is computed from the same rate card the server
 * prices with, and eligibility comes from the member's own record — the member
 * chooses a configuration, never a price or a price tier.
 *
 * Submitting hands the request to staff. From that moment the member can only
 * watch its status: the draft-only RLS policy and the transition trigger make
 * that true regardless of what this component does.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Loader2, Upload } from "lucide-react";
import { useCms } from "@/i18n/cms";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
} from "@/design-system/icf-welcome-design-system-a835df";
import {
  PACKAGE_DURATIONS,
  PARTNER_PACKAGES,
  SCHOOL_DURATIONS,
  SCHOOL_PLACEMENTS,
  formatChf,
  type AdOfferType,
  type AdPlacementType,
  type AdRequest,
  type PartnerPackage,
} from "@/lib/ads";
import { activeWindow, computePrice } from "@/lib/ads-pricing";
import {
  getAdvertiseCatalogue,
  listMyAdRequests,
  saveAdRequestDraft,
  submitAdRequest,
  uploadAdLogo,
} from "@/lib/ads.functions";

const TOTAL_STEPS = 4;

type WizardState = {
  offerType: AdOfferType;
  package: PartnerPackage | null;
  placements: AdPlacementType[];
  durationMonths: number | null;
  newsletterMentions: number;
  organisation: string;
  programType: string;
  accreditationReference: string;
  attested: boolean;
  advertiserName: string;
  contactEmail: string;
  logoPath: string | null;
  descriptionDe: string;
  descriptionFr: string;
  descriptionIt: string;
  descriptionEn: string;
  ctaUrl: string;
  announcementDate: string;
  requestedStart: string;
};

const EMPTY: WizardState = {
  offerType: "partner_package",
  package: "gold",
  placements: [],
  durationMonths: 12,
  newsletterMentions: 0,
  organisation: "",
  programType: "",
  accreditationReference: "",
  attested: false,
  advertiserName: "",
  contactEmail: "",
  logoPath: null,
  descriptionDe: "",
  descriptionFr: "",
  descriptionIt: "",
  descriptionEn: "",
  ctaUrl: "",
  announcementDate: "",
  requestedStart: "",
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

export function AdvertiseWizard() {
  const { t } = useCms();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const catalogue = useQuery({
    queryKey: ["advertise-catalogue"],
    queryFn: () => getAdvertiseCatalogue(),
  });
  const requests = useQuery({
    queryKey: ["my-ad-requests"],
    queryFn: () => listMyAdRequests(),
  });

  const rateCard = catalogue.data?.rateCard ?? null;
  const eligibility = catalogue.data?.eligibility ?? null;

  const price = useMemo(() => {
    if (!rateCard) return null;
    const result = computePrice(
      rateCard,
      {
        offerType: state.offerType,
        package: state.package,
        placements: state.placements,
        durationMonths: state.durationMonths,
      },
      eligibility?.tier ?? null,
    );
    return result.ok ? result : null;
  }, [rateCard, state, eligibility]);

  const period = useMemo(() => {
    const start = state.requestedStart || new Date().toISOString().slice(0, 10);
    return activeWindow({
      offerType: state.offerType,
      startDate: start,
      durationMonths: state.durationMonths,
      announcementDate: state.announcementDate || null,
    });
  }, [state]);

  const patch = (next: Partial<WizardState>) => setState((prev) => ({ ...prev, ...next }));

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const dataBase64 = await readFileAsBase64(file);
      return uploadAdLogo({
        data: {
          fileName: file.name,
          contentType: file.type as "image/png",
          dataBase64,
        },
      });
    },
    onSuccess: (result) => patch({ logoPath: result.path }),
    onError: (err: Error) => setError(err.message),
  });

  const save = useMutation({
    mutationFn: async () =>
      saveAdRequestDraft({
        data: {
          offerType: state.offerType,
          package: state.offerType === "partner_package" ? state.package : null,
          placements: state.offerType === "school" ? state.placements : [],
          durationMonths: state.offerType === "eannouncement" ? null : state.durationMonths,
          newsletterMentions: state.newsletterMentions,
          schoolAttestation:
            state.offerType === "school"
              ? {
                  organisation: state.organisation,
                  programType: state.programType,
                  accreditationReference: state.accreditationReference,
                }
              : null,
          advertiserName: state.advertiserName || null,
          contactEmail: state.contactEmail || null,
          logoPath: state.logoPath,
          descriptionDe: state.descriptionDe || null,
          descriptionFr: state.descriptionFr || null,
          descriptionIt: state.descriptionIt || null,
          descriptionEn: state.descriptionEn || null,
          ctaUrl: state.ctaUrl || null,
          announcementDate: state.announcementDate || null,
          requestedStart: state.requestedStart || null,
        },
      }),
    onError: (err: Error) => setError(err.message),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-ad-requests"] }),
  });

  const submit = useMutation({
    mutationFn: async () => {
      const draft = await save.mutateAsync();
      return submitAdRequest({ data: { id: (draft as AdRequest).id } });
    },
    onSuccess: () => {
      setDone(true);
      setOpen(false);
      setStep(1);
      setState(EMPTY);
      void queryClient.invalidateQueries({ queryKey: ["my-ad-requests"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const canContinue = () => {
    if (step === 2) {
      if (state.offerType === "partner_package")
        return Boolean(state.package && state.durationMonths);
      if (state.offerType === "school")
        return (
          state.placements.length > 0 &&
          Boolean(state.durationMonths) &&
          state.attested &&
          state.organisation.trim().length > 1 &&
          state.programType.trim().length > 1 &&
          state.accreditationReference.trim().length > 1
        );
      return Boolean(state.announcementDate);
    }
    if (step === 3) return state.advertiserName.trim().length > 1 && Boolean(state.contactEmail);
    return true;
  };

  const durations =
    state.offerType === "school"
      ? [
          ...new Set(state.placements.flatMap((placement) => SCHOOL_DURATIONS[placement] ?? [])),
        ].sort((a, b) => b - a)
      : [...PACKAGE_DURATIONS];

  if (catalogue.isPending || requests.isPending) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center px-6 py-10">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  if (catalogue.data === null) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Card>
          <CardContent className="py-6">
            <h1 className="font-heading text-2xl text-foreground">
              Advertising is not available yet
            </h1>
            <p className="mt-3 text-muted-foreground">
              This section becomes available once the advertising setup is live. Please try again
              later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-heading text-3xl">{t("advertise.title")}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{t("advertise.lede")}</p>

      {done ? (
        <Card className="mt-6">
          <CardContent className="flex items-start gap-3 py-6">
            <Check className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
            <p>{t("advertise.submitted")}</p>
          </CardContent>
        </Card>
      ) : null}

      {!open ? (
        <div className="mt-6">
          <Button size="pill" onClick={() => setOpen(true)}>
            {t("advertise.start")}
          </Button>
        </div>
      ) : null}

      {open && rateCard ? (
        <Card className="mt-8">
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              {t("advertise.step")
                .replace("{n}", String(step))
                .replace("{total}", String(TOTAL_STEPS))}
            </p>

            {step === 1 ? (
              <fieldset className="mt-4">
                <legend className="font-heading text-xl">{t("advertise.offer.title")}</legend>
                <div className="mt-4 grid gap-3">
                  {(["partner_package", "eannouncement", "school"] as AdOfferType[]).map(
                    (offer) => (
                      <label
                        key={offer}
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4"
                      >
                        <input
                          type="radio"
                          name="offer"
                          className="mt-1"
                          checked={state.offerType === offer}
                          onChange={() =>
                            patch({
                              offerType: offer,
                              package: offer === "partner_package" ? "gold" : null,
                              placements: [],
                              durationMonths: offer === "eannouncement" ? null : 12,
                            })
                          }
                        />
                        <span>
                          <span className="block font-semibold">
                            {t(`advertise.offer.${offer}`)}
                          </span>
                          <span className="block text-sm text-muted-foreground">
                            {t(`advertise.offer.${offer}Body`)}
                          </span>
                        </span>
                      </label>
                    ),
                  )}
                </div>
              </fieldset>
            ) : null}

            {step === 2 && state.offerType === "partner_package" ? (
              <div className="mt-4 grid gap-4">
                <fieldset>
                  <legend className="font-semibold">{t("advertise.offer.package")}</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {PARTNER_PACKAGES.map((name) => {
                      const pkg = rateCard.packages[name];
                      if (!pkg) return null;
                      return (
                        <label
                          key={name}
                          className="cursor-pointer rounded-2xl border border-border p-4"
                        >
                          <input
                            type="radio"
                            name="package"
                            checked={state.package === name}
                            onChange={() => patch({ package: name })}
                          />
                          <span className="ml-2 font-semibold">{pkg.label}</span>
                          <span className="mt-2 block text-xs text-muted-foreground">
                            {t("advertise.offer.includes")}:{" "}
                            {pkg.placements.map((p) => t(`advertise.placement.${p}`)).join(", ")}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <DurationPicker
                  durations={durations}
                  value={state.durationMonths}
                  onChange={(months) => patch({ durationMonths: months })}
                />
                <StartDateField
                  value={state.requestedStart}
                  onChange={(value) => patch({ requestedStart: value })}
                />
              </div>
            ) : null}

            {step === 2 && state.offerType === "eannouncement" ? (
              <div className="mt-4 grid gap-4">
                <Card>
                  <CardContent className="py-5">
                    <p className="font-semibold">{t("advertise.eligibility.title")}</p>
                    <p className="mt-1 text-sm">
                      {eligibility ? t(`advertise.eligibility.${eligibility.tier}`) : ""} —{" "}
                      {price ? formatChf(price.amount, price.currency) : ""}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {eligibility?.tier === "icf_global"
                        ? t("advertise.eligibility.fallback")
                        : t("advertise.eligibility.explain")}
                    </p>
                  </CardContent>
                </Card>
                <div>
                  <Label htmlFor="announcement-date">
                    {t("advertise.content.announcementDate")}
                  </Label>
                  <Input
                    id="announcement-date"
                    type="date"
                    value={state.announcementDate}
                    onChange={(event) => patch({ announcementDate: event.target.value })}
                  />
                </div>
                <StartDateField
                  value={state.requestedStart}
                  onChange={(value) => patch({ requestedStart: value })}
                />
              </div>
            ) : null}

            {step === 2 && state.offerType === "school" ? (
              <div className="mt-4 grid gap-4">
                <fieldset>
                  <legend className="font-semibold">{t("advertise.offer.placements")}</legend>
                  <div className="mt-3 grid gap-2">
                    {SCHOOL_PLACEMENTS.map((placement) => (
                      <label key={placement} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={state.placements.includes(placement)}
                          onChange={(event) =>
                            patch({
                              placements: event.target.checked
                                ? [...state.placements, placement]
                                : state.placements.filter((p) => p !== placement),
                            })
                          }
                        />
                        <span>{t(`advertise.placement.${placement}`)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <DurationPicker
                  durations={durations}
                  value={state.durationMonths}
                  onChange={(months) => patch({ durationMonths: months })}
                />
                <Card>
                  <CardContent className="grid gap-3 py-5">
                    <p className="font-semibold">{t("advertise.school.title")}</p>
                    <p className="text-sm text-muted-foreground">{t("advertise.school.body")}</p>
                    <div>
                      <Label htmlFor="school-org">{t("advertise.school.organisation")}</Label>
                      <Input
                        id="school-org"
                        value={state.organisation}
                        onChange={(event) => patch({ organisation: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="school-program">{t("advertise.school.programType")}</Label>
                      <Input
                        id="school-program"
                        value={state.programType}
                        onChange={(event) => patch({ programType: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="school-ref">{t("advertise.school.accreditation")}</Label>
                      <Input
                        id="school-ref"
                        value={state.accreditationReference}
                        onChange={(event) => patch({ accreditationReference: event.target.value })}
                      />
                    </div>
                    <label className="flex items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={state.attested}
                        onChange={(event) => patch({ attested: event.target.checked })}
                      />
                      <span>{t("advertise.school.attest")}</span>
                    </label>
                  </CardContent>
                </Card>
                <StartDateField
                  value={state.requestedStart}
                  onChange={(value) => patch({ requestedStart: value })}
                />
              </div>
            ) : null}

            {step === 3 ? (
              <div className="mt-4 grid gap-4">
                <p className="font-heading text-xl">{t("advertise.content.title")}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="advertiser-name">{t("advertise.content.advertiserName")}</Label>
                    <Input
                      id="advertiser-name"
                      value={state.advertiserName}
                      onChange={(event) => patch({ advertiserName: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-email">{t("advertise.content.contactEmail")}</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={state.contactEmail}
                      onChange={(event) => patch({ contactEmail: event.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cta-url">{t("advertise.content.ctaUrl")}</Label>
                  <Input
                    id="cta-url"
                    type="url"
                    placeholder="https://"
                    value={state.ctaUrl}
                    onChange={(event) => patch({ ctaUrl: event.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ad-logo">{t("advertise.content.logo")}</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="ad-logo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) uploadLogo.mutate(file);
                      }}
                    />
                    {uploadLogo.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    {state.logoPath ? (
                      <Badge variant="secondary">
                        <Upload className="mr-1 h-3 w-3" aria-hidden />
                        {t("advertise.content.logo")}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("advertise.content.logoHint")}
                  </p>
                </div>
                <div className="grid gap-3">
                  <Label>{t("advertise.content.description")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("advertise.content.descriptionHint")}
                  </p>
                  {(
                    [
                      ["de", "descriptionDe"],
                      ["fr", "descriptionFr"],
                      ["it", "descriptionIt"],
                      ["en", "descriptionEn"],
                    ] as const
                  ).map(([code, key]) => (
                    <div key={code}>
                      <Label htmlFor={`desc-${code}`} className="text-xs uppercase">
                        {code}
                      </Label>
                      <Textarea
                        id={`desc-${code}`}
                        rows={2}
                        value={state[key]}
                        onChange={(event) =>
                          patch({ [key]: event.target.value } as Partial<WizardState>)
                        }
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <Label htmlFor="mentions">{t("advertise.content.newsletterMentions")}</Label>
                  <Input
                    id="mentions"
                    type="number"
                    min={0}
                    max={rateCard.newsletter_mentions_guard}
                    value={state.newsletterMentions}
                    onChange={(event) =>
                      patch({ newsletterMentions: Number(event.target.value) || 0 })
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("advertise.content.newsletterMentionsHint")}
                  </p>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="mt-4 grid gap-3">
                <p className="font-heading text-xl">{t("advertise.review.title")}</p>
                <dl className="grid gap-2 text-sm">
                  <Row
                    label={t("advertise.offer.title")}
                    value={t(`advertise.offer.${state.offerType}`)}
                  />
                  {state.package ? (
                    <Row
                      label={t("advertise.offer.package")}
                      value={rateCard.packages[state.package]?.label ?? state.package}
                    />
                  ) : null}
                  <Row
                    label={t("advertise.review.price")}
                    value={price ? formatChf(price.amount, price.currency) : "—"}
                  />
                  <Row
                    label={t("advertise.review.period")}
                    value={`${period.from} – ${period.until}`}
                  />
                  <Row label={t("advertise.content.advertiserName")} value={state.advertiserName} />
                </dl>
                <p className="text-sm text-muted-foreground">
                  {t("advertise.eligibility.explain")}
                </p>
              </div>
            ) : null}

            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {step > 1 ? (
                <Button variant="outline" size="pill" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                  {t("advertise.back")}
                </Button>
              ) : null}
              {step < TOTAL_STEPS ? (
                <Button
                  size="pill"
                  disabled={!canContinue()}
                  onClick={() => {
                    setError(null);
                    setStep(step + 1);
                  }}
                >
                  {t("advertise.next")}
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              ) : (
                <Button size="pill" disabled={submit.isPending} onClick={() => submit.mutate()}>
                  {submit.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                  {t("advertise.submit")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="pill"
                disabled={save.isPending}
                onClick={() => save.mutate()}
              >
                {t("advertise.saveDraft")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="mt-12">
        <h2 className="font-heading text-2xl">{t("advertise.myRequests")}</h2>
        {requests.data?.length ? (
          <ul className="mt-4 grid gap-3">
            {requests.data.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div>
                  <p className="font-semibold">
                    {request.advertiser_name || t(`advertise.offer.${request.offer_type}`)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(`advertise.offer.${request.offer_type}`)} ·{" "}
                    {formatChf(request.computed_price, request.currency)}
                    {request.active_from
                      ? ` · ${request.active_from} – ${request.active_until ?? ""}`
                      : ""}
                  </p>
                </div>
                <Badge variant="secondary">{t(`advertise.status.${request.status}`)}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{t("advertise.noRequests")}</p>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-border pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

function DurationPicker({
  durations,
  value,
  onChange,
}: {
  durations: number[];
  value: number | null;
  onChange: (months: number) => void;
}) {
  const { t } = useCms();
  return (
    <fieldset>
      <legend className="font-semibold">{t("advertise.offer.duration")}</legend>
      <div className="mt-3 flex flex-wrap gap-3">
        {durations.map((months) => (
          <label
            key={months}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2"
          >
            <input
              type="radio"
              name="duration"
              checked={value === months}
              onChange={() => onChange(months)}
            />
            <span className="text-sm">
              {months === 1
                ? t("advertise.offer.oneMonth")
                : t("advertise.offer.months").replace("{n}", String(months))}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function StartDateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useCms();
  return (
    <div>
      <Label htmlFor="requested-start">{t("advertise.content.requestedStart")}</Label>
      <Input
        id="requested-start"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
