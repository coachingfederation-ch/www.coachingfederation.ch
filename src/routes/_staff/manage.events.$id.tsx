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
import { sanitizeHeroMarks } from "@/lib/hero-design";
import { useCms } from "@/i18n/cms";
import { fetchVocabulary, type VocabRow } from "@/lib/vocabularies";
import {
  cancelRegistration,
  generateEventOccurrences,
  getManagedEvent,
  listCommunityOptions,
  listEventRegistrations,
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
    if (row) setRegistrations(await listEventRegistrations({ data: { eventId: id } }));
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
  const cancelAttendee = async (r: Registration, refund: boolean | undefined) => {
    setMessage(null);
    setError(null);
    try {
      const result = await cancelRegistration({
        data: { registrationId: r.id, ...(refund === undefined ? {} : { refund }) },
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

        <EventRepeatSection
          event={event}
          t={t}
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
          ticketsSection={
            event.registration_mode === "rsvp_tickets" ? (
              <EventTicketsSection eventId={event.id} t={t} />
            ) : null
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
