import { describe, expect, it } from "vitest";

import { gustavoProfile } from "../candidate-profile.js";
import {
  JOB_DESCRIPTION_SNAPSHOT_MAX_CHARS,
  hashJobDescription,
  snapshotJobDescription,
} from "../job-description-snapshot.js";
import { ingestApplyFlowJob, projectJobForFunnel } from "../ingest-applyflow-job.js";
import { extractJobIntelligence } from "../job-intelligence.js";
import { evaluateJobMatch } from "../evaluate-job-match.js";

const NOW = new Date("2026-08-13T12:00:00.000Z");

const APPLY_POSTING = `Senior Product Engineer
Remote · CLT

We need React, Next.js, TypeScript and Node.js to ship product integrations.
`;

const STRETCH_POSTING = `Backend Engineer
Hybrid

Stack: React, TypeScript and Kubernetes. PostgreSQL is a plus.
`;

const SKIP_POSTING = `Legacy Engineer
Onsite

Looking for Java, Elixir and Ruby specialists. Mainframe experience is a plus.
`;

describe("snapshotJobDescription", () => {
  it("trunca em 4000 caracteres", () => {
    const long = "React TypeScript\n".repeat(400);
    const snapshot = snapshotJobDescription(long);
    expect(snapshot.length).toBeLessThanOrEqual(JOB_DESCRIPTION_SNAPSHOT_MAX_CHARS);
  });
});

describe("hashJobDescription", () => {
  it("é estável após normalizar whitespace", () => {
    expect(hashJobDescription("React   Next.js")).toBe(hashJobDescription("react next.js"));
  });
});

describe("ingestApplyFlowJob", () => {
  it("normaliza três descrições reais para o mesmo tipo ApplyFlowJob", () => {
    const applyJob = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      now: NOW,
      id: "job_apply",
    });
    const stretchJob = ingestApplyFlowJob({
      description: STRETCH_POSTING,
      source: "paste",
      profile: gustavoProfile,
      now: NOW,
      id: "job_stretch",
    });
    const skipJob = ingestApplyFlowJob({
      description: SKIP_POSTING,
      source: "json",
      profile: gustavoProfile,
      now: NOW,
      id: "job_skip",
    });

    expect(applyJob.jobMatch.decision).toBe("apply");
    expect(applyJob.status).toBe("reviewing");
    expect(stretchJob.jobMatch.decision).toBe("stretch");
    expect(stretchJob.status).toBe("reviewing");
    expect(skipJob.jobMatch.decision).toBe("skip");
    expect(skipJob.status).toBe("ignored");

    for (const job of [applyJob, stretchJob, skipJob]) {
      expect(job.descriptionSnapshot?.length ?? 0).toBeLessThanOrEqual(JOB_DESCRIPTION_SNAPSHOT_MAX_CHARS);
      expect(job.descriptionHash).toMatch(/^[0-9a-f]{8}$/);
      expect(job.jobMatch.scoringVersion).toBe("v1");
      const intel = extractJobIntelligence(
        job.id === "job_apply" ? APPLY_POSTING : job.id === "job_stretch" ? STRETCH_POSTING : SKIP_POSTING,
      );
      expect(job.jobMatch).toEqual(
        evaluateJobMatch(gustavoProfile, { skills: intel.detectedSkills }, { now: NOW }),
      );
    }
  });

  it("projeta a vaga para o funil atual sem inventar backend", () => {
    const job = ingestApplyFlowJob({
      description: APPLY_POSTING,
      source: "paste",
      profile: gustavoProfile,
      now: NOW,
      id: "job_funnel",
    });
    const projected = projectJobForFunnel(job);
    expect(projected.source).toBe("paste");
    expect(projected.status).toBe("reviewing");
    expect(projected.fitScore).toBe(job.jobMatch.score);
    expect(projected.jobTitle).toBe(job.title);
  });
});
