import { describe, expect, it } from "vitest";

import type { ApplicationDecisionSnapshot } from "@devflow/applyflow-core";

import {
  JOB_DECISION_V2_CREATE_APPLICATION,
  JOB_DECISION_V2_CREATE_HINT,
  JOB_DECISION_V2_CURRENT_ANALYSIS,
  JOB_DECISION_V2_AT_APPLY_ANALYSIS,
  JOB_DECISION_V2_CURRENT_HINT,
  JOB_DECISION_V2_HINT,
  JOB_DECISION_V2_INPUTS_HINT,
  JOB_DECISION_V2_LABELS,
  JOB_DECISION_V2_LAB_HANDOFF,
  JOB_DECISION_V2_LINK,
  JOB_DECISION_V2_MARK_SENT,
  JOB_DECISION_V2_MARK_SENT_HINT,
  JOB_DECISION_V2_NEED_APPLICATION,
  JOB_DECISION_V2_NEED_RESUME,
  JOB_DECISION_V2_REGISTERED_PRESERVED,
  registeredAnalysisFromSnapshot,
} from "./job-decision-v2-content";

describe("job-decision-v2-content", () => {
  it("não promete auto-submit", () => {
    expect(JOB_DECISION_V2_HINT.toLowerCase()).toContain("não envia");
    expect(JOB_DECISION_V2_LABELS.skip).toBe("SKIP");
    expect(JOB_DECISION_V2_LABELS.needs_info).toBe("INCONCLUSIVA");
  });

  it("exige Application antes de Outcome", () => {
    expect(JOB_DECISION_V2_NEED_APPLICATION.toLowerCase()).toContain("candidatura");
    expect(JOB_DECISION_V2_NEED_APPLICATION.toLowerCase()).not.toContain("auto-submit");
  });

  it("não promete editor de inputs nem transferência automática ao Interview Lab", () => {
    expect(JOB_DECISION_V2_NEED_RESUME.toLowerCase()).toContain("currículo");
    expect(JOB_DECISION_V2_INPUTS_HINT.toLowerCase()).toContain("orientação");
    expect(JOB_DECISION_V2_LAB_HANDOFF.toLowerCase()).toContain("não transfere");
  });

  it("o CTA de análise não promete envio e o registo explica o que grava", () => {
    expect(JOB_DECISION_V2_LINK).toBe("Analisar vaga");
    expect(JOB_DECISION_V2_CREATE_APPLICATION).toBe("Registrar candidatura");
    expect(JOB_DECISION_V2_CREATE_HINT.toLowerCase()).toContain("não envia");
    expect(JOB_DECISION_V2_CREATE_HINT.toLowerCase()).toContain("congela");
  });

  it("distingue análise atual da análise registrada no snapshot", () => {
    expect(JOB_DECISION_V2_CURRENT_ANALYSIS).toBe("Análise atual");
    expect(JOB_DECISION_V2_AT_APPLY_ANALYSIS).toBe("Análise no envio");
    expect(JOB_DECISION_V2_CURRENT_HINT.toLowerCase()).toContain("currículo atual");
    expect(JOB_DECISION_V2_REGISTERED_PRESERVED.toLowerCase()).toContain("preservada");
    const snapshot: ApplicationDecisionSnapshot = {
      capturedAt: "2026-09-09T12:00:00.000Z",
      overallFit: 61,
      dimensions: {
        overall: 61,
        coreEngineering: 70,
        stack: 20,
        specialization: 40,
        seniority: 80,
        product: 75,
        language: 40,
      },
      decision: "apply_stretch",
      priority: 55,
      requirements: [{ id: "req-en", label: "English", category: "language", status: "unknown" }],
      supportingEvidenceIds: [],
      primaryCaseIds: [],
    };
    const registered = registeredAnalysisFromSnapshot(snapshot);
    expect(registered?.overallFit).toBe(61);
    expect(registered?.decision).toBe("apply_stretch");
    expect(registered?.dimensions.language).toBe(40);
    expect(registered?.requirements[0]?.status).toBe("unknown");
    expect(registeredAnalysisFromSnapshot(null)).toBeNull();
  });

  it("marcar como enviada não promete um segundo registo nem envio automático", () => {
    expect(JOB_DECISION_V2_MARK_SENT).toBe("Marcar como enviada");
    expect(JOB_DECISION_V2_MARK_SENT_HINT.toLowerCase()).toContain("depois de enviares");
    expect(JOB_DECISION_V2_MARK_SENT_HINT.toLowerCase()).toContain("não cria outro");
    expect(JOB_DECISION_V2_MARK_SENT_HINT.toLowerCase()).not.toContain("auto-submit");
  });
});