import { gustavoProfile, createResumeLibraryFromProfile } from "@devflow/applyflow-core";
import { describe, expect, it, vi } from "vitest";

import {
  areJobMatchPreviewsEqual,
  discoveryHitKey,
  evaluateDiscoveredJobHitPreview,
  matchProfileFingerprint,
  previewInputFingerprint,
  sortDiscoveryHitsByMatch,
  type DiscoveryHitPreviewState,
} from "./preview-hit";
import { ingestDiscoveredJobHit } from "./save-hit";
import type { JobSearchHit } from "./types";

const NOW = new Date("2026-09-30T12:00:00.000Z");
const APPLY =
  "Senior Product Engineer. Remote. We need React, Next.js, TypeScript and Node.js to ship product integrations.";
const SKIP = "Legacy Engineer Onsite. Looking for Java, Elixir and Ruby specialists. Mainframe experience is a plus.";

function hit(overrides: Partial<JobSearchHit> = {}): JobSearchHit {
  return {
    externalId: "424242",
    source: "theirstack",
    title: "Senior Software Engineer",
    company: "Acme",
    description: APPLY,
    sourceUrl: "https://www.linkedin.com/jobs/view/424242",
    ...overrides,
  };
}

describe("evaluateDiscoveredJobHitPreview", () => {
  it("projects TheirStack / Remote OK descriptions through the existing Match Engine", () => {
    const library = createResumeLibraryFromProfile(gustavoProfile, { now: NOW });
    for (const source of ["theirstack", "remoteok"] as const) {
      const previewed = evaluateDiscoveredJobHitPreview(hit({ source, externalId: "1" }), {
        profile: gustavoProfile,
        resumeLibrary: library,
        now: NOW,
      });
      expect(previewed.ok).toBe(true);
      if (!previewed.ok) return;
      const saved = ingestDiscoveredJobHit(hit({ source, externalId: "1" }), {
        profile: gustavoProfile,
        resumeLibrary: library,
        now: NOW,
      });
      expect(saved.ok).toBe(true);
      if (!saved.ok) return;
      expect(areJobMatchPreviewsEqual(previewed.preview, {
        score: saved.job.jobMatch.score,
        decision: saved.job.jobMatch.decision,
        matchedSkills: saved.job.jobMatch.matchedSkills,
        missingSkills: saved.job.jobMatch.missingSkills,
        unknownSkills: saved.job.jobMatch.unknownSkills,
        scoringVersion: saved.job.jobMatch.scoringVersion,
      })).toBe(true);
      expect(previewed.preview.scoringVersion).toBe("v1");
    }
  });

  it("refuses Jobgether title-only matching and accepts pasted description", () => {
    const without = evaluateDiscoveredJobHitPreview(
      hit({ source: "jobgether", description: undefined, externalId: "jg1" }),
      { profile: gustavoProfile, now: NOW },
    );
    expect(without).toEqual({ ok: false, reason: "missing_description" });

    const withPaste = evaluateDiscoveredJobHitPreview(
      hit({ source: "jobgether", description: APPLY, externalId: "jg1" }),
      { profile: gustavoProfile, now: NOW },
    );
    expect(withPaste.ok).toBe(true);
  });

  it("does not write storage, create applications, or call fetch during preview", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const setItem = vi.fn();
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: () => null, setItem, removeItem: vi.fn(), clear: vi.fn() },
    });
    try {
      const result = evaluateDiscoveredJobHitPreview(hit({ description: SKIP }), {
        profile: gustavoProfile,
        now: NOW,
      });
      expect(result.ok).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(setItem).not.toHaveBeenCalled();
      if (result.ok) {
        expect(JSON.stringify(result.preview)).not.toContain('"status"');
        expect(JSON.stringify(result.preview)).not.toContain("application");
      }
    } finally {
      Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original });
      fetchSpy.mockRestore();
    }
  });
});

describe("preview fingerprints and sorting", () => {
  it("changes fingerprint when description or default variant changes", () => {
    const library = createResumeLibraryFromProfile(gustavoProfile, { now: NOW });
    const fp = matchProfileFingerprint(library);
    expect(fp).toBeTruthy();
    const a = previewInputFingerprint(hit({ description: APPLY }), fp);
    const b = previewInputFingerprint(hit({ description: SKIP }), fp);
    expect(a).not.toBe(b);
    expect(discoveryHitKey(hit())).toBe("theirstack:424242");
  });

  it("sorts loaded results by descending score and keeps needs_description after ready", () => {
    const hits: JobSearchHit[] = [
      hit({ externalId: "low", title: "Low" }),
      hit({ externalId: "high", title: "High" }),
      hit({ externalId: "need", title: "Need", description: undefined }),
    ];
    const previews: Record<string, DiscoveryHitPreviewState> = {
      "theirstack:low": {
        status: "ready",
        preview: {
          score: 40,
          decision: "skip",
          matchedSkills: [],
          missingSkills: ["Java"],
          scoringVersion: "v1",
        },
      },
      "theirstack:high": {
        status: "ready",
        preview: {
          score: 90,
          decision: "apply",
          matchedSkills: ["React"],
          missingSkills: [],
          scoringVersion: "v1",
        },
      },
      "theirstack:need": { status: "needs_description" },
    };
    const sorted = sortDiscoveryHitsByMatch(hits, previews).map((item) => item.externalId);
    expect(sorted).toEqual(["high", "low", "need"]);
  });
});
