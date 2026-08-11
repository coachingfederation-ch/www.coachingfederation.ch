/**
 * Visual section components for the event editor route
 * (src/routes/_staff/manage.events.$id.tsx). Extracted verbatim from that
 * route so the page component stays a thin orchestrator over `event` state.
 */
import * as React from "react";
import { ImagePlus, X } from "lucide-react";
import { EventTranslationsPanel } from "@/components/cms/EventTranslationsPanel";
import { EventHostsPanel } from "@/components/cms/EventHostsPanel";
import { RichTextEditor } from "@/components/cms/RichTextField";
import { HeroDesignSection } from "@/components/cms/HeroDesignSection";
import { EventHeroPreview } from "@/components/cms/EventHeroPreview";
import { sanitizeHeroMarks } from "@/lib/hero-design";
import type { getManagedEvent, listEventRegistrations } from "@/lib/events-admin.functions";
import {
  DEFAULT_RULE,
  expandRecurrence,
  MAX_OCCURRENCES,
  type RecurrenceRule,
} from "@/lib/recurrence";
import type { VocabRow } from "@/lib/vocabularies";
import { vocabLabel } from "@/lib/vocabularies";

export type Managed = NonNullable<Awaited<ReturnType<typeof getManagedEvent>>>;
export type Registration = Awaited<ReturnType<typeof listEventRegistrations>>[number];

/** ISO instant -> value for <input type="datetime-local">. */
export function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

/** One labelled block of the form — the editor is long, so it reads in chunks. */
export function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <div className="mt-4 border-t border-border pt-4">{children}</div>
    </section>
  );
}

type Patch = (next: Partial<Managed>) => void;

/** Details section: title, slug, language, category, region, featured — plus timing. */
export function EventDetailsSection({
  event,
  patch,
  categories,
  regions,
  communities,
  t,
}: {
  event: Managed;
  patch: Patch;
  categories: VocabRow[];
  regions: VocabRow[];
  communities: { id: string; name: string }[];
  t: (k: string) => string;
}) {
  // A community event is placed by community, not by region — the two facets
  // are mutually exclusive, so switching category clears the other value.
  const isCommunity = categories.find((c) => c.id === event.category_id)?.slug === "community";
  return (
    <>
      <Section title={t("events.section.details")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("events.fieldTitle")}>
            <input
              className={inputClass}
              value={event.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </Field>
          <Field label={t("events.fieldSlug")}>
            <input
              className={inputClass}
              value={event.slug}
              onChange={(e) => patch({ slug: e.target.value })}
            />
          </Field>
          <Field label={t("events.fieldLanguage")}>
            <select
              className={inputClass}
              value={event.language}
              onChange={(e) => patch({ language: e.target.value as Managed["language"] })}
            >
              {["de", "fr", "it", "en"].map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("events.fieldCategory")}>
            <select
              className={inputClass}
              value={event.category_id ?? ""}
              onChange={(e) => {
                const next = e.target.value || null;
                const nextIsCommunity = categories.find((c) => c.id === next)?.slug === "community";
                patch({
                  category_id: next,
                  ...(nextIsCommunity ? { region_id: null } : { community_id: null }),
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
                value={event.community_id ?? ""}
                onChange={(e) => patch({ community_id: e.target.value || null })}
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
                value={event.region_id ?? ""}
                onChange={(e) => patch({ region_id: e.target.value || null })}
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
          <Field label={t("events.fieldFeatured")}>
            <input
              type="checkbox"
              checked={event.is_featured}
              onChange={(e) => patch({ is_featured: e.target.checked })}
            />
          </Field>
        </div>
      </Section>

      <Section title={t("events.section.when")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("events.fieldStarts")}>
            <input
              type="datetime-local"
              className={inputClass}
              value={toLocalInput(event.starts_at)}
              onChange={(e) =>
                patch({ starts_at: fromLocalInput(e.target.value) ?? event.starts_at })
              }
            />
          </Field>
          <Field label={t("events.fieldEnds")}>
            <input
              type="datetime-local"
              className={inputClass}
              value={toLocalInput(event.ends_at)}
              onChange={(e) => patch({ ends_at: fromLocalInput(e.target.value) })}
            />
          </Field>
        </div>
      </Section>
    </>
  );
}

/**
 * Repeat panel: turns one event into a series of independent dated copies.
 * Dates are previewed with the very same expander the server uses, so the
 * list staff read is the list that gets created.
 */
export function EventRepeatSection({
  event,
  onGenerate,
  t,
}: {
  event: Managed;
  onGenerate: (rule: RecurrenceRule) => Promise<void>;
  t: (k: string) => string;
}) {
  const stored = (event as { recurrence?: RecurrenceRule | null }).recurrence ?? null;
  const [enabled, setEnabled] = React.useState(Boolean(stored));
  const [rule, setRule] = React.useState<RecurrenceRule>(stored ?? DEFAULT_RULE);
  const [busy, setBusy] = React.useState(false);

  const dates = enabled ? expandRecurrence(event.starts_at, rule) : [];
  const patchRule = (next: Partial<RecurrenceRule>) => setRule({ ...rule, ...next });

  return (
    <Section title={t("events.repeat.section")} hint={t("events.repeat.hint")}>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <span>{t("events.repeat.enable")}</span>
      </label>

      {enabled ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t("events.repeat.frequency")}>
              <select
                className={inputClass}
                value={rule.frequency}
                onChange={(e) =>
                  patchRule({ frequency: e.target.value as RecurrenceRule["frequency"] })
                }
              >
                <option value="weekly">{t("events.repeat.weekly")}</option>
                <option value="monthly_date">{t("events.repeat.monthlyDate")}</option>
                <option value="monthly_weekday">{t("events.repeat.monthlyWeekday")}</option>
              </select>
            </Field>
            {rule.frequency === "weekly" ? (
              <Field label={t("events.repeat.interval")}>
                <input
                  type="number"
                  min={1}
                  max={8}
                  className={inputClass}
                  value={rule.interval}
                  onChange={(e) => patchRule({ interval: Number(e.target.value) || 1 })}
                />
              </Field>
            ) : null}
            <Field label={t("events.repeat.endMode")}>
              <select
                className={inputClass}
                value={rule.endMode}
                onChange={(e) =>
                  patchRule({ endMode: e.target.value as RecurrenceRule["endMode"] })
                }
              >
                <option value="count">{t("events.repeat.endAfter")}</option>
                <option value="until">{t("events.repeat.endOn")}</option>
              </select>
            </Field>
            {rule.endMode === "count" ? (
              <Field label={t("events.repeat.count")}>
                <input
                  type="number"
                  min={2}
                  max={MAX_OCCURRENCES + 1}
                  className={inputClass}
                  value={rule.count ?? 2}
                  onChange={(e) => patchRule({ count: Number(e.target.value) || 2 })}
                />
              </Field>
            ) : (
              <Field label={t("events.repeat.until")}>
                <input
                  type="date"
                  className={inputClass}
                  value={rule.until ?? ""}
                  onChange={(e) => patchRule({ until: e.target.value || null })}
                />
              </Field>
            )}
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("events.repeat.preview")}
          </p>
          {dates.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">{t("events.repeat.none")}</p>
          ) : (
            <p className="mt-1 text-sm text-foreground">
              {dates
                .map((iso) =>
                  new Date(iso).toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }),
                )
                .join(" · ")}
            </p>
          )}

          <button
            type="button"
            disabled={busy || dates.length === 0}
            className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            onClick={async () => {
              setBusy(true);
              try {
                await onGenerate(rule);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? t("events.repeat.creating") : `${t("events.repeat.create")} (${dates.length})`}
          </button>
        </>
      ) : null}
    </Section>
  );
}

/** Content section: summary, description, translations — plus the featured image. */
export function EventContentSection({
  event,
  patch,
  setPickerOpen,
  categories,
  regions,
  t,
}: {
  event: Managed;
  patch: Patch;
  setPickerOpen: (open: boolean) => void;
  categories: VocabRow[];
  regions: VocabRow[];
  t: (k: string) => string;
}) {
  const pills = [
    categories.find((c) => c.id === event.category_id),
    regions.find((r) => r.id === event.region_id),
  ]
    .filter(Boolean)
    .map((row) => vocabLabel(row!, event.language));
  return (
    <>
      <Section title={t("events.section.content")}>
        <div className="grid gap-4">
          <Field label={t("events.fieldSummary")}>
            <input
              className={inputClass}
              value={event.summary ?? ""}
              onChange={(e) => patch({ summary: e.target.value })}
            />
          </Field>
          <Field label={t("events.fieldDescription")}>
            <RichTextEditor
              value={event.description ?? ""}
              minHeight="16rem"
              onChange={(next) => patch({ description: next })}
            />
          </Field>
          <EventTranslationsPanel
            eventId={event.id}
            sourceLanguage={event.language}
            contentUpdatedAt={event.content_updated_at ?? null}
          />
        </div>
      </Section>

      <Section title={t("hero.section")}>
        <HeroDesignSection
          kind="event"
          imageUrl={event.image_url}
          title={event.title}
          summary={event.summary}
          marks={sanitizeHeroMarks("event", event.hero_marks) ?? []}
          onChange={(next) => patch({ hero_marks: next })}
          t={t}
          preview={
            <EventHeroPreview event={event} pills={pills} untitledLabel={t("hero.untitled")} />
          }
        >
          <div>
            <Field label={t("events.fieldImageUrl")}>
              <input
                className={inputClass}
                placeholder="https://…"
                value={event.image_url ?? ""}
                onChange={(e) =>
                  // A hand-pasted URL drops any Unsplash credit that no longer applies.
                  patch({
                    image_url: e.target.value,
                    image_credit_name: null,
                    image_credit_url: null,
                  })
                }
              />
            </Field>
            <p className="mt-1 text-xs text-muted-foreground">{t("events.imageHint")}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                {t("events.chooseUnsplash")}
              </button>
              {event.image_url ? (
                <button
                  type="button"
                  onClick={() =>
                    patch({ image_url: null, image_credit_name: null, image_credit_url: null })
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
                >
                  <X className="h-3.5 w-3.5" />
                  {t("events.removeImage")}
                </button>
              ) : null}
            </div>
            {event.image_url ? (
              <div className="mt-3">
                <img
                  src={event.image_url}
                  alt=""
                  className="h-32 w-full max-w-xs rounded-xl border border-border object-cover"
                />
                {event.image_credit_name ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("events.imageCredit")} {event.image_credit_name}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">{t("events.imageFallback")}</p>
            )}
          </div>
        </HeroDesignSection>
      </Section>
    </>
  );
}

/** Location section: mode, city, venue, online URL. */
export function EventLocationSection({
  event,
  patch,
  t,
}: {
  event: Managed;
  patch: Patch;
  t: (k: string) => string;
}) {
  return (
    <Section title={t("events.section.location")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("events.fieldLocationMode")}>
          <select
            className={inputClass}
            value={event.location_mode}
            onChange={(e) => patch({ location_mode: e.target.value as Managed["location_mode"] })}
          >
            <option value="in_person">{t("events.mode.inPerson")}</option>
            <option value="online">{t("events.mode.online")}</option>
            <option value="hybrid">{t("events.mode.hybrid")}</option>
          </select>
        </Field>
        <Field label={t("events.fieldCity")}>
          <input
            className={inputClass}
            value={event.city ?? ""}
            onChange={(e) => patch({ city: e.target.value })}
          />
        </Field>
        <Field label={t("events.fieldVenue")}>
          <input
            className={inputClass}
            value={event.venue_name ?? ""}
            onChange={(e) => patch({ venue_name: e.target.value })}
          />
        </Field>
        <Field label={t("events.fieldOnlineUrl")}>
          <input
            className={inputClass}
            value={event.online_url ?? ""}
            onChange={(e) => patch({ online_url: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-4">
        <Field label={t("events.fieldMapLocation")}>
          <input
            className={inputClass}
            value={event.map_location ?? ""}
            onChange={(e) => patch({ map_location: e.target.value })}
            placeholder="Bahnhofstrasse 1, 8001 Zürich"
          />
        </Field>
        <p className="mt-1.5 text-xs text-muted-foreground">{t("events.fieldMapLocationHint")}</p>
      </div>
    </Section>
  );
}

/** Hosts section: thin wrapper over EventHostsPanel. */
export function EventHostsSection({
  eventId,
  hint,
  title,
}: {
  eventId: string;
  hint: string;
  title: string;
}) {
  return (
    <Section title={title} hint={hint}>
      <EventHostsPanel eventId={eventId} />
    </Section>
  );
}

/** Publishing section: registration settings, optional ticket tiers, save/status controls, attendees. */
export function EventPublishingSection({
  event,
  patch,
  saving,
  save,
  changeStatus,
  registrations,
  confirmed,
  setRegistrationStatusAndReload,
  resendConfirmation,
  ticketsSection,
  t,
}: {
  event: Managed;
  patch: Patch;
  saving: boolean;
  save: () => void | Promise<void>;
  changeStatus: (status: "draft" | "published" | "cancelled") => void | Promise<void>;
  registrations: Registration[];
  confirmed: number;
  setRegistrationStatusAndReload: (r: Registration) => void | Promise<void>;
  resendConfirmation: (r: Registration) => void | Promise<void>;
  ticketsSection?: React.ReactNode;
  t: (k: string) => string;
}) {
  // Attendee list filters. Local UI state only — the underlying list is
  // already loaded, so filtering client-side keeps the table responsive.
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [paymentFilter, setPaymentFilter] = React.useState("all");
  const [confirmationFilter, setConfirmationFilter] = React.useState("all");

  const visibleRegistrations = registrations.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (paymentFilter !== "all" && r.payment_status !== paymentFilter) return false;
    if (
      confirmationFilter !== "all" &&
      (r.confirmation_status ?? "not_sent") !== confirmationFilter
    )
      return false;
    return true;
  });

  return (
    <>
      <Section title={t("events.section.registration")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("events.fieldCapacity")}>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={event.capacity ?? ""}
              onChange={(e) => patch({ capacity: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>
          <Field label={t("events.fieldRegistrationMode")}>
            <select
              className={inputClass}
              value={event.registration_mode}
              onChange={(e) =>
                patch({ registration_mode: e.target.value as Managed["registration_mode"] })
              }
            >
              <option value="none">{t("events.regMode.none")}</option>
              <option value="rsvp">{t("events.regMode.rsvp")}</option>
              <option value="rsvp_members">{t("events.regMode.rsvpMembers")}</option>
              <option value="rsvp_tickets">{t("events.regMode.rsvpTickets")}</option>
            </select>
          </Field>
          {/* The membership flag only means anything on a members-only RSVP. */}
          {event.registration_mode === "rsvp_members" ? (
            <Field label={t("events.fieldAllowNonMembers")}>
              <input
                type="checkbox"
                checked={event.guest_registration_allowed}
                onChange={(e) => patch({ guest_registration_allowed: e.target.checked })}
              />
            </Field>
          ) : null}
          <Field label={t("events.fieldRegOpens")}>
            <input
              type="datetime-local"
              className={inputClass}
              value={toLocalInput(event.registration_opens_at)}
              onChange={(e) => patch({ registration_opens_at: fromLocalInput(e.target.value) })}
            />
          </Field>
          <Field label={t("events.fieldRegCloses")}>
            <input
              type="datetime-local"
              className={inputClass}
              value={toLocalInput(event.registration_closes_at)}
              onChange={(e) => patch({ registration_closes_at: fromLocalInput(e.target.value) })}
            />
          </Field>
        </div>
      </Section>

      {ticketsSection}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          onClick={() => void save()}
          disabled={saving}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? t("events.saving") : t("events.save")}
        </button>
        {event.status === "published" ? (
          <button
            onClick={() => void changeStatus("draft")}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            {t("events.unpublish")}
          </button>
        ) : (
          <button
            onClick={() => void changeStatus("published")}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            {t("events.publish")}
          </button>
        )}
        <button
          onClick={() => void changeStatus("cancelled")}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
        >
          {t("events.cancelEvent")}
        </button>
        <span className="text-xs text-muted-foreground">{t(`events.status.${event.status}`)}</span>
      </div>

      <h2 className="mt-12 text-lg font-semibold tracking-tight">{t("events.attendees")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {confirmed}
        {event.capacity ? ` / ${event.capacity}` : ""} {t("events.confirmedSuffix")}
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Field label={t("events.filterStatus")}>
          <select
            className={inputClass}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{t("events.filterAll")}</option>
            {["confirmed", "cancelled"].map((s) => (
              <option key={s} value={s}>
                {t(`events.regStatus.${s}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("events.filterPayment")}>
          <select
            className={inputClass}
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="all">{t("events.filterAll")}</option>
            {["not_required", "pending", "paid", "expired"].map((s) => (
              <option key={s} value={s}>
                {t(`events.payStatus.${s}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("events.filterConfirmation")}>
          <select
            className={inputClass}
            value={confirmationFilter}
            onChange={(e) => setConfirmationFilter(e.target.value)}
          >
            <option value="all">{t("events.filterAll")}</option>
            {["not_sent", "sending", "sent", "failed"].map((s) => (
              <option key={s} value={s}>
                {t(`events.confirmationStatus.${s}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">{t("events.colName")}</th>
              <th className="px-4 py-3 font-semibold">{t("events.colEmail")}</th>
              <th className="px-4 py-3 font-semibold">{t("events.colStatus")}</th>
              <th className="px-4 py-3 font-semibold">{t("events.colPayment")}</th>
              <th className="px-4 py-3 font-semibold">{t("events.colConfirmation")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visibleRegistrations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-muted-foreground">
                  {registrations.length === 0
                    ? t("events.noAttendees")
                    : t("events.noMatchingAttendees")}
                </td>
              </tr>
            ) : (
              visibleRegistrations.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{r.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-3">{t(`events.regStatus.${r.status}`)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t(`events.payStatus.${r.payment_status}`)}
                    {r.amount_cents > 0
                      ? ` · ${(r.amount_cents / 100).toFixed(2)} ${r.currency}`
                      : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span
                      className={
                        r.confirmation_status === "failed" ? "font-semibold text-destructive" : ""
                      }
                    >
                      {t(`events.confirmationStatus.${r.confirmation_status ?? "not_sent"}`)}
                    </span>
                    {r.locale ? (
                      <span className="ml-1 uppercase">· {r.locale}</span>
                    ) : null}
                    {r.confirmation_error ? (
                      <span className="mt-0.5 block text-xs">{r.confirmation_error}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {r.status !== "cancelled" ? (
                        <button
                          onClick={() => void resendConfirmation(r)}
                          disabled={r.payment_status === "pending"}
                          title={
                            r.payment_status === "pending"
                              ? t("events.resendPendingHint")
                              : undefined
                          }
                          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t("events.resendConfirmation")}
                        </button>
                      ) : null}
                      <button
                        onClick={() => void setRegistrationStatusAndReload(r)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                      >
                        {r.status === "cancelled" ? t("events.reinstate") : t("events.cancelRsvp")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
