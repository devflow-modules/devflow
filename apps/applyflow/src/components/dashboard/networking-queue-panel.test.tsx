import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { NETWORKING_OPEN_JOB_LABEL } from "./job-inbox-content";
import { NetworkingQueuePanel } from "./networking-queue-panel";
import type { ApplyFlowJob } from "@devflow/applyflow-core";

const reviewingJob: ApplyFlowJob = {
  id: "job_net_1",
  title: "Staff Backend Engineer",
  company: "Stefanini",
  source: "paste",
  status: "reviewing",
  jobContext: { skills: ["NestJS"] },
  jobMatch: {
    score: 55,
    decision: "stretch",
    matchedSkills: [],
    missingSkills: ["NestJS"],
    evaluatedAt: "2026-08-13T12:00:00.000Z",
    scoringVersion: "v1",
  },
  createdAt: "2026-08-13T12:00:00.000Z",
  updatedAt: "2026-08-13T12:00:00.000Z",
};

describe("NetworkingQueuePanel", () => {
  it("usa rótulo PT-BR acessível para abrir a oportunidade", () => {
    const html = renderToStaticMarkup(<NetworkingQueuePanel jobs={[reviewingJob]} />);
    expect(html).toContain(NETWORKING_OPEN_JOB_LABEL);
    expect(html).toContain(`Abrir oportunidade: Stefanini · Staff Backend Engineer`);
    expect(html).not.toContain(">Open job<");
  });
});
