/**
 * Visual section components for the event editor route
 * (src/routes/_staff/manage.events.$id.tsx). Extracted verbatim from that
 * route so the page component stays a thin orchestrator over `event` state.
 */
import * as React from "react";
import { ImagePlus, X } from "lucide-react";
import { EventTranslationsPanel } from "@/components/cms/EventTranslationsPanel";
import { EventHostsPanel } from "@/components/cms/EventHostsPanel";
import { MarkdownEditor } from "@/components/cms/MarkdownEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from "@/design-system/icf-welcome-design-system-a835df";

import { HeroDesignSection } from "@/components/cms/HeroDesignSection";
import { EventHeroPreview } from "@/components/cms/EventHeroPreview";
import { sanitizeHeroMarks } from "@/lib/hero-design";
import { displayEventStatus, hasEventStarted } from "@/lib/events";
import type { getManagedEvent, listEventRegistrations } from "@/lib/events-admin.functions";
import { exportEventRegistrations } from "@/lib/events-admin.functions";
import {
  EventAttendeeToolbar,
  EMPTY_FILTERS,
  matchesFilters,
  type AttendeeFilters,
} from "@/components/cms/EventAttendeeToolbar";
import { StaffRegistrationDialog } from "@/components/cms/StaffRegistrationDialog";
import {
  DEFAULT_RULE,
  expandRecurrence,
  MAX_OCCURRENCES,
  type RecurrenceRule,
} from "@/lib/recurrence";
import type { VocabRow } from "@/lib/vocabularies";
import { vocabLabel } from "@/lib/vocabularies";
import { ApprovedGuestsPanel } from "@/components/cms/ApprovedGuestsPanel";

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

/**
 * Shifts a `datetime-local` value by whole hours, staying in the same string
 * shape. Used to derive a default end time from the start staff just typed.
 */
export function addHoursToLocalInput(value: string, hours: number) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  d.setTime(d.getTime() + hours * 3600000);
  return toLocalInput(d.toISOString());
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
          {/* Audience marker only: the seat policy still comes from the
              registration mode. */}
          <Field label={t("events.fieldInternal")}>
            <input
              type="checkbox"
              checked={event.is_internal ?? false}
              onChange={(e) => patch({ is_internal: e.target.checked })}
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
                // Editing the start also proposes an end two hours later; staff
                // can still overwrite the end afterwards.
                patch({
                  starts_at: fromLocalInput(e.target.value) ?? event.starts_at,
                  ends_at: fromLocalInput(addHoursToLocalInput(e.target.value, 2)),
                })
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
 *
 * Creating dates is the last step of the editor: the copies are made from the
 * stored row, so the source event must be published and free of unsaved edits
 * before staff can spawn a series from it.
 */
export function EventRepeatSection({
  event,
  onGenerate,
  canCreate,
  blockedReason,
  t,
}: {
  event: Managed;
  onGenerate: (rule: RecurrenceRule) => Promise<void>;
  canCreate: boolean;
  blockedReason: string | null;
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

          {blockedReason ? (
            <p className="mt-4 text-sm text-muted-foreground">{blockedReason}</p>
          ) : null}

          <div className="mt-4">
            <Button
              type="button"
              size="pill"
              disabled={busy || dates.length === 0 || !canCreate}
              onClick={async () => {
                setBusy(true);
                try {
                  await onGenerate(rule);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy
                ? t("events.repeat.creating")
                : `${t("events.repeat.create")} (${dates.length})`}
            </Button>
          </div>
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
            <MarkdownEditor
              value={event.description ?? ""}
              rows={14}
              language={event.language}
              modes={["write", "preview"]}
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
  cancelAttendee,
  retryRefund,
  ticketsSection,
  tiers,
  reloadRegistrations,
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
  cancelAttendee: (
    r: Registration,
    refund: boolean | undefined,
    note: string | null,
  ) => void | Promise<void>;
  retryRefund: (r: Registration) => void | Promise<void>;
  ticketsSection?: React.ReactNode;
  tiers: { id: string; name: string }[];
  reloadRegistrations: () => void | Promise<void>;
  t: (k: string) => string;
}) {
  // Attendee desk filters. Local UI state only — the underlying list is
  // already loaded, so filtering client-side keeps the table responsive.
  const [filters, setFilters] = React.useState<AttendeeFilters>(EMPTY_FILTERS);
  // Derived, not stored: a started event is "passed" and its lifecycle actions
  // (unpublish, cancel) are withdrawn.
  const started = hasEventStarted(event.starts_at);
  const [addOpen, setAddOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  // The attendee awaiting a cancellation confirmation, if any.
  const [pendingCancel, setPendingCancel] = React.useState<Registration | null>(null);
  // Rows expanded to their full detail panel. Expansion is the escape valve for
  // the columns the table has to truncate (long emails, error strings).
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const toggleRow = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const visibleRegistrations = registrations.filter((r) => matchesFilters(r, filters));

  const checkedInCount = registrations.filter(
    (r) => r.status === "confirmed" && r.checked_in_at,
  ).length;

  // The CSV is built server-side (authorisation and escaping live there); the
  // browser only turns the returned text into a download.
  const exportCsv = async () => {
    setExporting(true);
    try {
      const file = await exportEventRegistrations({ data: { eventId: event.id } });
      const blob = new Blob([`\uFEFF${file.csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

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
              <option value="rsvp_invited">{t("events.regMode.rsvpInvited")}</option>
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
          {/* Guest passes only make sense where a seat can actually be taken. */}
          {event.registration_mode !== "none" ? (
            <Field label={t("events.fieldGuestPasses")}>
              <input
                type="checkbox"
                checked={event.guest_passes_allowed ?? false}
                onChange={(e) => patch({ guest_passes_allowed: e.target.checked })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("events.fieldGuestPassesHelp")}
              </p>
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
          {/* Used by the attendance CSV import: the share of the scheduled
              length an online attendee must be present for. A 15-minute floor
              applies on top, so a very short session cannot be trivial. */}
          {event.registration_mode !== "none" ? (
            <Field label={t("events.attendance.minPercent")}>
              <input
                type="number"
                min={1}
                max={100}
                className={inputClass}
                value={event.attendance_min_percent ?? 80}
                onChange={(e) =>
                  patch({
                    attendance_min_percent: Math.min(
                      100,
                      Math.max(1, Number(e.target.value) || 80),
                    ),
                  })
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("events.attendance.minPercentHelp")}
              </p>
            </Field>
          ) : null}
        </div>
      </Section>

      {/* Who is coming as a guest. Read-only here: the decision belongs to
          Membership & Engagement, the leader only needs to welcome them. */}
      {event.guest_passes_allowed ? (
        <div className="mt-6">
          <ApprovedGuestsPanel eventId={event.id} />
        </div>
      ) : null}

      {ticketsSection}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          onClick={() => void save()}
          disabled={saving}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? t("events.saving") : t("events.save")}
        </button>
        {/* A started event is history: unpublishing or cancelling it would
            rewrite something attendees already lived through. */}
        {started ? null : event.status === "published" ? (
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
        {started ? null : (
          <button
            onClick={() => void changeStatus("cancelled")}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            {t("events.cancelEvent")}
          </button>
        )}
        <span className="text-xs text-muted-foreground">
          {t(`events.status.${displayEventStatus(event.status, event.starts_at)}`)}
        </span>
      </div>

      <h2 className="mt-12 text-lg font-semibold tracking-tight">{t("events.attendees")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {confirmed}
        {event.capacity ? ` / ${event.capacity}` : ""} {t("events.confirmedSuffix")}
      </p>
      <EventAttendeeToolbar
        eventId={event.id}
        filters={filters}
        setFilters={setFilters}
        tiers={tiers}
        confirmed={confirmed}
        checkedIn={checkedInCount}
        capacity={event.capacity}
        onAdd={() => setAddOpen(true)}
        onExport={exportCsv}
        exporting={exporting}
        t={t}
      />
      <StaffRegistrationDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        eventId={event.id}
        tiers={tiers}
        onCreated={reloadRegistrations}
        t={t}
      />
      {/* The table stays inside the editor column: the row expander carries the
          detail that used to force a wider, horizontally scrolling grid. */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-10" />
            <col className="w-[34%]" />
            <col className="w-[16%]" />
            <col className="w-[22%]" />
            <col />
          </colgroup>
          <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2 py-3" />
              <th className="px-4 py-3 font-semibold">{t("events.colName")}</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">{t("events.colStatus")}</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">
                {t("events.colPayment")}
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visibleRegistrations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                  {registrations.length === 0
                    ? t("events.noAttendees")
                    : t("events.noMatchingAttendees")}
                </td>
              </tr>
            ) : (
              visibleRegistrations.map((r) => {
                const open = expanded.has(r.id);
                return (
                  <React.Fragment key={r.id}>
                    <tr className="border-t border-border">
                      <td className="px-2 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => toggleRow(r.id)}
                          aria-expanded={open}
                          aria-label={t(open ? "events.rowCollapse" : "events.rowExpand")}
                          title={t(open ? "events.rowCollapse" : "events.rowExpand")}
                          className="grid size-7 place-items-center rounded-full border border-border text-xs text-muted-foreground hover:bg-secondary"
                        >
                          <span
                            aria-hidden
                            className={open ? "rotate-90 transition" : "transition"}
                          >
                            ›
                          </span>
                        </button>
                      </td>
                      <td className="truncate px-4 py-3 font-medium" title={r.full_name}>
                        {r.full_name}
                        {r.checked_in_at ? (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            {t("events.checkIn.resultIn")}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {t(`events.regStatus.${r.status}`)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="block truncate">
                          {t(`events.payStatus.${r.payment_status}`)}
                          {r.amount_cents > 0
                            ? ` · ${(r.amount_cents / 100).toFixed(2)} ${r.currency}`
                            : ""}
                        </span>
                        {r.confirmation_status === "failed" || r.refund_status === "failed" ? (
                          <span className="mt-0.5 block text-xs font-semibold text-destructive">
                            {t(
                              r.refund_status === "failed"
                                ? "events.refundStatus.failed"
                                : "events.confirmationStatus.failed",
                            )}
                          </span>
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
                            onClick={() =>
                              r.status === "cancelled"
                                ? void setRegistrationStatusAndReload(r)
                                : setPendingCancel(r)
                            }
                            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                          >
                            {r.status === "cancelled"
                              ? t("events.reinstate")
                              : t("events.cancelRsvp")}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="border-t border-border/60 bg-secondary/30">
                        <td colSpan={5} className="px-4 py-4">
                          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                            <DetailItem label={t("events.colName")} value={r.full_name} />
                            <DetailItem label={t("events.colEmail")} value={r.email} />
                            <DetailItem
                              label={t("events.colPayment")}
                              value={`${t(`events.payStatus.${r.payment_status}`)}${
                                r.amount_cents > 0
                                  ? ` · ${(r.amount_cents / 100).toFixed(2)} ${r.currency}`
                                  : ""
                              }`}
                            />
                            <DetailItem
                              label={t("events.colConfirmation")}
                              value={t(
                                `events.confirmationStatus.${r.confirmation_status ?? "not_sent"}`,
                              )}
                              note={r.confirmation_error}
                            />
                            <DetailItem
                              label={t("events.colRefund")}
                              value={t(
                                `events.refundStatus.${r.refund_status ?? "not_applicable"}`,
                              )}
                              note={r.refund_error}
                            >
                              {r.refund_status === "failed" ? (
                                <button
                                  onClick={() => void retryRefund(r)}
                                  className="mt-1 text-xs font-semibold text-primary underline"
                                >
                                  {t("events.retryRefund")}
                                </button>
                              ) : null}
                            </DetailItem>
                            <DetailItem
                              label={t("events.colStatus")}
                              value={t(`events.regStatus.${r.status}`)}
                            />
                          </dl>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <CancelAttendeeDialog
        registration={pendingCancel}
        eventStartsAt={event.starts_at}
        onClose={() => setPendingCancel(null)}
        onConfirm={async (r, refund, note) => {
          setPendingCancel(null);
          await cancelAttendee(r, refund, note);
        }}
        t={t}
      />
    </>
  );
}

/**
 * Cancellation confirmation.
 *
 * Cancelling a paid seat moves money and sends mail, so it is never a single
 * click: the dialog states the refund verdict the server will apply and lets
 * staff override it deliberately.
 */
/** One label/value pair inside an expanded attendee row. */
function DetailItem({
  label,
  value,
  note,
  children,
}: {
  label: string;
  value: string;
  note?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{value}</dd>
      {note ? <dd className="mt-0.5 break-words text-xs text-destructive">{note}</dd> : null}
      {children ? <dd>{children}</dd> : null}
    </div>
  );
}

function CancelAttendeeDialog({
  registration,
  eventStartsAt,
  onClose,
  onConfirm,
  t,
}: {
  registration: Registration | null;
  eventStartsAt: string | null;
  onClose: () => void;
  onConfirm: (
    r: Registration,
    refund: boolean | undefined,
    note: string | null,
  ) => void | Promise<void>;
  t: (k: string) => string;
}) {
  const wasPaid = Boolean(
    registration && registration.payment_status === "paid" && registration.amount_cents > 0,
  );
  // Mirrors REFUND_DEADLINE_HOURS on the server; the server decides, this only
  // tells staff what will happen.
  const withinPolicy = eventStartsAt
    ? new Date(eventStartsAt).getTime() - Date.now() > 48 * 3600_000
    : true;
  const [override, setOverride] = React.useState<boolean | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setOverride(null);
    setNote("");
    setBusy(false);
  }, [registration?.id]);

  const refund = override ?? withinPolicy;

  return (
    <AlertDialog open={registration !== null} onOpenChange={(open) => (!open ? onClose() : null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("events.cancelDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {registration ? (
              <>
                {t("events.cancelDialog.intro")} <strong>{registration.full_name}</strong>.{" "}
                {wasPaid
                  ? refund
                    ? t("events.cancelDialog.refundYes")
                    : t("events.cancelDialog.refundNo")
                  : t("events.cancelDialog.free")}
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {wasPaid && registration ? (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={refund}
              onChange={(e) => setOverride(e.target.checked)}
            />
            <span>
              {t("events.cancelDialog.refundToggle")} (
              {(registration.amount_cents / 100).toFixed(2)} {registration.currency})
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {withinPolicy
                  ? t("events.cancelDialog.policyOutside")
                  : t("events.cancelDialog.policyInside")}
              </span>
            </span>
          </label>
        ) : null}
        <label className="block text-sm">
          <span className="text-xs font-semibold">{t("events.cancelDialog.noteLabel")}</span>
          <textarea
            rows={2}
            maxLength={500}
            value={note}
            placeholder={t("events.cancelDialog.notePlaceholder")}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("events.cancelDialog.keep")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              if (!registration) return;
              setBusy(true);
              void onConfirm(registration, wasPaid ? refund : undefined, note.trim() || null);
            }}
          >
            {busy ? t("events.cancelDialog.working") : t("events.cancelDialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
