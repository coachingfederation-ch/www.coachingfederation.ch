/**
 * Admin-only role administration.
 *
 * The manageable rights are the additive `editor`, `organizer` and `publisher`
 * grants on a claimed member: they add CMS capabilities and change nothing
 * about membership, the directory profile or Member Area access. The table is
 * an overview; assignment happens in the per-account detail panel. `admin` is
 * provisioned by migration and read-only here; `user` is dormant.
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireStaffAccess, ADMIN_ONLY } from "@/lib/staff-guard";
import { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { useCms } from "@/i18n/cms";
import { useMyRoles } from "@/lib/roles";
import { RoleTableRow } from "@/components/cms/RoleTableRow";
import { RoleDetailPanel } from "@/components/cms/RoleDetailPanel";
import { QaTestAccountPanel } from "@/components/cms/QaTestAccountPanel";
import {
  grantMemberRole,
  listRoleAdminData,
  revokeMemberRole,
  revokeAccountStaffRoles,
} from "@/lib/roles.functions";
import type { ManagedRole } from "@/lib/role-model";

export const Route = createFileRoute("/_staff/roles")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, ADMIN_ONLY),
  head: () => ({
    meta: [
      { title: "Roles — The Switzerland Chapter of ICF CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RolesPage,
});

type MemberRow = Awaited<ReturnType<typeof listRoleAdminData>>["members"][number];
type InternalRow = Awaited<ReturnType<typeof listRoleAdminData>>["internal"][number];
type AuditRow = Awaited<ReturnType<typeof listRoleAdminData>>["audit"][number];

function RolesPage() {
  const { t } = useCms();
  const { roles, loading: rolesLoading } = useMyRoles();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [internal, setInternal] = useState<InternalRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await listRoleAdminData();
      setMembers(data.members);
      setInternal(data.internal);
      setAudit(data.audit);
      setError(null);
    } catch {
      setError(t("roles.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async (row: MemberRow, role: ManagedRole) => {
    // Must cover every managed role explicitly: a fall-through default made
    // "administrator" read the publisher flag and revoke a grant that was
    // never held, which the server correctly rejects.
    const held =
      role === "administrator"
        ? row.isAdministrator
        : role === "editor"
          ? row.isEditor
          : role === "organizer"
            ? row.isOrganizer
            : row.isPublisher;
    setPending(`${row.memberId}:${role}`);
    try {
      if (held) await revokeMemberRole({ data: { memberId: row.memberId, role } });
      else await grantMemberRole({ data: { memberId: row.memberId, role } });
      await load();
    } catch {
      setError(t("roles.saveError"));
    } finally {
      setPending(null);
    }
  };

  /**
   * Clears editor + organizer in one action. Internal rows drop out of their
   * table entirely once the last privileged grant is gone, which is the point:
   * leftovers must not accumulate there.
   */
  const removeAccess = async (authUserId: string, name: string) => {
    if (!window.confirm(t("roles.removeConfirm").replace("{name}", name))) return;
    setPending(`account:${authUserId}`);
    try {
      await revokeAccountStaffRoles({ data: { authUserId } });
      await load();
    } catch {
      setError(t("roles.saveError"));
    } finally {
      setPending(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q),
    );
  }, [members, query]);

  const selected = useMemo(
    () => members.find((m) => m.memberId === selectedId) ?? null,
    [members, selectedId],
  );

  if (!rolesLoading && !roles.isAdmin) {
    return (
      <Shell>
        <div className="mx-auto max-w-3xl px-10 py-10 text-sm text-muted-foreground">
          {t("roles.adminOnly")}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-5xl px-10 py-10">
        <h1 className="text-2xl font-bold tracking-tight">{t("roles.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("roles.intro")}</p>

        {error ? (
          <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="relative mt-6 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("roles.searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm"
          />
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("roles.colName")}</th>
                <th className="px-4 py-3 font-semibold">{t("roles.colEmail")}</th>
                <th className="px-4 py-3 font-semibold">{t("roles.colLink")}</th>
                <th className="px-4 py-3 font-semibold">{t("roles.colAccess")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                    {t("roles.loading")}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                    {t("roles.empty")}
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <RoleTableRow
                    key={m.memberId}
                    member={m}
                    onOpen={(row) => setSelectedId(row.memberId)}
                    t={t}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {selected ? (
          <RoleDetailPanel
            member={selected}
            pending={pending}
            onToggle={toggle}
            onRemoveAccess={removeAccess}
            onClose={() => setSelectedId(null)}
            t={t}
          />
        ) : null}

        {/* Internal accounts: admins (and legacy staff roles) with no imported
            ICF member record. Read-only — admin is provisioned by migration and
            the database refuses to grant editor to a non-member. */}
        <h2 className="mt-10 text-lg font-semibold tracking-tight">{t("roles.internalTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("roles.internalIntro")}</p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("roles.colName")}</th>
                <th className="px-4 py-3 font-semibold">{t("roles.colEmail")}</th>
                <th className="px-4 py-3 font-semibold">{t("roles.colRoles")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                    {t("roles.loading")}
                  </td>
                </tr>
              ) : internal.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                    {t("roles.internalEmpty")}
                  </td>
                </tr>
              ) : (
                internal.map((a) => (
                  <tr key={a.authUserId} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{a.name ?? a.email ?? a.authUserId}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      {a.roles.map((role) => (
                        <span
                          key={role}
                          className="mr-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {role}
                        </span>
                      ))}
                    </td>
                    {/* Admin stays read-only; only the managed grants can go. */}
                    <td className="px-4 py-3 text-right">
                      {a.roles.some(
                        (r) => r === "editor" || r === "organizer" || r === "publisher",
                      ) ? (
                        <button
                          onClick={() =>
                            void removeAccess(a.authUserId, a.name ?? a.email ?? a.authUserId)
                          }
                          disabled={pending === `account:${a.authUserId}`}
                          className="rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          {t("roles.removeAccess")}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t("roles.adminNote")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <QaTestAccountPanel onProvisioned={() => void load()} />

        <h2 className="mt-10 text-lg font-semibold tracking-tight">{t("roles.auditTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("roles.auditIntro")}</p>
        <ul className="mt-3 space-y-2 text-sm">
          {audit.length === 0 ? (
            <li className="text-muted-foreground">{t("roles.auditEmpty")}</li>
          ) : (
            audit.map((entry) => (
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
      </div>
    </Shell>
  );
}
