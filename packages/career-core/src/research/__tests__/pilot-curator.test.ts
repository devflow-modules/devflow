import { describe, expect, it, beforeEach } from "vitest";
import { runCareerPilotCurator } from "../curator-agent.js";
import { resetFindingCounterForTests } from "../finding-classifier.js";
import { sanitizePilotText } from "../privacy-sanitizer.js";
import { listMethodologySourceIds } from "../sources/index.js";

describe("Career Pilot Curator", () => {
  beforeEach(() => {
    resetFindingCounterForTests();
  });

  it("exposes curated methodology sources only", () => {
    expect(listMethodologySourceIds()).toEqual([
      "govuk-moderated-usability",
      "w3c-wai-evaluation",
      "wcag-2-2-reference",
      "anpd-small-agent-security",
      "career-suite-pilot-runbook",
    ]);
  });

  describe("prepare mode", () => {
    it("returns protocol checklist and opening script", () => {
      const response = runCareerPilotCurator({
        mode: "prepare",
        sessionId: "P01",
        participantId: "P01",
        productVersion: "main@d3de0e7",
        participantProfile: "frontend developer",
      });

      expect(response.requiresHumanReview).toBe(true);
      expect(response.prepare?.openingScript[0]).toContain("testando a ferramenta");
      expect(response.prepare?.preflightChecklist).toContain("pilot mode=true");
      expect(response.prepare?.tasks.length).toBeGreaterThanOrEqual(7);
      expect(response.prepare?.methodologySources.length).toBeGreaterThan(0);
    });
  });

  describe("moderator_assist mode", () => {
    it("avoids inductive click guidance", () => {
      const response = runCareerPilotCurator({
        mode: "moderator_assist",
        sessionId: "P01",
        participantId: "P01",
        moderatorQuestion: "O participante perguntou onde clicar. Como respondo sem induzir?",
      });

      expect(response.moderatorAssist?.interventionAllowed).toBe(false);
      expect(response.moderatorAssist?.guidance).toContain("O que você esperaria que acontecesse?");
      expect(response.moderatorAssist?.avoid).toContain("Indicar elemento");
    });

    it("allows intervention on declared technical blocker", () => {
      const response = runCareerPilotCurator({
        mode: "moderator_assist",
        sessionId: "P01",
        participantId: "P01",
        moderatorQuestion: "Erro 500 bloqueou o fluxo.",
        moderatorAssistContext: { isTechnicalBlocker: true },
      });

      expect(response.moderatorAssist?.interventionAllowed).toBe(true);
    });
  });

  describe("structure_notes mode", () => {
    it("structures raw notes into observations with interpretation separated", () => {
      const response = runCareerPilotCurator({
        mode: "structure_notes",
        sessionId: "P01",
        participantId: "P01",
        notes: [
          "ficou 40 segundos procurando o botão",
          "perguntou se o currículo seria enviado",
          "não abriu revisar dados",
          "achou score punitivo",
        ],
      });

      expect(response.observations.length).toBe(4);
      const navigation = response.observations.find((o) => o.type === "navigation_friction");
      expect(navigation?.observation).toContain("40 segundos");
      expect(navigation?.interpretation).toBeTruthy();

      const privacy = response.observations.find((o) => o.type === "privacy_concern");
      expect(privacy?.observation).toContain("enviados");
    });
  });

  describe("classify mode", () => {
    it("classifies parser and intervention findings as P1", () => {
      const response = runCareerPilotCurator({
        mode: "classify",
        sessionId: "P01",
        participantId: "P01",
        notes: [
          "heading virou bullet na revisão",
          "moderador indicou onde clicar no CTA",
        ],
      });

      expect(response.findings.some((f) => f.severity === "P1")).toBe(true);
      expect(response.findings.every((f) => f.requiresHumanReview)).toBe(true);
    });
  });

  describe("synthesize mode", () => {
    it("recommends FIX BEFORE NEXT PARTICIPANT when P1 exists", () => {
      const response = runCareerPilotCurator({
        mode: "synthesize",
        sessionId: "P01",
        participantId: "P01",
        productVersion: "main@d3de0e7",
        durationMinutes: 28,
        moderatorInterventions: 1,
        notes: ["moderador indicou onde clicar", "não conseguiu concluir fluxo principal"],
        taskCompletions: [
          { taskId: "resume-analysis", label: "Resume analysis", completed: false },
          { taskId: "job-comparison", label: "Job comparison", completed: false },
        ],
      });

      expect(response.recommendation).toBe("FIX BEFORE NEXT PARTICIPANT");
      expect(response.summary?.findingsBySeverity.P1).toBeGreaterThan(0);
      expect(response.githubCommentDraft).toContain("FIX BEFORE P02");
      expect(response.githubCommentDraft).toContain("Requires human approval");
    });

    it("recommends CONTINUE when only low-severity friction is observed", () => {
      const response = runCareerPilotCurator({
        mode: "synthesize",
        sessionId: "P01",
        participantId: "P01",
        notes: ["ficou 40 segundos procurando o botão", "concluiu análise do currículo"],
        taskCompletions: [
          { taskId: "resume-analysis", label: "Resume analysis", completed: true },
          { taskId: "job-comparison", label: "Job comparison", completed: true },
          { taskId: "career-plan", label: "Career plan", completed: true },
        ],
        totalParticipantsInCohort: 1,
        sessionsWithSamePattern: 1,
      });

      expect(response.recommendation).toBe("CONTINUE TO NEXT PARTICIPANT");
      expect(response.summary?.participantFrequencyLabel).toBe("observado em 1 de 1 participante(s)");
    });

    it("recommends STOP PILOT on security incident notes", () => {
      const response = runCareerPilotCurator({
        mode: "synthesize",
        sessionId: "P01",
        participantId: "P01",
        notes: ["currículo persistiu no localStorage após reload"],
        taskCompletions: [
          { taskId: "resume-analysis", label: "Resume analysis", completed: true },
        ],
      });

      expect(response.recommendation).toBe("STOP PILOT");
      expect(response.githubCommentDraft).toContain("PILOT STOPPED AFTER P01");
    });
  });

  describe("privacy sanitizer", () => {
    it("blocks email and long résumé-like content", () => {
      const email = sanitizePilotText("participante disse joao@example.com");
      expect(email.sanitized).toContain("[EMAIL REDACTED]");

      const longResume = sanitizePilotText(
        `Experiência ${"desenvolvedor ".repeat(50)} skills react node`,
      );
      expect(longResume.blocked).toBe(true);
    });
  });
});
