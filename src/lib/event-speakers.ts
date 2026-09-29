/**
 * Shared, client-safe shape for event speakers.
 *
 * Unlike hosts, a speaker is not a coach profile: it is a small chapter-wide
 * record (name, photo, short bio, link) that any event can reuse.
 */
export type EventSpeaker = {
  id: string;
  name: string;
  bio: string | null;
  url: string | null;
  imagePath: string | null;
  imageUrl: string | null;
  /** Set when the speaker is a chapter member with a published coach profile. */
  profileId: string | null;
  /** How many events use this speaker (library search only; 0 elsewhere). */
  usageCount?: number;
};

/** Short bios keep the section scannable on the public page. */
export const MAX_SPEAKER_BIO = 400;
