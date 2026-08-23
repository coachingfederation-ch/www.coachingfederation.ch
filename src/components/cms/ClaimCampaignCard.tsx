/**
 * Claim invitation campaign card for /integration.
 * Exports: ClaimCampaignCard. Shows wave progress and gives admins start,
 * pause, cap and reminder controls plus a manual "release today's wave".
 *
 * The card only mirrors state: the wave engine enforces the daily cap, the
 * once-per-day rule and the release gates server-side, so a blocked campaign
 * shows a readable reason here rather than failing on click.
 */
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Button, Checkbox, Input } from "@/design-system/icf-welcome-design-system-a835df";
import {
  getClaimCampaign,
  releaseClaimWave,
  updateClaimCampaign,
} from "@/lib/members.functions";

type Overview = Awaited<ReturnType<typeof getClaimCampaign>>;

const CARD = "rounded-2xl border border-border bg-card p-5";
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function ClaimCampaignCard({ t }: { t: (key: string) => string }) {
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const load = async () => {
    try {
      setData(await getClaimCampaign());
    } catch (err) {
      setFailure(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setFailure(null);
    setNote(null);
    try {
      setNote(await fn());
    } catch (err) {
      setFailure(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      await load();
    }
  };

  if (!data) {
    return (
      <section className={CARD}>
        <h2 className="text-sm font-bold">{t("integration.campaignTitle")}</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          {failure ?? t("integration.campaignLoading")}
        </p>
      </section>
    );
  }

  const { campaign } = data;
  const blocked = data.gateReason
    ? t(`integration.campaignGate.${data.gateReason}`)
    : data.emailGate === "redirected"
      ? `${t("integration.campaignRedirected")} ${data.redirectTo ?? ""}`
      : null;
  const canSend = data.gateReason === null;

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">{t("integration.campaignTitle")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("integration.campaignBody")}</p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
          {t(`integration.campaignStatus.${campaign.status}`)}
        </span>
      </div>

      {blocked ? <p className="mt-3 text-xs text-muted-foreground">{blocked}</p> : null}
      {campaign.paused_reason ? (
        <p className="mt-2 text-xs text-destructive">{campaign.paused_reason}</p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Stat label={t("integration.campaignRemaining")} value={data.remaining} />
        <Stat label={t("integration.campaignInvited")} value={data.invited} />
        <Stat label={t("integration.campaignClaimed")} value={data.claimed} />
        <Stat label={t("integration.campaignReminders")} value={data.pendingReminders} />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold">
          <span className="block text-muted-foreground">{t("integration.campaignCap")}</span>
          <Input
            type="number"
            min={1}
            max={500}
            defaultValue={campaign.daily_cap}
            disabled={busy}
            onBlur={(e) => {
              const value = Number(e.target.value);
              if (!Number.isFinite(value) || value === campaign.daily_cap) return;
              void run(async () => {
                await updateClaimCampaign({ data: { daily_cap: Math.min(500, Math.max(1, value)) } });
                return t("integration.saved");
              });
            }}
            className="mt-1 w-24"
          />
        </label>

        <label className="text-xs font-semibold">
          <span className="block text-muted-foreground">{t("integration.campaignReminderDays")}</span>
          <Input
            type="number"
            min={1}
            max={60}
            defaultValue={campaign.reminder_after_days}
            disabled={busy}
            onBlur={(e) => {
              const value = Number(e.target.value);
              if (!Number.isFinite(value) || value === campaign.reminder_after_days) return;
              void run(async () => {
                await updateClaimCampaign({
                    data: { reminder_after_days: Math.min(60, Math.max(1, value)) },
                });
                return t("integration.saved");
              });
            }}
            className="mt-1 w-24"
          />
        </label>

        <label className="flex items-center gap-2 pb-2 text-xs font-semibold">
          <Checkbox
            checked={campaign.reminder_enabled}
            disabled={busy}
            onCheckedChange={(value) => {
              const checked = value === true;
              void run(async () => {
                await updateClaimCampaign({ data: { reminder_enabled: checked } });
                return t("integration.saved");
              });
            }}
          />
          {t("integration.campaignReminderOn")}
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {campaign.status === "running" ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await updateClaimCampaign({ data: { status: "paused" } });
                return t("integration.saved");
              })
            }
          >
            {t("integration.campaignPause")}
          </Button>
        ) : (
          <Button
            disabled={busy || !canSend}
            onClick={() => {
              if (!window.confirm(t("integration.campaignStartConfirm"))) return;
              void run(async () => {
                await updateClaimCampaign({ data: { status: "running" } });
                return t("integration.saved");
              });
            }}
          >
            {t("integration.campaignStart")}
          </Button>
        )}

        <Button
          variant="outline"
          disabled={busy || !canSend || campaign.status !== "running" || data.ranToday}
          onClick={() => {
            if (!window.confirm(t("integration.campaignReleaseConfirm"))) return;
            void run(async () => {
              const result = await releaseClaimWave();
              return result.ran
                ? `${t("integration.campaignReleased")} ${result.invited + result.reminded}`
                : `${t("integration.campaignSkipped")} ${result.skipped ?? ""}`;
            });
          }}
        >
          <Send className="mr-2 inline h-3.5 w-3.5" />
          {t("integration.campaignRelease")}
        </Button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {t("integration.campaignLastRun")}{" "}
        {campaign.last_run_at
          ? `${new Date(campaign.last_run_at).toLocaleString()} · ${campaign.last_run_sent}`
          : "—"}
        {data.ranToday ? ` · ${t("integration.campaignRanToday")}` : ""}
      </p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
      {failure ? <p className="mt-1 text-xs text-destructive">{failure}</p> : null}
    </section>
  );
}
