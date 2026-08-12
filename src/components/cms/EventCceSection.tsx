/**
 * CCE credit application section of the event editor.
 *
 * Self-contained: it loads and saves its own record so the surrounding event
 * form keeps working exactly as before when the toggle is off. Validation is
 * advisory here — the approver boundary and the row rules live in the
 * database.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { Field, Section, inputClass } from "./EventEditorSections";
import {
  CCE_CATEGORIES,
  CCE_CREDENTIALS,
  CCE_DELIVERY_METHODS,
  EMPTY_CCE_DRAFT,
  minutesBetween,
  minutesToHours,
  toDraft,
  validateCce,
  type CceCategory,
  type CceDelivery,
  type CceDraft,
  type CceStatus,
  type ScheduleDraft,
} from "@/lib/event-cce";
import {
  getEventCce,
  saveEventCce,
  setEventCceEnabled,
  setEventCceStatus,
} from "@/lib/event-cce.functions";

type T = (key: string) => string;

const newRow = (): ScheduleDraft => ({
  key: `new-${Math.random().toString(36).slice(2)}`,
  id: null,
  starts_at_text: "",
  ends_at_text: "",
  duration_minutes: 0,
  facilitator: "",
  topic: "",
  delivery_method: null,
  cce_category: "core_competency",
});

export function EventCceSection({
  eventId,
  startsAt,
  endsAt,
  timezone,
  defaultContactName,
  defaultContactEmail,
  defaultFacilitator,
  enabled,
  onEnabledChange,
  t,
}: {
  eventId: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  defaultContactName: string;
  defaultContactEmail: string;
  defaultFacilitator: string;
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  t: T;
}) {
  const [draft, setDraft] = useState<CceDraft>({ ...EMPTY_CCE_DRAFT });
  const [rows, setRows] = useState<ScheduleDraft[]>([]);
  const [status, setStatus] = useState<CceStatus>("not_requested");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getEventCce({ data: { eventId } });
      const app = result.application;
      setStatus((app?.status as CceStatus) ?? "not_requested");
      const loaded = toDraft(app);
      // Prefill the contact and facilitator from the event when the record is
      // still empty; never overwrite what an organizer already typed.
      setDraft({
        ...loaded,
        contact_name: loaded.contact_name || defaultContactName,
        contact_email: loaded.contact_email || defaultContactEmail,
        primary_facilitator_name: loaded.primary_facilitator_name || defaultFacilitator,
      });
      setRows(
        (result.rows as ScheduleDraft[] & { id: string }[]).map((r, index) => ({
          key: `row-${index}`,
          id: r.id ?? null,
          starts_at_text: r.starts_at_text ?? "",
          ends_at_text: r.ends_at_text ?? "",
          duration_minutes: r.duration_minutes ?? 0,
          facilitator: r.facilitator ?? "",
          topic: r.topic ?? "",
          delivery_method: r.delivery_method ?? null,
          cce_category: r.cce_category ?? "core_competency",
        })),
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.loadError"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, defaultContactName, defaultContactEmail, defaultFacilitator]);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  const set = (next: Partial<CceDraft>) => setDraft((d) => ({ ...d, ...next }));

  const patchRow = (key: string, next: Partial<ScheduleDraft>) =>
    setRows((current) =>
      current.map((r) => {
        if (r.key !== key) return r;
        const merged = { ...r, ...next };
        // Times drive the duration unless the organizer overrides it directly.
        if (next.starts_at_text !== undefined || next.ends_at_text !== undefined) {
          const derived = minutesBetween(merged.starts_at_text, merged.ends_at_text);
          if (derived > 0) merged.duration_minutes = derived;
        }
        return merged;
      }),
    );

  const validation = validateCce({ draft, rows, startIso: startsAt, endIso: endsAt, timezone });

  const toggle = async (next: boolean) => {
    setError(null);
    try {
      await setEventCceEnabled({ data: { eventId, enabled: next } });
      onEnabledChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.saveError"));
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await saveEventCce({
        data: {
          eventId,
          draft: {
            ...draft,
            core_competency_hours: Number(draft.core_competency_hours) || 0,
            resource_development_hours: Number(draft.resource_development_hours) || 0,
            break_minutes: Number(draft.break_minutes) || 0,
          },
          rows: rows.map((r, index) => ({
            id: r.id,
            position: index,
            starts_at_text: r.starts_at_text,
            ends_at_text: r.ends_at_text,
            duration_minutes: Number(r.duration_minutes) || 0,
            facilitator: r.facilitator,
            topic: r.topic,
            delivery_method: r.delivery_method,
            cce_category: r.cce_category,
          })),
        },
      });
      setMessage(t("cce.saved"));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const moveStatus = async (next: CceStatus) => {
    setError(null);
    try {
      await save();
      await setEventCceStatus({ data: { eventId, status: next } });
      setStatus(next);
      setMessage(t("cce.statusUpdated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.saveError"));
    }
  };

  return (
    <Section title={t("cce.section.title")} hint={t("cce.section.hint")}>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => void toggle(e.target.checked)} />
        <span className="font-semibold">{t("cce.toggle")}</span>
      </label>

      {!enabled ? (
        <p className="mt-3 text-xs text-muted-foreground">{t("cce.toggleOffHint")}</p>
      ) : null}

      {enabled ? (
        <div className="mt-5 space-y-6">
          {loading ? <p className="text-sm text-muted-foreground">{t("events.loading")}</p> : null}
          {message ? <p className="text-sm text-teal-foreground">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="rounded-xl border border-border bg-background p-4 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("cce.status.label")}
            </span>
            <p className="mt-1 font-semibold">{t(`cce.status.${status}`)}</p>
            <Link
              to="/manage/events/$id/cce"
              params={{ id: eventId }}
              className="mt-2 inline-block text-xs font-semibold text-primary underline"
            >
              {t("cce.openReview")}
            </Link>
          </div>

          {validation.multiDay ? (
            <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {t("cce.warn.multiDay")}
            </p>
          ) : null}
          {validation.rdOnly ? (
            <p className="rounded-xl border border-border bg-background p-3 text-sm">
              {t("cce.warn.rdOnly")}
            </p>
          ) : null}
          {validation.lateSubmission ? (
            <p className="rounded-xl border border-yellow/50 bg-background p-3 text-sm">
              {t("cce.warn.late")}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("cce.field.contactName")}>
              <input
                className={inputClass}
                value={draft.contact_name}
                onChange={(e) => set({ contact_name: e.target.value })}
              />
            </Field>
            <Field label={t("cce.field.contactEmail")}>
              <input
                type="email"
                className={inputClass}
                value={draft.contact_email}
                onChange={(e) => set({ contact_email: e.target.value })}
              />
            </Field>
            <Field label={t("cce.field.facilitatorName")}>
              <input
                className={inputClass}
                value={draft.primary_facilitator_name}
                onChange={(e) => set({ primary_facilitator_name: e.target.value })}
              />
            </Field>
            <Field label={t("cce.field.facilitatorCredential")}>
              <select
                className={inputClass}
                value={draft.primary_facilitator_credential}
                onChange={(e) => set({ primary_facilitator_credential: e.target.value })}
              >
                <option value="">—</option>
                {CCE_CREDENTIALS.map((c) => (
                  <option key={c} value={c}>
                    {t(`cce.credential.${c}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("cce.field.additionalFacilitators")}>
              <input
                className={inputClass}
                value={draft.additional_facilitators}
                onChange={(e) => set({ additional_facilitators: e.target.value })}
              />
            </Field>
            <Field label={t("cce.field.deliveryMethod")}>
              <select
                className={inputClass}
                value={draft.delivery_method ?? ""}
                onChange={(e) =>
                  set({ delivery_method: (e.target.value || null) as CceDelivery | null })
                }
              >
                <option value="">—</option>
                {CCE_DELIVERY_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(`cce.delivery.${m}`)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="space-y-4">
            <Field label={t("cce.field.targetAudience")}>
              <textarea
                rows={2}
                className={inputClass}
                value={draft.target_audience}
                onChange={(e) => set({ target_audience: e.target.value })}
              />
            </Field>
            <Field label={t("cce.field.learningObjectives")}>
              <textarea
                rows={4}
                className={inputClass}
                value={draft.learning_objectives}
                onChange={(e) => set({ learning_objectives: e.target.value })}
              />
            </Field>
            <Field label={t("cce.field.completionRequirements")}>
              <textarea
                rows={2}
                className={inputClass}
                value={draft.completion_requirements}
                onChange={(e) => set({ completion_requirements: e.target.value })}
              />
            </Field>
            <Field label={t("cce.field.attendanceMonitoring")}>
              <textarea
                rows={2}
                className={inputClass}
                value={draft.attendance_monitoring}
                onChange={(e) => set({ attendance_monitoring: e.target.value })}
              />
            </Field>
            <Field label={t("cce.field.contentRationale")}>
              <textarea
                rows={4}
                className={inputClass}
                value={draft.content_rationale}
                onChange={(e) => set({ content_rationale: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <Field label={t("cce.field.ccHours")}>
              <input
                type="number"
                step="0.25"
                min="0"
                className={inputClass}
                value={draft.core_competency_hours}
                onChange={(e) => set({ core_competency_hours: Number(e.target.value) })}
              />
            </Field>
            <Field label={t("cce.field.rdHours")}>
              <input
                type="number"
                step="0.25"
                min="0"
                className={inputClass}
                value={draft.resource_development_hours}
                onChange={(e) => set({ resource_development_hours: Number(e.target.value) })}
              />
            </Field>
            <Field label={t("cce.field.totalHours")}>
              <input className={inputClass} readOnly value={validation.enteredHours.toFixed(2)} />
            </Field>
            <Field label={t("cce.field.breakMinutes")}>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={draft.break_minutes}
                onChange={(e) => set({ break_minutes: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("cce.schedule.title")}
              </h3>
              <button
                type="button"
                onClick={() => setRows((r) => [...r, newRow()])}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                {t("cce.schedule.add")}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("cce.schedule.hint")}</p>

            <div className="mt-3 space-y-3">
              {rows.map((row) => (
                <div key={row.key} className="rounded-xl border border-border p-3">
                  <div className="grid gap-3 sm:grid-cols-6">
                    <Field label={t("cce.schedule.start")}>
                      <input
                        className={inputClass}
                        placeholder="18:30"
                        value={row.starts_at_text}
                        onChange={(e) => patchRow(row.key, { starts_at_text: e.target.value })}
                      />
                    </Field>
                    <Field label={t("cce.schedule.end")}>
                      <input
                        className={inputClass}
                        placeholder="19:15"
                        value={row.ends_at_text}
                        onChange={(e) => patchRow(row.key, { ends_at_text: e.target.value })}
                      />
                    </Field>
                    <Field label={t("cce.schedule.duration")}>
                      <input
                        type="number"
                        min="0"
                        className={inputClass}
                        value={row.duration_minutes}
                        onChange={(e) =>
                          patchRow(row.key, { duration_minutes: Number(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label={t("cce.schedule.facilitator")}>
                      <input
                        className={inputClass}
                        value={row.facilitator}
                        onChange={(e) => patchRow(row.key, { facilitator: e.target.value })}
                      />
                    </Field>
                    <Field label={t("cce.schedule.delivery")}>
                      <select
                        className={inputClass}
                        value={row.delivery_method ?? ""}
                        onChange={(e) =>
                          patchRow(row.key, {
                            delivery_method: (e.target.value || null) as CceDelivery | null,
                          })
                        }
                      >
                        <option value="">—</option>
                        {CCE_DELIVERY_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {t(`cce.delivery.${m}`)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={t("cce.schedule.category")}>
                      <select
                        className={inputClass}
                        value={row.cce_category}
                        onChange={(e) =>
                          patchRow(row.key, { cce_category: e.target.value as CceCategory })
                        }
                      >
                        {CCE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {t(`cce.category.${c}`)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="mt-3 flex items-end gap-3">
                    <div className="flex-1">
                      <Field label={t("cce.schedule.topic")}>
                        <input
                          className={inputClass}
                          value={row.topic}
                          onChange={(e) => patchRow(row.key, { topic: e.target.value })}
                        />
                      </Field>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                      className="mb-1 inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-semibold text-destructive"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      {t("cce.schedule.remove")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-sm">
              {t("cce.schedule.creditTotal")}:{" "}
              <strong>{minutesToHours(validation.scheduleMinutes).toFixed(2)}</strong>
            </p>
            {validation.hoursMismatch ? (
              <p className="mt-2 rounded-xl border border-yellow/50 bg-background p-3 text-sm">
                {t("cce.warn.hoursMismatch")}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("cce.field.supportingUrl")}>
              <input
                className={inputClass}
                value={draft.supporting_material_url}
                onChange={(e) => set({ supporting_material_url: e.target.value })}
              />
            </Field>
            <Field label={t("cce.field.supportingNote")}>
              <input
                className={inputClass}
                value={draft.supporting_material_note}
                onChange={(e) => set({ supporting_material_note: e.target.value })}
              />
            </Field>
          </div>

          <Field label={t("cce.field.internalNotes")}>
            <textarea
              rows={3}
              className={inputClass}
              value={draft.internal_notes}
              onChange={(e) => set({ internal_notes: e.target.value })}
            />
          </Field>

          {validation.missing.length > 0 ? (
            <div className="rounded-xl border border-border bg-background p-3 text-sm">
              <p className="font-semibold">{t("cce.missingTitle")}</p>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                {validation.missing.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? t("events.saving") : t("cce.save")}
            </button>
            <button
              type="button"
              onClick={() => void moveStatus("ready_for_review")}
              disabled={!validation.canRequestReview || saving}
              className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-semibold disabled:opacity-50"
            >
              {t("cce.markReady")}
            </button>
            {validation.rdOnly ? (
              <button
                type="button"
                onClick={() => void moveStatus("not_required_rd_only")}
                className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-semibold"
              >
                {t("cce.markRdOnly")}
              </button>
            ) : null}
            {validation.multiDay ? (
              <button
                type="button"
                onClick={() => void moveStatus("separate_conference_process")}
                className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-semibold"
              >
                {t("cce.markConference")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Section>
  );
}
