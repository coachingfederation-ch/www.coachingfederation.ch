/**
 * Event editor.
 *
 * Known simplification: the date inputs work in the browser's local timezone
 * and are stored as UTC instants. Swiss staff editing Swiss events see the
 * right thing; a per-event timezone picker would be the complete fix.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireStaffAccess, EVENT_ROLES } from "@/lib/staff-guard";
import * as React from "react";
import { useEffect, useState } from "react";
import { Shell } from "@/components/cms/Shell";
import { UnsplashPicker, type UnsplashPick } from "@/components/cms/UnsplashPicker";
import {
  EventDetailsSection,
  EventContentSection,
  EventLocationSection,
  EventHostsSection,
  EventSpeakersSection,
  EventRepeatSection,
  EventSeriesUpdateSection,
  EventRegistrationSettings,
  EventLifecycleActions,
  EventAttendeeDesk,
  type Managed,
  type Registration,
} from "@/components/cms/EventEditorSections";
import {
  EventStageHeader,
  EventStageNav,
  EventSaveBar,
  EventStageEmpty,
  type EditorSection,
} from "@/components/cms/EventEditorChrome";
import {
  defaultStageFor,
  readStoredStage,
  writeStoredStage,
  type EventStage,
} from "@/lib/event-editor-stages";
import { displayEventStatus } from "@/lib/events";
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
import { useSaveShortcut } from "@/hooks/use-save-shortcut";
import { useCms } from "@/i18n/cms";
import { fetchVocabulary, type VocabRow } from "@/lib/vocabularies";
import { EventDuplicateSection } from "@/components/cms/EventDuplicateSection";
import {
  applySeriesUpdate,
  cancelRegistration,
  duplicateEvent,
  generateEventOccurrences,
  getManagedEvent,
  listCommunityOptions,
  listEventRegistrations,
  listEventTiers,
  listSeriesDates,
  resendEventConfirmation,
  retryRegistrationRefund,
  setEventStatus,
  setRegistrationStatus,
  updateEvent,
  type SeriesDate,
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
  // The dates of this event's series, with the parent (next upcoming) marked.
  const [seriesDates, setSeriesDates] = useState<SeriesDate[]>([]);
  // Which lifecycle stage the editor shows. Null until the session's own
  // choice is read; the event's state decides on a first visit.
  const [stage, setStage] = useState<EventStage | null>(null);

  useEffect(() => {
    setStage(readStoredStage(id));
  }, [id]);

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
      setSeriesDates(await listSeriesDates({ data: { id } }).catch(() => []));
      if (row.tickets_enabled) {
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

  // Unsaved-changes flag and the save handler live above the loading guard so
  // the keyboard-shortcut hook below runs on every render (Rules of Hooks).
  const dirty = event !== null && baseline !== null && baseline !== JSON.stringify(event);

  const save = async () => {
    if (!event) return;
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
          tickets_enabled: event.tickets_enabled ?? false,
          guest_passes_allowed: event.guest_passes_allowed ?? false,
          attendance_min_percent: event.attendance_min_percent ?? 80,
          certificates_enabled: event.certificates_enabled ?? false,
          is_featured: event.is_featured,
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

  // Cmd/Ctrl+S saves, matching the other CMS editors.
  useSaveShortcut(save, saving || !dirty);

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

  const activeStage: EventStage = stage ?? defaultStageFor(event);

  const pickStage = (next: EventStage) => {
    setStage(next);
    writeStoredStage(event.id, next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  /* The extras toggles keep their meaning: they reveal the optional halves of
     the editor, and they now live in the section rail. */
  const extrasControls = (
    <div className="space-y-2 px-3 text-sm">
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
  );

  /* One entry per panel rendered in the active stage, in render order, so the
     rail always matches what is on screen. */
  const sections: EditorSection[] = [];
  const panels: React.ReactNode[] = [];
  const addPanel = (id: string, label: string, node: React.ReactNode) => {
    sections.push({ id, label });
    panels.push(
      <div key={id} id={id} className="scroll-mt-56">
        {node}
      </div>,
    );
  };

  if (activeStage === "setup") {
    addPanel(
      "panel-details",
      t("events.section.details"),
      <EventDetailsSection
        event={event}
        patch={patch}
        categories={categories}
        regions={regions}
        communities={communities}
        t={t}
      />,
    );
    addPanel(
      "panel-content",
      t("events.section.content"),
      <EventContentSection
        event={event}
        patch={patch}
        setPickerOpen={setPickerOpen}
        categories={categories}
        regions={regions}
        t={t}
      />,
    );
    addPanel(
      "panel-hosts",
      t("events.section.hosts"),
      <EventHostsSection
        eventId={event.id}
        title={t("events.section.hosts")}
        hint={t("events.hosts.sectionHint")}
      />,
    );
    addPanel(
      "panel-speakers",
      t("events.section.speakers"),
      <EventSpeakersSection
        eventId={event.id}
        title={t("events.section.speakers")}
        hint={t("events.speakers.sectionHint")}
      />,
    );
    addPanel(
      "panel-location",
      t("events.section.location"),
      <EventLocationSection event={event} patch={patch} t={t} />,
    );
  }

  if (activeStage === "registration") {
    addPanel(
      "panel-registration",
      t("events.section.registration"),
      <EventRegistrationSettings event={event} patch={patch} t={t} />,
    );
    if (event.tickets_enabled) {
      addPanel(
        "panel-tickets",
        t("events.section.tickets"),
        <EventTicketsSection eventId={event.id} t={t} />,
      );
      addPanel(
        "panel-discounts",
        t("events.section.discounts"),
        <EventDiscountCodesSection
          eventId={event.id}
          eventTitle={event.title}
          eventStartsAt={event.starts_at}
          t={t}
        />,
      );
    }
    if (event.registration_mode === "rsvp_invited") {
      addPanel(
        "panel-invitations",
        t("events.invitations.title"),
        <EventInvitationsSection eventId={event.id} t={t} />,
      );
    }
    // A waitlist makes no sense when the guest list is the gate.
    if (event.registration_mode !== "none" && event.registration_mode !== "rsvp_invited") {
      addPanel(
        "panel-waitlist",
        t("events.waitlist.title"),
        <EventWaitlistSection eventId={event.id} t={t} />,
      );
    }
    if (showForms) {
      addPanel(
        "panel-forms",
        t("events.forms.title"),
        <EventFormsSection eventId={event.id} t={t} />,
      );
    }
  }

  if (activeStage === "publish") {
    addPanel(
      "panel-publishing",
      t("events.section.publishing"),
      <EventLifecycleActions event={event} changeStatus={changeStatus} t={t} />,
    );
    // Repeat, series updates and copies all read the stored row, so they only
    // unlock once nothing is left unsaved.
    if (showRepeat) {
      addPanel(
        "panel-repeat",
        t("events.repeat.section"),
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
        />,
      );
    }
    addPanel(
      "panel-series",
      t("events.series.section"),
      <EventSeriesUpdateSection
        eventId={event.id}
        dates={seriesDates}
        t={t}
        canApply={!dirty}
        blockedReason={dirty ? t("events.repeat.needsSave") : null}
        onApply={async () => {
          setMessage(null);
          setError(null);
          try {
            const res = await applySeriesUpdate({ data: { id: event.id } });
            setMessage(
              `${t("events.series.updated")} ${res.updated}${
                res.skipped.length ? ` · ${t("events.series.skipped")} ${res.skipped.length}` : ""
              }`,
            );
            await load();
          } catch (e) {
            setError(e instanceof Error ? e.message : t("events.saveError"));
          }
        }}
      />,
    );
    addPanel(
      "panel-duplicate",
      t("events.duplicate.section"),
      <EventDuplicateSection
        startsAt={event.starts_at}
        t={t}
        canDuplicate={!dirty}
        blockedReason={dirty ? t("events.repeat.needsSave") : null}
        onDuplicate={async (startsAt) => {
          setMessage(null);
          setError(null);
          try {
            const res = await duplicateEvent({ data: { id: event.id, startsAt } });
            await navigate({ to: "/manage/events/$id", params: { id: res.id } });
          } catch (e) {
            setError(e instanceof Error ? e.message : t("events.saveError"));
          }
        }}
      />,
    );
  }

  if (activeStage === "run") {
    addPanel(
      "panel-attendees",
      t("events.attendees"),
      <EventAttendeeDesk
        event={event}
        registrations={registrations}
        confirmed={confirmed}
        setRegistrationStatusAndReload={setRegistrationStatusAndReload}
        resendConfirmation={resendConfirmation}
        cancelAttendee={cancelAttendee}
        retryRefund={retryRefund}
        tiers={tiers}
        reloadRegistrations={() => load().catch(() => setError(t("events.loadError")))}
        t={t}
      />,
    );
    if (showCce) {
      addPanel(
        "panel-cce",
        t("events.wizard.extras.cce"),
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
        />,
      );
    }
  }

  if (activeStage === "after") {
    addPanel(
      "panel-recap",
      t("events.recap.title"),
      <EventRecapEditor
        eventId={event.id}
        eventStartsAt={event.starts_at}
        eventTitle={event.title}
        t={(key) => t(`events.${key}`)}
      />,
    );
  }

  return (
    <Shell>
      <EventStageHeader
        title={event.title}
        statusLabel={t(`events.status.${displayEventStatus(event.status, event.starts_at)}`)}
        stage={activeStage}
        onStage={pickStage}
        onBack={() => void navigate({ to: "/manage/events" })}
        backLabel={t("events.backToList")}
        previewHref={event.status === "published" ? `/events/${event.slug}` : null}
        previewLabel={t("events.editor.preview")}
        t={t}
      />

      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-8 sm:px-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <EventStageNav
          sections={sections}
          extras={extrasControls}
          title={t("events.stage.sections")}
          extrasTitle={t("events.wizard.step.extras")}
        />

        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{t(`events.stage.hint.${activeStage}`)}</p>
          {message ? <p className="mt-3 text-sm text-teal-foreground">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

          {panels.length === 0 ? (
            <EventStageEmpty text={t(`events.stage.empty.${activeStage}`)} />
          ) : (
            panels
          )}
        </div>
      </div>

      <EventSaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => void save()}
        onDiscard={() => {
          if (baseline) setEvent(JSON.parse(baseline) as Managed);
        }}
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
    </Shell>
  );
}
