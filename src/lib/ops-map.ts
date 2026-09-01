/**
 * Pure builder for the nested-circle view of the operational structure.
 *
 * Turns the two reads the team surfaces already do — active projects plus the
 * privacy-filtered volunteer list with their assignments — into a four-level
 * tree: chapter → structure group → team → role → person.
 *
 * No I/O and no personal data beyond what `TeamMember` already carries, so the
 * same builder feeds the public map and the staff-side preview.
 */
import type { TeamMember } from "@/lib/team";

export type MapKind = "root" | "group" | "team" | "role" | "person";

export type MapNode = {
  id: string;
  name: string;
  kind: MapKind;
  /** Structure group the node belongs to — drives the circle colour. */
  group: GroupKey;
  children?: MapNode[];
  /** Only set on person leaves, so the map can open the shared member modal. */
  member?: TeamMember;
};

export type GroupKey = "organizational" | "projectTeams" | "communities";

export type MapProject = {
  slug: string;
  label: string;
  isCommunity: boolean;
  /** Not exposed on the public projects view yet; staff data sets it. */
  isProjectTeam?: boolean;
};

export type MapLabels = Record<GroupKey, string> & { root: string };

const GROUP_ORDER: GroupKey[] = ["organizational", "projectTeams", "communities"];

export function groupOf(project: MapProject): GroupKey {
  if (project.isCommunity) return "communities";
  if (project.isProjectTeam) return "projectTeams";
  return "organizational";
}

/**
 * Build the tree. Teams without a single assigned person are dropped: the
 * public data carries no empty roles, so an empty circle would be misleading.
 */
export function buildStructureTree(
  projects: MapProject[],
  members: TeamMember[],
  labels: MapLabels,
): MapNode {
  const groups: MapNode[] = [];

  for (const key of GROUP_ORDER) {
    const teams: MapNode[] = [];

    for (const project of projects.filter((p) => groupOf(p) === key)) {
      // role label → the people holding it in this project
      const roles = new Map<string, TeamMember[]>();
      for (const member of members) {
        for (const assignment of member.assignments) {
          if (assignment.projectSlug !== project.slug) continue;
          const list = roles.get(assignment.role) ?? [];
          list.push(member);
          roles.set(assignment.role, list);
        }
      }
      if (roles.size === 0) continue;

      teams.push({
        id: `team:${project.slug}`,
        name: project.label,
        kind: "team",
        group: key,
        children: [...roles.entries()].map(([role, people]) => ({
          id: `role:${project.slug}:${role}`,
          name: role,
          kind: "role" as const,
          group: key,
          children: people.map((person) => ({
            id: `person:${project.slug}:${role}:${person.memberId}`,
            name: person.name,
            kind: "person" as const,
            group: key,
            member: person,
          })),
        })),
      });
    }

    if (teams.length) {
      groups.push({ id: `group:${key}`, name: labels[key], kind: "group", group: key, children: teams });
    }
  }

  return { id: "root", name: labels.root, kind: "root", group: "organizational", children: groups };
}

/** Distinct people below a node — used for the circle caption. */
export function countPeople(node: MapNode): number {
  if (node.kind === "person") return 1;
  const ids = new Set<string>();
  const walk = (n: MapNode) => {
    if (n.kind === "person" && n.member) ids.add(n.member.memberId);
    n.children?.forEach(walk);
  };
  walk(node);
  return ids.size;
}
