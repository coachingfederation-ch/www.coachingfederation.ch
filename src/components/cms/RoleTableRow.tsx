/**
 * One member row in the roles overview table (src/routes/_staff/roles.tsx).
 *
 * The table is read-only on purpose: it shows *which* access rights an account
 * holds, while granting and revoking happens in the per-account detail panel.
 * That keeps the row readable as the number of rights grows.
 */
import { CalendarDays, ShieldCheck, Megaphone, SlidersHorizontal } from "lucide-react";
import type { listRoleAdminData } from "@/lib/roles.functions";

type MemberRow = Awaited<ReturnType<typeof listRoleAdminData>>["members"][number];

export function RoleTableRow({
  member: m,
  onOpen,
  t,
}: {
  member: MemberRow;
  onOpen: (row: MemberRow) => void;
  t: (k: string) => string;
}) {
  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3 font-medium">{m.name}</td>
      <td className="px-4 py-3 text-muted-foreground">{m.email ?? "—"}</td>
      {/* Claim linkage, the thing QA actually needs to verify:
          which imported record, and which auth identity. */}
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
        <div>ICF {m.cstRecno}</div>
        <div title={m.authUserId}>{m.authUserId.slice(0, 8)}…</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
            {t("roles.memberBadge")}
          </span>
          {m.isAdministrator ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t("roles.administratorBadge")}
            </span>
          ) : null}
          {m.isEditor ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("roles.editorBadge")}
            </span>
          ) : null}
          {m.isOrganizer ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-soft px-2.5 py-1 text-xs font-semibold text-teal-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {t("roles.organizerBadge")}
            </span>
          ) : null}
          {m.isPublisher ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/25 px-2.5 py-1 text-xs font-semibold text-foreground">
              <Megaphone className="h-3.5 w-3.5" />
              {t("roles.publisherBadge")}
            </span>
          ) : null}
          {/* Hybrid accounts (member + admin) are listed here, not
              under "Internal accounts" — the badge makes that legible. */}
          {m.isAdmin ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("roles.adminBadge")}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onOpen(m)}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
        >
          {t("roles.manage")}
        </button>
      </td>
    </tr>
  );
}
