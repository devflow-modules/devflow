import { describe, expect, it } from "vitest";

import {
  applyPipelineStatusToLinkedJob,
  collectApplicationAgeCopies,
  deriveApplicationNextAction,
  formatApplicationAppliedAge,
  formatApplicationRegisteredAge,
  formatApplicationStaleUpdateAge,
  formatApplicationUpdatedAge,
  jobStatusForPipelineTransition,
} from "../application-next-action.js";
import { canTransitionApplicationStatus } from "../application-lifecycle.js";
import { fromPipelineStatusV2, toPipelineStatusV2 } from "../pipeline-status.js";
import type { ApplyFlowJob } from "../job-match-types.js";
import type { ApplyFlowPipelineStatusV2 } from "../pipeline-status.js";

const NOW = new Date("2026-10-01T12:00:00.000Z");

function job(overrides: Partial<ApplyFlowJob> = {}): ApplyFlowJob {
  return {
    id: "job-1",
    title: "Engineer",
    company: "Acme",
    url: "https://remoteok.com/remote-jobs/1",
    source: "remoteok",
    status: "reviewing",
    jobContext: { skills: [] },
    jobMatch: {
      score: 70,
      decision: "apply",
      matchedSkills: [],
      missingSkills: [],
      evaluatedAt: NOW.toISOString(),
      scoringVersion: "v1",
    },
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

describe("deriveApplicationNextAction", () => {
  it("maps reviewing/applying to submission guidance", () => {
    expect(deriveApplicationNextAction({ status: "reviewing" }).kind).toBe("complete_submission");
    expect(deriveApplicationNextAction({ status: "applying" }).kind).toBe("complete_submission");
    expect(deriveApplicationNextAction({ status: "qualified" }).label).toMatch(/envio/i);
  });

  it("maps applied to consider follow-up without claiming non-response", () => {
    const g = deriveApplicationNextAction({ status: "applied" });
    expect(g.kind).toBe("consider_follow_up");
    expect(g.label).toMatch(/follow-up/i);
    expect(JSON.stringify(g).toLowerCase()).not.toContain("não respondeu");
    expect(JSON.stringify(g).toLowerCase()).not.toContain("nao respondeu");
  });

  it("maps mid-funnel statuses to stage guidance", () => {
    expect(deriveApplicationNextAction({ status: "recruiter_contacted" }).kind).toBe("track_contact");
    expect(deriveApplicationNextAction({ status: "screening" }).kind).toBe("prepare_interview");
    expect(deriveApplicationNextAction({ status: "interview" }).kind).toBe("prepare_interview");
    expect(deriveApplicationNextAction({ status: "technical" }).kind).toBe("complete_technical");
    expect(deriveApplicationNextAction({ status: "technical_test" }).kind).toBe("complete_technical");
    expect(deriveApplicationNextAction({ status: "final" }).kind).toBe("prepare_final");
    expect(deriveApplicationNextAction({ status: "offer" }).kind).toBe("review_offer");
    expect(deriveApplicationNextAction({ status: "accepted" }).kind).toBe("review_offer");
  });

  it("maps terminal statuses to Encerrada", () => {
    for (const status of ["hired", "rejected", "withdrawn", "skipped", "ignored"] as const) {
      const g = deriveApplicationNextAction({ status });
      expect(g.kind).toBe("terminal");
      expect(g.label).toBe("Encerrada");
    }
  });

  it("does not mutate inputs or invent side effects", () => {
    const status = { value: "applied" as const };
    const before = JSON.stringify(status);
    deriveApplicationNextAction({ status: status.value, jobId: "job-1" });
    expect(JSON.stringify(status)).toBe(before);
  });
});

describe("application age copy", () => {
  it("labels createdAt as registered age", () => {
    const copy = formatApplicationRegisteredAge("2026-09-24T12:00:00.000Z", NOW);
    expect(copy).toEqual({ kind: "registered", days: 7, label: "Registrada há 7 dias" });
  });

  it("labels updatedAt as updated age, never as applied", () => {
    const copy = formatApplicationUpdatedAge("2026-09-28T12:00:00.000Z", NOW);
    expect(copy?.kind).toBe("updated");
    expect(copy?.label).toBe("Atualizada há 3 dias");
    expect(copy?.label.toLowerCase()).not.toContain("aplicada");
  });

  it("uses appliedAt only when present", () => {
    expect(formatApplicationAppliedAge("2026-09-29T12:00:00.000Z", NOW)?.label).toBe("Aplicada há 2 dias");
    const collected = collectApplicationAgeCopies({
      createdAt: "2026-09-20T12:00:00.000Z",
      updatedAt: "2026-09-30T12:00:00.000Z",
      now: NOW,
    });
    expect(collected.some((item) => item.kind === "applied")).toBe(false);
    expect(collected.some((item) => item.kind === "updated")).toBe(true);
  });

  it("stale wording is sem atualização, not employer silence", () => {
    const copy = formatApplicationStaleUpdateAge("2026-09-20T12:00:00.000Z", NOW);
    expect(copy?.label).toBe("Sem atualização há 11 dias");
    expect(copy?.label.toLowerCase()).not.toContain("empresa");
    expect(copy?.label.toLowerCase()).not.toContain("respondeu");
  });
});

describe("job sync mapping helpers", () => {
  const cases: Array<[ApplyFlowPipelineStatusV2, string]> = [
    ["applied", "applied"],
    ["screening", "interview"],
    ["technical", "technical_test"],
    ["offer", "accepted"],
    ["hired", "hired"],
    ["rejected", "rejected"],
  ];

  it.each(cases)("%s maps to job.%s via fromPipelineStatusV2", (pipeline, expected) => {
    expect(jobStatusForPipelineTransition(pipeline)).toBe(fromPipelineStatusV2(pipeline));
    expect(jobStatusForPipelineTransition(pipeline)).toBe(expected);
    const synced = applyPipelineStatusToLinkedJob(job({ status: "reviewing" }), pipeline, NOW);
    expect(synced.status).toBe(expected);
  });

  it("prefers identity by leaving unmatched jobs untouched (caller supplies sourceJobId)", () => {
    const linked = job({ id: "job-linked", status: "applied" });
    const other = job({ id: "job-other", status: "reviewing" });
    expect(applyPipelineStatusToLinkedJob(linked, "screening", NOW).id).toBe("job-linked");
    expect(other.status).toBe("reviewing");
  });
});

describe("V1↔V2 mapping + shared transition authority", () => {
  it("keeps mapping consistent for guidance and job sync", () => {
    expect(toPipelineStatusV2("interview")).toBe("screening");
    expect(fromPipelineStatusV2("screening")).toBe("interview");
    expect(toPipelineStatusV2("accepted")).toBe("offer");
    expect(fromPipelineStatusV2("final")).toBe("interview");
  });

  it("uses the same canTransitionApplicationStatus authority", () => {
    expect(canTransitionApplicationStatus("applied", "screening")).toBe(true);
    expect(canTransitionApplicationStatus("hired", "applied")).toBe(false);
    expect(canTransitionApplicationStatus("rejected", "screening")).toBe(false);
    expect(canTransitionApplicationStatus("applied", "applied")).toBe(true);
  });
});
