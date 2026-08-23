/**
 * CMS member directory route (/_staff/members).
 * Exports: Route. Renders the searchable list of chapter members,
 * their sync status, and directory eligibility.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { requireStaffAccess, ADMIN_ONLY } from "@/lib/staff-guard";
import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { useCms } from "@/i18n/cms";
import {
  exportMembersCsv,
  getClaimPilotMembers,
  getMemberClaimStatuses,
  listMembers,
  setClaimPilotMember,
} from "@/lib/members.functions";
import { directoryEligibilityReason } from "@/lib/directory-eligibility";

export const Route = createFileRoute("/_staff/members/")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, ADMIN_ONLY),
  head: () => ({
    meta: [
      { title: "Members — The Switzerland Chapter of ICF CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MembersPage,
});

type MemberRow = {
  id: string;
  cst_recno: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  credential_slug: string | null;
  credential_expires_on: string | null;
  activity_state: string;
  last_synced_at: string | null;
};

type MemberClaimStatus = "claimed" | "invited" | "expired" | "never";

type SortKey = keyof MemberRow | "claim_status" | "pilot";

const COLUMNS: { key: SortKey; labelKey: string }[] = [
  { key: "full_name", labelKey: "members.colName" },
  { key: "email", labelKey: "members.colEmail" },
  { key: "city", labelKey: "members.colCity" },
  { key: "credential_slug", labelKey: "members.colCredential" },
  { key: "activity_state", labelKey: "members.colState" },
  { key: "credential_expires_on", labelKey: "members.colEligibility" },
  { key: "claim_status", labelKey: "members.colClaim" },
  { key: "pilot", labelKey: "members.colPilot" },
  { key: "last_synced_at", labelKey: "members.colSynced" },
];

function MembersPage() {
  const { t } = useCms();
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const [claimStatuses, setClaimStatuses] = useState<Record<string, MemberClaimStatus>>({});
  // Pilot flag: members invited in the very first claim wave (board, volunteers).
  const [pilotIds, setPilotIds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({
    key: "full_name",
    asc: true,
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // Contact details are not readable by the browser client (column grants),
    // so the list is served by a staff-guarded server function.
    listMembers()
      .then((data) => setRows((data ?? []) as MemberRow[]))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  // Claim readiness is admin-only data; non-admin staff simply see "—".
  useEffect(() => {
    getMemberClaimStatuses()
      .then((data) => setClaimStatuses((data ?? {}) as Record<string, MemberClaimStatus>))
      .catch(() => setClaimStatuses({}));
  }, []);

  useEffect(() => {
    getClaimPilotMembers()
      .then((ids) => setPilotIds(new Set(ids as string[])))
      .catch(() => setPilotIds(new Set()));
  }, []);

  const togglePilot = async (memberId: string, pilot: boolean) => {
    setPilotIds((prev) => {
      const next = new Set(prev);
      if (pilot) next.add(memberId);
      else next.delete(memberId);
      return next;
    });
    try {
      await setClaimPilotMember({ data: { memberId, pilot } });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPilotIds((prev) => {
        const next = new Set(prev);
        if (pilot) next.delete(memberId);
        else next.add(memberId);
        return next;
      });
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (state !== "all" && row.activity_state !== state) return false;
      if (!q) return true;
      return [row.full_name, row.email, row.city, row.cst_recno]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
    return [...filtered].sort((a, b) => {
      const read = (row: MemberRow) =>
        sort.key === "claim_status"
          ? (claimStatuses[row.id] ?? "never")
          : sort.key === "pilot"
            ? pilotIds.has(row.id)
              ? "0"
              : "1"
            : String(row[sort.key as keyof MemberRow] ?? "");
      const av = read(a);
      const bv = read(b);
      return sort.asc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [rows, query, state, sort, claimStatuses, pilotIds]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const { csv, filename } = await exportMembersCsv();
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-10 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("members.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("members.subtitle")}</p>
          </div>
          <button
            onClick={() => void handleExport()}
            disabled={exporting}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
          >
            <Download className="mr-2 inline h-3.5 w-3.5" />
            {t("members.export")}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("members.searchPlaceholder")}
              aria-label={t("members.searchPlaceholder")}
              className="w-64 rounded-full border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            aria-label={t("members.colState")}
            className="rounded-full border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
          >
            {["all", "active", "grace", "anonymized"].map((value) => (
              <option key={value} value={value}>
                {t(`members.state.${value}`)}
              </option>
            ))}
          </select>
        </div>

        {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/60 text-xs text-muted-foreground">
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-4 py-2 font-semibold">
                    <button
                      onClick={() =>
                        setSort((prev) =>
                          prev.key === col.key
                            ? { key: col.key, asc: !prev.asc }
                            : { key: col.key, asc: true },
                        )
                      }
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      aria-label={t(col.labelKey)}
                    >
                      {t(col.labelKey)}
                      {sort.key === col.key ? (
                        <span aria-hidden>{sort.asc ? "▲" : "▼"}</span>
                      ) : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-6 text-muted-foreground">
                    {t("members.loading")}
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-6 text-muted-foreground">
                    {t("members.empty")}
                  </td>
                </tr>
              ) : (
                visible.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">
                      <Link
                        to="/members/$id"
                        params={{ id: row.id }}
                        className="underline-offset-2 hover:underline"
                      >
                        {row.full_name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{row.email ?? "—"}</td>
                    <td className="px-4 py-2">{row.city ?? "—"}</td>
                    <td className="px-4 py-2 uppercase">{row.credential_slug ?? "—"}</td>
                    <td className="px-4 py-2">{t(`members.state.${row.activity_state}`)}</td>
                    <td className="px-4 py-2">
                      {(() => {
                        // Eligibility is derived, never stored: membership and
                        // credential validity move independently in the feed.
                        const reason = directoryEligibilityReason(row);
                        return (
                          <span
                            className={
                              reason === "eligible"
                                ? "rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold"
                                : "rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive"
                            }
                          >
                            {t(`members.eligibility.${reason}`)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2">
                      {(() => {
                        const claim = claimStatuses[row.id] ?? "never";
                        return (
                          <span
                            className={
                              claim === "claimed"
                                ? "rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold"
                                : claim === "invited"
                                  ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                                  : "rounded-full px-2 py-0.5 text-xs font-semibold text-muted-foreground"
                            }
                          >
                            {t(`members.claim.${claim}`)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={pilotIds.has(row.id)}
                        onChange={(e) => void togglePilot(row.id, e.target.checked)}
                        aria-label={t("members.colPilot")}
                      />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {row.last_synced_at ? new Date(row.last_synced_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {visible.length} / {rows.length}
        </p>
      </div>
    </Shell>
  );
}
