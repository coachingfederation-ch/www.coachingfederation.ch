/**
 * Client-safe shapes for the public local-communities pages.
 *
 * A community is not a separate entity: it is an operational-structure project
 * (`op_projects`) flagged `is_community`. Everything shown publicly is resolved
 * server-side against the visitor's locale, so the client never sees the
 * `*_de` / `*_fr` / `*_it` columns.
 */
import type { TeamMember } from "./team";

/** Members shown in the ring around the community hexagon. */
export const RING_MAX_MEMBERS = 12;

export type CommunitySummary = {
  slug: string;
  name: string;
  /** Localized markdown source. */
  description: string | null;
  cadence: string | null;
  contactEmail: string | null;
  signupUrl: string | null;
  /** Localized language labels, e.g. ["Deutsch", "English"]. */
  languages: string[];
  isFeatured: boolean;
  /** Optional feature image (signed URL or external link). */
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  /** "upload" | "url" | "unsplash" | "ai" — drives the AI disclosure badge. */
  imageSource: string | null;
  imageCreditName: string | null;
  imageCreditUrl: string | null;
  memberCount: number;
  /** A few photos for the overview card preview. */
  preview: TeamMember[];
};

export type CommunityDetail = Omit<CommunitySummary, "preview"> & {
  members: TeamMember[];
};

/**
 * Ring members plus the overflow.
 *
 * Every member up to `RING_MAX_MEMBERS` goes on the circle — including a lone
 * volunteer, who would otherwise disappear from the detail page and the About
 * preview. Only members beyond the cap fall into the overflow note.
 */
export function splitRing(members: TeamMember[]): { ring: TeamMember[]; overflow: TeamMember[] } {
  return {
    ring: members.slice(0, RING_MAX_MEMBERS),
    overflow: members.slice(RING_MAX_MEMBERS),
  };
}

/** Even placement on a circle, starting at the top and going clockwise. */
export function ringPosition(index: number, total: number): { x: number; y: number } {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}
