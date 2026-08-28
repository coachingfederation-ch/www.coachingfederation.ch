/**
 * The at-a-glance strip. Each card carries the change against the preceding
 * period of the same length, computed on the server.
 */
import { deltaLabel, type Delta, type OverviewKpis } from "@/lib/chapter-overview";
import { StatCard } from "./OverviewPrimitives";

export function OverviewKpiGrid({
  kpis,
  t,
  comparedLabel,
}: {
  kpis: OverviewKpis;
  t: (k: string) => string;
  comparedLabel: string;
}) {
  const card = (key: keyof OverviewKpis, delta: Delta) => (
    <StatCard
      key={key}
      label={t(`overview.kpi.${key}`)}
      value={String(delta.current)}
      trend={deltaLabel(delta)}
      hint={`${comparedLabel}: ${delta.previous}`}
    />
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {card("articles", kpis.articles)}
      {card("newsletters", kpis.newsletters)}
      {card("events", kpis.events)}
      {card("registrations", kpis.registrations)}
      {card("checkIns", kpis.checkIns)}
      {card("newMembers", kpis.newMembers)}
      {card("guestPasses", kpis.guestPasses)}
      {card("chatConversations", kpis.chatConversations)}
    </div>
  );
}
