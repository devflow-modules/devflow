import { describe, expect, it } from "vitest";
import {
  extractCanonicalTechKeywordsFound,
  extractJobContentKeywords,
  extractSeniorityTermsFound,
  keywordCoverageHits,
  normalizeForAtsMatch,
} from "./atsKeywordExtraction";

describe("normalizeForAtsMatch", () => {
  it("lowercases, strips noise, and folds dots into spaces", () => {
    expect(normalizeForAtsMatch("  Node.js & React!!!  ")).toBe("node js react");
  });
});

describe("extractCanonicalTechKeywordsFound", () => {
  it("returns sorted deterministic list", () => {
    const t = "We use React, TypeScript, and also react again.";
    const a = extractCanonicalTechKeywordsFound(t);
    const b = extractCanonicalTechKeywordsFound(t);
    expect(a).toEqual(b);
    expect(a).toContain("React");
    expect(a).toContain("TypeScript");
  });

  it("detects multi-word tokens like REST API and CI/CD", () => {
    const t = "Experience with REST API and CI/CD pipelines.";
    const k = extractCanonicalTechKeywordsFound(t);
    expect(k).toContain("REST API");
    expect(k).toContain("CI/CD");
  });
});

describe("extractSeniorityTermsFound", () => {
  it("finds seniority phrases deterministically sorted", () => {
    const t = "Looking for Senior engineer with Mentoring and Production focus.";
    expect(extractSeniorityTermsFound(t)).toEqual(
      [...extractSeniorityTermsFound(t)].sort((x, y) => x.localeCompare(y)),
    );
    expect(extractSeniorityTermsFound(t)).toContain("Senior");
    expect(extractSeniorityTermsFound(t)).toContain("Mentoring");
  });
});

describe("extractJobContentKeywords", () => {
  it("drops stopwords and returns stable ordering for ties alphabetically", () => {
    const job = "the candidate must know kubernetes and kubernetes automation";
    const k = extractJobContentKeywords(job, 20);
    expect(k.every((w) => w.length >= 4)).toBe(true);
    expect(k).toContain("kubernetes");
  });
});

describe("keywordCoverageHits", () => {
  it("counts how many job keywords appear in normalized resume", () => {
    const jobKw = ["payments", "ledger", "typescript"];
    const resumeNorm = "worked on payments and typescript services";
    expect(keywordCoverageHits(jobKw, resumeNorm)).toBe(2);
  });
});
