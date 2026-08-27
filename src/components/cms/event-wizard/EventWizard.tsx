/**
 * Guided event creation.
 *
 * The long editor asks every question at once; this wizard asks the few that
 * decide which questions matter (where, who can join, which extras) and only
 * then shows the matching fields. It writes exactly one row, at the end, and
 * hands over to the editor for polish.
 */
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { ImagePlus, Sparkles, X } from "lucide-react";
import {
  Button,
  Checkbox,
  Input,
  Textarea,
} from "@/design-system/icf-welcome-design-system-a835df";
import { UnsplashPicker, type UnsplashPick } from "@/components/cms/UnsplashPicker";
import {
  Field,
  inputClass,
  fromLocalInput,
  addHoursToLocalInput,
} from "@/components/cms/EventEditorSections";

import { slugify } from "@/lib/articles";
import { fetchVocabulary, vocabLabel, type VocabRow } from "@/lib/vocabularies";
import { createEvent, listCommunityOptions, setEventStatus } from "@/lib/events-admin.functions";
import { setEventCceEnabled } from "@/lib/event-cce.functions";
import { assistWriting } from "@/lib/writing-assist.functions";
import { rememberWizardExtras } from "@/lib/event-wizard-extras";

type Language = "de" | "fr" | "it" | "en";
type LocationMode = "in_person" | "online" | "hybrid";
type RegistrationMode = "none" | "rsvp" | "rsvp_members" | "rsvp_invited";

type Draft = {
  title: string;
  language: Language;
  startsLocal: string;
  endsLocal: string;
  categoryId: string | null;
  regionId: string | null;
  communityId: string | null;
  locationMode: LocationMode;
  city: string;
  venue: string;
  onlineUrl: string;
  mapLocation: string;
  registrationMode: RegistrationMode;
  capacity: string;
  /** Ticket tiers and discount codes are offered, whoever may register. */
  ticketsEnabled: boolean;
  isInternal: boolean;
  isFeatured: boolean;
  repeats: boolean;
  cce: boolean;
  forms: boolean;
  summary: string;
  description: string;
  imageUrl: string;
  imageCreditName: string | null;
  imageCreditUrl: string | null;
};

const STEPS = ["basics", "where", "who", "extras", "content", "review"] as const;
type Step = (typeof STEPS)[number];

/** Default start: a month out, at the chapter's usual evening slot. */
function defaultStart() {
  const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  d.setHours(18, 30, 0, 0);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

/** One selectable answer. Tiles beat dropdowns when the answer branches the form. */
function Choice({
  selected,
  title,
  hint,
  onSelect,
}: {
  selected: boolean;
  title: string;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-primary bg-secondary"
          : "border-border bg-card hover:border-primary/40 hover:bg-secondary/50"
      }`}
    >
      <span className="block text-sm font-semibold">{title}</span>
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </button>
  );
}

function StepShell({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
      <h2 className="font-heading text-2xl">{title}</h2>
      {hint ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{hint}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function EventWizard({ t }: { t: (k: string) => string }) {
  const navigate = useNavigate();
  const [step, setStep] = React.useState<Step>("basics");
  const [categories, setCategories] = React.useState<VocabRow[]>([]);
  const [regions, setRegions] = React.useState<VocabRow[]>([]);
  const [communities, setCommunities] = React.useState<{ id: string; name: string }[]>([]);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [drafting, setDrafting] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [draft, setDraft] = React.useState<Draft>({
    title: "",
    language: "en",
    startsLocal: defaultStart(),
    endsLocal: "",
    categoryId: null,
    regionId: null,
    communityId: null,
    locationMode: "in_person",
    city: "",
    venue: "",
    onlineUrl: "",
    mapLocation: "",
    registrationMode: "rsvp",
    capacity: "",
    ticketsEnabled: false,
    isInternal: false,
    isFeatured: false,
    repeats: false,
    cce: false,
    forms: false,
    summary: "",
    description: "",
    imageUrl: "",
    imageCreditName: null,
    imageCreditUrl: null,
  });

  const patch = (next: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...next }));

  React.useEffect(() => {
    void Promise.all([
      fetchVocabulary("cf_event_categories", { activeOnly: true }),
      fetchVocabulary("cf_regions", { activeOnly: true }),
      listCommunityOptions(),
    ])
      .then(([cats, regs, comms]) => {
        setCategories(cats);
        setRegions(regs);
        setCommunities(comms);
      })
      .catch(() => undefined);
  }, []);

  const isCommunity = categories.find((c) => c.id === draft.categoryId)?.slug === "community";
  const index = STEPS.indexOf(step);
  const canContinue = step !== "basics" || (draft.title.trim().length >= 3 && !!draft.startsLocal);

  const go = (delta: number) => {
    const next = STEPS[Math.min(STEPS.length - 1, Math.max(0, index + delta))];
    setStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Writes summary and description from the answers already given. */
  const aiDraft = async () => {
    setDrafting(true);
    setError(null);
    const when = draft.startsLocal ? new Date(draft.startsLocal).toDateString() : "";
    const where =
      draft.locationMode === "online"
        ? "an online event"
        : `an event in ${draft.city || "Switzerland"}${draft.venue ? ` at ${draft.venue}` : ""}`;
    const facts = `Event title: ${draft.title}. It is ${where}, on ${when}. Audience: ${
      draft.isInternal ? "chapter members" : "coaches, clients and organisations"
    }.`;
    try {
      const [summary, body] = await Promise.all([
        assistWriting({
          data: {
            action: "prompt",
            text: "",
            language: draft.language,
            prompt: `${facts} Write one plain sentence of at most 200 characters that invites people to this event. No Markdown, no heading, no quotation marks.`,
          },
        }),
        assistWriting({
          data: {
            action: "prompt",
            text: "",
            language: draft.language,
            prompt: `${facts} Write a short event description in Markdown: two paragraphs, then a "What you'll take away" list of three bullet points. Do not invent speakers, prices, statistics or testimonials.`,
          },
        }),
      ]);
      patch({
        summary: (summary.text ?? "").trim().slice(0, 400),
        description: (body.text ?? "").trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.wizard.aiFailed"));
    } finally {
      setDrafting(false);
    }
  };

  const submit = async (publish: boolean) => {
    setBusy(true);
    setError(null);
    const base = slugify(draft.title) || "event";
    try {
      let id: string;
      try {
        ({ id } = await createEvent({ data: payload(draft, base) }));
      } catch (first) {
        // A taken slug is the one failure worth retrying automatically.
        if (!(first instanceof Error) || !first.message.includes("slug")) throw first;
        ({ id } = await createEvent({
          data: payload(draft, `${base}-${Date.now().toString(36).slice(-4)}`),
        }));
      }
      if (draft.cce) await setEventCceEnabled({ data: { eventId: id, enabled: true } });
      if (publish) await setEventStatus({ data: { id, status: "published" } });
      // The editor cannot read "does this event repeat?" off a fresh row, so the
      // wizard's answers travel with the hand-over.
      rememberWizardExtras(id, { repeat: draft.repeats, forms: draft.forms, cce: draft.cce });
      void navigate({ to: "/manage/events/$id", params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.saveError"));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 sm:px-10">
      <button
        onClick={() => void navigate({ to: "/manage/events" })}
        className="btn-mono !text-muted-foreground hover:!text-foreground"
      >
        ← {t("events.backToList")}
      </button>
      <h1 className="mt-4 font-heading text-3xl">{t("events.wizard.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("events.wizard.intro")}</p>

      {/* Progress rail */}
      <ol className="mt-6 flex flex-wrap gap-2" aria-label={t("events.wizard.progress")}>
        {STEPS.map((s, i) => (
          <li key={s}>
            <span
              aria-current={s === step ? "step" : undefined}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                s === step
                  ? "border-primary bg-primary text-primary-foreground"
                  : i < index
                    ? "border-border bg-secondary text-foreground"
                    : "border-border text-muted-foreground"
              }`}
            >
              {i + 1}. {t(`events.wizard.step.${s}`)}
            </span>
          </li>
        ))}
      </ol>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      {step === "basics" ? (
        <StepShell title={t("events.wizard.basics.title")} hint={t("events.wizard.basics.hint")}>
          <div className="grid gap-4">
            <Field label={t("events.fieldTitle")}>
              <Input
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder={t("events.wizard.basics.titlePlaceholder")}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("events.fieldStarts")}>
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={draft.startsLocal}
                  onChange={(e) =>
                    // The end follows the start by two hours by default.
                    patch({
                      startsLocal: e.target.value,
                      endsLocal: addHoursToLocalInput(e.target.value, 2),
                    })
                  }

                />
              </Field>
              <Field label={t("events.fieldEnds")}>
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={draft.endsLocal}
                  onChange={(e) => patch({ endsLocal: e.target.value })}
                />
              </Field>
            </div>
            <Field label={t("events.fieldLanguage")}>
              <div className="flex flex-wrap gap-2">
                {(["de", "fr", "it", "en"] as Language[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={draft.language === l}
                    onClick={() => patch({ language: l })}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${
                      draft.language === l
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("events.fieldCategory")}>
                <select
                  className={inputClass}
                  value={draft.categoryId ?? ""}
                  onChange={(e) => {
                    const next = e.target.value || null;
                    const nextIsCommunity =
                      categories.find((c) => c.id === next)?.slug === "community";
                    patch({
                      categoryId: next,
                      ...(nextIsCommunity ? { regionId: null } : { communityId: null }),
                    });
                  }}
                >
                  <option value="">{t("events.fieldUnset")}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {vocabLabel(c, "en")}
                    </option>
                  ))}
                </select>
              </Field>
              {isCommunity ? (
                <Field label={t("events.fieldCommunity")}>
                  <select
                    className={inputClass}
                    value={draft.communityId ?? ""}
                    onChange={(e) => patch({ communityId: e.target.value || null })}
                  >
                    <option value="">{t("events.fieldUnset")}</option>
                    {communities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label={t("events.fieldRegion")}>
                  <select
                    className={inputClass}
                    value={draft.regionId ?? ""}
                    onChange={(e) => patch({ regionId: e.target.value || null })}
                  >
                    <option value="">{t("events.fieldUnset")}</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {vocabLabel(r, "en")}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </div>
        </StepShell>
      ) : null}

      {step === "where" ? (
        <StepShell title={t("events.wizard.where.title")} hint={t("events.wizard.where.hint")}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Choice
              selected={draft.locationMode === "in_person"}
              title={t("events.mode.inPerson")}
              hint={t("events.wizard.where.inPersonHint")}
              onSelect={() => patch({ locationMode: "in_person" })}
            />
            <Choice
              selected={draft.locationMode === "online"}
              title={t("events.mode.online")}
              hint={t("events.wizard.where.onlineHint")}
              onSelect={() => patch({ locationMode: "online" })}
            />
            <Choice
              selected={draft.locationMode === "hybrid"}
              title={t("events.mode.hybrid")}
              hint={t("events.wizard.where.hybridHint")}
              onSelect={() => patch({ locationMode: "hybrid" })}
            />
          </div>

          <div className="mt-6 grid gap-4">
            {draft.locationMode !== "online" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("events.fieldCity")}>
                  <Input value={draft.city} onChange={(e) => patch({ city: e.target.value })} />
                </Field>
                <Field label={t("events.fieldVenue")}>
                  <Input value={draft.venue} onChange={(e) => patch({ venue: e.target.value })} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label={t("events.fieldMapLocation")}>
                    <Input
                      value={draft.mapLocation}
                      onChange={(e) => patch({ mapLocation: e.target.value })}
                      placeholder="Bahnhofstrasse 1, 8001 Zürich"
                    />
                  </Field>
                </div>
              </div>
            ) : null}
            {draft.locationMode !== "in_person" ? (
              <Field label={t("events.fieldOnlineUrl")}>
                <Input
                  value={draft.onlineUrl}
                  onChange={(e) => patch({ onlineUrl: e.target.value })}
                  placeholder="https://…"
                />
              </Field>
            ) : null}
          </div>
        </StepShell>
      ) : null}

      {step === "who" ? (
        <StepShell title={t("events.wizard.who.title")} hint={t("events.wizard.who.hint")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice
              selected={draft.registrationMode === "none"}
              title={t("events.registrationOff")}
              hint={t("events.wizard.who.noneHint")}
              onSelect={() => patch({ registrationMode: "none", ticketsEnabled: false })}
            />
            <Choice
              selected={draft.registrationMode === "rsvp"}
              title={t("events.audience.anyone")}
              hint={t("events.wizard.who.rsvpHint")}
              onSelect={() => patch({ registrationMode: "rsvp" })}
            />
            <Choice
              selected={draft.registrationMode === "rsvp_members"}
              title={t("events.audience.members")}
              hint={t("events.wizard.who.membersHint")}
              onSelect={() => patch({ registrationMode: "rsvp_members" })}
            />
            <Choice
              selected={draft.registrationMode === "rsvp_invited"}
              title={t("events.audience.invited")}
              hint={t("events.wizard.who.invitedHint")}
              onSelect={() => patch({ registrationMode: "rsvp_invited" })}
            />
          </div>

          {draft.registrationMode !== "none" ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label={t("events.fieldCapacity")}>
                <Input
                  type="number"
                  min={1}
                  value={draft.capacity}
                  onChange={(e) => patch({ capacity: e.target.value })}
                />
              </Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <Checkbox
                  checked={draft.ticketsEnabled}
                  onCheckedChange={(v) => patch({ ticketsEnabled: v === true })}
                />
                <span>{t("events.fieldTickets")}</span>
              </label>
            </div>
          ) : null}

          <div className="mt-6 grid gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.isInternal}
                onCheckedChange={(v) => patch({ isInternal: v === true })}
              />
              <span>{t("events.fieldInternal")}</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.isFeatured}
                onCheckedChange={(v) => patch({ isFeatured: v === true })}
              />
              <span>{t("events.fieldFeatured")}</span>
            </label>
          </div>
        </StepShell>
      ) : null}

      {step === "extras" ? (
        <StepShell title={t("events.wizard.extras.title")} hint={t("events.wizard.extras.hint")}>
          <div className="grid gap-3">
            <Choice
              selected={draft.repeats}
              title={t("events.wizard.extras.repeat")}
              hint={t("events.wizard.extras.repeatHint")}
              onSelect={() => patch({ repeats: !draft.repeats })}
            />
            <Choice
              selected={draft.cce}
              title={t("events.wizard.extras.cce")}
              hint={t("events.wizard.extras.cceHint")}
              onSelect={() => patch({ cce: !draft.cce })}
            />
            <Choice
              selected={draft.forms}
              title={t("events.wizard.extras.forms")}
              hint={t("events.wizard.extras.formsHint")}
              onSelect={() => patch({ forms: !draft.forms })}
            />
          </div>
        </StepShell>
      ) : null}

      {step === "content" ? (
        <StepShell title={t("events.wizard.content.title")} hint={t("events.wizard.content.hint")}>
          <div className="grid gap-4">
            <div>
              <Button
                type="button"
                variant="outline"
                size="pill"
                disabled={drafting || draft.title.trim().length < 3}
                onClick={() => void aiDraft()}
              >
                <Sparkles className="h-4 w-4" />
                {drafting ? t("events.wizard.content.drafting") : t("events.wizard.content.draft")}
              </Button>
            </div>
            <Field label={t("events.fieldSummary")}>
              <Input
                value={draft.summary}
                maxLength={400}
                onChange={(e) => patch({ summary: e.target.value })}
              />
            </Field>
            <Field label={t("events.fieldDescription")}>
              <Textarea
                rows={12}
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>
            <Field label={t("events.fieldImageUrl")}>
              <Input
                value={draft.imageUrl}
                placeholder="https://…"
                onChange={(e) =>
                  patch({
                    imageUrl: e.target.value,
                    imageCreditName: null,
                    imageCreditUrl: null,
                  })
                }
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="pill"
                onClick={() => setPickerOpen(true)}
              >
                <ImagePlus className="h-4 w-4" />
                {t("events.chooseUnsplash")}
              </Button>
              {draft.imageUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="pill"
                  onClick={() =>
                    patch({ imageUrl: "", imageCreditName: null, imageCreditUrl: null })
                  }
                >
                  <X className="h-4 w-4" />
                  {t("events.removeImage")}
                </Button>
              ) : null}
            </div>
            {draft.imageUrl ? (
              <img
                src={draft.imageUrl}
                alt=""
                className="h-32 w-full max-w-xs rounded-xl border border-border object-cover"
              />
            ) : null}
          </div>
        </StepShell>
      ) : null}

      {step === "review" ? (
        <StepShell title={t("events.wizard.review.title")} hint={t("events.wizard.review.hint")}>
          <dl className="grid gap-3 text-sm">
            <ReviewRow label={t("events.fieldTitle")} value={draft.title || "—"} />
            <ReviewRow
              label={t("events.fieldStarts")}
              value={draft.startsLocal ? new Date(draft.startsLocal).toLocaleString() : "—"}
            />
            <ReviewRow
              label={t("events.fieldLocationMode")}
              value={t(
                draft.locationMode === "in_person"
                  ? "events.mode.inPerson"
                  : draft.locationMode === "online"
                    ? "events.mode.online"
                    : "events.mode.hybrid",
              )}
            />
            <ReviewRow
              label={t("events.fieldAudience")}
              value={t(
                {
                  none: "events.registrationOff",
                  rsvp: "events.audience.anyone",
                  rsvp_members: "events.audience.members",
                  rsvp_invited: "events.audience.invited",
                }[draft.registrationMode],
              )}
            />
            <ReviewRow
              label={t("events.wizard.step.extras")}
              value={
                [
                  draft.repeats ? t("events.wizard.extras.repeat") : null,
                  draft.cce ? t("events.wizard.extras.cce") : null,
                  draft.forms ? t("events.wizard.extras.forms") : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || t("events.wizard.review.noExtras")
              }
            />
            <ReviewRow label={t("events.fieldSummary")} value={draft.summary || "—"} />
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" size="pill" disabled={busy} onClick={() => void submit(false)}>
              {busy ? t("events.saving") : t("events.wizard.review.saveDraft")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="pill"
              disabled={busy}
              onClick={() => void submit(true)}
            >
              {t("events.wizard.review.publish")}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("events.wizard.review.afterHint")}
          </p>
        </StepShell>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="pill"
          disabled={index === 0}
          onClick={() => go(-1)}
        >
          {t("events.wizard.back")}
        </Button>
        {step !== "review" ? (
          <Button type="button" size="pill" disabled={!canContinue} onClick={() => go(1)}>
            {t("events.wizard.next")}
          </Button>
        ) : null}
      </div>

      <UnsplashPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(pick: UnsplashPick) =>
          patch({
            imageUrl: pick.url,
            imageCreditName: pick.creditName,
            imageCreditUrl: pick.creditUrl,
          })
        }
      />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border pb-2 last:border-0">
      <dt className="w-48 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="flex-1">{value}</dd>
    </div>
  );
}

/** Wizard answers -> the shape `createEvent` validates. */
function payload(draft: Draft, slug: string) {
  return {
    title: draft.title.trim(),
    slug,
    summary: draft.summary.trim() || null,
    description: draft.description.trim() || null,
    language: draft.language,
    starts_at: fromLocalInput(draft.startsLocal) ?? new Date().toISOString(),
    ends_at: fromLocalInput(draft.endsLocal),
    timezone: "Europe/Zurich",
    location_mode: draft.locationMode,
    venue_name: draft.locationMode === "online" ? null : draft.venue.trim() || null,
    city: draft.locationMode === "online" ? null : draft.city.trim() || null,
    online_url: draft.locationMode === "in_person" ? null : draft.onlineUrl.trim() || null,
    map_location: draft.locationMode === "online" ? null : draft.mapLocation.trim() || null,
    image_url: draft.imageUrl.trim() || null,
    image_credit_name: draft.imageCreditName,
    image_credit_url: draft.imageCreditUrl,
    capacity: draft.capacity ? Number(draft.capacity) : null,
    registration_mode: draft.registrationMode,
    registration_opens_at: null,
    registration_closes_at: null,
    guest_registration_allowed: draft.registrationMode !== "rsvp_members",
    tickets_enabled: draft.ticketsEnabled,
    is_featured: draft.isFeatured,
    is_internal: draft.isInternal,
    category_id: draft.categoryId,
    region_id: draft.regionId,
    community_id: draft.communityId,
  };
}
