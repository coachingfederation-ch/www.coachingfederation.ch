/**
 * Ticket tier management for the event editor.
 *
 * Prices are entered in whole currency units and stored in cents. Sold counts
 * come from the server, and a tier that already sold seats is deactivated
 * rather than deleted so past registrations keep their price history.
 */
import { useEffect, useState } from "react";
import { Section, inputClass } from "./EventEditorSections";
import { listEventTiers, saveEventTiers } from "@/lib/events-admin.functions";
import { translateTierNames } from "@/lib/tier-translations.functions";
import type { TierSegment } from "@/lib/tickets";

type Tier = Awaited<ReturnType<typeof listEventTiers>>[number];

type Draft = {
  id: string | null;
  key: string;
  name: string;
  name_de: string;
  name_fr: string;
  name_it: string;
  description: string;
  price: string;
  currency: "CHF" | "EUR";
  capacity: string;
  segment: TierSegment;
  is_active: boolean;
  sold: number;
};

const toDraft = (tier: Tier): Draft => ({
  id: tier.id,
  key: tier.id,
  name: tier.name ?? "",
  name_de: tier.name_de ?? "",
  name_fr: tier.name_fr ?? "",
  name_it: tier.name_it ?? "",
  description: tier.description ?? "",
  price: (tier.price_cents / 100).toFixed(2),
  currency: (tier.currency as "CHF" | "EUR") ?? "CHF",
  capacity: tier.capacity === null ? "" : String(tier.capacity),
  segment: tier.segment as TierSegment,
  is_active: tier.is_active,
  sold: tier.sold_count,
});

const emptyDraft = (segment: TierSegment): Draft => ({
  id: null,
  key: `new-${Math.random().toString(36).slice(2)}`,
  name: "",
  name_de: "",
  name_fr: "",
  name_it: "",
  description: "",
  price: "0.00",
  currency: "CHF",
  capacity: "",
  segment,
  is_active: true,
  sold: 0,
});

export function EventTicketsSection({
  eventId,
  t,
}: {
  eventId: string;
  t: (key: string) => string;
}) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "translating">("loading");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const rows = await listEventTiers({ data: { eventId } });
    setDrafts(rows.map(toDraft));
    setStatus("ready");
  };

  useEffect(() => {
    load().catch(() => {
      setError(t("events.tickets.loadError"));
      setStatus("ready");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const update = (key: string, next: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...next } : d)));

  const move = (index: number, delta: number) =>
    setDrafts((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row!);
      return next;
    });

  const save = async () => {
    setError(null);
    setMessage(null);
    let rows = drafts;
    // Auto-fill missing DE/FR/IT names before saving; they stay editable after.
    const missing = rows.filter(
      (d) => d.name.trim() && (!d.name_de.trim() || !d.name_fr.trim() || !d.name_it.trim()),
    );
    if (missing.length > 0) {
      setStatus("translating");
      try {
        const translated = await translateTierNames({
          data: { names: missing.map((d) => d.name.trim()) },
        });
        const byKey = new Map(missing.map((d, i) => [d.key, translated[i]!]));
        rows = rows.map((d) => {
          const hit = byKey.get(d.key);
          if (!hit) return d;
          return {
            ...d,
            name_de: d.name_de.trim() || hit.de,
            name_fr: d.name_fr.trim() || hit.fr,
            name_it: d.name_it.trim() || hit.it,
          };
        });
        setDrafts(rows);
      } catch (e) {
        // Translation is a convenience — never block the save on it.
        setError(e instanceof Error ? e.message : t("events.tickets.translateError"));
      }
    }
    setStatus("saving");
    try {
      await saveEventTiers({
        data: {
          eventId,
          tiers: rows.map((d, index) => ({
            id: d.id,
            name: d.name.trim(),
            name_de: d.name_de.trim() || null,
            name_fr: d.name_fr.trim() || null,
            name_it: d.name_it.trim() || null,
            description: d.description.trim() || null,
            price_cents: Math.round(Number(d.price.replace(",", ".") || "0") * 100),
            currency: d.currency,
            capacity: d.capacity ? Number(d.capacity) : null,
            segment: d.segment,
            is_active: d.is_active,
            sort_order: index,
          })),
        },
      });
      await load();
      setMessage(t("events.tickets.saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.tickets.saveError"));
    } finally {
      setStatus("ready");
    }
  };

  return (
    <Section title={t("events.section.tickets")} hint={t("events.tickets.sectionHint")}>
      {status === "loading" ? (
        <p className="text-sm text-muted-foreground">{t("events.loading")}</p>
      ) : (
        <div className="space-y-4">
          {drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("events.tickets.none")}</p>
          ) : null}
          {drafts.map((draft, index) => (
            <div key={draft.key} className="rounded-xl border border-border p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {t("events.tickets.nameEn")}
                  </span>
                  <input
                    className={inputClass}
                    value={draft.name}
                    onChange={(e) => update(draft.key, { name: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {t("events.tickets.segment")}
                  </span>
                  <select
                    className={inputClass}
                    value={draft.segment}
                    onChange={(e) => update(draft.key, { segment: e.target.value as TierSegment })}
                  >
                    <option value="member">{t("events.tickets.segmentMember")}</option>
                    <option value="non_member">{t("events.tickets.segmentNonMember")}</option>
                    <option value="general">{t("events.tickets.segmentGeneral")}</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {t("events.tickets.price")}
                  </span>
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={draft.price}
                    onChange={(e) => update(draft.key, { price: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {t("events.tickets.currency")}
                  </span>
                  <select
                    className={inputClass}
                    value={draft.currency}
                    onChange={(e) =>
                      update(draft.key, { currency: e.target.value as "CHF" | "EUR" })
                    }
                  >
                    <option value="CHF">CHF</option>
                    <option value="EUR">EUR</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {t("events.tickets.capacity")}
                  </span>
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={draft.capacity}
                    onChange={(e) =>
                      update(draft.key, { capacity: e.target.value.replace(/\D/g, "") })
                    }
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {t("events.tickets.description")}
                  </span>
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={draft.description}
                    onChange={(e) => update(draft.key, { description: e.target.value })}
                  />
                </label>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {(["de", "fr", "it"] as const).map((loc) => (
                  <label key={loc} className="block">
                    <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                      {t("events.tickets.name")} · {loc.toUpperCase()}
                    </span>
                    <input
                      className={inputClass}
                      value={draft[`name_${loc}` as const]}
                      onChange={(e) => update(draft.key, { [`name_${loc}`]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(e) => update(draft.key, { is_active: e.target.checked })}
                  />
                  {t("events.tickets.active")}
                </label>
                <span className="text-muted-foreground">
                  {t("events.tickets.sold")}: {draft.sold}
                  {draft.capacity ? ` / ${draft.capacity}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  className="rounded-full border border-border px-3 py-1 font-semibold hover:bg-secondary"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  className="rounded-full border border-border px-3 py-1 font-semibold hover:bg-secondary"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => setDrafts((prev) => prev.filter((row) => row.key !== draft.key))}
                  className="rounded-full border border-border px-3 py-1 font-semibold hover:bg-secondary"
                >
                  {t("events.tickets.remove")}
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setDrafts((prev) => [...prev, emptyDraft("non_member")])}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              {t("events.tickets.add")}
            </button>
            <button
              type="button"
              onClick={() => setDrafts((prev) => [...prev, emptyDraft("member")])}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              {t("events.tickets.addMember")}
            </button>
            <button
              type="button"
              disabled={status === "saving" || status === "translating"}
              onClick={() => void save()}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {status === "translating"
                ? t("events.tickets.translating")
                : status === "saving"
                  ? t("events.saving")
                  : t("events.tickets.save")}
            </button>
            {message ? <span className="text-xs text-teal-foreground">{message}</span> : null}
            {error ? <span className="text-xs text-destructive">{error}</span> : null}
          </div>
        </div>
      )}
    </Section>
  );
}
