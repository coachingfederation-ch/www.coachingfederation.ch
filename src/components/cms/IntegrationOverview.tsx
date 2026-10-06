/**
 * Day-to-day overview for the Integration page: a health strip ("is the sync
 * healthy?") and a Today queue ("what needs someone to act?").
 *
 * Read-only aggregation over data the page already loads: the integration
 * config row, the relay-health summary, the claim-campaign overview and the
 * retention summary. The only actions are the existing ones (run sync, release
 * today's wave), handed in by the page so busy/message state stays in one place.
 * Exports: HealthStrip, TodayQueue.
 */
import { ArrowRight, RefreshCw, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import type { IntegrationConfig } from "@/lib/integration";
import type {
  getClaimCampaign,
  getLifecycleRetentionSummary,
  getRelayHealth,
} from "@/lib/members.functions";

type T = (key: string) => string;
type Level = "ok" | "warn" | "fail";
export type RelayHealth = Awaited<ReturnType<typeof getRelayHealth>>;
export type ClaimOverview = Awaited<ReturnType<typeof getClaimCampaign>>;
export type RetentionSummary = Awaited<ReturnType<typeof getLifecycleRetentionSummary>>;

const TONE: Record<Level, string> = {
  ok: "bg-teal",
  warn: "bg-warn",
  fail: "bg-destructive",
};

function formatShort(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function HealthStrip({
  t,
  config,
  health,
}: {
  t: T;
  config: IntegrationConfig;
  health: RelayHealth | null;
}) {
  const live = config.mode === "live";
  const emailLevel: Level = config.emails_suppressed
    ? config.email_redirect_to
      ? "warn"
      : live
        ? "fail"
        : "warn"
    : "ok";

  const tiles: {
    key: string;
    label: string;
    level: Level | null;
    value: string;
    target: string;
  }[] = [
    {
      key: "sync",
      label: t("integration.tileSync"),
      level: health?.lastSync.level ?? null,
      value: health
        ? `${health.lastSync.status ?? t("integration.healthNever")} · ${formatShort(health.lastSync.at)}`
        : formatShort(config.last_successful_sync_at),
      target: "section-sync",
    },
    {
      key: "relay",
      label: t("integration.tileRelay"),
      level: health?.relay.level ?? null,
      value: health
        ? health.relay.error
          ? health.relay.error
          : `${health.relay.roundTripMs} ms`
        : "…",
      target: "section-diagnostics",
    },
    {
      key: "email",
      label: t("integration.tileEmail"),
      level: emailLevel,
      value: config.emails_suppressed
        ? config.email_redirect_to
          ? t("integration.emailsRedirected")
          : t("integration.emailsSuppressed")
        : t("integration.emailsLive"),
      target: "section-advanced",
    },
    {
      key: "claim",
      label: t("integration.tileClaim"),
      level: config.account_claim_enabled ? "ok" : "warn",
      value: config.account_claim_enabled
        ? t("integration.claimOpen")
        : t("integration.claimClosed"),
      target: "section-claim",
    },
    {
      key: "cred",
      label: t("integration.tileCredentials"),
      level: health?.credentials.level ?? null,
      value: health
        ? health.credentials.ok === null
          ? t("integration.healthNever")
          : `${
              health.credentials.ok
                ? t("integration.healthCredentialsOk")
                : t("integration.healthCredentialsFailed")
            } · ${formatShort(health.credentials.at)}`
        : "…",
      target: "section-diagnostics",
    },
  ];

  return (
    <section aria-label={t("integration.healthStripLabel")}>
      <ul className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <li key={tile.key}>
            <button
              type="button"
              onClick={() => scrollToSection(tile.target)}
              className="flex h-full w-full flex-col items-start gap-1 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span
                  className={
                    "size-2 shrink-0 rounded-full " +
                    (tile.level ? TONE[tile.level] : "bg-muted")
                  }
                  aria-hidden
                />
                {tile.label}
              </span>
              <span className="text-sm font-semibold text-foreground">{tile.value}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

type QueueItem = {
  key: string;
  level: Level;
  title: string;
  detail?: string;
  action?: { label: string; icon: "sync" | "send"; onClick: () => void };
  jump?: string;
};

export function TodayQueue({
  t,
  config,
  health,
  claim,
  retention,
  busy,
  onRunSync,
  onReleaseWave,
}: {
  t: T;
  config: IntegrationConfig;
  health: RelayHealth | null;
  claim: ClaimOverview | null;
  retention: RetentionSummary | null;
  busy: boolean;
  onRunSync: () => void;
  onReleaseWave: () => void;
}) {
  const items: QueueItem[] = [];

  if (health?.lastSync.level === "fail" || (config.last_sync_error && !health)) {
    items.push({
      key: "sync",
      level: "fail",
      title: t("integration.todaySyncFailed"),
      detail: config.last_sync_error ?? health?.lastSync.error ?? undefined,
      action: { label: t("integration.runSync"), icon: "sync", onClick: onRunSync },
    });
  }

  if (claim) {
    const { campaign } = claim;
    if (campaign.paused_reason) {
      items.push({
        key: "claim-paused",
        level: "warn",
        title: t("integration.todayPaused"),
        detail: campaign.paused_reason,
        jump: "section-claim",
      });
    } else if (campaign.status === "running" && !claim.ranToday && claim.gateReason === null) {
      items.push({
        key: "claim-wave",
        level: "warn",
        title: t("integration.todayWaveDue"),
        detail: `${claim.remaining} ${t("integration.todayWaveRemaining")} · ${claim.pendingReminders} ${t("integration.todayReminders")}`,
        action: { label: t("integration.campaignRelease"), icon: "send", onClick: onReleaseWave },
      });
    }
  }

  if (retention && retention.due > 0) {
    items.push({
      key: "removal",
      level: "warn",
      title: `${retention.due} ${t("integration.todayRemovalDue")}`,
      jump: "section-advanced",
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-bold">{t("integration.todayTitle")}</h2>
      {items.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-teal" aria-hidden />
          {t("integration.todayEmpty")}
          {claim?.ranToday ? ` ${t("integration.campaignRanToday")}` : ""}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {items.map((item) => (
            <li key={item.key} className="flex flex-wrap items-center gap-3 py-3">
              <span className={"size-2 shrink-0 rounded-full " + TONE[item.level]} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.detail ? (
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">{item.detail}</p>
                ) : null}
              </div>
              {item.action ? (
                <Button size="sm" disabled={busy} onClick={item.action.onClick}>
                  {item.action.icon === "sync" ? (
                    <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Send className="mr-2 h-3.5 w-3.5" aria-hidden />
                  )}
                  {item.action.label}
                </Button>
              ) : null}
              {item.jump ? (
                <Button size="sm" variant="ghost" onClick={() => scrollToSection(item.jump!)}>
                  {t("integration.todayOpen")}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
