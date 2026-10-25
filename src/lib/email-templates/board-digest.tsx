/**
 * Board digest — the weekly (or fortnightly) summary for the board's group
 * mailbox. Staff-facing and English-only, like the other internal notices.
 * Exports: template. Registered in registry.ts.
 *
 * Shared email chrome comes from AuthEmailShell, matching the chapter's other
 * emails. Report-specific inline styles remain compatible with email clients.
 */
import * as React from "react";
import {
  Button,
  Column,
  Heading,
  Hr,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { EmailTemplateData, TemplateEntry } from "./registry";
import type { BoardDigestData, DigestList } from "../board-digest";
import type { Delta } from "../chapter-overview";
import { AuthEmailShell } from "./auth-shell";

interface Props {
  digest?: BoardDigestData;
  test?: boolean;
}

const KPI_LABELS: [keyof BoardDigestData["kpis"], string][] = [
  ["newMembers", "New members"],
  ["articles", "Articles published"],
  ["newsletters", "Newsletters"],
  ["events", "Events"],
  ["registrations", "Registrations"],
  ["checkIns", "Check-ins"],
  ["guestPasses", "Guest passes"],
  ["chatConversations", "Assistant conversations"],
];

function trend(d: Delta): string {
  const diff = d.current - d.previous;
  if (diff === 0) return "same as before";
  return `${diff > 0 ? "+" : ""}${diff} vs. previous period`;
}

const pct = (v: number | null) => (v === null ? "n/a" : `${v}%`);

function List({ list, empty }: { list?: DigestList; empty: string }) {
  if (!list || list.total === 0) return <Text style={muted}>{empty}</Text>;
  return (
    <>
      {list.items.map((item, i) => (
        <Text key={i} style={listRow}>
          <strong>{item.primary}</strong>
          {item.secondary ? ` · ${item.secondary}` : ""}
          {item.tertiary ? <span style={{ color: "#5b5f7a" }}>{` · ${item.tertiary}`}</span> : null}
        </Text>
      ))}
      {list.more > 0 ? <Text style={muted}>{`and ${list.more} more`}</Text> : null}
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Hr style={hr} />
      <Heading as="h2" style={h2}>
        {children}
      </Heading>
    </>
  );
}

const Email = ({ digest, test }: Props) => {
  if (!digest) return null;
  const { members, articles, events, assistant, operations } = digest;
  return (
    <AuthEmailShell
      preview={`Platform update for ${digest.periodLabel}`}
      tag={test ? "Board digest · test send" : "Board digest"}
      heading="What happened on the platform"
    >
            <Text style={paragraph}>{digest.periodLabel}</Text>

            <SectionTitle>At a glance</SectionTitle>
            {KPI_LABELS.map(([key, label]) => (
              <Row key={key} style={{ marginBottom: "6px" }}>
                <Column style={kpiLabel}>{label}</Column>
                <Column style={kpiValue}>{digest.kpis[key].current}</Column>
                <Column style={kpiTrend}>{trend(digest.kpis[key])}</Column>
              </Row>
            ))}

            {members ? (
              <>
                <SectionTitle>Members</SectionTitle>
                <Text style={h3}>{`New members (${members.newMembers.total})`}</Text>
                <List list={members.newMembers} empty="No new members." />
                <Text style={h3}>Changes</Text>
                {members.changes.length ? (
                  members.changes.map((c) => (
                    <Text key={c.label} style={listRow}>{`${c.label}: ${c.count}`}</Text>
                  ))
                ) : (
                  <Text style={muted}>No member changes recorded.</Text>
                )}
                <List list={members.changedMembers} empty="" />
                <Text style={h3}>{`Entered the grace period (${members.enteredGrace.total})`}</Text>
                <List list={members.enteredGrace} empty="Nobody entered the grace period." />
                <Text style={h3}>{`Left the chapter (${members.deactivated.total})`}</Text>
                <List list={members.deactivated} empty="Nobody left." />
                <Text style={h3}>Retention right now</Text>
                <Text style={listRow}>
                  {`${members.retention.pastExpiry} past expiry · ${members.retention.inGrace} in grace period · ${members.retention.due} due for removal`}
                </Text>
              </>
            ) : null}

            {articles ? (
              <>
                <SectionTitle>{`New articles (${articles.total})`}</SectionTitle>
                <List list={articles} empty="No new articles." />
              </>
            ) : null}

            {events ? (
              <>
                <SectionTitle>{`New events (${events.total})`}</SectionTitle>
                <List list={events} empty="No new events." />
              </>
            ) : null}

            {assistant ? (
              <>
                <SectionTitle>Assistant</SectionTitle>
                <Text style={listRow}>
                  {`${assistant.total} conversations · ${pct(assistant.successRate)} answered · ${pct(assistant.escalationRate)} passed to the office · ${pct(assistant.helpfulRate)} rated helpful`}
                </Text>
                {assistant.topCategories.length ? (
                  <>
                    <Text style={h3}>Most asked about</Text>
                    {assistant.topCategories.map((c) => (
                      <Text key={c.label} style={listRow}>{`${c.label}: ${c.count}`}</Text>
                    ))}
                  </>
                ) : null}
                <Text style={h3}>Passed to the office</Text>
                <List list={assistant.escalations} empty="None." />
              </>
            ) : null}

            {operations ? (
              <>
                <SectionTitle>Operational structure change log</SectionTitle>
                <Text style={listRow}>
                  {`${operations.assigned} assigned · ${operations.unassigned} removed`}
                </Text>
                <List list={operations.entries} empty="No changes." />
              </>
            ) : null}

            <Section style={{ margin: "28px 0 0" }}>
              <Button href={digest.overviewUrl} style={button}>
                Open the chapter overview
              </Button>
            </Section>
            <Text style={muted}>
              Sent to the board mailbox configured on the Integration page. Member names are
              included for board use only; please do not forward.
            </Text>
    </AuthEmailShell>
  );
};

const emptyList = { items: [], more: 0, total: 0 };
const delta = (current: number, previous: number) => ({ current, previous });

export const template: TemplateEntry = {
  component: Email as unknown as TemplateEntry["component"],
  subject: (data: EmailTemplateData) => {
    const d = data["digest"] as BoardDigestData | undefined;
    return `${data["test"] ? "[Test] " : ""}Board digest${d ? `: ${d.periodLabel}` : ""}`;
  },
  displayName: "Board digest",
  previewData: {
    digest: {
      periodLabel: "Monday, October 12 to Monday, October 19",
      from: "2026-10-12T05:00:00.000Z",
      to: "2026-10-19T05:00:00.000Z",
      kpis: {
        articles: delta(3, 2),
        newsletters: delta(1, 1),
        events: delta(4, 2),
        registrations: delta(38, 21),
        checkIns: delta(17, 9),
        newMembers: delta(2, 3),
        guestPasses: delta(1, 0),
        chatConversations: delta(24, 19),
      },
      sections: { members: true, articles: true, events: true, assistant: true, operations: true },
      members: {
        newMembers: {
          items: [{ primary: "Anna Muster", secondary: "PCC", tertiary: "Zürich" }],
          more: 0,
          total: 1,
        },
        changes: [{ label: "Credential upgrades", count: 1 }],
        changedMembers: {
          items: [{ primary: "Max Muster", secondary: "Credential upgrades" }],
          more: 0,
          total: 1,
        },
        deactivated: emptyList,
        enteredGrace: emptyList,
        retention: { inGrace: 4, due: 0, pastExpiry: 6 },
      },
      articles: {
        items: [
          { primary: "Coaching in times of change", secondary: "Anna Muster", tertiary: "draft" },
        ],
        more: 0,
        total: 1,
      },
      events: {
        items: [
          {
            primary: "Peer coaching evening",
            secondary: "Max Muster · Bern",
            tertiary: "Thursday, November 5 · published",
          },
        ],
        more: 0,
        total: 1,
      },
      assistant: {
        total: 24,
        successRate: 79.2,
        escalationRate: 8.3,
        helpfulRate: 90,
        topCategories: [{ label: "Membership", count: 9 }],
        escalations: emptyList,
      },
      operations: {
        assigned: 1,
        unassigned: 0,
        entries: {
          items: [
            {
              primary: "Assigned: Anna Muster",
              secondary: "Zürich · Lead",
              tertiary: "Monday, November 2 · by Max Muster",
            },
          ],
          more: 0,
          total: 1,
        },
      },
      overviewUrl: "https://new.coachingfederation.ch/manage",
    } satisfies BoardDigestData,
  },
};

const h2 = { fontSize: "17px", color: "#2b379b", margin: "0 0 12px", fontWeight: 600 };
const h3 = { fontSize: "13px", color: "#212251", fontWeight: 700, margin: "16px 0 6px" };
const hr = { borderColor: "#ece4d6", margin: "24px 0 16px" };
const paragraph = { fontSize: "14px", color: "#5b5f7a", lineHeight: "1.6", margin: 0 };
const listRow = { fontSize: "14px", color: "#212251", lineHeight: "1.5", margin: "0 0 4px" };
const kpiLabel = { fontSize: "14px", color: "#212251", width: "55%" };
const kpiValue = { fontSize: "16px", color: "#212251", fontWeight: 700, width: "15%" };
const kpiTrend = { fontSize: "12px", color: "#5b5f7a", width: "30%" };
const button = {
  backgroundColor: "#2b379b",
  borderRadius: "999px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  padding: "12px 24px",
  textDecoration: "none",
};
const muted = { fontSize: "13px", color: "#5b5f7a", lineHeight: "1.5", margin: "8px 0 0" };
