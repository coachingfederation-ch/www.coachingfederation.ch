/**
 * Shared types and layout constants for the operational-structure admin
 * screen and its sub-components (project list, project form, role and
 * assignment editor).
 */
export type Localized = {
  id: string;
  slug: string;
  name: string;
  name_de: string | null;
  name_fr: string | null;
  name_it: string | null;
  sort_order: number;
  is_active: boolean;
};

import type { CommunityFields } from "@/components/cms/CommunityPanel";

/** Projects carry the community fields too; roles never do. */
export type ProjectRow = Localized & CommunityFields & { is_project_team: boolean };

export type Assignment = {
  id: string;
  member_id: string;
  role_id: string;
  sort_order: number;
  member: { full_name: string | null; email: string | null; auth_user_id: string | null } | null;
};

export type MemberOption = { id: string; full_name: string | null; auth_user_id: string | null };

export const LOCALE_COLS = ["name_de", "name_fr", "name_it"] as const;

export const INPUT =
  "rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/20";
