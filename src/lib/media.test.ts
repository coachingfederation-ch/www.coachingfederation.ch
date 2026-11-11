import { describe, expect, it } from "vitest";
import {
  mediaOwnerOf,
  mediaPathOf,
  mediaRefForPath,
  toAbsoluteMediaUrl,
  toPublicMediaUrl,
} from "./media";

const ID = "695966cd-0764-458e-baf4-c9f4f4d845e0";
const NL = "26c3afb5-2858-485d-a6ad-9205c82cfd37";

describe("mediaOwnerOf", () => {
  it("maps each allowed path shape to its owning row", () => {
    expect(mediaOwnerOf(`${ID}/1786022681506.jpg`)).toEqual({ kind: "article", id: ID });
    expect(mediaOwnerOf(`communities/${ID}-1788418843642.png`)).toEqual({
      kind: "community",
      id: ID,
    });
    expect(mediaOwnerOf(`communities/${ID}/1788418843642.jpg`)).toEqual({
      kind: "community",
      id: ID,
    });
    expect(mediaOwnerOf(`newsletters/${NL}/${ID}-framed-1787476731068.jpg`)).toEqual({
      kind: "newsletter",
      id: NL,
    });
  });

  it("refuses everything else in the bucket", () => {
    expect(mediaOwnerOf(`speakers/${ID}.jpg`)).toBeNull();
    expect(mediaOwnerOf(`${ID}/../speakers/x.jpg`)).toBeNull();
    expect(mediaOwnerOf(`${ID}/a/b.jpg`)).toBeNull();
    expect(mediaOwnerOf("not-a-uuid/x.jpg")).toBeNull();
    expect(mediaOwnerOf("")).toBeNull();
  });
});

describe("mediaPathOf / toPublicMediaUrl", () => {
  const legacy = `https://example.supabase.co/storage/v1/object/sign/article-images/${ID}/1.jpg?token=secret`;

  it("maps a legacy signed URL onto the media reference and drops the token", () => {
    expect(mediaPathOf(legacy)).toBe(`${ID}/1.jpg`);
    expect(toPublicMediaUrl(legacy)).toBe(`/api/public/media/${ID}/1.jpg`);
    expect(toPublicMediaUrl(legacy)).not.toContain("token");
  });

  it("round-trips a media reference, relative or absolute", () => {
    const ref = mediaRefForPath(`newsletters/${NL}/a.png`);
    expect(mediaPathOf(ref)).toBe(`newsletters/${NL}/a.png`);
    expect(mediaPathOf(`https://new.coachingfederation.ch${ref}`)).toBe(`newsletters/${NL}/a.png`);
  });

  it("passes external images through unchanged", () => {
    const unsplash = "https://images.unsplash.com/photo-1?w=1200";
    expect(mediaPathOf(unsplash)).toBeNull();
    expect(toPublicMediaUrl(unsplash)).toBe(unsplash);
    expect(toPublicMediaUrl(null)).toBeNull();
  });

  it("makes references absolute for email and og:image", () => {
    expect(toAbsoluteMediaUrl(legacy, "https://new.coachingfederation.ch/")).toBe(
      `https://new.coachingfederation.ch/api/public/media/${ID}/1.jpg`,
    );
    expect(toAbsoluteMediaUrl("https://images.unsplash.com/x", "https://a.ch")).toBe(
      "https://images.unsplash.com/x",
    );
  });
});
