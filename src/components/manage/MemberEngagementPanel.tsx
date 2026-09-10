/**
 * Member engagement admin panel.
 *
 * Two halves: the campaign settings (mode, daily cap) and the queue/history
 * table. The wording of each campaign is code-owned and previewed under
 * Cloud → Emails, so it is not editable here.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Send, Check, X } from "lucide-react";

import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/design-system/icf-welcome-design-system-a835df";
import {
  isDormant,
  type EngagementCampaign,
  type EngagementCampaignKey,
  type EngagementMode,
} from "@/lib/member-engagement";
import {
  cancelEngagementSends,
  listEngagementCampaigns,
  listEngagementSends,
  releaseEngagementSends,
  runEngagementDispatch,
  saveEngagementCampaign,
  type EngagementSendRow,
  type EngagementStats,
} from "@/lib/member-engagement.functions";

const CAMPAIGN_LABELS: Record<EngagementCampaignKey, string> = {
  welcome_new_member: "Welcome new members",
  credential_upgrade: "Credential upgrade",
  credential_specialisation: "Credential specialisation",
  grace_reengagement: "Grace period re-engagement",
  grace_first_warning: "Grace period first warning",
  grace_final_warning: "Grace period final warning",
};

const CAMPAIGN_HINTS: Record<EngagementCampaignKey, string> = {
  welcome_new_member: "Sent when a member appears in the ICF feed for the first time.",
  credential_upgrade: "Sent when a member moves forward on the ACC → PCC → MCC ladder.",
  credential_specialisation:
    "Specialisation tags (ACTC, MCS-ACC, MCS-PCC, MCS-MCC) are not in the ICF feed yet, so nothing is detected. The email is ready and starts sending once the feed carries them.",

  grace_reengagement:
    "Sent on the membership expiry date, naming the end of ICF's two-month grace.",
  grace_first_warning: "Sent one month after the membership expiry date.",
  grace_final_warning: "Sent seven days before the end of ICF's two-month grace period.",
};

const MODE_LABELS: Record<EngagementMode, string> = {
  off: "Off — detect nothing, send nothing",
  automatic: "Automatic — send after every sync",
  queued: "Queued — hold for review before sending",
};

export function MemberEngagementPanel() {
  const [campaigns, setCampaigns] = useState<EngagementCampaign[] | null>(null);
  const [active, setActive] = useState<EngagementCampaignKey>("welcome_new_member");
  const [draft, setDraft] = useState<EngagementCampaign | null>(null);
  const [saving, setSaving] = useState(false);

  const [sends, setSends] = useState<EngagementSendRow[]>([]);
  const [stats, setStats] = useState<EngagementStats | null>(null);
  const [loadingSends, setLoadingSends] = useState(true);

  useEffect(() => {
    listEngagementCampaigns()
      .then(setCampaigns)
      .catch(() => setCampaigns([]));
  }, []);

  const reloadSends = () => {
    setLoadingSends(true);
    listEngagementSends({ data: { limit: 50 } })
      .then((result) => {
        setSends(result.rows);
        setStats(result.stats);
      })
      .catch(() => setSends([]))
      .finally(() => setLoadingSends(false));
  };

  useEffect(reloadSends, []);

  // Buffer the selected campaign so unsaved setting changes stay per-campaign.
  useEffect(() => {
    const found = campaigns?.find((row) => row.key === active) ?? null;
    setDraft(found ? { ...found } : null);
  }, [campaigns, active]);

  const pendingIds = useMemo(
    () => sends.filter((row) => row.status === "pending").map((row) => row.id),
    [sends],
  );

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await saveEngagementCampaign({
        data: {
          key: draft.key,
          mode: draft.mode,
          dailyCap: draft.daily_cap,
        },
      });

      setCampaigns((current) =>
        (current ?? []).map((row) => (row.key === draft.key ? draft : row)),
      );
      toast.success("Campaign saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the campaign");
    } finally {
      setSaving(false);
    }
  };

  const act = async (action: "release" | "cancel" | "dispatch", ids: string[] = pendingIds) => {
    try {
      if (action === "release") {
        const { released } = await releaseEngagementSends({ data: { ids } });
        toast.success(`${released} email${released === 1 ? "" : "s"} released`);
      } else if (action === "cancel") {
        const { cancelled } = await cancelEngagementSends({ data: { ids } });
        toast.success(`${cancelled} email${cancelled === 1 ? "" : "s"} cancelled`);
      } else {
        const { sent, failed } = await runEngagementDispatch();
        toast.success(`${sent} sent, ${failed} failed`);
      }
      reloadSends();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    }
  };

  if (campaigns === null) {
    return (
      <div className="flex items-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading campaigns…
      </div>
    );
  }

  const modeBadge = (mode: EngagementMode) =>
    mode === "automatic" ? "Sending" : mode === "queued" ? "On hold" : "Off";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-heading text-3xl text-foreground">Member engagement</h1>
        <p className="max-w-2xl text-muted-foreground">
          Lifecycle emails triggered by what the ICF member sync detects. Copy is written per
          language; members without a language preference receive English.
        </p>
      </header>

      {stats ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Waiting" value={stats.pending} />
          <StatCard label="Sent (30 days)" value={stats.sentLast30Days} />
          <StatCard label="Failed" value={stats.failed} />
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <div className="bg-hero px-6 py-6">
          <h2 className="font-heading text-xl text-hero-foreground">Campaigns</h2>
          <p className="mt-1 text-sm text-hero-foreground/70">
            Pick a campaign to change how and when it sends.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {campaigns.map((campaign) => {
              const selected = campaign.key === active;
              return (
                <Button
                  key={campaign.key}
                  variant={selected ? "inverse" : "inverse-ghost"}
                  size="sm"
                  aria-pressed={selected}
                  onClick={() => setActive(campaign.key)}
                >
                  {CAMPAIGN_LABELS[campaign.key]}
                  <span className="opacity-70">· {modeBadge(campaign.mode)}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {draft ? (
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-heading text-lg text-foreground">
                  {CAMPAIGN_LABELS[draft.key]}
                </h3>
                <Badge variant={draft.mode === "off" ? "secondary" : "default"}>
                  {modeBadge(draft.mode)}
                </Badge>
                {isDormant(draft.key) ? (
                  <Badge variant="secondary">Waiting for feed data</Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">{CAMPAIGN_HINTS[draft.key]}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Sending mode</Label>
                <Select
                  value={draft.mode}
                  onValueChange={(value) => setDraft({ ...draft, mode: value as EngagementMode })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MODE_LABELS) as EngagementMode[]).map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {MODE_LABELS[mode]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily-cap">Daily cap</Label>
                <Input
                  id="daily-cap"
                  type="number"
                  min={1}
                  max={500}
                  value={draft.daily_cap}
                  onChange={(event) =>
                    setDraft({ ...draft, daily_cap: Number(event.target.value) || 1 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Most emails this campaign may send in one day.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="max-w-xl text-sm text-muted-foreground">
                The wording of this email lives with every other chapter email, under Cloud →
                Emails, in German, French, Italian and English. Members receive it in their
                correspondence language.
              </p>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save campaign
              </Button>
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-1">
            <CardTitle>Queue and history</CardTitle>
            <p className="text-sm text-muted-foreground">
              {pendingIds.length
                ? `${pendingIds.length} email${pendingIds.length === 1 ? "" : "s"} waiting for your approval.`
                : "Nothing is waiting for approval right now."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => act("release")} disabled={!pendingIds.length}>
              <Check className="mr-2 h-4 w-4" /> Approve all waiting
            </Button>
            <Button variant="outline" onClick={() => act("dispatch")}>
              <Send className="mr-2 h-4 w-4" /> Send approved emails now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSends ? (
            <div className="flex items-center gap-3 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : sends.length === 0 ? (
            <div className="flex items-center gap-3 py-8 text-muted-foreground">
              <Mail className="h-4 w-4" /> Nothing detected yet. Sends appear after the next member
              sync.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sends.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.memberName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {CAMPAIGN_LABELS[row.campaignKey as EngagementCampaignKey] ?? row.campaignKey}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.status === "failed"
                            ? "destructive"
                            : row.status === "pending"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {row.status}
                      </Badge>
                      {row.errorMessage ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {row.errorMessage}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(row.createdAt).toLocaleDateString("en-CH")}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => act("release", [row.id])}>
                            <Check className="mr-2 h-4 w-4" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => act("cancel", [row.id])}
                          >
                            <X className="mr-2 h-4 w-4" /> Cancel
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No action needed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="font-heading text-3xl text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}
