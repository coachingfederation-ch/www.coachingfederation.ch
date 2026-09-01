/**
 * Member engagement admin panel.
 *
 * Two halves: the campaign editor (mode, daily cap, localized subject/body)
 * and the queue/history table. Copy edits are buffered locally and only
 * written on Save, so switching campaigns can never clobber unsaved text.
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
  Textarea,
} from "@/design-system/icf-welcome-design-system-a835df";
import {
  CAMPAIGN_PLACEHOLDERS,
  ENGAGEMENT_LOCALES,
  isDormant,
  type EngagementCampaign,
  type EngagementCampaignKey,
  type EngagementLocale,
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
};

const CAMPAIGN_HINTS: Record<EngagementCampaignKey, string> = {
  welcome_new_member: "Sent when a member appears in the ICF feed for the first time.",
  credential_upgrade: "Sent when a member moves forward on the ACC → PCC → MCC ladder.",
  credential_specialisation:
    "Specialisation tags (ACTC, MCS-ACC, MCS-PCC, MCS-MCC) are not in the ICF feed yet, so nothing is detected. The copy can be written now and will start sending once the feed carries them.",
  grace_reengagement: "Sent when a membership lapses and the member enters the grace window.",
};

const MODE_LABELS: Record<EngagementMode, string> = {
  off: "Off — detect nothing, send nothing",
  automatic: "Automatic — send after every sync",
  queued: "Queued — hold for review before sending",
};

export function MemberEngagementPanel() {
  const [campaigns, setCampaigns] = useState<EngagementCampaign[] | null>(null);
  const [active, setActive] = useState<EngagementCampaignKey>("welcome_new_member");
  const [locale, setLocale] = useState<EngagementLocale>("en");
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

  // Buffer the selected campaign so unsaved edits stay per-campaign.
  useEffect(() => {
    const found = campaigns?.find((row) => row.key === active) ?? null;
    setDraft(found ? { ...found, copy: { ...found.copy } } : null);
  }, [campaigns, active]);

  const pendingIds = useMemo(
    () => sends.filter((row) => row.status === "pending").map((row) => row.id),
    [sends],
  );

  const updateCopy = (field: "subject" | "body", value: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            copy: {
              ...current.copy,
              [locale]: {
                subject: field === "subject" ? value : (current.copy[locale]?.subject ?? ""),
                body: field === "body" ? value : (current.copy[locale]?.body ?? ""),
              },
            },
          }
        : current,
    );
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await saveEngagementCampaign({
        data: {
          key: draft.key,
          mode: draft.mode,
          dailyCap: draft.daily_cap,
          copy: draft.copy,
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

  const act = async (
    action: "release" | "cancel" | "dispatch",
    ids: string[] = pendingIds,
  ) => {
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

      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={active} onValueChange={(value) => setActive(value as EngagementCampaignKey)}>
            <TabsList className="flex-wrap">
              {campaigns.map((campaign) => (
                <TabsTrigger key={campaign.key} value={campaign.key}>
                  {CAMPAIGN_LABELS[campaign.key]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {draft ? (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">{CAMPAIGN_HINTS[draft.key]}</p>
              {isDormant(draft.key) ? (
                <Badge variant="secondary">Waiting for feed data</Badge>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sending mode</Label>
                  <Select
                    value={draft.mode}
                    onValueChange={(value) =>
                      setDraft({ ...draft, mode: value as EngagementMode })
                    }
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
                </div>
              </div>

              <Tabs value={locale} onValueChange={(value) => setLocale(value as EngagementLocale)}>
                <TabsList>
                  {ENGAGEMENT_LOCALES.map((code) => (
                    <TabsTrigger key={code} value={code}>
                      {code.toUpperCase()}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={draft.copy[locale]?.subject ?? ""}
                  onChange={(event) => updateCopy("subject", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Body</Label>
                <Textarea
                  id="body"
                  rows={12}
                  value={draft.copy[locale]?.body ?? ""}
                  onChange={(event) => updateCopy("body", event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Placeholders: {CAMPAIGN_PLACEHOLDERS[draft.key].map((p) => `{{${p}}}`).join(", ")}
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save campaign
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Queue and history</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => act("release")}
              disabled={!pendingIds.length}
            >
              <Check className="mr-2 h-4 w-4" /> Release waiting
            </Button>
            <Button variant="outline" size="sm" onClick={() => act("dispatch")}>
              <Send className="mr-2 h-4 w-4" /> Send now
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
                    <TableCell>{row.memberName ?? "—"}</TableCell>
                    <TableCell>
                      {CAMPAIGN_LABELS[row.campaignKey as EngagementCampaignKey] ??
                        row.campaignKey}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === "failed" ? "destructive" : "secondary"}>
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => act("release", [row.id])}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => act("cancel", [row.id])}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
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
