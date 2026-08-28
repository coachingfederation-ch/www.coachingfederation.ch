/**
 * Membership & Engagement dashboard for the guest pass pilot.
 * Exports: GuestPassesDashboard. Rendered by /_staff/manage/guest-passes.
 *
 * Every decision goes through a server function that re-checks the M&E role;
 * this screen only presents them. Guest contact details are shown because the
 * route is M&E-only — the read that feeds it is gated server-side.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from "@/design-system/icf-welcome-design-system-a835df";
import { useCms } from "@/i18n/cms";
import {
  approveGuestPass,
  cancelGuestPass,
  declineGuestPass,
  exportGuestPasses,
  listAllGuestPasses,
  setGuestPassFollowUp,
  type StaffGuestPass,
} from "@/lib/guest-passes.functions";

type Action = "approve" | "decline" | "cancel";

const FOLLOW_UP_OPTIONS = ["none", "contacted", "converted", "closed"] as const;

const STATUS_TONE: Record<string, string> = {
  invited: "bg-secondary text-secondary-foreground",
  pending: "bg-warn-soft text-warn-foreground",
  approved: "bg-teal-soft text-teal-foreground",
  registered: "bg-teal-soft text-teal-foreground",
  attended: "bg-highlight text-highlight-foreground",
  declined: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const STATUS_FILTERS = [
  "all",
  "invited",
  "pending",
  "approved",
  "registered",
  "attended",
  "declined",
  "cancelled",
] as const;

export function GuestPassesDashboard({
  initialRows,
}: {
  initialRows: StaffGuestPass[];
}) {
  const { t, locale } = useCms();
  const [rows, setRows] = useState<StaffGuestPass[]>(initialRows);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [pending, setPending] = useState<{ action: Action; pass: StaffGuestPass } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [followUp, setFollowUp] = useState<StaffGuestPass | null>(null);
  const [followUpStatus, setFollowUpStatus] =
    useState<(typeof FOLLOW_UP_OPTIONS)[number]>("none");
  const [followUpNote, setFollowUpNote] = useState("");
  const [linkMember, setLinkMember] = useState(false);

  const counts = useMemo(() => {
    const has = (s: string[]) => rows.filter((r) => s.includes(r.status)).length;
    return {
      waiting: has(["invited"]),
      requests: has(["pending"]),
      approved: has(["approved", "registered"]),
      attended: rows.filter((r) => r.checkedInAt || r.status === "attended").length,
      declined: has(["declined", "cancelled"]),
      converted: rows.filter((r) => r.convertedMemberId).length,
    };
  }, [rows]);

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const refresh = async () => setRows(await listAllGuestPasses());

  const runAction = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const passId = pending.pass.id;
      if (pending.action === "approve") {
        await approveGuestPass({ data: { passId, note: note || undefined } });
        toast.success(t("guestPasses.toast.approved"));
      } else if (pending.action === "decline") {
        await declineGuestPass({ data: { passId, note } });
        toast.success(t("guestPasses.toast.declined"));
      } else {
        await cancelGuestPass({ data: { passId, note: note || undefined } });
        toast.success(t("guestPasses.toast.cancelled"));
      }
      await refresh();
      setPending(null);
      setNote("");
    } catch {
      toast.error(t("guestPasses.toast.error"));
    } finally {
      setBusy(false);
    }
  };

  const saveFollowUp = async () => {
    if (!followUp) return;
    setBusy(true);
    try {
      await setGuestPassFollowUp({
        data: {
          passId: followUp.id,
          followUpStatus,
          followUpNote: followUpNote || null,
          convertedMemberId: linkMember ? followUp.matchedMemberId : null,
        },
      });
      toast.success(t("guestPasses.toast.saved"));
      await refresh();
      setFollowUp(null);
    } catch {
      toast.error(t("guestPasses.toast.error"));
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setExporting(true);
    try {
      const headers = [
        "event","eventDate","memberName","memberEmail","memberNumber","guestName","guestEmail",
        "guestPhone","guestLocation","guestLanguage","status","decisionAt","decisionNote",
        "attended","followUpStatus","followUpNote","converted","createdAt",
      ].map((k) => t(`guestPasses.csv.${k}`));
      const file = await exportGuestPasses({ data: { headers } });
      const blob = new Blob([`\uFEFF${file.csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("guestPasses.toast.error"));
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(locale, { dateStyle: "medium" }) : "—";

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-primary">{t("guestPasses.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t("guestPasses.subtitle")}
          </p>
        </div>
        <Button variant="outline" onClick={download} disabled={exporting}>
          {exporting ? <Loader2 className="animate-spin" /> : <Download />}
          {t("guestPasses.actions.export")}
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {(
          [
            ["requests", counts.requests],
            ["approved", counts.approved],
            ["attended", counts.attended],
            ["declined", counts.declined],
            ["converted", counts.converted],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="rounded-2xl border border-border bg-card p-5">
            <div className="font-body text-3xl font-bold text-primary">{value}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {t(`guestPasses.counts.${key}`)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("guestPasses.filters.label")}</span>
        {STATUS_FILTERS.map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
          >
            {value === "all" ? t("guestPasses.filters.all") : t(`guestPasses.status.${value}`)}
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {rows.length === 0 ? t("guestPasses.empty") : t("guestPasses.emptyFiltered")}
        </p>
      ) : (
        <div className="space-y-4">
          {visible.map((pass) => (
            <article key={pass.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-xl text-primary">{pass.guestFullName}</h2>
                    <Badge className={STATUS_TONE[pass.status]}>
                      {t(`guestPasses.status.${pass.status}`)}
                    </Badge>
                    {pass.checkedInAt ? (
                      <Badge className={STATUS_TONE["attended"]}>
                        {t("guestPasses.status.attended")}
                      </Badge>
                    ) : null}
                    <Badge variant="outline">
                      {pass.followUpConsent
                        ? t("guestPasses.consentYes")
                        : t("guestPasses.consentNo")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{pass.guestEmail}</p>
                  {pass.status === "invited" ? (
                    <p className="text-sm text-muted-foreground">
                      {t("guestPasses.waitingHint")}
                    </p>
                  ) : null}
                  <p className="text-sm text-foreground">
                    {pass.eventTitle} · {formatDate(pass.eventStartsAt)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("guestPasses.columns.member")}: {pass.invitingMemberName ?? "—"}
                    {pass.invitingMemberNumber
                      ? ` · ${t("guestPasses.memberNumber")} ${pass.invitingMemberNumber}`
                      : ""}
                    {pass.invitingMemberStatus ? ` · ${pass.invitingMemberStatus}` : ""}
                  </p>
                  {pass.decisionNote ? (
                    <p className="text-sm text-muted-foreground">
                      {t("guestPasses.columns.note")}: {pass.decisionNote}
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    {t("guestPasses.columns.followUp")}:{" "}
                    {t(`guestPasses.followUpStatus.${pass.followUpStatus}`)}
                    {pass.convertedMemberId ? " ✓" : ""}
                  </p>
                  {pass.matchedMemberId && !pass.convertedMemberId ? (
                    <p className="text-sm text-teal-foreground">
                      {t("guestPasses.followUpDialog.matchFound")}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {pass.status === "pending" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          setNote("");
                          setPending({ action: "approve", pass });
                        }}
                      >
                        {t("guestPasses.actions.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNote("");
                          setPending({ action: "decline", pass });
                        }}
                      >
                        {t("guestPasses.actions.decline")}
                      </Button>
                    </>
                  ) : null}
                  {["pending", "approved", "registered"].includes(pass.status) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNote("");
                        setPending({ action: "cancel", pass });
                      }}
                    >
                      {t("guestPasses.actions.cancel")}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setFollowUp(pass);
                      setFollowUpStatus(
                        (FOLLOW_UP_OPTIONS as readonly string[]).includes(pass.followUpStatus)
                          ? (pass.followUpStatus as (typeof FOLLOW_UP_OPTIONS)[number])
                          : "none",
                      );
                      setFollowUpNote(pass.followUpNote ?? "");
                      setLinkMember(Boolean(pass.convertedMemberId));
                    }}
                  >
                    {t("guestPasses.actions.followUp")}
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/manage/guest-passes/$id" params={{ id: pass.id }}>
                      {t("guestPasses.actions.view")}
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <AlertDialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending ? t(`guestPasses.dialog.${pending.action}Title`) : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending ? t(`guestPasses.dialog.${pending.action}Body`) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="guest-pass-note">{t("guestPasses.dialog.noteLabel")}</Label>
            <Textarea
              id="guest-pass-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("guestPasses.dialog.notePlaceholder")}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("guestPasses.dialog.back")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void runAction();
              }}
              disabled={busy || (pending?.action === "decline" && note.trim().length === 0)}
            >
              {t("guestPasses.dialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(followUp)} onOpenChange={(open) => !open && setFollowUp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("guestPasses.followUpDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("guestPasses.followUpDialog.statusLabel")}</Label>
              <div className="flex flex-wrap gap-2">
                {FOLLOW_UP_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={followUpStatus === option ? "default" : "outline"}
                    onClick={() => setFollowUpStatus(option)}
                  >
                    {t(`guestPasses.followUpStatus.${option}`)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-pass-follow-up-note">
                {t("guestPasses.followUpDialog.noteLabel")}
              </Label>
              <Textarea
                id="guest-pass-follow-up-note"
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                rows={3}
              />
            </div>
            {followUp && !followUp.followUpConsent ? (
              <p className="text-sm text-muted-foreground">
                {t("guestPasses.followUpDialog.noConsent")}
              </p>
            ) : null}
            {followUp?.matchedMemberId ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="guest-pass-link-member"
                  checked={linkMember}
                  onCheckedChange={(value) => setLinkMember(value === true)}
                />
                <Label htmlFor="guest-pass-link-member">
                  {t("guestPasses.followUpDialog.linkMember")}
                </Label>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUp(null)}>
              {t("guestPasses.actions.close")}
            </Button>
            <Button onClick={() => void saveFollowUp()} disabled={busy}>
              {t("guestPasses.actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
