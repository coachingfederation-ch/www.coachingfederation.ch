/**
 * Member-facing "Advertise with us" configurator.
 *
 * Five steps: what you want to book, how it is configured, the ad content
 * (with live previews), advertiser and contract details, and a summary. The price shown here is computed from the same rate card the server
 * prices with, and eligibility comes from the member's own record — the member
 * chooses a configuration, never a price or a price tier.
 *
 * Submitting hands the request to staff. From that moment the member can only
 * watch its status: the draft-only RLS policy and the transition trigger make
 * that true regardless of what this component does.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Languages, Loader2, Upload } from "lucide-react";
import { AdPreview, type AdPreviewContent, type AdPreviewFormat } from "./AdPreview";
import { useCms } from "@/i18n/cms";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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
  getAdvertiserPrefill,
  translateAdCopy,
  listMyAdRequests,
  saveAdRequestDraft,
  submitAdRequest,
  uploadAdLogo,
} from "@/lib/ads.functions";

const TOTAL_STEPS = 5;

const LOCALES = ["de", "fr", "it", "en"] as const;
type Loc = (typeof LOCALES)[number];
const CAP: Record<Loc, "De" | "Fr" | "It" | "En"> = { de: "De", fr: "Fr", it: "It", en: "En" };
const PHONE_RE = /^\+?[\d\s().-]{6,20}$/;

async function fileHash(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

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
  headlineDe: string;
  headlineFr: string;
  headlineIt: string;
  headlineEn: string;
  imagePath: string | null;
  contactName: string;
  contactPhone: string;
  billingStreet: string;
  billingPostcode: string;
  billingCity: string;
  billingCountry: string;
  vatNumber: string;
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
  headlineDe: "",
  headlineFr: "",
  headlineIt: "",
  headlineEn: "",
  imagePath: null,
  contactName: "",
  contactPhone: "",
  billingStreet: "",
  billingPostcode: "",
  billingCity: "",
  billingCountry: "",
  vatNumber: "",
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

  const [sourceLocale, setSourceLocale] = useState<Loc>("en");
  const [previews, setPreviews] = useState<{ image: string | null; logo: string | null }>({
    image: null,
    logo: null,
  });
  const [hashes, setHashes] = useState<{ image: string | null; logo: string | null }>({
    image: null,
    logo: null,
  });
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [prefillSource, setPrefillSource] = useState<"member" | "advertiser" | "none">("none");

  const prefill = useQuery({
    queryKey: ["advertiser-prefill"],
    queryFn: () => getAdvertiserPrefill(),
    enabled: open,
    staleTime: 5 * 60_000,
  });
  useEffect(() => {
    const p = prefill.data;
    if (!p) return;
    setPrefillSource(p.source);
    // Fill only empty fields so edits made in this booking are never overwritten.
    setState((prev) => ({
      ...prev,
      advertiserName: prev.advertiserName || p.organisation || p.contactName,
      contactName: prev.contactName || p.contactName,
      contactEmail: prev.contactEmail || p.email,
      contactPhone: prev.contactPhone || p.phone,
      billingStreet: prev.billingStreet || p.street,
      billingPostcode: prev.billingPostcode || p.postcode,
      billingCity: prev.billingCity || p.city,
      billingCountry: prev.billingCountry || p.country,
      vatNumber: prev.vatNumber || p.vatNumber,
    }));
  }, [prefill.data]);

  const upload = useMutation({
    mutationFn: async ({ file, kind }: { file: File; kind: "logo" | "image" }) => {
      const hash = await fileHash(file);
      const other = kind === "logo" ? hashes.image : hashes.logo;
      if (other && other === hash) throw new Error(t("advertise.content.sameFile"));
      const dataBase64 = await readFileAsBase64(file);
      const result = await uploadAdLogo({
        data: {
          fileName: file.name,
          contentType: file.type as "image/png",
          dataBase64,
          kind,
        },
      });
      return { ...result, kind, hash, url: URL.createObjectURL(file) };
    },
    onMutate: () => setUploadWarning(null),
    onSuccess: (result) => {
      setHashes((h) => ({ ...h, [result.kind]: result.hash }));
      setPreviews((p) => ({ ...p, [result.kind]: result.url }));
      patch(result.kind === "logo" ? { logoPath: result.path } : { imagePath: result.path });
    },
    onError: (err: Error) => setUploadWarning(err.message),
  });

  const translate = useMutation({
    mutationFn: () =>
      translateAdCopy({
        data: {
          source: sourceLocale,
          headline: state[`headline${CAP[sourceLocale]}`],
          text: state[`description${CAP[sourceLocale]}`],
        },
      }),
    onSuccess: (result) => {
      const next: Partial<WizardState> = {};
      for (const l of LOCALES) {
        const r = result[l];
        if (!r) continue;
        next[`headline${CAP[l]}`] = r.headline;
        next[`description${CAP[l]}`] = r.text;
      }
      patch(next);
    },
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
          headlineDe: state.headlineDe || null,
          headlineFr: state.headlineFr || null,
          headlineIt: state.headlineIt || null,
          headlineEn: state.headlineEn || null,
          imagePath: state.imagePath,
          contactName: state.contactName || null,
          contactPhone: state.contactPhone || null,
          billingStreet: state.billingStreet || null,
          billingPostcode: state.billingPostcode || null,
          billingCity: state.billingCity || null,
          billingCountry: state.billingCountry || null,
          vatNumber: state.vatNumber || null,
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
    if (step === 3)
      return (
        Boolean(state.ctaUrl.trim()) &&
        LOCALES.some((l) => state[`headline${CAP[l]}`].trim().length > 0)
      );
    if (step === 4)
      return (
        state.advertiserName.trim().length > 1 &&
        state.contactName.trim().length > 1 &&
        /.+@.+\..+/.test(state.contactEmail) &&
        Boolean(state.billingStreet.trim()) &&
        Boolean(state.billingPostcode.trim()) &&
        Boolean(state.billingCity.trim()) &&
        Boolean(state.billingCountry.trim()) &&
        (!state.contactPhone.trim() || PHONE_RE.test(state.contactPhone.trim()))
      );
    return true;
  };

  const durations =
    state.offerType === "school"
      ? [
          ...new Set(state.placements.flatMap((placement) => SCHOOL_DURATIONS[placement] ?? [])),
        ].sort((a, b) => b - a)
      : [...PACKAGE_DURATIONS];

  const previewFormats: AdPreviewFormat[] = (() => {
    if (state.offerType !== "school") return ["banner", "square", "newsletter"];
    const f: AdPreviewFormat[] = [];
    if (state.placements.includes("event_banner")) f.push("banner");
    if (state.placements.includes("square_advert")) f.push("square");
    if (state.placements.includes("newsletter")) f.push("newsletter");
    return f.length ? f : ["banner", "square", "newsletter"];
  })();
  const previewContent: AdPreviewContent = {
    advertiserName: state.advertiserName,
    headline: state[`headline${CAP[sourceLocale]}`],
    text: state[`description${CAP[sourceLocale]}`],
    ctaLabel: t("advertise.content.ctaLabel"),
    ctaUrl: state.ctaUrl,
    imageUrl: previews.image,
    logoUrl: previews.logo,
    sponsoredLabel: t("advertise.content.sponsored"),
  };
  const previewLabel = (f: AdPreviewFormat) =>
    t(`advertise.content.preview${f[0].toUpperCase()}${f.slice(1)}`);

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
    <div className="mx-auto max-w-5xl px-6 py-10">
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
              <div className="mt-4 grid gap-6 lg:grid-cols-2">
                <div className="grid content-start gap-4">
                  <p className="font-heading text-xl">{t("advertise.content.title")}</p>
                  <div>
                    <Label htmlFor="cta-url">{t("advertise.content.ctaUrl")}</Label>
                    <Input
                      id="cta-url"
                      inputMode="url"
                      placeholder="example.ch"
                      value={state.ctaUrl}
                      onChange={(event) => patch({ ctaUrl: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ["image", "image/png,image/jpeg,image/webp", state.imagePath],
                        ["logo", "image/png,image/jpeg,image/webp,image/svg+xml", state.logoPath],
                      ] as const
                    ).map(([kind, accept, path]) => (
                      <div key={kind}>
                        <Label htmlFor={`ad-${kind}`}>{t(`advertise.content.${kind}`)}</Label>
                        <Input
                          id={`ad-${kind}`}
                          type="file"
                          accept={accept}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) upload.mutate({ file, kind });
                            event.target.value = "";
                          }}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {kind === "image"
                            ? t("advertise.content.imageHint")
                            : t("advertise.content.logoDifferent")}
                        </p>
                        {path ? (
                          <Badge variant="secondary" className="mt-1">
                            <Upload className="mr-1 h-3 w-3" aria-hidden />
                            {t("advertise.content.uploaded")}
                          </Badge>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {upload.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-label="Uploading" />
                  ) : null}
                  {uploadWarning ? (
                    <p className="text-sm text-destructive" role="alert">
                      {uploadWarning}
                    </p>
                  ) : null}

                  <Tabs value={sourceLocale} onValueChange={(v) => setSourceLocale(v as Loc)}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <TabsList>
                        {LOCALES.map((l) => (
                          <TabsTrigger key={l} value={l}>
                            {l.toUpperCase()}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          translate.isPending || !state[`headline${CAP[sourceLocale]}`].trim()
                        }
                        onClick={() => translate.mutate()}
                      >
                        {translate.isPending ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Languages className="mr-1 h-4 w-4" aria-hidden />
                        )}
                        {translate.isPending
                          ? t("advertise.content.translating")
                          : t("advertise.content.translate")}
                      </Button>
                    </div>
                    {LOCALES.map((l) => (
                      <TabsContent key={l} value={l} className="grid gap-3">
                        {!state[`headline${CAP[l]}`].trim() ? (
                          <p className="text-xs text-muted-foreground">
                            {t("advertise.content.notTranslated")}
                          </p>
                        ) : null}
                        <div>
                          <Label htmlFor={`headline-${l}`}>
                            {t("advertise.content.headline")} ({l.toUpperCase()})
                          </Label>
                          <Input
                            id={`headline-${l}`}
                            maxLength={120}
                            value={state[`headline${CAP[l]}`]}
                            onChange={(event) =>
                              patch({
                                [`headline${CAP[l]}`]: event.target.value,
                              } as Partial<WizardState>)
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor={`desc-${l}`}>
                            {t("advertise.content.text")} ({l.toUpperCase()})
                          </Label>
                          <Textarea
                            id={`desc-${l}`}
                            rows={3}
                            maxLength={600}
                            value={state[`description${CAP[l]}`]}
                            onChange={(event) =>
                              patch({
                                [`description${CAP[l]}`]: event.target.value,
                              } as Partial<WizardState>)
                            }
                          />
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                  <p className="text-sm text-muted-foreground">
                    {t("advertise.content.newsletterInfo")}
                  </p>
                </div>

                <div className="grid content-start gap-3">
                  <p className="font-heading text-xl">{t("advertise.content.previewTitle")}</p>
                  <Tabs defaultValue={previewFormats[0]}>
                    <TabsList>
                      {previewFormats.map((f) => (
                        <TabsTrigger key={f} value={f}>
                          {previewLabel(f)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {previewFormats.map((f) => (
                      <TabsContent key={f} value={f}>
                        <AdPreview format={f} content={previewContent} />
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="mt-4 grid gap-4">
                <p className="font-heading text-xl">{t("advertise.contract.title")}</p>
                {prefillSource !== "none" ? (
                  <p className="text-sm text-muted-foreground">
                    {prefillSource === "member"
                      ? t("advertise.contract.prefilledMember")
                      : t("advertise.contract.prefilledAdvertiser")}
                  </p>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["advertiserName", "organisation", "organization"],
                      ["contactName", "contactName", "name"],
                      ["contactEmail", "email", "email"],
                      ["contactPhone", "phone", "tel"],
                      ["billingStreet", "street", "street-address"],
                      ["billingPostcode", "postcode", "postal-code"],
                      ["billingCity", "city", "address-level2"],
                      ["billingCountry", "country", "country-name"],
                      ["vatNumber", "vat", "off"],
                    ] as const
                  ).map(([key, label, auto]) => (
                    <div
                      key={key}
                      className={key === "billingStreet" ? "sm:col-span-2" : undefined}
                    >
                      <Label htmlFor={`contract-${key}`}>{t(`advertise.contract.${label}`)}</Label>
                      <Input
                        id={`contract-${key}`}
                        type={
                          key === "contactEmail" ? "email" : key === "contactPhone" ? "tel" : "text"
                        }
                        autoComplete={auto}
                        value={state[key]}
                        onChange={(event) =>
                          patch({ [key]: event.target.value } as Partial<WizardState>)
                        }
                      />
                      {key === "contactPhone" &&
                      state.contactPhone.trim() &&
                      !PHONE_RE.test(state.contactPhone.trim()) ? (
                        <p className="mt-1 text-xs text-destructive">
                          {t("advertise.contract.phoneInvalid")}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="mt-4 grid gap-6">
                <p className="font-heading text-xl">{t("advertise.review.title")}</p>
                <SummaryBlock
                  title={t("advertise.summary.offer")}
                  editLabel={t("advertise.summary.edit")}
                  onEdit={() => setStep(2)}
                >
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
                </SummaryBlock>
                <SummaryBlock
                  title={t("advertise.summary.content")}
                  editLabel={t("advertise.summary.edit")}
                  onEdit={() => setStep(3)}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {previewFormats.map((f) => (
                      <div key={f}>
                        <p className="mb-1 text-xs text-muted-foreground">{previewLabel(f)}</p>
                        <AdPreview format={f} content={previewContent} compact />
                      </div>
                    ))}
                  </div>
                </SummaryBlock>
                <SummaryBlock
                  title={t("advertise.summary.contract")}
                  editLabel={t("advertise.summary.edit")}
                  onEdit={() => setStep(4)}
                >
                  <Row label={t("advertise.contract.organisation")} value={state.advertiserName} />
                  <Row label={t("advertise.contract.contactName")} value={state.contactName} />
                  <Row label={t("advertise.contract.email")} value={state.contactEmail} />
                  {state.contactPhone ? (
                    <Row label={t("advertise.contract.phone")} value={state.contactPhone} />
                  ) : null}
                  <Row
                    label={t("advertise.contract.street")}
                    value={`${state.billingStreet}, ${state.billingPostcode} ${state.billingCity}, ${state.billingCountry}`}
                  />
                  {state.vatNumber ? (
                    <Row label={t("advertise.contract.vat")} value={state.vatNumber} />
                  ) : null}
                </SummaryBlock>
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

function SummaryBlock({
  title,
  editLabel,
  onEdit,
  children,
}: {
  title: string;
  editLabel: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          {editLabel}
        </Button>
      </div>
      <dl className="grid gap-2 text-sm">{children}</dl>
    </section>
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
