import { describe, expect, it } from "vitest";

import { JOB_DECISION_V2_PACK_BLOCK_KIND_LABELS } from "./job-decision-v2-content";
import { buildJobDecisionBrief } from "./job-decision-brief";
import type { JobDecisionV2, PackBlockExplanation } from "@devflow/applyflow-core";

function decisionFixture(overrides: Partial<JobDecisionV2> = {}): JobDecisionV2 {
  return {
    decision: "apply_stretch",
    overall: 62,
    eliminationRisk: "medium",
    careerUpside: "medium",
    hiringProbability: "medium",
    reasons: ["Fixture"],
    dimensions: {},
    gates: [],
    matches: [
      {
        requirement: {
          id: "react",
          label: "React",
          category: "skills",
          importance: "fundamental",
          requirementType: "skill",
        },
        status: "proven",
        matchedEvidence: [],
        reason: "Evidência no currículo",
      },
      {
        requirement: {
          id: "k8s",
          label: "Kubernetes",
          category: "skills",
          importance: "fundamental",
          requirementType: "skill",
        },
        status: "unknown",
        matchedEvidence: [],
        reason: "Sem evidência suficiente",
      },
      {
        requirement: {
          id: "loc",
          label: "Localização",
          category: "logistics",
          importance: "important",
          requirementType: "location",
        },
        status: "gap",
        matchedEvidence: [],
        reason: "Não informado no anúncio",
      },
    ],
    recommendedClaims: [],
    candidateInputRequests: [],
    ...overrides,
  } as JobDecisionV2;
}

describe("buildJobDecisionBrief", () => {
  it("separates asks, demonstrated evidence, and confirmations by kind", () => {
    const packBlock: PackBlockExplanation = {
      blocked: true,
      decision: "needs_info",
      canPrepareManually: true,
      title: "Pack bloqueado",
      summary: "Falta contexto",
      nextAction: "Confirmar no anúncio",
      items: [
        { kind: "announcement", label: "work_mode", detail: "Modelo não informado" },
        { kind: "evidence", label: "AWS", detail: "Evidência insuficiente" },
        { kind: "profile", label: "Inglês", detail: "Não declarado no perfil" },
      ],
    };

    const brief = buildJobDecisionBrief({ decision: decisionFixture(), packBlock });
    expect(brief.asks.items).toEqual(
      expect.arrayContaining(["React (obrigatório)", "Kubernetes (obrigatório)", "Localização"]),
    );
    expect(brief.shows.items.some((item) => item.startsWith("React"))).toBe(true);
    expect(brief.confirm.items.some((item) => item.startsWith(JOB_DECISION_V2_PACK_BLOCK_KIND_LABELS.announcement))).toBe(
      true,
    );
    expect(brief.confirm.items.some((item) => item.startsWith(JOB_DECISION_V2_PACK_BLOCK_KIND_LABELS.evidence))).toBe(
      true,
    );
    expect(brief.confirm.items.some((item) => item.startsWith(JOB_DECISION_V2_PACK_BLOCK_KIND_LABELS.profile))).toBe(
      true,
    );
    expect(brief.confirm.items.join(" ")).not.toMatch(/não atendido|reprovado/i);
  });

  it("returns empty copy when there is no structured decision yet", () => {
    const brief = buildJobDecisionBrief({ decision: null });
    expect(brief.asks.items).toEqual([]);
    expect(brief.shows.empty).toBeTruthy();
    expect(brief.confirm.empty).toBeTruthy();
  });
});
