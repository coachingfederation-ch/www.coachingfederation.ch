/**
 * Certificate server functions: public verification, staff issuing and the
 * member's own reprint list.
 *
 * Every write goes through a security-definer database routine that re-checks
 * both the caller's authority over the event and the attendance facts. Nothing
 * here decides entitlement from browser input.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertOrganizer } from "./authz";
import type { CertificateView } from "./certificates.server";

const tokenSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
});
const eventSchema = z.object({ eventId: z.string().uuid() });
const certificateSchema = z.object({ certificateId: z.string().uuid() });

/** Public verification read. Presentation facts only — never contact data. */
export const getCertificate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }): Promise<CertificateView | null> => {
    const { certificateByToken } = await import("./certificates.server");
    return certificateByToken(data.token);
  });

export type StaffCertificateRow = {
  id: string;
  registration_id: string;
  serial: string;
  public_token: string;
  status: string;
  holder_name: string;
  completed_on: string;
  cc_hours: number | null;
  rd_hours: number | null;
  email_status: string;
  email_error: string | null;
};

export type CertificateBoard = {
  certificatesEnabled: boolean;
  ccApproved: { cc: number | null; rd: number | null };
  checkedIn: number;
  issued: number;
  revoked: number;
  pendingEmails: number;
  rows: StaffCertificateRow[];
};

const BOARD_COLUMNS =
  "id, registration_id, serial, public_token, status, holder_name, completed_on, cc_hours, rd_hours, email_status, email_error";

/** Counts and per-attendee state for the staff panel, in one round trip. */
export const loadCertificateBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => eventSchema.parse(input))
  .handler(async ({ context, data }): Promise<CertificateBoard> => {
    await assertOrganizer(context);

    const [
      { data: event, error: eventError },
      { data: rows, error: rowsError },
      { count: checkedIn, error: countError },
    ] = await Promise.all([
      context.supabase
        .from("events")
        .select("certificates_enabled, cce_approved_cc_hours, cce_approved_rd_hours")
        .eq("id", data.eventId)
        .maybeSingle(),
      context.supabase
        .from("event_certificates")
        .select(BOARD_COLUMNS)
        .eq("event_id", data.eventId)
        .order("holder_name", { ascending: true }),
      context.supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", data.eventId)
        .not("checked_in_at", "is", null),
    ]);

    // A blocked read must never be rendered as "nothing issued yet" — that is
    // how a permission problem stayed invisible once already.
    const failure = eventError ?? rowsError ?? countError;
    if (failure) throw new Error(failure.message);

    const list = (rows ?? []) as StaffCertificateRow[];

    return {
      certificatesEnabled: event?.certificates_enabled ?? false,
      ccApproved: {
        cc: event?.cce_approved_cc_hours ?? null,
        rd: event?.cce_approved_rd_hours ?? null,
      },
      checkedIn: checkedIn ?? 0,
      issued: list.filter((r) => r.status === "issued").length,
      revoked: list.filter((r) => r.status === "revoked").length,
      pendingEmails: list.filter((r) => r.status === "issued" && r.email_status !== "sent").length,
      rows: list,
    };
  });

/**
 * Issues the batch for every checked-in attendee who does not have a live
 * certificate yet, then mails the ones that have not been mailed. Safe to run
 * twice: the routine is idempotent and the mailer claims each send.
 */
export const issueCompletionDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => eventSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("issue_event_completion", {
      _event_id: data.eventId,
      _actor: context.userId,
    });
    if (error) throw new Error(error.message);

    // The routine reports its own key names; skips are split by reason.
    const outcome = (result ?? {}) as {
      certificates_issued?: number;
      skipped_already?: number;
      skipped_ineligible?: number;
    };
    const { sendPendingCertificateEmails } = await import("./certificates.server");
    const mail = await sendPendingCertificateEmails(data.eventId);
    return {
      issued: Number(outcome.certificates_issued ?? 0),
      skipped: Number(outcome.skipped_already ?? 0) + Number(outcome.skipped_ineligible ?? 0),
      sent: mail.sent,
      failed: mail.failed,
    };
  });

export const revokeCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    certificateSchema.extend({ reason: z.string().max(300).optional() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("revoke_event_certificate", {
      _certificate_id: data.certificateId,
      _actor: context.userId,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);

    const { sendCertificateRevocation } = await import("./certificates.server");
    await sendCertificateRevocation(data.certificateId);
    return { ok: true };
  });

/** Mints a fresh serial from the current facts and mails the replacement. */
export const reissueCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => certificateSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("reissue_event_certificate", {
      _certificate_id: data.certificateId,
      _actor: context.userId,
    });
    if (error) throw new Error(error.message);

    const created = (result as { certificate_id?: string } | null)?.certificate_id;
    if (created) {
      const { sendCertificateEmail } = await import("./certificates.server");
      await sendCertificateEmail(created, { force: true });
    }
    return { certificateId: created ?? null };
  });

/** Resends one certificate email on request, even if it already went out. */
export const resendCertificateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => certificateSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);

    // Confirms through the caller's own RLS scope that this certificate is
    // one they may act on before the privileged mailer touches it.
    const { data: row } = await context.supabase
      .from("event_certificates")
      .select("id")
      .eq("id", data.certificateId)
      .maybeSingle();
    if (!row) throw new Error("Certificate not found");

    const { sendCertificateEmail } = await import("./certificates.server");
    return sendCertificateEmail(data.certificateId, { force: true });
  });

export type MemberCertificate = {
  id: string;
  serial: string;
  public_token: string;
  event_title_snapshot: string;
  completed_on: string;
  cc_hours: number | null;
  rd_hours: number | null;
};

/** The member's own certificates, newest first, for reprinting. */
export const listMyCertificates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MemberCertificate[]> => {
    const { data } = await context.supabase
      .from("event_certificates")
      .select("id, serial, public_token, event_title_snapshot, completed_on, cc_hours, rd_hours")
      .eq("status", "issued")
      .order("completed_on", { ascending: false });
    return (data ?? []) as MemberCertificate[];
  });
