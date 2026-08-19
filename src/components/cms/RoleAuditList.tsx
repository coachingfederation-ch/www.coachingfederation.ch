/**
 * Role change history with filters and incremental paging.
 *
 * The screen shows the ten most recent changes; filters run in the database so
 * a search reaches the whole retained history, not just the loaded page.
 * Entries older than 24 months are archived by a nightly job.
 */
import { useEffect, useState } from "react";
import { listRoleGrantHistory } from "@/lib/roles.functions";
import type { GrantableRole } from "@/lib/role-model";

type AuditRow = Awaited<ReturnType<typeof listRoleGrantHistory>>["entries"][number];

const PAGE_SIZE = 10;

const ROLE_OPTIONS: { value: GrantableRole; labelKey: string }[] = [
  { value: "admin", labelKey: "roles.adminBadge" },
  { value: "administrator", labelKey: "roles.administratorBadge" },
  { value: "editor", labelKey: "roles.editorBadge" },
  { value: "organizer", labelKey: "roles.organizerBadge" },
  { value: "publisher", labelKey: "roles.publisherBadge" },
];

export function RoleAuditList({
  initialEntries,
  initialTotal,
  t,
}: {
  initialEntries: AuditRow[];
  initialTotal: number;
  t: (key: string) => string;
}) {
  const [entries, setEntries] = useState<AuditRow[]>(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"" | GrantableRole>("");
  const [action, setAction] = useState<"" | "granted" | "revoked">("");
  const [busy, setBusy] = useState(false);
  const [filtered, setFiltered] = useState(false);

  useEffect(() => {
    if (!filtered) {
      setEntries(initialEntries);
      setTotal(initialTotal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEntries, initialTotal]);

  const fetchPage = async (offset: number) => {
    setBusy(true);
    try {
      const result = await listRoleGrantHistory({
        data: {
          limit: PAGE_SIZE,
          offset,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(role ? { role } : {}),
          ...(action ? { action } : {}),
        },
      });
      setEntries((prev) => (offset === 0 ? result.entries : [...prev, ...result.entries]));
      setTotal(result.total);
    } finally {
      setBusy(false);
    }
  };

  // Any filter change restarts paging from the first page.
  const applyFilters = () => {
    const active = Boolean(search.trim() || role || action);
    setFiltered(active);
    void fetchPage(0);
  };

  const selectClass = "rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground";

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters();
          }}
          placeholder={t("roles.auditSearchPlaceholder")}
          aria-label={t("roles.auditSearchPlaceholder")}
          className="min-w-[14rem] flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "" | GrantableRole)}
          aria-label={t("roles.auditFilterRole")}
          className={selectClass}
        >
          <option value="">{t("roles.auditFilterRole")}</option>
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as "" | "granted" | "revoked")}
          aria-label={t("roles.auditFilterAction")}
          className={selectClass}
        >
          <option value="">{t("roles.auditFilterAction")}</option>
          <option value="granted">{t("roles.auditActionGranted")}</option>
          <option value="revoked">{t("roles.auditActionRevoked")}</option>
        </select>
        <button
          onClick={applyFilters}
          disabled={busy}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {t("roles.auditApplyFilter")}
        </button>
      </div>

      <ul className="mt-3 space-y-2 text-sm">
        {entries.length === 0 ? (
          <li className="text-muted-foreground">
            {filtered ? t("roles.auditNoMatches") : t("roles.auditEmpty")}
          </li>
        ) : (
          entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-border bg-card px-4 py-2 text-muted-foreground"
            >
              <span className="font-medium text-foreground">
                {entry.subjectName ?? entry.userId}
              </span>{" "}
              — {entry.role} {entry.action}
              {entry.actorName ? ` (${t("roles.auditBy")} ${entry.actorName})` : ""} ·{" "}
              {new Date(entry.createdAt).toLocaleString()}
            </li>
          ))
        )}
      </ul>

      <div className="mt-3 flex items-center gap-3">
        {entries.length < total ? (
          <button
            onClick={() => void fetchPage(entries.length)}
            disabled={busy}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            {t("roles.auditShowMore")}
          </button>
        ) : null}
        {total > 0 ? (
          <span className="text-xs text-muted-foreground">
            {t("roles.auditCount")
              .replace("{shown}", String(entries.length))
              .replace("{total}", String(total))}
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{t("roles.auditRetentionNote")}</p>
    </>
  );
}
