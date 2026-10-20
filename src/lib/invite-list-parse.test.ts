import { describe, expect, it } from "vitest";
import { parseInviteList } from "./invite-list-parse";

describe("parseInviteList", () => {
  it("splits on commas, semicolons and new lines and dedupes case-insensitively", () => {
    const r = parseInviteList("a@example.com, B@example.com;\nb@example.com");
    expect(r.emails).toEqual(["a@example.com", "b@example.com"]);
  });

  it("takes emails from CSV rows and ignores names and headers", () => {
    const r = parseInviteList('name,email\n"Anna Muster",anna.muster@example.com');
    expect(r.emails).toEqual(["anna.muster@example.com"]);
    expect(r.invalid).toEqual([]);
    expect(r.names["anna.muster@example.com"]).toBe("Anna Muster");
  });

  it("strips Outlook angle brackets and reports broken addresses", () => {
    const r = parseInviteList("<anna@example.com>, broken@nowhere");
    expect(r.emails).toEqual(["anna@example.com"]);
    expect(r.invalid).toEqual(["broken@nowhere"]);
  });
});
