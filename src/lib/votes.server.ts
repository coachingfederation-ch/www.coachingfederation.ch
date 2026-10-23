/**
 * Member votes: announcement and reminder emails (hourly cron).
 *
 * - Announcement: once, when a published vote with announcements switched on
 *   has opened. Goes to every active or grace member with a linked account.
 * - Reminder: once, three days before close, only to members who have not
 *   voted yet (participation rows say who voted, never what).
 *
 * Every send goes through `sendMemberEmail`, so TEST mode suppression and
 * redirects apply exactly as for every other member email.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SITE_URL } from "@/i18n/config";
import { sendMemberEmail } from "./member-email.server";
import { localized } from "./votes";
import type { Locale } from "@/i18n/config";

const REMINDER_DAYS = 3;

type Lang = "en" | "de" | "fr" | "it";
const COPY: Record<Lang, { open: string; remind: string; body: string; remindBody: string }> = {
  en: {
    open: "Your vote is open: {title}",
    remind: "Three days left to vote: {title}",
    body: "We are asking all members to vote on {title}.\n\n{summary}\n\nVoting is open until {close}. Sign in to read the proposal and cast your vote:\n{url}",
    remindBody:
      "Voting on {title} closes on {close}. You have not voted yet.\n\nSign in to read the proposal and cast your vote:\n{url}",
  },
  de: {
    open: "Ihre Abstimmung ist offen: {title}",
    remind: "Noch drei Tage zum Abstimmen: {title}",
    body: "Wir bitten alle Mitglieder um ihre Stimme zu {title}.\n\n{summary}\n\nDie Abstimmung ist bis {close} offen. Melden Sie sich an, um den Vorschlag zu lesen und abzustimmen:\n{url}",
    remindBody:
      "Die Abstimmung zu {title} endet am {close}. Sie haben noch nicht abgestimmt.\n\nMelden Sie sich an, um den Vorschlag zu lesen und abzustimmen:\n{url}",
  },
  fr: {
    open: "Votre vote est ouvert : {title}",
    remind: "Plus que trois jours pour voter : {title}",
    body: "Nous demandons à tous les membres de voter sur {title}.\n\n{summary}\n\nLe vote est ouvert jusqu'au {close}. Connectez-vous pour lire la proposition et voter :\n{url}",
    remindBody:
      "Le vote sur {title} se termine le {close}. Vous n'avez pas encore voté.\n\nConnectez-vous pour lire la proposition et voter :\n{url}",
  },
  it: {
    open: "La votazione è aperta: {title}",
    remind: "Ancora tre giorni per votare: {title}",
    body: "Chiediamo a tutti i membri di votare su {title}.\n\n{summary}\n\nLa votazione è aperta fino al {close}. Accedi per leggere la proposta e votare:\n{url}",
    remindBody:
      "La votazione su {title} si chiude il {close}. Non hai ancora votato.\n\nAccedi per leggere la proposta e votare:\n{url}",
  },
};

const LOCALE_TAG: Record<Lang, string> = { en: "en-US", de: "de-CH", fr: "fr-CH", it: "it-CH" };

function fill(s: string, vars: Record<string, string>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

type Recipient = { id: string; email: string; correspondence_locale: string | null };

async function recipients(excludeVoteId?: string): Promise<Recipient[]> {
  const { data } = await supabaseAdmin
    .from("members")
    .select("id, email, correspondence_locale")
    .in("activity_state", ["active", "grace"])
    .not("auth_user_id", "is", null)
    .not("email", "is", null);
  let list = (data ?? []) as Recipient[];
  if (excludeVoteId) {
    const { data: voted } = await supabaseAdmin
      .from("vote_participations")
      .select("member_id")
      .eq("vote_id", excludeVoteId);
    const done = new Set((voted ?? []).map((r) => r.member_id));
    list = list.filter((m) => !done.has(m.id));
  }
  return list;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendAll(vote: any, kind: "open" | "remind", list: Recipient[]) {
  let sent = 0;
  for (const m of list) {
    const lang = (["de", "fr", "it"].includes(m.correspondence_locale ?? "")
      ? m.correspondence_locale
      : "en") as Lang;
    const c = COPY[lang];
    const vars = {
      title: localized(vote, "title", lang as Locale),
      summary: localized(vote, "summary", lang as Locale),
      close: new Date(vote.closes_at).toLocaleDateString(LOCALE_TAG[lang], {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "Europe/Zurich",
      }),
      url: `${SITE_URL}/member/votes/${vote.slug}`,
    };
    const subject = fill(kind === "open" ? c.open : c.remind, vars);
    const body = fill(kind === "open" ? c.body : c.remindBody, vars);
    const result = await sendMemberEmail({
      memberId: m.id,
      to: m.email,
      templateKey: `vote_${kind}`,
      subject,
      body,
      template: {
        name: "member-engagement",
        data: { subject, body, baseUrl: SITE_URL },
        idempotencyKey: `vote-${kind}-${vote.id}-${m.id}`,
      },
    });
    if (result.sent) sent += 1;
  }
  return sent;
}

export async function runVoteEmails(now: Date = new Date()) {
  const { loadFeatureFlagsServer } = await import("./feature-flags.server");
  if (!(await loadFeatureFlagsServer()).votes) return { announced: 0, reminded: 0 };

  const iso = now.toISOString();
  const { data: votes } = await supabaseAdmin
    .from("votes")
    .select("*")
    .eq("status", "published")
    .lte("opens_at", iso)
    .gt("closes_at", iso);

  let announced = 0;
  let reminded = 0;
  for (const vote of votes ?? []) {
    if (!vote.announce_enabled) continue;
    if (!vote.announced_at) {
      // Mark first so an overlapping run cannot announce twice.
      const { data: claimed } = await supabaseAdmin
        .from("votes")
        .update({ announced_at: iso })
        .eq("id", vote.id)
        .is("announced_at", null)
        .select("id");
      if (claimed?.length) announced += await sendAll(vote, "open", await recipients());
      continue;
    }
    const remindFrom = new Date(vote.closes_at).getTime() - REMINDER_DAYS * 86_400_000;
    if (!vote.reminded_at && now.getTime() >= remindFrom) {
      const { data: claimed } = await supabaseAdmin
        .from("votes")
        .update({ reminded_at: iso })
        .eq("id", vote.id)
        .is("reminded_at", null)
        .select("id");
      if (claimed?.length) reminded += await sendAll(vote, "remind", await recipients(vote.id));
    }
  }
  return { announced, reminded };
}
