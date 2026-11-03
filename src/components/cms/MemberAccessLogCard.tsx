/**
 * Member data access trail (admin, Integration → Advanced and Setup).
 * Lists the latest 100 staff reads of member data: lists, CSV exports, detail
 * views, and throttled attempts. Entries are append-only and pruned after 12 months.
 */
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useCms } from "@/i18n/cms";
import { listMemberAccessLog } from "@/lib/members.functions";

const CARD = "rounded-2xl border border-border bg-card p-5";

type Row = Awaited<ReturnType<typeof listMemberAccessLog>>[number];

export function MemberAccessLogCard() {
  const { t } = useCms();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setRows(await listMemberAccessLog());
      } catch (err) {
        setError(err instanceof Error ? err.message : t("integration.accessLogError"));
      }
    })();
  }, [t]);

  const actionLabel = (action: string) => {
    const blocked = action.endsWith("_blocked");
    const base = action.replace(/_blocked$/, "");
    const label = t(`integration.accessLogAction.${base}`);
    return blocked ? `${label} · ${t("integration.accessLogBlocked")}` : label;
  };

  return (
    <section className={CARD}>
      <h3 className="flex items-center gap-2 font-heading text-lg">
        <ShieldCheck className="h-4 w-4" aria-hidden /> {t("integration.accessLogTitle")}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("integration.accessLogIntro")}</p>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {rows && rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("integration.accessLogEmpty")}</p>
      ) : null}
      {rows && rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-semibold">{t("integration.accessLogWhen")}</th>
                <th className="py-2 pr-3 font-semibold">{t("integration.accessLogWho")}</th>
                <th className="py-2 pr-3 font-semibold">{t("integration.accessLogWhat")}</th>
                <th className="py-2 font-semibold">{t("integration.accessLogRows")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3">{r.actor_email ?? r.actor_user_id.slice(0, 8)}</td>
                  <td
                    className={
                      "py-2 pr-3 " + (r.action.endsWith("_blocked") ? "text-destructive" : "")
                    }
                  >
                    {actionLabel(r.action)}
                  </td>
                  <td className="py-2">{r.row_count ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
