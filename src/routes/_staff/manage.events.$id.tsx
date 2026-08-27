/**
 * Event editor.
 *
 * Known simplification: the date inputs work in the browser's local timezone
 * and are stored as UTC instants. Swiss staff editing Swiss events see the
 * right thing; a per-event timezone picker would be the complete fix.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireStaffAccess, EVENT_ROLES } from "@/lib/staff-guard";
import { useEffect, useState } from "react";
import { Shell } from "@/components/cms/Shell";
import { UnsplashPicker, type UnsplashPick } from "@/components/cms/UnsplashPicker";
import {
  EventDetailsSection,
  EventContentSection,
  EventLocationSection,
  EventHostsSection,
  EventRepeatSection,
  EventPublishingSection,
  type Managed,
  type Registration,
} from "@/components/cms/EventEditorSections";
import { EventTicketsSection } from "@/components/cms/EventTicketsSection";
import { EventCceSection } from "@/components/cms/EventCceSection";
import { EventDiscountCodesSection } from "@/components/cms/EventDiscountCodesSection";
import { EventWaitlistSection } from "@/components/cms/EventWaitlistSection";
import { EventInvitationsSection } from "@/components/cms/EventInvitationsSection";
import { EventFormsSection } from "@/components/cms/EventFormsSection";
import { listEventForms } from "@/lib/event-forms.functions";

import { EventRecapEditor } from "@/components/cms/EventRecapEditor";
import { sanitizeHeroMarks } from "@/lib/hero-design";
import { takeWizardExtras } from "@/lib/event-wizard-extras";
import { useCms } from "@/i18n/cms";
import { fetchVocabulary, type VocabRow } from "@/lib/vocabularies";
import {
  cancelRegistration,
  generateEventOccurrences,
  getManagedEvent,
  listCommunityOptions,
  listEventRegistrations,
  listEventTiers,
  resendEventConfirmation,
  retryRegistrationRefund,
  setEventStatus,
  setRegistrationStatus,
  updateEvent,
} from "@/lib/events-admin.functions";

export const Route = createFileRoute("/_staff/manage/events/$id")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, EVENT_ROLES),
  head: () => ({
    meta: [
      { title: "Edit event — The Switzerland Chapter of ICF CMS" },
      {
        name: "description",
        content:
          "Edit an The Switzerland Chapter of ICF event, its registration settings and attendees.",
      },
      { property: "og:title", content: "Edit event — The Switzerland Chapter of ICF CMS" },
      {
        property: "og:description",
        content:
          "Edit an The Switzerland Chapter of ICF event, its registration settings and attendees.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EventEditor,
});

function EventEditor() {
  const { id } = Route.useParams();
  const { t } = useCms();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Managed | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Category and region are the public filter facets, so the editor reads the
  // same vocabulary tables the /events filter bar does.
  const [categories, setCategories] = useState<VocabRow[]>([]);
  const [regions, setRegions] = useState<VocabRow[]>([]);
  const [communities, setCommunities] = useState<{ id: string; name: string }[]>([]);
  // Tier names feed the attendee filter and the add-attendee dialog.
  const [tiers, setTiers] = useState<{ id: string; name: string }[]>([]);
  // Optional panels. An event that already repeats or already applies for CCE
  // shows them on its own; otherwise they follow the wizard's answers, and
  // afterwards the toggles above the form.
  const [extras, setExtras] = useState({ repeat: false, forms: false, cce: false });
  // Stored forms are their own proof the panel is needed — the toggle itself is
  // view state and does not survive a reload.
  const [hasForms, setHasForms] = useState(false);

  useEffect(() => {
    const handed = takeWizardExtras(id);
    if (handed) setExtras(handed);
  }, [id]);

  useEffect(() => {
    listEventForms({ data: { eventId: id } })
      .then((rows) => setHasForms((rows ?? []).length > 0))
      .catch(() => undefined);
  }, [id]);


  useEffect(() => {
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

  const load = async () => {
    const row = await getManagedEvent({ data: { id } });
    setEvent(row as Managed | null);
    // Snapshot of the stored row: repeat dates are copied from the database, so
    // the editor must know whether the form still holds unsaved edits.
    setBaseline(row ? JSON.stringify(row) : null);

    if (row) {
      setRegistrations(await listEventRegistrations({ data: { eventId: id } }));
      if (row.registration_mode === "rsvp_tickets") {
        setTiers(
          (await listEventTiers({ data: { eventId: id } })).map((tier) => ({
            id: tier.id,
            name: tier.name,
          })),
        );
      }
    }
  };

  useEffect(() => {
    load().catch(() => setError(t("events.loadError")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!event) {
    return (
      <Shell>
        <div className="mx-auto max-w-4xl px-10 py-10 text-sm text-muted-foreground">
          {error ?? t("events.loading")}
        </div>
      </Shell>
    );
  }

  const patch = (next: Partial<Managed>) => setEvent({ ...event, ...next });

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await updateEvent({
        data: {
          id: event.id,
          title: event.title,
          slug: event.slug,
          summary: event.summary,
          description: event.description,
          language: event.language,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
          timezone: event.timezone ?? "Europe/Zurich",
          location_mode: event.location_mode,
          venue_name: event.venue_name,
          city: event.city,
          online_url: event.online_url,
          map_location: event.map_location,
          image_url: event.image_url,
          image_credit_name: event.image_credit_name,
          image_credit_url: event.image_credit_url,
          capacity: event.capacity,
          registration_mode: event.registration_mode,
          registration_opens_at: event.registration_opens_at,
          registration_closes_at: event.registration_closes_at,
          guest_registration_allowed: event.guest_registration_allowed,
          guest_passes_allowed: event.guest_passes_allowed ?? false,
          attendance_min_percent: event.attendance_min_percent ?? 80,
          certificates_enabled: event.certificates_enabled ?? false,
          is_featured: event.is_featured,
          is_internal: event.is_internal ?? false,
          category_id: event.category_id,
          region_id: event.region_id,
          community_id: event.community_id,
          hero_marks: sanitizeHeroMarks("event", event.hero_marks),
        },
      });
      setMessage(t("events.saved"));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: "draft" | "published" | "cancelled") => {
    try {
      await setEventStatus({ data: { id: event.id, status } });
      await load();
    } catch {
      setError(t("events.saveError"));
    }
  };

  const setRegistrationStatusAndReload = async (r: Registration) => {
    await setRegistrationStatus({
      data: {
        registrationId: r.id,
        status: r.status === "cancelled" ? "confirmed" : "cancelled",
      },
    });
    await load();
  };

  /**
   * Manual re-send after a failed or lost confirmation. Failures surface as an
   * error on the page; the registration itself is never touched.
   */
  const resendConfirmation = async (r: Registration) => {
    try {
      const result = await resendEventConfirmation({ data: { registrationId: r.id } });
      if (result.status !== "sent") setError(t("events.resendFailed"));
    } catch {
      setError(t("events.resendFailed"));
    }
    await load();
  };

  /**
   * Full cancellation: releases the seat, reverses the payment when the refund
   * policy (or a staff override) says so, and notifies the attendee. Any
   * partial failure is surfaced instead of silently swallowed, because money
   * and mail are involved.
   */
  const cancelAttendee = async (
    r: Registration,
    refund: boolean | undefined,
    note: string | null,
  ) => {
    setMessage(null);
    setError(null);
    try {
      const result = await cancelRegistration({
        data: {
          registrationId: r.id,
          ...(refund === undefined ? {} : { refund }),
          ...(note ? { note } : {}),
        },
      });
      if (result.refund.status === "failed") setError(t("events.refundFailed"));
      else if (result.email.status === "failed") setError(t("events.cancelEmailFailed"));
      else setMessage(t("events.cancelDone"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.saveError"));
    }
    await load();
  };

  const retryRefund = async (r: Registration) => {
    setMessage(null);
    setError(null);
    try {
      const result = await retryRegistrationRefund({ data: { registrationId: r.id } });
      if (result.status === "failed") setError(t("events.refundFailed"));
      else setMessage(t("events.refundDone"));
    } catch {
      setError(t("events.refundFailed"));
    }
    await load();
  };

  const confirmed = registrations.filter((r) => r.status === "confirmed").length;

  // Repeat dates copy the stored row, so they only make sense for a published
  // event whose form holds no pending edits.
  const dirty = baseline !== null && baseline !== JSON.stringify(event);
  const canCreateOccurrences = event.status === "published" && !dirty;
  const repeatBlockedReason =
    event.status !== "published"
      ? t("events.repeat.needsPublish")
      : dirty
        ? t("events.repeat.needsSave")
        : null;

  // A stored rule or an active application is proof the panel is needed; the
  // toggles above the form cover everything else.
  const storedRecurrence = (event as { recurrence?: unknown }).recurrence ?? null;
  const showRepeat = extras.repeat || Boolean(storedRecurrence);
  const showForms = extras.forms || hasForms;

  const showCce = extras.cce || Boolean(event.cce_enabled);

  return (
    <Shell>
      <div className="mx-auto max-w-4xl px-10 py-10">
        <button
          onClick={() => void navigate({ to: "/manage/events" })}
          className="btn-mono !text-muted-foreground hover:!text-foreground"
        >
          ← {t("events.backToList")}
        </button>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{event.title}</h1>

        {/* Extras row: the optional halves of the editor stay out of the way
            until this event actually needs them. */}
        <div className="mt-4 flex flex-wrap gap-4 rounded-2xl border border-border bg-card px-5 py-3 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("events.wizard.step.extras")}
          </span>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showRepeat}
              onChange={(e) => setExtras({ ...extras, repeat: e.target.checked })}
              disabled={Boolean(storedRecurrence)}
            />
            <span>{t("events.wizard.extras.repeat")}</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showCce}
              onChange={(e) => setExtras({ ...extras, cce: e.target.checked })}
              disabled={Boolean(event.cce_enabled)}
            />
            <span>{t("events.wizard.extras.cce")}</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showForms}
              onChange={(e) => setExtras({ ...extras, forms: e.target.checked })}
              disabled={hasForms}
            />

            <span>{t("events.wizard.extras.forms")}</span>
          </label>
        </div>

        {message ? <p className="mt-3 text-sm text-teal-foreground">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <EventDetailsSection
          event={event}
          patch={patch}
          categories={categories}
          regions={regions}
          communities={communities}
          t={t}
        />

        <EventContentSection
          event={event}
          patch={patch}
          setPickerOpen={setPickerOpen}
          categories={categories}
          regions={regions}
          t={t}
        />

        <EventHostsSection
          eventId={event.id}
          title={t("events.section.hosts")}
          hint={t("events.hosts.sectionHint")}
        />

        <EventLocationSection event={event} patch={patch} t={t} />

        {showCce ? (
          <EventCceSection
            eventId={event.id}
            startsAt={event.starts_at}
            endsAt={event.ends_at}
            timezone={event.timezone ?? "Europe/Zurich"}
            defaultContactName=""
            defaultContactEmail=""
            defaultFacilitator=""
            enabled={Boolean(event.cce_enabled)}
            onEnabledChange={(next) => patch({ cce_enabled: next })}
            t={t}
          />
        ) : null}

        <EventPublishingSection
          event={event}
          patch={patch}
          saving={saving}
          save={save}
          changeStatus={changeStatus}
          registrations={registrations}
          confirmed={confirmed}
          setRegistrationStatusAndReload={setRegistrationStatusAndReload}
          resendConfirmation={resendConfirmation}
          cancelAttendee={cancelAttendee}
          retryRefund={retryRefund}
          tiers={tiers}
          reloadRegistrations={() => load().catch(() => setError(t("events.loadError")))}
          ticketsSection={
            <>
              {event.registration_mode === "rsvp_tickets" ? (
                <>
                  <EventTicketsSection eventId={event.id} t={t} />
                  <EventDiscountCodesSection
                    eventId={event.id}
                    eventTitle={event.title}
                    eventStartsAt={event.starts_at}
                    t={t}
                  />
                </>
              ) : null}
              {event.registration_mode === "rsvp_invited" ? (
                <EventInvitationsSection eventId={event.id} t={t} />
              ) : null}
              {/* A waitlist makes no sense when the guest list is the gate. */}
              {event.registration_mode !== "none" && event.registration_mode !== "rsvp_invited" ? (
                <EventWaitlistSection eventId={event.id} t={t} />
              ) : null}
              {showForms ? <EventFormsSection eventId={event.id} t={t} /> : null}
              {/* Repeat lives right after Custom Forms: occurrences are copied
                  from the stored row, so this only unlocks once the event is
                  published and nothing is left unsaved. */}
              {showRepeat ? (
                <EventRepeatSection
                  event={event}
                  t={t}
                  canCreate={canCreateOccurrences}
                  blockedReason={repeatBlockedReason}
                  onGenerate={async (rule) => {
                    setMessage(null);
                    setError(null);
                    try {
                      const res = await generateEventOccurrences({ data: { id: event.id, rule } });
                      setMessage(
                        `${t("events.repeat.created")} ${res.created}${res.skipped ? ` · ${t("events.repeat.skipped")} ${res.skipped}` : ""}`,
                      );
                      await load();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : t("events.saveError"));
                    }
                  }}
                />
              ) : null}
              {/* The recap closes the loop: last panel, because it is written
                  after the event has actually happened. */}
              <EventRecapEditor eventId={event.id} eventStartsAt={event.starts_at} eventTitle={event.title} t={(key) => t(`events.${key}`)} />
            </>
          }
          t={t}
        />

        <UnsplashPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onPick={(pick: UnsplashPick) =>
            patch({
              image_url: pick.url,
              image_credit_name: pick.creditName,
              image_credit_url: pick.creditUrl,
            })
          }
        />
      </div>
    </Shell>
  );
}
