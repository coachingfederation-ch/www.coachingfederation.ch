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
import { MailCheck, Search, ShieldCheck, UserPlus } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { useCms } from "@/i18n/cms";
import { useMyRoles } from "@/lib/roles";
import { RoleTableRow } from "@/components/cms/RoleTableRow";
import { RoleDetailPanel, SuperAdminSwitch } from "@/components/cms/RoleDetailPanel";
import { QaTestAccountPanel } from "@/components/cms/QaTestAccountPanel";
import { RoleAuditList } from "@/components/cms/RoleAuditList";
import {
  grantMemberRole,
  listRoleAdminData,
  revokeMemberRole,
  revokeAccountStaffRoles,
  grantAccountRole,
  revokeAccountRole,
  inviteInternalAccount,
  resendInternalInvitation,
  withdrawInternalInvitation,
} from "@/lib/roles.functions";
import { GRANTABLE_ROLES, type GrantableRole } from "@/lib/role-model";


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
  const [auditTotal, setAuditTotal] = useState(0);
  const [superAdminCount, setSuperAdminCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<GrantableRole | "">("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await listRoleAdminData();
      setMembers(data.members);
      setInternal(data.internal);
      setAudit(data.audit);
      setAuditTotal(data.auditTotal);
      setSuperAdminCount(data.superAdminCount);
      setCurrentUserId(data.currentUserId);
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

  const toggle = async (row: MemberRow, role: GrantableRole) => {
    // Must cover every managed role explicitly: a fall-through default made
    // "administrator" read the publisher flag and revoke a grant that was
    // never held, which the server correctly rejects.
    const held =
      role === "admin"
        ? row.isAdmin
        : role === "administrator"
          ? row.isAdministrator
          : role === "editor"
            ? row.isEditor
            : role === "organizer"
              ? row.isOrganizer
              : row.isPublisher;
    // Full access is never granted or removed on a single stray click.
    if (role === "admin" && !confirmSuperAdmin(held, row.name)) return;
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

  const confirmSuperAdmin = (held: boolean, name: string) =>
    window.confirm(
      t(held ? "roles.superAdminRevokeConfirm" : "roles.superAdminGrantConfirm").replace(
        "{name}",
        name,
      ),
    );

  /**
   * Super Admin for an internal account — keyed by auth user id, because those
   * accounts have no imported member record to address.
   */
  const toggleAccountSuperAdmin = async (authUserId: string, name: string, held: boolean) => {
    if (!confirmSuperAdmin(held, name)) return;
    setPending(`account:${authUserId}:admin`);
    try {
      if (held) await revokeAccountRole({ data: { authUserId, role: "admin" } });
      else await grantAccountRole({ data: { authUserId, role: "admin" } });
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

  /** Invites a staff account that has no imported ICF member record. */
  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteBusy(true);
    setError(null);
    try {
      await inviteInternalAccount({
        data: {
          email: inviteEmail.trim(),
          displayName: inviteName.trim(),
          ...(inviteRole ? { role: inviteRole } : {}),
        },
      });
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("");
      setNotice(t("roles.inviteSent"));
      await load();
    } catch {
      setError(t("roles.inviteError"));
    } finally {
      setInviteBusy(false);
    }
  };

  const resendInvite = async (authUserId: string) => {
    setPending(`account:${authUserId}:invite`);
    setError(null);
    try {
      await resendInternalInvitation({ data: { authUserId } });
      setNotice(t("roles.inviteSent"));
    } catch {
      setError(t("roles.inviteError"));
    } finally {
      setPending(null);
    }
  };

  const withdrawInvite = async (authUserId: string, name: string) => {
    if (!window.confirm(t("roles.withdrawConfirm").replace("{name}", name))) return;
    setPending(`account:${authUserId}:invite`);
    try {
      await withdrawInternalInvitation({ data: { authUserId } });
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

        {notice ? (
          <div className="mt-4 rounded-lg border border-border bg-secondary px-4 py-2 text-sm">
            {notice}
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
            isSelf={selected.authUserId === currentUserId}
            isLastSuperAdmin={superAdminCount <= 1}
            onToggle={toggle}
            onRemoveAccess={removeAccess}
            onClose={() => setSelectedId(null)}
            t={t}
          />
        ) : null}

        {/* Internal accounts: admins (and legacy staff roles) with no imported
            ICF member record. Read-only — admin is provisioned by migration and
            the database refuses to grant editor to a non-member. */}
        <div className="mt-10 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{t("roles.internalTitle")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("roles.internalIntro")}
            </p>
          </div>
          <button
            onClick={() => {
              setNotice(null);
              setInviteOpen((open) => !open);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {t("roles.inviteCta")}
          </button>
        </div>

        {inviteOpen ? (
          <form
            onSubmit={sendInvite}
            className="mt-4 rounded-2xl border border-border bg-card p-5"
          >
            <h3 className="text-sm font-semibold">{t("roles.inviteTitle")}</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("roles.inviteIntro")}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block font-semibold">{t("roles.inviteName")}</span>
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                  minLength={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold">{t("roles.inviteEmail")}</span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold">{t("roles.inviteRole")}</span>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as GrantableRole | "")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("roles.inviteRoleNone")}</option>
                  {GRANTABLE_ROLES.filter((role) => role !== "admin").map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={inviteBusy}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {inviteBusy ? t("roles.inviteSending") : t("roles.inviteSend")}
              </button>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
              >
                {t("roles.inviteCancel")}
              </button>
            </div>
          </form>
        ) : null}
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
                internal.map((a: InternalRow) => (
                  <tr key={a.authUserId} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">
                      {a.name ?? a.email ?? a.authUserId}
                      {a.pending ? (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-highlight px-2 py-0.5 text-xs font-semibold text-highlight-foreground">
                          <MailCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          {t("roles.pendingBadge")}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      {a.roles.map((role: string) => (
                        <span
                          key={role}
                          className="mr-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {role}
                        </span>
                      ))}
                    </td>
                    {/* Super Admin is now assignable here; the scoped grants
                        still require a claim-linked member record. */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-2">
                        <div className="w-full max-w-xs">
                          <SuperAdminSwitch
                            on={a.roles.includes("admin")}
                            busy={pending === `account:${a.authUserId}:admin`}
                            disabledReason={
                              a.authUserId === currentUserId
                                ? t("roles.superAdminSelfHint")
                                : a.roles.includes("admin") && superAdminCount <= 1
                                  ? t("roles.superAdminLastHint")
                                  : null
                            }
                            onToggle={() =>
                              void toggleAccountSuperAdmin(
                                a.authUserId,
                                a.name ?? a.email ?? a.authUserId,
                                a.roles.includes("admin"),
                              )
                            }
                            t={t}
                          />
                        </div>
                        {a.pending ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => void resendInvite(a.authUserId)}
                              disabled={pending === `account:${a.authUserId}:invite`}
                              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                            >
                              {t("roles.resend")}
                            </button>
                            <button
                              onClick={() =>
                                void withdrawInvite(
                                  a.authUserId,
                                  a.name ?? a.email ?? a.authUserId,
                                )
                              }
                              disabled={pending === `account:${a.authUserId}:invite`}
                              className="rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                            >
                              {t("roles.withdraw")}
                            </button>
                          </div>
                        ) : null}
                        {a.roles.some(
                          (r: string) => r === "editor" || r === "organizer" || r === "publisher",
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
                        ) : null}
                      </div>
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
        <RoleAuditList initialEntries={audit} initialTotal={auditTotal} t={t} />
      </div>
    </Shell>
  );
}
