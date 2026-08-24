/**
 * Events CMS listing route (/_staff/manage/events).
 * Exports: Route. Renders the administrative workspace for creating,
 * publishing, and managing chapter events.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { requireStaffAccess, EVENT_ROLES } from "@/lib/staff-guard";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus, X } from "lucide-react";
import { Checkbox } from "@/design-system/icf-welcome-design-system-a835df";
import { Shell } from "@/components/cms/Shell";
import { useCms } from "@/i18n/cms";
import { listManagedEvents } from "@/lib/events-admin.functions";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  category: fallback(z.string(), "").default(""),
  community: fallback(z.string(), "").default(""),
  host: fallback(z.string(), "").default(""),
  city: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "").default(""),
  page: fallback(z.number().int(), 1).default(1),
});

const PAGE_SIZE = 25;
const ONLINE_CITY = "__online__";

export const Route = createFileRoute("/_staff/manage/events/")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, EVENT_ROLES),
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Events — The Switzerland Chapter of ICF CMS" },
      {
        name: "description",
        content: "Create, publish and manage The Switzerland Chapter of ICF events and RSVPs.",
      },
      { property: "og:title", content: "Events — The Switzerland Chapter of ICF CMS" },
      {
        property: "og:description",
        content: "Create, publish and manage The Switzerland Chapter of ICF events and RSVPs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ManageEventsPage,
});

type Row = Awaited<ReturnType<typeof listManagedEvents>>[number];

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-warn-soft text-[color:var(--warn)]",
  published: "bg-teal-soft text-teal-foreground",
  cancelled: "bg-secondary text-muted-foreground",
  archived: "bg-secondary text-muted-foreground",
};

type EventsSearch = z.infer<typeof searchSchema>;

const FILTER_STORE_KEY = "cms.manage-events.filters";

const isPristine = (s: EventsSearch) =>
  !s.q && !s.category && !s.community && !s.host && !s.city && !s.status && s.page === 1;

function ManageEventsPage() {
  const { t } = useCms();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listManagedEvents()
      .then(setRows)
      .catch(() => setError(t("events.loadError")));
  }, [t]);

  // Coming back from an event detail lands here without search params, which
  // would silently drop the filter set. The last used filters are kept for the
  // browser session and restored when the URL carries none of its own.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (restored) return;
    setRestored(true);
    if (!isPristine(search)) return;
    try {
      const raw = sessionStorage.getItem(FILTER_STORE_KEY);
      if (!raw) return;
      const stored = searchSchema.parse(JSON.parse(raw));
      if (isPristine(stored)) return;
      void navigate({ to: "/manage/events", search: stored, replace: true });
    } catch {
      /* a corrupt entry simply means "no saved filters" */
    }
    // Runs once per mount; `search` is only read for its initial value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored]);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(FILTER_STORE_KEY, JSON.stringify(search));
    } catch {
      /* private mode without storage: filters just aren't remembered */
    }
  }, [search, restored]);

  /** Every filter change also resets paging, so results are never off-screen. */
  const setFilter = (patch: Record<string, string | number>) =>
    void navigate({
      to: "/manage/events",
      search: (prev) => ({ ...prev, page: 1, ...patch }),
      replace: true,
    });

  const options = useMemo(() => {
    const categories = new Map<string, string>();
    const communities = new Map<string, string>();
    const hosts = new Map<string, string>();
    const cities = new Set<string>();
    let hasOnline = false;
    for (const row of rows ?? []) {
      if (row.category_id && row.category_name) categories.set(row.category_id, row.category_name);
      if (row.community_id && row.community_name)
        communities.set(row.community_id, row.community_name);
      for (const host of row.hosts) hosts.set(host.id, host.name);
      // Events without a city — and the handful typed literally as "Online" —
      // collapse into a single "Online" option so the list has no duplicates.
      if (row.city && row.city.trim().toLowerCase() !== "online") cities.add(row.city);
      else hasOnline = true;
    }
    const byLabel = (a: [string, string], b: [string, string]) => a[1].localeCompare(b[1]);
    return {
      categories: [...categories.entries()].sort(byLabel),
      communities: [...communities.entries()].sort(byLabel),
      hosts: [...hosts.entries()].sort(byLabel),
      cities: [...cities].sort((a, b) => a.localeCompare(b)),
      hasOnline,
    };
  }, [rows]);

  // Status is an *exclusion* filter: the `status` search param holds a
  // comma-separated list of statuses to hide. Empty means show everything —
  // every status is active by default, so the list never starts filtered.
  const excludedStatuses = search.status
    ? search.status.split(",").filter(Boolean)
    : [];

  const filtered = useMemo(() => {
    const term = search.q.trim().toLowerCase();
    return (rows ?? [])
      .filter((row) => {
        if (term && !row.title.toLowerCase().includes(term)) return false;
        if (search.category && row.category_id !== search.category) return false;
        if (search.community && row.community_id !== search.community) return false;
        if (search.host && !row.hosts.some((h) => h.id === search.host)) return false;
        if (search.city) {
          const isOnline = !row.city || row.city.trim().toLowerCase() === "online";
          if (search.city === ONLINE_CITY ? !isOnline : row.city !== search.city) return false;
        }
        if (excludedStatuses.includes(row.status)) return false;
        return true;
      })
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [rows, search, excludedStatuses]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, search.page), pageCount);
  const start = (page - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const hasFilters = Boolean(
    search.q || search.category || search.community || search.host || search.city || search.status,
  );

  // Creating an event runs through the guided wizard at /manage/events/new,
  // which writes the row once every branching question is answered.

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-10 py-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("events.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("events.intro")}</p>
          </div>
          <button
            onClick={() => void navigate({ to: "/manage/events/new" })}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {t("events.new")}
          </button>
        </header>

        {error ? (
          <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("events.filters.search")}
              </span>
              <input
                type="search"
                value={search.q}
                onChange={(e) => setFilter({ q: e.target.value })}
                placeholder={t("events.filters.searchPlaceholder")}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm"
              />
            </label>

            <FilterSelect
              label={t("events.filters.category")}
              allLabel={t("events.filters.allCategories")}
              value={search.category}
              onChange={(v) => setFilter({ category: v })}
              options={options.categories}
            />
            <FilterSelect
              label={t("events.filters.community")}
              allLabel={t("events.filters.allCommunities")}
              value={search.community}
              onChange={(v) => setFilter({ community: v })}
              options={options.communities}
            />
            <FilterSelect
              label={t("events.filters.host")}
              allLabel={t("events.filters.allHosts")}
              value={search.host}
              onChange={(v) => setFilter({ host: v })}
              options={options.hosts}
            />
            <FilterSelect
              label={t("events.filters.city")}
              allLabel={t("events.filters.allCities")}
              value={search.city}
              onChange={(v) => setFilter({ city: v })}
              options={[
                ...options.cities.map((c) => [c, c] as [string, string]),
                ...(options.hasOnline
                  ? [[ONLINE_CITY, t("events.onlineLabel")] as [string, string]]
                  : []),
              ]}
            />
            <StatusFilter
              label={t("events.colStatus")}
              excluded={excludedStatuses}
              onToggle={(status, active) => {
                const next = active
                  ? excludedStatuses.filter((s) => s !== status)
                  : [...excludedStatuses, status];
                setFilter({ status: next.join(",") });
              }}
              options={["draft", "published", "cancelled"].map(
                (s) => [s, t(`events.status.${s}`)] as [string, string],
              )}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{t("events.filters.count").replace("{count}", String(filtered.length))}</span>
            {hasFilters ? (
              <button
                type="button"
                onClick={() =>
                  void navigate({
                    to: "/manage/events",
                    search: {
                      q: "",
                      category: "",
                      community: "",
                      host: "",
                      city: "",
                      status: "",
                      page: 1,
                    },
                    replace: true,
                  })
                }
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary/60"
              >
                <X className="h-3.5 w-3.5" />
                {t("events.filters.clear")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("events.colTitle")}</th>
                <th className="px-4 py-3 font-semibold">{t("events.colWhen")}</th>
                <th className="px-4 py-3 font-semibold">{t("events.colWhere")}</th>
                <th className="px-4 py-3 font-semibold">{t("events.filters.category")}</th>
                <th className="px-4 py-3 font-semibold">{t("events.filters.community")}</th>
                <th className="px-4 py-3 font-semibold">{t("events.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {rows === null ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-muted-foreground">
                    {t("events.loading")}
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-muted-foreground">
                    {hasFilters ? t("events.filters.noMatches") : t("events.empty")}
                  </td>
                </tr>
              ) : (
                visible.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() =>
                      void navigate({ to: "/manage/events/$id", params: { id: row.id } })
                    }
                    className="cursor-pointer border-t border-border hover:bg-secondary/40"
                  >
                    <td className="px-4 py-3 font-medium">
                      {row.title}
                      {row.is_internal ? (
                        <span className="ml-2 inline-flex rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                          {t("events.tag.membersOnly")}
                        </span>
                      ) : null}
                      {row.series_id ? (
                        <span className="ml-2 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {t("events.repeat.badge")}
                        </span>
                      ) : null}
                      {row.hosts.length ? (
                        <span className="mt-1 block text-xs font-normal text-muted-foreground">
                          {row.hosts.map((h) => h.name).join(", ")}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(row.starts_at).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: row.timezone ?? "Europe/Zurich",
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {[row.venue_name, row.city].filter(Boolean).join(", ") ||
                        t("events.onlineLabel")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.category_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.community_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[row.status] ?? ""}`}
                      >
                        {t(`events.status.${row.status}`)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > PAGE_SIZE ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {t("events.pagination.range")
                .replace("{from}", String(start + 1))
                .replace("{to}", String(Math.min(start + PAGE_SIZE, filtered.length)))
                .replace("{total}", String(filtered.length))}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  void navigate({
                    to: "/manage/events",
                    search: (prev) => ({ ...prev, page: page - 1 }),
                    replace: true,
                  })
                }
                className="rounded-full border border-border px-3 py-1.5 font-semibold disabled:opacity-40"
              >
                {t("events.pagination.previous")}
              </button>
              <span className="text-muted-foreground">
                {t("events.pagination.page")
                  .replace("{page}", String(page))
                  .replace("{pages}", String(pageCount))}
              </span>
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() =>
                  void navigate({
                    to: "/manage/events",
                    search: (prev) => ({ ...prev, page: page + 1 }),
                    replace: true,
                  })
                }
                className="rounded-full border border-border px-3 py-1.5 font-semibold disabled:opacity-40"
              >
                {t("events.pagination.next")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}

function StatusFilter({
  label,
  excluded,
  onToggle,
  options,
}: {
  label: string;
  excluded: string[];
  onToggle: (status: string, active: boolean) => void;
  options: [string, string][];
}) {
  return (
    <fieldset className="flex min-w-[150px] flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-3">
        {options.map(([status, name]) => {
          const active = !excluded.includes(status);
          return (
            <label key={status} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                checked={active}
                onCheckedChange={(checked) => onToggle(status, checked === true)}
              />
              {name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function FilterSelect({
  label,
  allLabel,
  value,
  onChange,
  options,
}: {
  label: string;
  allLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  if (options.length === 0) return null;
  return (
    <label className="flex min-w-[150px] flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full border border-border bg-background px-4 py-2 text-sm"
      >
        <option value="">{allLabel}</option>
        {options.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
