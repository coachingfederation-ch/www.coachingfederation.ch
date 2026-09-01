/**
 * Client-safe shapes for the public team page (operational structure).
 *
 * The public surface is deliberately narrow: name, photo, project/role labels,
 * volunteer bio, and the opt-in contact channels. Everything is resolved
 * server-side against the visitor's locale so the client never has to know
 * about the `name_de` / `name_fr` / `name_it` columns.
 */
import type { Locale } from "@/i18n/config";

export type LocalizedNameRow = {
  name: string;
  name_de: string | null;
  name_fr: string | null;
  name_it: string | null;
};

/** Locale-aware label with a graceful fallback to the English name. */
export function localizedName(row: LocalizedNameRow, locale: Locale): string {
  if (locale === "de") return row.name_de || row.name;
  if (locale === "fr") return row.name_fr || row.name;
  if (locale === "it") return row.name_it || row.name;
  return row.name;
}

export type TeamProject = { slug: string; label: string; isCommunity: boolean };

export type TeamAssignment = { projectSlug: string; project: string; role: string };

export type TeamMember = {
  memberId: string;
  profileId: string;
  name: string;
  initials: string;
  imageUrl: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  email: string | null;
  /** Set only when the member's coach profile is genuinely published. */
  coachProfileId: string | null;
  assignments: TeamAssignment[];
};

export type TeamDirectory = { projects: TeamProject[]; members: TeamMember[] };

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)![0] ?? "") : "";
  return (first + last).toUpperCase();
}
