/**
 * Attendee desk toolbar: search, the four operational filters, the door
 * counter and the day-of actions (add a comped seat, export, open the
 * scanner). Filtering is client-side because the attendee list is already
 * loaded in full for the event being edited.
 */
import * as React from "react";
import { Link } from "@tanstack/react-router";

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

export type AttendeeFilters = {
  search: string;
  status: string;
  payment: string;
  confirmation: string;
  tier: string;
  checkIn: string;
};

export const EMPTY_FILTERS: AttendeeFilters = {
  search: "",
  status: "all",
  payment: "all",
  confirmation: "all",
  tier: "all",
  checkIn: "all",
};

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function EventAttendeeToolbar({
  eventId,
  filters,
  setFilters,
  tiers,
  confirmed,
  checkedIn,
  capacity,
  onAdd,
  onExport,
  exporting,
  t,
}: {
  eventId: string;
  filters: AttendeeFilters;
  setFilters: (next: AttendeeFilters) => void;
  tiers: { id: string; name: string }[];
  confirmed: number;
  checkedIn: number;
  capacity: number | null;
  onAdd: () => void;
  onExport: () => void | Promise<void>;
  exporting: boolean;
  t: (k: string) => string;
}) {
  const patch = (next: Partial<AttendeeFilters>) => setFilters({ ...filters, ...next });

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            {checkedIn} / {confirmed}
          </span>{" "}
          {t("events.checkIn.counter")}
          {capacity ? ` · ${t("events.fieldCapacityShort")} ${capacity}` : ""}
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary"
          >
            {t("events.staffAdd.open")}
          </button>
          <button
            type="button"
            onClick={() => void onExport()}
            disabled={exporting}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
          >
            {exporting ? t("events.exporting") : t("events.exportCsv")}
          </button>
          <Link
            to="/manage/events/$id/check-in"
            params={{ id: eventId }}
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            {t("events.checkIn.open")}
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Labelled label={t("events.searchAttendees")}>
          <input
            type="search"
            className={inputClass}
            placeholder={t("events.searchAttendeesPlaceholder")}
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
          />
        </Labelled>
        <Labelled label={t("events.filterStatus")}>
          <select
            className={inputClass}
            value={filters.status}
            onChange={(e) => patch({ status: e.target.value })}
          >
            <option value="all">{t("events.filterAll")}</option>
            {["confirmed", "cancelled"].map((s) => (
              <option key={s} value={s}>
                {t(`events.regStatus.${s}`)}
              </option>
            ))}
          </select>
        </Labelled>
        <Labelled label={t("events.filterPayment")}>
          <select
            className={inputClass}
            value={filters.payment}
            onChange={(e) => patch({ payment: e.target.value })}
          >
            <option value="all">{t("events.filterAll")}</option>
            {["not_required", "pending", "paid", "expired"].map((s) => (
              <option key={s} value={s}>
                {t(`events.payStatus.${s}`)}
              </option>
            ))}
          </select>
        </Labelled>
        {tiers.length > 0 ? (
          <Labelled label={t("events.filterTier")}>
            <select
              className={inputClass}
              value={filters.tier}
              onChange={(e) => patch({ tier: e.target.value })}
            >
              <option value="all">{t("events.filterAll")}</option>
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name}
                </option>
              ))}
            </select>
          </Labelled>
        ) : null}
        <Labelled label={t("events.filterCheckIn")}>
          <select
            className={inputClass}
            value={filters.checkIn}
            onChange={(e) => patch({ checkIn: e.target.value })}
          >
            <option value="all">{t("events.filterAll")}</option>
            <option value="in">{t("events.checkIn.filterIn")}</option>
            <option value="out">{t("events.checkIn.filterOut")}</option>
          </select>
        </Labelled>
        <Labelled label={t("events.filterConfirmation")}>
          <select
            className={inputClass}
            value={filters.confirmation}
            onChange={(e) => patch({ confirmation: e.target.value })}
          >
            <option value="all">{t("events.filterAll")}</option>
            {["not_sent", "sending", "sent", "failed"].map((s) => (
              <option key={s} value={s}>
                {t(`events.confirmationStatus.${s}`)}
              </option>
            ))}
          </select>
        </Labelled>
      </div>
    </div>
  );
}

/** Shared matcher so the table and the counter never disagree. */
export function matchesFilters(
  r: {
    full_name: string;
    email: string;
    status: string;
    payment_status: string;
    confirmation_status?: string | null;
    tier_id?: string | null;
    checked_in_at?: string | null;
  },
  f: AttendeeFilters,
) {
  const q = f.search.trim().toLowerCase();
  if (q && !`${r.full_name} ${r.email}`.toLowerCase().includes(q)) return false;
  if (f.status !== "all" && r.status !== f.status) return false;
  if (f.payment !== "all" && r.payment_status !== f.payment) return false;
  if (f.confirmation !== "all" && (r.confirmation_status ?? "not_sent") !== f.confirmation)
    return false;
  if (f.tier !== "all" && (r.tier_id ?? "") !== f.tier) return false;
  if (f.checkIn === "in" && !r.checked_in_at) return false;
  if (f.checkIn === "out" && r.checked_in_at) return false;
  return true;
}
