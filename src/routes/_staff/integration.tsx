/**
 * System integration and sync management route (/_staff/integration).
 * Exports: Route. Renders the admin dashboard for Supabase/External syncs,
 * cutover controls, and history logs.
 */

import { createFileRoute } from "@tanstack/react-router";
import { requireStaffAccess, ADMIN_ONLY } from "@/lib/staff-guard";
import { Fragment, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, ClipboardCheck, RefreshCw } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { ContentOwnershipPanel } from "@/components/cms/ContentOwnershipPanel";
import { LinkedInPageSettings } from "@/components/cms/LinkedInPageSettings";
import { SyncRunDetail } from "@/components/cms/SyncRunDetail";
import { useCms } from "@/i18n/cms";
import {
  fetchIntegrationConfig,
  fetchRecentSyncRuns,
  updateIntegrationConfig,
  type IntegrationConfig,
  type SyncRun,
} from "@/lib/integration";
import {
  runSyncNow,
  executeCutover,
  rehearseCutover,
  cleanupExpiredMembers,
  getOutboundIpDiagnostics,
} from "@/lib/members.functions";

export const Route = createFileRoute("/_staff/integration")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, ADMIN_ONLY),
  head: () => ({
    meta: [
      { title: "Integration status — The Switzerland Chapter of ICF CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IntegrationPage,
});

const CARD = "rounded-2xl border border-border bg-card p-5";
const BTN =
  "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-50";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

/**
 * The two release gates. The database trigger `tg_integration_config_guard`
 * is the real enforcement point (TEST mode can never send member email or open
 * claiming); this card mirrors those rules so a blocked gate shows a readable
 * reason instead of failing on click.
 */
function GatesCard({
  config,
  busy,
  act,
  t,
}: {
  config: IntegrationConfig;
  busy: boolean;
  act: (key: string, fn: () => Promise<string>) => Promise<void>;
  t: (key: string) => string;
}) {
  const isLive = config.mode === "live";
  const emailReason = !isLive
    ? t("integration.gateReasonTest")
    : config.cutover_in_progress
      ? t("integration.gateReasonFrozen")
      : null;
  const claimReason = !isLive
    ? t("integration.gateReasonTest")
    : !config.cutover_completed_at
      ? t("integration.gateReasonNoCutover")
      : config.cutover_in_progress
        ? t("integration.gateReasonFrozen")
        : null;

  const toggle = (key: string, values: Partial<IntegrationConfig>) =>
    void act(key, async () => {
      await updateIntegrationConfig(values);
      return t("integration.saved");
    });

  return (
    <section className={CARD}>
      <h2 className="text-sm font-bold">{t("integration.gatesTitle")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("integration.gatesBody")}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("integration.emails")}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {config.emails_suppressed
              ? config.email_redirect_to
                ? t("integration.emailsRedirected") + " " + config.email_redirect_to
                : t("integration.emailsSuppressed")
              : t("integration.emailsLive")}
          </p>
          {config.emails_suppressed ? (
            <>
              <button
                className={BTN + " mt-3"}
                disabled={busy || emailReason !== null}
                onClick={() => {
                  if (!window.confirm(t("integration.gateEmailOpenConfirm"))) return;
                  toggle("gate-email", { emails_suppressed: false });
                }}
              >
                {t("integration.gateEmailOpen")}
              </button>
              {emailReason ? (
                <p className="mt-2 text-xs text-muted-foreground">{emailReason}</p>
              ) : null}
            </>
          ) : (
            <button
              className="mt-3 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
              disabled={busy}
              onClick={() => toggle("gate-email", { emails_suppressed: true })}
            >
              {t("integration.gateEmailClose")}
            </button>
          )}
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("integration.claim")}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {config.account_claim_enabled
              ? t("integration.claimOpen")
              : t("integration.claimClosed")}
          </p>
          {config.account_claim_enabled ? (
            <button
              className="mt-3 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
              disabled={busy}
              onClick={() => toggle("gate-claim", { account_claim_enabled: false })}
            >
              {t("integration.gateClaimClose")}
            </button>
          ) : (
            <>
              <button
                className={BTN + " mt-3"}
                disabled={busy || claimReason !== null}
                onClick={() => {
                  if (!window.confirm(t("integration.gateClaimOpenConfirm"))) return;
                  toggle("gate-claim", { account_claim_enabled: true });
                }}
              >
                {t("integration.gateClaimOpen")}
              </button>
              {claimReason ? (
                <p className="mt-2 text-xs text-muted-foreground">{claimReason}</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function IntegrationPage() {
  const { t } = useCms();
  const [config, setConfig] = useState<IntegrationConfig | null>(null);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [rehearsal, setRehearsal] = useState<
    { step: string; ok: boolean; detail: string }[] | null
  >(null);
  const [openRunId, setOpenRunId] = useState<string | null>(null);

  const reload = async () => {
    try {
      const [c, r] = await Promise.all([fetchIntegrationConfig(), fetchRecentSyncRuns()]);
      setConfig(c);
      setRuns(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const act = async (key: string, fn: () => Promise<string>) => {
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      setMessage(await fn());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
      await reload();
    }
  };

  const isTest = config?.mode === "test";

  return (
    <Shell>
      <div className="mx-auto max-w-4xl px-10 py-10">
        <h1 className="text-2xl font-bold tracking-tight">{t("integration.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("integration.subtitle")}</p>

        {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
        <p className="mt-3 min-h-4 text-xs text-muted-foreground" role="status" aria-live="polite">
          {message ?? ""}
        </p>

        {!config ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("integration.loading")}</p>
        ) : (
          <div className="mt-4 space-y-4">
            <section className={CARD}>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={
                    "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider " +
                    (isTest ? "bg-destructive text-white" : "bg-teal text-white")
                  }
                >
                  {isTest ? t("integration.modeTest") : t("integration.modeLive")}
                </span>
                {config.cutover_in_progress ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" /> {t("integration.frozen")}
                  </span>
                ) : null}
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("integration.emails")}</dt>
                  <dd className="font-semibold">
                    {config.emails_suppressed
                      ? config.email_redirect_to
                        ? t("integration.emailsRedirected") + " " + config.email_redirect_to
                        : t("integration.emailsSuppressed")
                      : t("integration.emailsLive")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("integration.claim")}</dt>
                  <dd className="font-semibold">
                    {config.account_claim_enabled
                      ? t("integration.claimOpen")
                      : t("integration.claimClosed")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("integration.lastSuccess")}</dt>
                  <dd className="font-semibold">{formatDate(config.last_successful_sync_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("integration.lastFailure")}</dt>
                  <dd className="font-semibold">{formatDate(config.last_failed_sync_at)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">{t("integration.cutoverDone")}</dt>
                  <dd className="font-semibold">{formatDate(config.cutover_completed_at)}</dd>
                </div>
              </dl>
              {config.last_sync_error ? (
                <p className="mt-3 rounded-lg bg-secondary p-3 text-xs text-destructive">
                  {config.last_sync_error}
                </p>
              ) : null}

              <label className="mt-4 block text-xs text-muted-foreground">
                {t("integration.redirectInbox")}
                <input
                  type="email"
                  defaultValue={config.email_redirect_to ?? ""}
                  onBlur={(e) =>
                    void act("redirect", async () => {
                      await updateIntegrationConfig({ email_redirect_to: e.target.value || null });
                      return t("integration.saved");
                    })
                  }
                  className="mt-1 block w-full max-w-sm rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/20"
                />
              </label>
            </section>

            <GatesCard config={config} busy={busy !== null} act={act} t={t} />

            <section className={CARD}>
              <h2 className="text-sm font-bold">{t("integration.actions")}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className={BTN}
                  disabled={busy !== null}
                  onClick={() =>
                    void act("sync", async () => {
                      const r = await runSyncNow();
                      return `${r.status}: ${r.feedCount} in feed, ${r.created} new, ${r.updated} updated, ${r.deactivated} deactivated.${r.message ? " " + r.message : ""}`;
                    })
                  }
                >
                  <RefreshCw className="mr-2 inline h-3.5 w-3.5" />
                  {t("integration.runSync")}
                </button>
                <button
                  className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() => {
                    if (!window.confirm(t("integration.cleanupConfirm"))) return;
                    void act("cleanup", async () => {
                      const r = await cleanupExpiredMembers();
                      return `${r.anonymized} ${t("integration.cleanupDone")}`;
                    });
                  }}
                >
                  {t("integration.cleanup")}
                </button>
              </div>
            </section>

            <ContentOwnershipPanel />

            <LinkedInPageSettings />

            <section className={CARD + " border-destructive/40"}>
              <h2 className="flex items-center gap-2 text-sm font-bold text-destructive">
                <AlertTriangle className="h-4 w-4" /> {t("integration.cutoverTitle")}
              </h2>
              {config.cutover_completed_at ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-teal" />
                  {t("integration.cutoverAlready")} {formatDate(config.cutover_completed_at)}
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("integration.cutoverBody")}
                  </p>
                  <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                    {["1", "2", "3", "4", "5", "6", "7", "8"].map((n) => (
                      <li key={n}>{t(`integration.cutoverStep${n}`)}</li>
                    ))}
                  </ol>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="CUTOVER"
                      aria-label={t("integration.cutoverConfirmLabel")}
                      className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
                    />
                    <button
                      className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                      disabled={confirmText !== "CUTOVER" || busy !== null}
                      onClick={() =>
                        void act("cutover", async () => {
                          const r = await executeCutover({ data: { confirm: "CUTOVER" } });
                          setConfirmText("");
                          return r.steps
                            .map((s) => `${s.ok ? "✓" : "✗"} ${s.step}: ${s.detail}`)
                            .join(" | ");
                        })
                      }
                    >
                      {t("integration.cutoverRun")}
                    </button>
                  </div>
                </>
              )}
            </section>

            {!config.cutover_completed_at && (
              <section className={CARD}>
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <ClipboardCheck className="h-4 w-4 text-teal" /> {t("integration.rehearseTitle")}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("integration.rehearseBody")}
                </p>
                <button
                  className={BTN + " mt-4"}
                  disabled={busy !== null}
                  onClick={() =>
                    void act("rehearse", async () => {
                      const r = await rehearseCutover({});
                      setRehearsal(r.steps);
                      return t("integration.rehearseDone");
                    })
                  }
                >
                  {busy === "rehearse"
                    ? t("integration.rehearseRunning")
                    : t("integration.rehearseRun")}
                </button>
                {rehearsal && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="py-1 pr-3">{t("integration.rehearseColStep")}</th>
                          <th className="py-1">{t("integration.rehearseColDetail")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rehearsal.map((s) => (
                          <tr key={s.step} className="border-t border-border/60 align-top">
                            <td className="py-1 pr-3 font-semibold">
                              {s.ok ? "✓" : "✗"} {s.step}
                            </td>
                            <td className="py-1 text-muted-foreground">{s.detail}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            <section className={CARD}>
              <h2 className="text-sm font-bold">{t("integration.history")}</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-3">{t("integration.colStarted")}</th>
                      <th className="py-1 pr-3">{t("integration.colMode")}</th>
                      <th className="py-1 pr-3">{t("integration.colStatus")}</th>
                      <th className="py-1 pr-3">{t("integration.colFeed")}</th>
                      <th className="py-1">{t("integration.colChanges")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-3 text-muted-foreground">
                          {t("integration.noRuns")}
                        </td>
                      </tr>
                    ) : (
                      runs.map((r) => (
                        <Fragment key={r.id}>
                          <tr
                            className="cursor-pointer border-t border-border hover:bg-secondary/60"
                            onClick={() => setOpenRunId(openRunId === r.id ? null : r.id)}
                          >
                            <td className="py-1.5 pr-3">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-left font-semibold"
                                aria-expanded={openRunId === r.id}
                              >
                                <ChevronRight
                                  className={
                                    "h-3.5 w-3.5 transition-transform " +
                                    (openRunId === r.id ? "rotate-90" : "")
                                  }
                                  aria-hidden
                                />
                                {formatDate(r.started_at)}
                              </button>
                            </td>
                            <td className="py-1.5 pr-3 uppercase">{r.mode}</td>
                            <td className="py-1.5 pr-3">{r.status}</td>
                            <td className="py-1.5 pr-3">{r.feed_member_count ?? "—"}</td>
                            <td className="py-1.5">
                              +{r.created_count} / ~{r.updated_count} / −{r.deactivated_count}
                            </td>
                          </tr>
                          {openRunId === r.id ? (
                            <tr className="border-t border-border/40">
                              <td colSpan={5} className="pb-4 pt-2">
                                <p className="mb-2 text-xs text-muted-foreground">
                                  {t("integration.runTrigger")}: {r.trigger_source} ·{" "}
                                  {t("integration.runDuration")}:{" "}
                                  {r.finished_at
                                    ? Math.max(
                                        0,
                                        Math.round(
                                          (new Date(r.finished_at).getTime() -
                                            new Date(r.started_at).getTime()) /
                                            1000,
                                        ),
                                      ) + "s"
                                    : "—"}
                                </p>
                                {r.error_message ? (
                                  <p className="mb-2 rounded-lg bg-card p-2 text-xs text-destructive">
                                    {r.error_message}
                                  </p>
                                ) : null}
                                <SyncRunDetail runId={r.id} />
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </Shell>
  );
}
