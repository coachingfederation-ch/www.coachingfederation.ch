/**
 * Map of the internal CMS screens for the staff support agent.
 * Exports: STAFF_SCREENS, screenFor, staffScreenMap, starterQuestionsFor.
 *
 * This is the small built-in floor of what the agent knows: what each internal
 * screen is for and which record type lives there. Everything topical —
 * "what happens when I publish?" — comes from the internal knowledge entries
 * admins maintain in /manage/knowledge, not from here.
 *
 * Client-safe on purpose: the panel uses the same table to pick its starter
 * questions, so the suggestions and the agent's route map cannot drift apart.
 */

export type StaffRecordKind = "event" | "article" | "newsletter";

export type StaffScreen = {
  /** Path prefix, longest match wins. */
  prefix: string;
  title: string;
  summary: string;
  /** Record type an id in this path refers to, when the screen has one. */
  record?: StaffRecordKind;
  /** Suggested opening questions, shown in the panel and never sent as-is. */
  starters: string[];
};

export const STAFF_SCREENS: StaffScreen[] = [
  {
    prefix: "/manage/events",
    title: "Events",
    summary:
      "Create and edit events: dates, location mode, registration, ticket tiers, discount codes, invitations and guest lists, CCE credits, attendance, certificates, recaps and LinkedIn posts.",
    record: "event",
    starters: [
      "What does each registration audience change?",
      "How do ticket tiers decide the price someone pays?",
      "What do I need before I can request CCE credits?",
    ],
  },
  {
    prefix: "/manage/newsletters",
    title: "Newsletters",
    summary:
      "Build newsletters from blocks, draft copy with AI, preview the real email and schedule the send.",
    record: "newsletter",
    starters: [
      "How do I preview and test this newsletter?",
      "Can a newsletter be edited after it is sent?",
    ],
  },
  {
    prefix: "/manage/guest-passes",
    title: "Guest passes",
    summary:
      "Membership & Engagement queue for guest pass requests: waiting for guest, pending, approved, declined.",
    starters: [
      "Why can I not approve this request yet?",
      "What does the guest see after a member invites them?",
    ],
  },
  {
    prefix: "/manage/knowledge",
    title: "Assistant knowledge",
    summary:
      "FAQs and notes for the two assistants. Public entries feed the website assistant, internal entries feed this support agent.",
    starters: [
      "What is the difference between a public and an internal entry?",
      "In which language should I write an entry?",
    ],
  },
  {
    prefix: "/manage/integration",
    title: "Integrations",
    summary: "Member sync with ICF Global, payment mode and maintenance jobs.",
    starters: ["What does the member sync do?"],
  },
  {
    prefix: "/manage",
    title: "Chapter overview",
    summary:
      "Dashboard of chapter activity: members, events, registrations, articles and newsletters over time, with CSV exports.",
    starters: ["What does this dashboard count as an active member?"],
  },
  {
    prefix: "/articles",
    title: "Insights articles",
    summary:
      "Write, translate, schedule and publish Insights articles, including lead images and LinkedIn posts.",
    record: "article",
    starters: [
      "What is missing before I can publish this?",
      "How do translations work here?",
      "What happens if I unpublish an article?",
    ],
  },
  {
    prefix: "/members",
    title: "Members",
    summary:
      "Member records synced from ICF Global, directory visibility, claim status and lifecycle state.",
    starters: ["Why is a member not visible in the coach directory?"],
  },
  {
    prefix: "/roles",
    title: "Roles and rights",
    summary:
      "Grant and remove rights for members and internal accounts, and review the change history.",
    starters: [
      "What can each role do?",
      "Does giving someone Editor change their membership?",
    ],
  },
  {
    prefix: "/vocabularies",
    title: "Vocabularies",
    summary:
      "The shared lists behind the coach finder and profiles: regions, languages, specialisations, formats, client types, credentials.",
    starters: ["Where do these lists show up on the public site?"],
  },
  {
    prefix: "/coach-finder",
    title: "Coach finder settings",
    summary: "Rules and copy for the public coach directory.",
    starters: ["Which coaches appear in the directory?"],
  },
  {
    prefix: "/operational-structure",
    title: "Operational structure",
    summary: "Board, teams, roles and volunteering opportunities shown on the public site.",
    starters: ["How do I add a new volunteering role?"],
  },
  {
    prefix: "/governance",
    title: "Governance documents",
    summary: "Statutes, policies and reports published for members.",
    starters: ["Who can see a governance document?"],
  },
  {
    prefix: "/my-profile",
    title: "My coach profile",
    summary: "Your own directory profile as a credentialed coach.",
    starters: ["What makes my profile appear in the directory?"],
  },
];

/** Longest-prefix match for a pathname, ignoring the locale prefix. */
export function screenFor(pathname: string): StaffScreen | undefined {
  const path = pathname.replace(/^\/(de|fr|it|en)(?=\/|$)/, "") || "/";
  return STAFF_SCREENS.filter(
    (screen) => path === screen.prefix || path.startsWith(`${screen.prefix}/`),
  ).sort((a, b) => b.prefix.length - a.prefix.length)[0];
}

/** Compact route map for the system prompt. */
export function staffScreenMap(): string {
  return STAFF_SCREENS.map((screen) => `- ${screen.prefix} — ${screen.title}: ${screen.summary}`)
    .join("\n");
}

export function starterQuestionsFor(pathname: string): string[] {
  return screenFor(pathname)?.starters ?? [
    "What can I do on this screen?",
    "Who is allowed to see what I publish here?",
  ];
}
