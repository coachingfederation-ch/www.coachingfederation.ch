/**
 * The five dashboard panels. Each takes its slice of the server payload plus
 * an export callback; none of them computes a metric.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  CoachFinderPanelData,
  ContentPanelData,
  ConversationsPanelData,
  EventsPanelData,
  MembersPanelData,
  Slice,
} from "@/lib/chapter-overview";
import { ChartFrame, Panel, SliceList, StatCard } from "./OverviewPrimitives";

const AXIS = { fontSize: 11 };
const PIE_TOKENS = [
  "var(--color-primary)",
  "var(--color-accent)",
  "var(--color-teal)",
  "var(--color-highlight)",
  "var(--color-cyan)",
  "var(--color-warn)",
];

type T = (k: string) => string;

function Donut({ slices }: { slices: Slice[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={slices} dataKey="value" nameKey="label" innerRadius="55%" outerRadius="85%">
          {slices.map((s, i) => (
            <Cell key={s.label} fill={PIE_TOKENS[i % PIE_TOKENS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={AXIS} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ContentPanel({
  data,
  t,
  onExport,
  exporting,
}: {
  data: ContentPanelData;
  t: T;
  onExport: () => void;
  exporting: boolean;
}) {
  return (
    <Panel
      title={t("overview.content.title")}
      description={t("overview.content.description")}
      exportLabel={t("overview.export")}
      onExport={onExport}
      exporting={exporting}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label={t("overview.content.articles")} value={String(data.articlesPublished)} />
        <StatCard label={t("overview.content.newsletters")} value={String(data.newslettersSent)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartFrame title={t("overview.content.trend")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.articlesByBucket}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={AXIS} />
              <YAxis allowDecimals={false} tick={AXIS} />
              <Tooltip />
              <Legend wrapperStyle={AXIS} />
              <Bar
                dataKey="articles"
                name={t("overview.content.articles")}
                fill="var(--color-primary)"
              />
              <Bar
                dataKey="newsletters"
                name={t("overview.content.newsletters")}
                fill="var(--color-accent)"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
        <SliceList
          title={t("overview.content.languages")}
          slices={data.articleLanguages}
          empty={t("overview.noData")}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SliceList
          title={t("overview.content.statusMix")}
          slices={data.articleStatus}
          empty={t("overview.noData")}
        />
        <div className="rounded-2xl border border-border bg-background p-4">
          <h3 className="text-sm font-semibold">{t("overview.content.sentList")}</h3>
          {data.newsletters.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">{t("overview.noData")}</p>
          ) : (
            <ul className="mt-3 space-y-2 text-xs">
              {data.newsletters.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium">{n.title}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {n.language.toUpperCase()} · {n.publishedAt?.slice(0, 10) ?? "—"} ·{" "}
                    {t("overview.content.blocks")}: {n.blocks}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}

export function EventsPanel({
  data,
  t,
  money,
  onExport,
  exporting,
}: {
  data: EventsPanelData;
  t: T;
  money: (cents: number) => string;
  onExport: () => void;
  exporting: boolean;
}) {
  return (
    <Panel
      title={t("overview.events.title")}
      description={t("overview.events.description")}
      exportLabel={t("overview.export")}
      onExport={onExport}
      exporting={exporting}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("overview.events.events")} value={String(data.events)} />
        <StatCard label={t("overview.events.registrations")} value={String(data.registrations)} />
        <StatCard
          label={t("overview.events.checkIns")}
          value={String(data.checkIns)}
          hint={data.attendanceRate === null ? null : `${data.attendanceRate}%`}
        />
        <StatCard label={t("overview.events.net")} value={money(data.netCents)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartFrame title={t("overview.events.trend")}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.byBucket}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={AXIS} />
              <YAxis allowDecimals={false} tick={AXIS} />
              <Tooltip />
              <Legend wrapperStyle={AXIS} />
              <Line
                type="monotone"
                dataKey="registrations"
                name={t("overview.events.registrations")}
                stroke="var(--color-primary)"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="checkIns"
                name={t("overview.events.checkIns")}
                stroke="var(--color-teal)"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="events"
                name={t("overview.events.events")}
                stroke="var(--color-accent)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
        <ChartFrame title={t("overview.events.statusMix")}>
          <Donut slices={data.statusMix} />
        </ChartFrame>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("overview.events.cceEvents")}
          value={String(data.cce.events)}
          hint={`${t("overview.events.cceAwards")}: ${data.cce.awards}`}
        />
        <StatCard
          label={t("overview.events.cceHours")}
          value={`${data.cce.ccHours} / ${data.cce.rdHours}`}
          hint={t("overview.events.cceHoursHint")}
        />
        <StatCard
          label={t("overview.events.certificates")}
          value={String(data.cce.certificates)}
          hint={`${t("overview.events.certificateEvents")}: ${data.cce.certificateEvents}`}
        />
        <StatCard
          label={t("overview.events.guestPasses")}
          value={String(data.guestPasses.issued)}
          hint={`${t("overview.events.approved")}: ${data.guestPasses.approved} · ${t("overview.events.pending")}: ${data.guestPasses.pending} · ${t("overview.events.declined")}: ${data.guestPasses.declined}`}
        />
      </div>
    </Panel>
  );
}

export function MembersPanel({
  data,
  t,
  onExport,
  exporting,
}: {
  data: MembersPanelData;
  t: T;
  onExport: () => void;
  exporting: boolean;
}) {
  return (
    <Panel
      title={t("overview.members.title")}
      description={t("overview.members.description")}
      exportLabel={t("overview.export")}
      onExport={onExport}
      exporting={exporting}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("overview.members.total")}
          value={String(data.total)}
          hint={t("overview.currentState")}
        />
        <StatCard
          label={t("overview.members.active")}
          value={String(data.active)}
          hint={`${t("overview.members.grace")}: ${data.grace} · ${t("overview.members.inactive")}: ${data.inactive}`}
        />
        <StatCard
          label={t("overview.members.claimed")}
          value={String(data.claimed)}
          hint={`${t("overview.members.unclaimed")}: ${data.unclaimed}`}
        />
        <StatCard label={t("overview.members.joined")} value={String(data.joined)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartFrame title={t("overview.members.trend")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.joinedByBucket}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={AXIS} />
              <YAxis allowDecimals={false} tick={AXIS} />
              <Tooltip />
              <Bar
                dataKey="members"
                name={t("overview.members.joined")}
                fill="var(--color-primary)"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
        <SliceList
          title={t("overview.members.credentials")}
          slices={data.credentials}
          empty={t("overview.noData")}
        />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {data.lastSync
          ? `${t("overview.members.lastSync")}: ${data.lastSync.status} · ${
              data.lastSync.finishedAt?.slice(0, 16).replace("T", " ") ?? "—"
            } · +${data.lastSync.created} / ~${data.lastSync.updated} / −${data.lastSync.deactivated}`
          : t("overview.members.noSync")}
      </p>
    </Panel>
  );
}

export function CoachFinderPanel({
  data,
  t,
  onExport,
  exporting,
}: {
  data: CoachFinderPanelData;
  t: T;
  onExport: () => void;
  exporting: boolean;
}) {
  return (
    <Panel
      title={t("overview.finder.title")}
      description={t("overview.finder.description")}
      exportLabel={t("overview.export")}
      onExport={onExport}
      exporting={exporting}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("overview.finder.published")}
          value={String(data.published)}
          hint={t("overview.currentState")}
        />
        <StatCard label={t("overview.finder.hidden")} value={String(data.hidden)} />
        <StatCard
          label={t("overview.finder.languages")}
          value={String(data.languages.length)}
          hint={`${t("overview.finder.regions")}: ${data.regions.length}`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartFrame title={t("overview.finder.visibility")}>
          <Donut slices={data.visibility} />
        </ChartFrame>
        <SliceList
          title={t("overview.finder.credentials")}
          slices={data.credentials}
          empty={t("overview.noData")}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <SliceList
          title={t("overview.finder.languages")}
          slices={data.languages}
          empty={t("overview.noData")}
        />
        <SliceList
          title={t("overview.finder.regions")}
          slices={data.regions}
          empty={t("overview.noData")}
        />
        <SliceList
          title={t("overview.finder.specialisations")}
          slices={data.specialisations}
          empty={t("overview.noData")}
        />
      </div>
    </Panel>
  );
}

export function ConversationsPanel({
  data,
  t,
  onExport,
  exporting,
}: {
  data: ConversationsPanelData;
  t: T;
  onExport: () => void;
  exporting: boolean;
}) {
  const merged = data.agent.byBucket.map((p, i) => ({
    date: p.date,
    interactions: Number(p.interactions ?? 0),
    conversations: Number(data.live.byBucket[i]?.conversations ?? 0),
    answered: Number(data.live.byBucket[i]?.answered ?? 0),
  }));

  return (
    <Panel
      title={t("overview.chat.title")}
      description={t("overview.chat.description")}
      exportLabel={t("overview.export")}
      onExport={onExport}
      exporting={exporting}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("overview.chat.agentConversations")}
          value={String(data.agent.conversations)}
          hint={`${t("overview.chat.interactions")}: ${data.agent.interactions}`}
        />
        <StatCard
          label={t("overview.chat.escalationRate")}
          value={data.agent.escalationRate === null ? "—" : `${data.agent.escalationRate}%`}
          hint={
            data.agent.helpfulRate === null
              ? null
              : `${t("overview.chat.helpfulRate")}: ${data.agent.helpfulRate}%`
          }
        />
        <StatCard
          label={t("overview.chat.liveConversations")}
          value={String(data.live.conversations)}
          hint={`${t("overview.chat.messages")}: ${data.live.messages}`}
        />
        <StatCard
          label={t("overview.chat.answerRate")}
          value={data.live.answerRate === null ? "—" : `${data.live.answerRate}%`}
          hint={`${t("overview.chat.answered")}: ${data.live.answered}`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartFrame title={t("overview.chat.trend")}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={merged}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={AXIS} />
              <YAxis allowDecimals={false} tick={AXIS} />
              <Tooltip />
              <Legend wrapperStyle={AXIS} />
              <Line
                type="monotone"
                dataKey="interactions"
                name={t("overview.chat.interactions")}
                stroke="var(--color-primary)"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="conversations"
                name={t("overview.chat.liveConversations")}
                stroke="var(--color-teal)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
        <div className="grid gap-4">
          <SliceList
            title={t("overview.chat.outcomes")}
            slices={data.agent.outcomes}
            empty={t("overview.noData")}
          />
          <SliceList
            title={t("overview.chat.categories")}
            slices={data.agent.topCategories}
            empty={t("overview.noData")}
          />
        </div>
      </div>
    </Panel>
  );
}
