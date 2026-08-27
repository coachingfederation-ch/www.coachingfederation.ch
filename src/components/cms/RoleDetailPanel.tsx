/**
 * Per-account detail view for the roles admin screen.
 *
 * Access rights are assigned here rather than in the table: each right is an
 * independent, additive grant, so a checklist reads better than a row of
 * buttons and stays legible as rights are added. Super Admin sits apart from
 * the four managed rights: it is full access, so it is styled as a distinct,
 * destructive-toned action and is blocked for your own account and for the
 * last remaining Super Admin (the database enforces both rules too).
 */
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Crown,
  Megaphone,
  ShieldCheck,
  SlidersHorizontal,
  UserPlus,
  X,
} from "lucide-react";
import { listAccountRoleAudit, type listRoleAdminData } from "@/lib/roles.functions";
import type { GrantableRole, ManagedRole } from "@/lib/role-model";

type MemberRow = Awaited<ReturnType<typeof listRoleAdminData>>["members"][number];
type AuditRow = Awaited<ReturnType<typeof listRoleAdminData>>["audit"][number];

const RIGHTS: { role: ManagedRole; labelKey: string; descKey: string; icon: typeof ShieldCheck }[] =
  [
    {
      role: "administrator",
      labelKey: "roles.administratorBadge",
      descKey: "roles.administratorDesc",
      icon: SlidersHorizontal,
    },
    {
      role: "editor",
      labelKey: "roles.editorBadge",
      descKey: "roles.editorDesc",
      icon: ShieldCheck,
    },
    {
      role: "organizer",
      labelKey: "roles.organizerBadge",
      descKey: "roles.organizerDesc",
      icon: CalendarDays,
    },
    {
      role: "publisher",
      labelKey: "roles.publisherBadge",
      descKey: "roles.publisherDesc",
      icon: Megaphone,
    },
    {
      role: "membership",
      labelKey: "roles.membershipBadge",
      descKey: "roles.membershipDesc",
      icon: UserPlus,
    },
  ];

function holds(member: MemberRow, role: ManagedRole): boolean {
  if (role === "administrator") return member.isAdministrator;
  if (role === "editor") return member.isEditor;
  if (role === "organizer") return member.isOrganizer;
  if (role === "publisher") return member.isPublisher;
  return member.isMembership;
}

export function RoleDetailPanel({
  member,
  pending,
  isSelf,
  isLastSuperAdmin,
  onToggle,
  onRemoveAccess,
  onClose,
  t,
}: {
  member: MemberRow;
  pending: string | null;
  isSelf: boolean;
  isLastSuperAdmin: boolean;
  onToggle: (row: MemberRow, role: GrantableRole) => void | Promise<void>;
  onRemoveAccess: (authUserId: string, name: string) => void | Promise<void>;
  onClose: () => void;
  t: (k: string) => string;
}) {
  const [audit, setAudit] = useState<AuditRow[]>([]);

  // The per-account history is what makes a grant auditable at the point of
  // decision, so it loads with the panel rather than living only in the
  // site-wide log further down the page.
  useEffect(() => {
    let active = true;
    void listAccountRoleAudit({ data: { authUserId: member.authUserId } })
      .then((res) => {
        if (active) setAudit(res.audit as AuditRow[]);
      })
      .catch(() => {
        if (active) setAudit([]);
      });
    return () => {
      active = false;
    };
  }, [member.authUserId, pending]);

  const hasAnyRight =
    member.isAdministrator ||
    member.isEditor ||
    member.isOrganizer ||
    member.isPublisher ||
    member.isMembership;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label={t("roles.close")}
        onClick={onClose}
        className="absolute inset-0 bg-foreground/30"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card p-6 shadow-xl">
        <button
          onClick={onClose}
          aria-label={t("roles.close")}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="pr-8 text-lg font-semibold tracking-tight">{member.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{member.email ?? "—"}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          ICF {member.cstRecno} · {member.authUserId.slice(0, 8)}… · {member.activityState}
        </p>

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("roles.rightsTitle")}
        </h3>

        {member.isAdmin ? (
          <p className="mt-3 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
            {t("roles.adminNote")}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {RIGHTS.map(({ role, labelKey, descKey, icon: Icon }) => {
              const on = holds(member, role);
              const busy = pending === `${member.memberId}:${role}`;
              return (
                <li key={role}>
                  <button
                    onClick={() => void onToggle(member, role)}
                    disabled={busy}
                    aria-pressed={on}
                    className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition disabled:opacity-50 ${
                      on ? "border-primary/40 bg-primary/5" : "border-border hover:bg-secondary/60"
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card"
                      }`}
                    >
                      {on ? <Icon className="h-3.5 w-3.5" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{t(labelKey)}</span>
                      <span className="block text-xs text-muted-foreground">{t(descKey)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Super Admin: full access, so it is separated from the scoped rights
            above and never silently bundled into "Remove access". */}
        <SuperAdminSwitch
          on={member.isAdmin}
          busy={pending === `${member.memberId}:admin`}
          disabledReason={
            isSelf
              ? t("roles.superAdminSelfHint")
              : member.isAdmin && isLastSuperAdmin
                ? t("roles.superAdminLastHint")
                : null
          }
          onToggle={() => void onToggle(member, "admin")}
          t={t}
        />

        {!member.isAdmin && hasAnyRight ? (
          <button
            onClick={() => void onRemoveAccess(member.authUserId, member.name)}
            disabled={pending === `account:${member.authUserId}`}
            className="mt-4 self-start rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            {t("roles.removeAccess")}
          </button>
        ) : null}

        <h3 className="mt-8 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("roles.accountAuditTitle")}
        </h3>
        <ul className="mt-3 space-y-2 text-sm">
          {audit.length === 0 ? (
            <li className="text-muted-foreground">{t("roles.auditEmpty")}</li>
          ) : (
            audit.map((entry) => (
              <li key={entry.id} className="text-muted-foreground">
                <span className="font-medium text-foreground">{entry.role}</span> {entry.action}
                {entry.actorName ? ` (${t("roles.auditBy")} ${entry.actorName})` : ""} ·{" "}
                {new Date(entry.createdAt).toLocaleString()}
              </li>
            ))
          )}
        </ul>
      </aside>
    </div>
  );
}

export function SuperAdminSwitch({
  on,
  busy,
  disabledReason,
  onToggle,
  t,
}: {
  on: boolean;
  busy: boolean;
  disabledReason: string | null;
  onToggle: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className="mt-4">
      <button
        onClick={onToggle}
        disabled={busy || disabledReason !== null}
        aria-pressed={on}
        className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition disabled:opacity-50 ${
          on ? "border-destructive/40 bg-destructive/5" : "border-border hover:bg-secondary/60"
        }`}
      >
        <span
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
            on ? "border-destructive bg-destructive text-white" : "border-border bg-card"
          }`}
        >
          {on ? <Crown className="h-3.5 w-3.5" /> : null}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{t("roles.adminBadge")}</span>
          <span className="block text-xs text-muted-foreground">{t("roles.superAdminDesc")}</span>
        </span>
      </button>
      {disabledReason ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{disabledReason}</p>
      ) : null}
    </div>
  );
}
