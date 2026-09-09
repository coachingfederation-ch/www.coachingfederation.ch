/**
 * Grace-period retention sweep.
 *
 * A member who drops out of the ICF feed is moved into a grace window by the
 * sync, and a row is written to `member_lifecycle_queue`. This module is what
 * finally reads that queue: it warns the member twice, closes the row when the
 * member comes back, and tells the chapter office when records are due for
 * removal.
 *
 * Deletion stays a deliberate human act — the sweep never anonymises anyone.
 * It only makes sure nobody is deleted without warning and no due record goes
 * unnoticed.
 *
 * Exports: runLifecycleSweep, loadRetentionSummary, GRACE_NOTICE_DAYS,
 * GRACE_FINAL_NOTICE_DAYS.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { graceNoticeCopy } from "./email-templates/member-grace-copy";

/** Lead time of the first warning, in days before the scheduled deletion. */
export const GRACE_NOTICE_DAYS = 30;
/** Lead time of the final warning, in days before the scheduled deletion. */
export const GRACE_FINAL_NOTICE_DAYS = 7;

const OFFICE_EMAIL = "office@coachingfederation.ch";
const DAY_MS = 86400000;

export type LifecycleSweepResult = {
  resolved: number;
  warned30: number;
  warned7: number;
  due: number;
  digestSent: boolean;
};

export type RetentionSummary = {
  inGrace: number;
  warned30: number;
  warned7: number;
  due: number;
  nextDeletionAt: string | null;
};

type QueueRow = {
  id: string;
  member_id: string;
  scheduled_deletion_at: string;
  notified_at: string | null;
  final_notice_at: string | null;
};

type MemberRow = {
  id: string;
  first_name: string | null;
  full_name: string | null;
  email: string | null;
  activity_state: string | null;
  correspondence_locale: string | null;
};

/** Open queue rows — never resolved, so a returned member drops out at once. */
async function openQueueRows(): Promise<QueueRow[]> {
  const { data, error } = await supabaseAdmin
    .from("member_lifecycle_queue")
    .select("id, member_id, scheduled_deletion_at, notified_at, final_notice_at")
    .is("resolved_at", null);
  if (error) throw error;
  return (data ?? []) as unknown as QueueRow[];
}

async function membersById(ids: string[]): Promise<Map<string, MemberRow>> {
  if (!ids.length) return new Map();
  const { data, error } = await supabaseAdmin
    .from("members")
    .select("id, first_name, full_name, email, activity_state, correspondence_locale")
    .in("id", ids);
  if (error) throw error;
  const map = new Map<string, MemberRow>();
  for (const row of (data ?? []) as unknown as MemberRow[]) map.set(row.id, row);
  return map;
}

/**
 * Sends one warning and stamps the queue row. Returns true only when the email
 * actually left the building, so a suppressed send is retried on a later run
 * rather than silently marked as warned.
 */
async function sendWarning(
  stage: "notice" | "final",
  row: QueueRow,
  member: MemberRow,
): Promise<boolean> {
  if (!member.email || member.activity_state === "anonymized") return false;

  const firstName = member.first_name || member.full_name || "there";
  const copy = graceNoticeCopy(
    stage,
    member.correspondence_locale,
    firstName,
    row.scheduled_deletion_at,
  );
  const { sendMemberEmail } = await import("./member-email.server");

  const result = await sendMemberEmail({
    memberId: member.id,
    to: member.email,
    templateKey: stage === "notice" ? "member-grace-notice" : "member-grace-final-notice",
    subject: copy.subject,
    body: copy.body,
    template: {
      name: stage === "notice" ? "member-grace-notice" : "member-grace-final-notice",
      data: { subject: copy.subject, body: copy.body },
      // Keyed by the grace window, so one window can never mail twice even if
      // the sweep runs more than once in a day.
      idempotencyKey: `grace-${stage}-${row.member_id}-${row.scheduled_deletion_at.slice(0, 10)}`,
    },
  });
  if (!result.sent) return false;

  await supabaseAdmin
    .from("member_lifecycle_queue")
    .update(
      stage === "notice"
        ? { notified_at: new Date().toISOString() }
        : { final_notice_at: new Date().toISOString() },
    )
    .eq("id", row.id);
  return true;
}

/** One daily notice to the chapter office — counts only, never member data. */
async function sendOfficeDigest(due: number, nextDeletionAt: string | null): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const subject = `${due} member record${due === 1 ? "" : "s"} due for removal`;
  const body = `${due} member record${due === 1 ? " has" : "s have"} passed the end of the grace period and ${
    due === 1 ? "is" : "are"
  } waiting for confirmation.

Open the integration screen in the CMS, review the retention card, and use "Clean up" to complete the removal. Nothing is deleted automatically.

${nextDeletionAt ? `Next scheduled date after today: ${nextDeletionAt.slice(0, 10)}.` : ""}`;

  try {
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    await sendTemplateEmail("member-engagement", OFFICE_EMAIL, {
      idempotencyKey: `lifecycle-digest-${today}`,
      templateData: { subject, body },
    });
    return true;
  } catch (err) {
    console.error(
      `[member-lifecycle] office digest failed error=${JSON.stringify(
        err instanceof Error ? err.message : String(err),
      )}`,
    );
    return false;
  }
}

/** Nightly sweep: close returned members, warn the rest, alert on overdue rows. */
export async function runLifecycleSweep(): Promise<LifecycleSweepResult> {
  const rows = await openQueueRows();
  const members = await membersById(rows.map((row) => row.member_id));
  const now = Date.now();
  const result: LifecycleSweepResult = {
    resolved: 0,
    warned30: 0,
    warned7: 0,
    due: 0,
    digestSent: false,
  };

  let nextDeletionAt: string | null = null;

  for (const row of rows) {
    const member = members.get(row.member_id);

    // Back in the feed (or already anonymised): the row has no further work.
    if (!member || member.activity_state !== "grace") {
      await supabaseAdmin
        .from("member_lifecycle_queue")
        .update({
          resolved_at: new Date().toISOString(),
          resolution: member?.activity_state === "anonymized" ? "anonymized" : "reactivated",
        })
        .eq("id", row.id);
      result.resolved += 1;
      continue;
    }

    const deletionAt = new Date(row.scheduled_deletion_at).getTime();
    const daysLeft = Math.ceil((deletionAt - now) / DAY_MS);

    if (daysLeft <= 0) {
      result.due += 1;
      continue;
    }
    if (!nextDeletionAt || row.scheduled_deletion_at < nextDeletionAt) {
      nextDeletionAt = row.scheduled_deletion_at;
    }

    // A grace window shorter than the first lead time collapses to one
    // warning: we never mail two messages on the same day.
    if (daysLeft <= GRACE_FINAL_NOTICE_DAYS) {
      if (!row.final_notice_at && (await sendWarning("final", row, member))) result.warned7 += 1;
      continue;
    }
    if (daysLeft <= GRACE_NOTICE_DAYS && !row.notified_at) {
      if (await sendWarning("notice", row, member)) result.warned30 += 1;
    }
  }

  if (result.due > 0) {
    result.digestSent = await sendOfficeDigest(result.due, nextDeletionAt);
  }

  return result;
}

/** Read-only counts for the staff retention card. */
export async function loadRetentionSummary(): Promise<RetentionSummary> {
  const rows = await openQueueRows();
  const now = Date.now();
  let inGrace = 0;
  let warned30 = 0;
  let warned7 = 0;
  let due = 0;
  let nextDeletionAt: string | null = null;

  for (const row of rows) {
    const deletionAt = new Date(row.scheduled_deletion_at).getTime();
    if (deletionAt <= now) {
      due += 1;
      continue;
    }
    inGrace += 1;
    if (row.notified_at) warned30 += 1;
    if (row.final_notice_at) warned7 += 1;
    if (!nextDeletionAt || row.scheduled_deletion_at < nextDeletionAt) {
      nextDeletionAt = row.scheduled_deletion_at;
    }
  }

  return { inGrace, warned30, warned7, due, nextDeletionAt };
}
