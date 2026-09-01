/**
 * MailerLite delivery panel for one newsletter edition.
 *
 * Two deliberate steps: "Push to MailerLite" creates or refreshes the draft
 * campaign from the rendered edition, "Send" dispatches it. Sending cannot be
 * undone, so it sits behind a confirmation and behind the publish roles.
 * Exports: NewsletterSendPanel. Used by /manage/newsletters/:id.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send, Upload } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
} from "@/design-system/icf-welcome-design-system-a835df";
import {
  getNewsletterSendStateFn,
  listMailerLiteGroupsFn,
  pushNewsletterToMailerLiteFn,
  sendNewsletterFn,
} from "@/lib/newsletters.functions";
import { isNewsletterSendable } from "@/lib/newsletters";
import { LOCALE_ORDER, type Locale } from "@/i18n/config";

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function NewsletterSendPanel({
  id,
  defaultSubject,
  canSend,
  status,
}: {
  id: string;
  defaultSubject: string;
  canSend: boolean;
  /** Edition status — the panel stays inert until it reaches review. */
  status: string;
}) {
  const queryClient = useQueryClient();
  const getState = useServerFn(getNewsletterSendStateFn);
  const listGroups = useServerFn(listMailerLiteGroupsFn);
  const push = useServerFn(pushNewsletterToMailerLiteFn);
  const send = useServerFn(sendNewsletterFn);

  // One campaign per language: the whole panel is scoped to the active locale.
  const [locale, setLocale] = useState<Locale>("en");
  const stateKey = ["newsletter-send", id, locale];
  const { data: state } = useQuery({
    queryKey: stateKey,
    queryFn: () => getState({ data: { id, locale } }),
  });
  const { data: groupData } = useQuery({
    queryKey: ["mailerlite-groups"],
    queryFn: () => listGroups(),
    staleTime: 5 * 60 * 1000,
  });

  const [groupId, setGroupId] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [fromName, setFromName] = useState<string | null>(null);
  const [fromEmail, setFromEmail] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: stateKey });

  const pushMutation = useMutation({
    mutationFn: (input: {
      groupId: string;
      groupName: string;
      subject: string;
      fromName: string;
      fromEmail: string;
    }) => push({ data: { id, locale, ...input } }),
    onSuccess: invalidate,
  });
  const sendMutation = useMutation({
    mutationFn: (scheduledFor: string | null) => send({ data: { id, locale, scheduledFor } }),
    onSuccess: invalidate,
  });

  if (!state) return null;

  const groups = groupData?.groups ?? [];
  const currentGroupId = groupId ?? state.groupId ?? "";
  const currentGroup = groups.find((group) => group.id === currentGroupId);
  const currentSubject = subject ?? state.subject ?? defaultSubject;
  const currentFromName = fromName ?? state.fromName ?? state.defaultFromName;
  const currentFromEmail = fromEmail ?? state.fromEmail ?? state.defaultFromEmail;
  const sent = Boolean(state.sentAt);
  // A draft nobody reviewed must never reach MailerLite; the server enforces
  // the same rule, this only keeps the controls honest.
  const needsReview = !isNewsletterSendable(status);
  const locked = sent || needsReview;
  const ready =
    Boolean(currentGroupId) &&
    currentSubject.trim().length > 2 &&
    currentFromName.trim().length > 1 &&
    /.+@.+\..+/.test(currentFromEmail);

  const problem =
    errorMessage(pushMutation.error) ??
    errorMessage(sendMutation.error) ??
    groupData?.error ??
    state.lastError;

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Send with MailerLite</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Language edition">
          {LOCALE_ORDER.map((code) => (
            <Button
              key={code}
              variant={locale === code ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setLocale(code);
                setGroupId(null);
                setSubject(null);
                setFromName(null);
                setFromEmail(null);
                setScheduleAt("");
              }}
            >
              {code.toUpperCase()}
            </Button>
          ))}
        </div>

        {!state.connected ? (
          <p className="text-sm text-muted-foreground">
            MailerLite is not connected yet. Add the API key to enable sending.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ml-group">Audience group</Label>
            <Select
              value={currentGroupId}
              onValueChange={setGroupId}
              disabled={locked || groups.length === 0}
            >
              <SelectTrigger id="ml-group">
                <SelectValue placeholder="Choose a group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} ({group.activeCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ml-subject">Subject line</Label>
            <Input
              id="ml-subject"
              value={currentSubject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={locked}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ml-from-name">Sender name</Label>
            <Input
              id="ml-from-name"
              value={currentFromName}
              onChange={(event) => setFromName(event.target.value)}
              disabled={locked}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ml-from-email">Sender address</Label>
            <Input
              id="ml-from-email"
              type="email"
              value={currentFromEmail}
              onChange={(event) => setFromEmail(event.target.value)}
              disabled={locked}
              placeholder="newsletter@coachingfederation.ch"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={!canSend || !ready || locked || pushMutation.isPending}
            onClick={() =>
              pushMutation.mutate({
                groupId: currentGroupId,
                groupName: currentGroup?.name ?? currentGroupId,
                subject: currentSubject.trim(),
                fromName: currentFromName.trim(),
                fromEmail: currentFromEmail.trim(),
              })
            }
          >
            <Upload className="h-4 w-4" />
            {pushMutation.isPending
              ? "Pushing…"
              : state.campaignId
                ? "Update MailerLite draft"
                : "Push to MailerLite"}
          </Button>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ml-schedule">Schedule (optional, Zürich time)</Label>
            <Input
              id="ml-schedule"
              type="datetime-local"
              value={scheduleAt}
              onChange={(event) => setScheduleAt(event.target.value)}
              disabled={locked}
            />
          </div>

          <Button
            size="sm"
            disabled={!canSend || !state.campaignId || locked || sendMutation.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            <Send className="h-4 w-4" />
            {sendMutation.isPending ? "Sending…" : scheduleAt ? "Schedule send" : "Send now"}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {sent
            ? `Sent ${new Date(state.sentAt as string).toLocaleString("en-GB")}${
                state.groupName ? ` to ${state.groupName}` : ""
              }.`
            : state.lastPushedAt
              ? `Draft campaign in MailerLite, last updated ${new Date(
                  state.lastPushedAt,
                ).toLocaleString("en-GB")}. Review it there, then send.`
              : "Push the edition first — MailerLite keeps the exact layout of the preview."}
        </p>

        {needsReview ? (
          <p className="text-sm text-muted-foreground">
            Submit this edition for review before it can be pushed or sent.
          </p>
        ) : null}
        {!canSend ? (
          <p className="text-sm text-muted-foreground">
            Only publishers can push and send an edition, and never one they wrote themselves.
          </p>
        ) : null}
        {problem ? <p className="text-sm text-destructive">{problem}</p> : null}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {scheduleAt ? "Schedule this edition?" : "Send this edition now?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {`This dispatches the campaign to ${currentGroup?.name ?? "the selected group"}${
                currentGroup ? ` (${currentGroup.activeCount} subscribers)` : ""
              }. MailerLite sends cannot be recalled.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                // datetime-local has no zone; the server reads it as an instant,
                // so convert the local wall clock to ISO here.
                sendMutation.mutate(scheduleAt ? new Date(scheduleAt).toISOString() : null);
              }}
            >
              {scheduleAt ? "Schedule" : "Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
