/**
 * Staff-side preview of the public structure map.
 *
 * Read-only: it reuses the same public directory read the /team page uses, so
 * admins see exactly what visitors see, enriched with the staff-only
 * organizational / project-team split that the public projects view does not
 * expose. Members who are not visible publicly therefore do not appear here.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/icf-welcome-design-system-a835df";
import { StructureMap } from "@/components/team/StructureMap";
import { useI18n } from "@/i18n";
import { listTeamDirectory } from "@/lib/team.functions";
import type { useCms } from "@/i18n/cms";
import type { ProjectRow } from "@/components/cms/ops/types";

export function StructureMapPanel({
  t,
  projects,
}: {
  t: ReturnType<typeof useCms>["t"];
  projects: ProjectRow[];
}) {
  const { t: tPublic } = useI18n();
  const { data, isPending } = useQuery({
    queryKey: ["team-directory", "en"],
    queryFn: () => listTeamDirectory({ data: { locale: "en" } }),
  });

  // The public read decides which projects are shown; the staff rows decide
  // which group each one lands in.
  const mapProjects = useMemo(() => {
    const flags = new Map(projects.map((p) => [p.slug, p]));
    return (data?.projects ?? []).map((p) => ({
      slug: p.slug,
      label: p.label,
      isCommunity: p.isCommunity,
      isProjectTeam: flags.get(p.slug)?.is_project_team ?? false,
    }));
  }, [data, projects]);

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>{t("ops.map.title")}</CardTitle>
        <CardDescription>{t("ops.map.note")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <p className="text-sm text-muted-foreground">{t("ops.map.loading")}</p>
        ) : (
          <StructureMap
            projects={mapProjects}
            members={data?.members ?? []}
            labels={{
              root: tPublic("team.map.root"),
              organizational: tPublic("team.map.group.organizational"),
              projectTeams: tPublic("team.map.group.projectTeams"),
              communities: tPublic("team.map.group.communities"),
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
