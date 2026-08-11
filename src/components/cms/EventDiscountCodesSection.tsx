/**
 * Discount-code management for ticketed events.
 *
 * Codes are entered per event and always applied to a single ticket tier at
 * checkout. Dates are entered as days in the editor's local timezone — the
 * same simplification the rest of the event editor makes. A code that has
 * already been used is archived rather than deleted, so historical
 * registrations keep pointing at a real row.
 */
import { useEffect, useState } from "react";
import { Section, inputClass } from "./EventEditorSections";
import { listEventTiers } from "@/lib/events-admin.functions";
import {
  deleteEventDiscountCode,
  listEventDiscountCodes,
  saveEventDiscountCode,
  type ManagedDiscountCode,
} from "@/lib/discount-codes.functions";
import type { DiscountType } from "@/lib/discount-codes";

type TierOption = { id: string; name: string };

type Draft = {
  id: string | null;
  key: string;
  code: string;
  discount_type: DiscountType;
  value: string;
  is_active: boolean;
  is_archived: boolean;
  starts_on: string;
  expires_on: string;
  max_uses: string;
  tier_ids: string[];
  member_only: boolean;
  internal_note: string;
  used_count: number;
};

const toDay = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const fromDay = (day: string, endOfDay: boolean) =>
  day ? new Date(`${day}T${endOfDay ? "23:59:59" : "00:00:00"}`).toISOString() : null;

const toDraft = (row: ManagedDiscountCode): Draft => ({
  id: row.id,
  key: row.id,
  code: row.code,
  discount_type: row.discount_type,
  value:
    row.discount_type === "percentage"
      ? String(Math.round(row.discount_value))
      : row.discount_value.toFixed(2),
  is_active: row.is_active,
  is_archived: row.is_archived,
  starts_on: toDay(row.starts_at),
  expires_on: toDay(row.expires_at),
  max_uses: row.max_uses === null ? "" : String(row.max_uses),
  tier_ids: row.tier_ids ?? [],
  member_only: row.member_only,
  internal_note: row.internal_note ?? "",
  used_count: row.used_count,
});

const emptyDraft = (): Draft => ({
  id: null,
  key: `new-${Math.random().toString(36).slice(2)}`,
  code: "",
  discount_type: "percentage",
  value: "10",
  is_active: true,
  is_archived: false,
  starts_on: "",
  expires_on: "",
  max_uses: "",
  tier_ids: [],
  member_only: false,
  internal_note: "",
  used_count: 0,
});

export function EventDiscountCodesSection({
  eventId,
  t,
}: {
  eventId: string;
  t: (key: string) => string;
}) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [tiers, setTiers] = useState<TierOption[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "saving">("loading");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const [rows, tierRows] = await Promise.all([
      listEventDiscountCodes({ data: { eventId } }),
      listEventTiers({ data: { eventId } }),
    ]);
    setDrafts(rows.map(toDraft));
    setTiers(tierRows.map((tier) => ({ id: tier.id, name: tier.name })));
    setStatus("ready");
  };

  useEffect(() => {
    load().catch(() => {
      setError(t("events.discounts.loadError"));
      setStatus("ready");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const update = (key: string, next: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...next } : d)));

  const toggleTier = (draft: Draft, tierId: string) =>
    update(draft.key, {
      tier_ids: draft.tier_ids.includes(tierId)
        ? draft.tier_ids.filter((id) => id !== tierId)
        : [...draft.tier_ids, tierId],
    });

  const save = async (draft: Draft) => {
    setError(null);
    setMessage(null);
    setStatus("saving");
    try {
      await saveEventDiscountCode({
        data: {
          eventId,
          id: draft.id,
          code: draft.code.trim().toUpperCase(),
          discount_type: draft.discount_type,
          discount_value: Number(draft.value.replace(",", ".") || "0"),
          is_active: draft.is_active,
          is_archived: draft.is_archived,
          starts_at: fromDay(draft.starts_on, false),
          expires_at: fromDay(draft.expires_on, true),
          max_uses: draft.max_uses ? Number(draft.max_uses) : null,
          tier_ids: draft.tier_ids,
          member_only: draft.member_only,
          internal_note: draft.internal_note.trim() || null,
        },
      });
      await load();
      setMessage(t("events.discounts.saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.discounts.saveError"));
    } finally {
      setStatus("ready");
    }
  };

  const remove = async (draft: Draft) => {
    if (!draft.id) {
      setDrafts((prev) => prev.filter((row) => row.key !== draft.key));
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const result = await deleteEventDiscountCode({ data: { id: draft.id } });
      setMessage(
        result.deleted ? t("events.discounts.deleted") : t("events.discounts.archivedDone"),
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.discounts.saveError"));
    }
  };

  const statusLabel = (draft: Draft) => {
    if (draft.is_archived) return t("events.discounts.statusArchived");
    if (!draft.is_active) return t("events.discounts.statusInactive");
    return t("events.discounts.statusActive");
  };

  return (
    <Section title={t("events.section.discounts")} hint={t("events.discounts.sectionHint")}>
      {status === "loading" ? (
        <p className="text-sm text-muted-foreground">{t("events.loading")}</p>
      ) : (
        <div className="space-y-4">
          {drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("events.discounts.none")}</p>
          ) : null}

          {drafts.map((draft) => (
            <div key={draft.key} className="rounded-xl border border-border p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {t("events.discounts.code")}
                  </span>
                  <input
                    className={inputClass}
                    value={draft.code}
                    onChange={(e) =>
                      update(draft.key, { code: e.target.value.toUpperCase().replace(/\s/g, "") })
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {t("events.discounts.type")}
                  </span>
                  <select
                    className={inputClass}
                    value={draft.discount_type}
                    onChange={(e) =>
                      update(draft.key, { discount_type: e.target.value as DiscountType })
                    }
                  >
                    <option value="percentage">{t("events.discounts.typePercentage")}</option>
                    <option value="fixed">{t("events.discounts.typeFixed")}</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {draft.discount_type === "percentage"
                      ? t("events.discounts.valuePercent")
                      : t("events.discounts.valueAmount")}
                  </span>
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={draft.value}
                    onChange={(e) => update(draft.key, { value: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {t("events.discounts.maxUses")}
                  </span>
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={draft.max_uses}
                    onChange={(e) =>
                      update(draft.key, { max_uses: e.target.value.replace(/\D/g, "") })
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {t("events.discounts.startsOn")}
                  </span>
                  <input
                    type="date"
                    className={inputClass}
                    value={draft.starts_on}
                    onChange={(e) => update(draft.key, { starts_on: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {t("events.discounts.expiresOn")}
                  </span>
                  <input
                    type="date"
                    className={inputClass}
                    value={draft.expires_on}
                    onChange={(e) => update(draft.key, { expires_on: e.target.value })}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {t("events.discounts.note")}
                  </span>
                  <input
                    className={inputClass}
                    value={draft.internal_note}
                    onChange={(e) => update(draft.key, { internal_note: e.target.value })}
                  />
                </label>
              </div>

              {tiers.length > 0 ? (
                <div className="mt-3">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {t("events.discounts.tiers")}
                  </span>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {tiers.map((tier) => (
                      <label key={tier.id} className="flex items-center gap-2 font-semibold">
                        <input
                          type="checkbox"
                          checked={draft.tier_ids.includes(tier.id)}
                          onChange={() => toggleTier(draft, tier.id)}
                        />
                        {tier.name}
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t("events.discounts.tiersHint")}
                  </p>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(e) => update(draft.key, { is_active: e.target.checked })}
                  />
                  {t("events.discounts.active")}
                </label>
                <label className="flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={draft.member_only}
                    onChange={(e) => update(draft.key, { member_only: e.target.checked })}
                  />
                  {t("events.discounts.memberOnly")}
                </label>
                <label className="flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={draft.is_archived}
                    onChange={(e) => update(draft.key, { is_archived: e.target.checked })}
                  />
                  {t("events.discounts.archived")}
                </label>
                <span className="text-muted-foreground">
                  {statusLabel(draft)} · {t("events.discounts.used")}: {draft.used_count}
                  {draft.max_uses ? ` / ${draft.max_uses}` : ""}
                </span>
                <button
                  type="button"
                  disabled={status === "saving" || !draft.code.trim()}
                  onClick={() => void save(draft)}
                  className="rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {status === "saving" ? t("events.saving") : t("events.discounts.save")}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(draft)}
                  className="rounded-full border border-border px-3 py-1 font-semibold hover:bg-secondary"
                >
                  {draft.used_count > 0
                    ? t("events.discounts.archive")
                    : t("events.discounts.remove")}
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setDrafts((prev) => [...prev, emptyDraft()])}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              {t("events.discounts.add")}
            </button>
            {message ? <span className="text-xs text-teal-foreground">{message}</span> : null}
            {error ? <span className="text-xs text-destructive">{error}</span> : null}
          </div>
        </div>
      )}
    </Section>
  );
}
