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
};

/** Short bios keep the section scannable on the public page. */
export const MAX_SPEAKER_BIO = 400;
