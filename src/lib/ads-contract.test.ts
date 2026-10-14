import { describe, expect, it } from "vitest";
import { missingContractFields } from "./ads";

const complete = {
  advertiser_name: "Muster AG",
  contact_name: "Anna Muster",
  contact_email: "anna.muster@example.com",
  billing_street: "Bahnhofstrasse 1",
  billing_postcode: "8001",
  billing_city: "Zürich",
  billing_country: "Switzerland",
};

describe("missingContractFields", () => {
  it("accepts a complete address and contact", () => {
    expect(missingContractFields(complete)).toEqual([]);
  });
  it("requires the full billing address", () => {
    expect(missingContractFields({ ...complete, billing_postcode: " " })).toEqual([
      "billing_postcode",
    ]);
  });
  it("requires a contact name", () => {
    expect(missingContractFields({ ...complete, contact_name: null })).toEqual(["contact_name"]);
  });
});
