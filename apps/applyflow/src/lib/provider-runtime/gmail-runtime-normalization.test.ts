import { describe, expect, it } from "vitest";
import {
  extractSanitizedEmailDomain,
  extractSanitizedEmailDomains,
  getHeaderValue,
  parseMetadataDateHeader,
  sanitizeGmailLabelIds,
} from "./gmail-runtime-normalization.js";

describe("extractSanitizedEmailDomain", () => {
  it("extracts domain without local-part", () => {
    expect(extractSanitizedEmailDomain("Recruiter <recruiter@acme.example>")).toBe("acme.example");
  });

  it("returns undefined for invalid values", () => {
    expect(extractSanitizedEmailDomain("not-an-email")).toBeUndefined();
  });
});

describe("extractSanitizedEmailDomains", () => {
  it("deduplicates and sorts recipient domains", () => {
    expect(
      extractSanitizedEmailDomains("A <a@beta.example>, B <b@beta.example>, C <c@acme.example>"),
    ).toEqual(["acme.example", "beta.example"]);
  });
});

describe("parseMetadataDateHeader", () => {
  it("parses RFC2822 date to ISO", () => {
    expect(parseMetadataDateHeader("Fri, 20 Jun 2026 14:00:00 +0000")).toBe("2026-06-20T14:00:00.000Z");
  });

  it("parses RFC2822 dates with numeric timezone offsets", () => {
    expect(parseMetadataDateHeader("Mon, 16 Jun 2026 09:00:00 -0300")).toBe("2026-06-16T12:00:00.000Z");
    expect(parseMetadataDateHeader("Mon, 16 Jun 2026 13:00:00 +0530")).toBe("2026-06-16T07:30:00.000Z");
  });

  it("rejects invalid date headers", () => {
    expect(parseMetadataDateHeader("not-a-date")).toBeUndefined();
    expect(parseMetadataDateHeader("")).toBeUndefined();
  });
});

describe("getHeaderValue", () => {
  it("finds headers case-insensitively", () => {
    expect(
      getHeaderValue(
        [
          { name: "From", value: "recruiter@jobs.example" },
          { name: "Date", value: "Fri, 20 Jun 2026 14:00:00 +0000" },
        ],
        "date",
      ),
    ).toBe("Fri, 20 Jun 2026 14:00:00 +0000");
  });
});

describe("sanitizeGmailLabelIds", () => {
  it("returns sorted unique labels", () => {
    expect(sanitizeGmailLabelIds(["INBOX", "UNREAD", "INBOX"])).toEqual(["INBOX", "UNREAD"]);
  });
});
