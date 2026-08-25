/**
 * Imported-record + eligibility panel for src/routes/_staff/members.$id.tsx.
 * Shows the read-only synced fields and the directory eligibility flags.
 */
import { Check, X } from "lucide-react";
import type { getMemberDetail } from "@/lib/members.functions";
import {
  directoryEligibilityReason,
  hasDirectoryCredential,
  isActiveMember,
  isDirectoryEligible,
  isDirectoryVisible,
  type MemberVisibility,
} from "@/lib/directory-eligibility";

type Detail = Awaited<ReturnType<typeof getMemberDetail>>;

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}

function Flag({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {on ? (
        <Check className="h-4 w-4 text-primary" aria-hidden />
      ) : (
        <X className="h-4 w-4 text-destructive" aria-hidden />
      )}
      <span>{label}</span>
    </div>
  );
}

export function MemberSyncStatusPanel({
  detail,
  address,
  visibility,
  t,
}: {
  detail: Detail;
  address: string;
  visibility: MemberVisibility | null;
  t: (k: string) => string;
}) {
  const rules = { allowNonCredentialed: detail.allowNonCredentialed };
  const reason = directoryEligibilityReason(detail.member, rules);
  return (
    <>
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">{t("members.detail.importedTitle")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("members.detail.importedNote")}</p>
        <dl className="mt-3 text-sm">
          <Row label={t("members.detail.recno")} value={detail.member.cst_recno} />
          <Row label={t("members.colEmail")} value={detail.member.email} />
          <Row label={t("members.detail.phone")} value={detail.member.phone} />
          <Row label={t("members.detail.address")} value={address} />
          <Row label={t("members.colCredential")} value={detail.member.credential_slug} />
          <Row label={t("members.detail.awarded")} value={detail.member.credential_awarded_on} />
          <Row
            label={t("members.detail.credExpires")}
            value={detail.member.credential_expires_on}
          />
          <Row label={t("members.detail.memberType")} value={detail.member.member_type} />
          <Row label={t("members.detail.joined")} value={detail.member.membership_join_date} />
          <Row
            label={t("members.detail.expires")}
            value={detail.member.membership_expiration_date}
          />
          <Row
            label={t("members.colState")}
            value={t(`members.state.${detail.member.activity_state}`)}
          />
          <Row
            label={t("members.colSynced")}
            value={
              detail.member.last_synced_at
                ? new Date(detail.member.last_synced_at).toLocaleString()
                : null
            }
          />
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">{t("members.detail.addressNote")}</p>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">{t("members.detail.eligibilityTitle")}</h2>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <Flag label={t("members.detail.isActiveMember")} on={isActiveMember(detail.member)} />
          <Flag
            label={t("members.detail.hasCredential")}
            on={hasDirectoryCredential(detail.member)}
          />
          <Flag
            label={t("members.detail.isEligible")}
            on={isDirectoryEligible(detail.member, rules)}
          />
          <Flag
            label={t("members.detail.isVisible")}
            on={isDirectoryVisible(detail.member, visibility, rules)}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t(`members.eligibility.${reason}`)}</p>
      </section>
    </>
  );
}
