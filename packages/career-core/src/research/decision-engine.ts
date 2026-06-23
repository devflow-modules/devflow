import type { PilotDecision, PilotFinding, PilotTaskCompletion } from "./curator-contracts.js";
import { countFindingsBySeverity } from "./finding-classifier.js";

export type DecisionInput = {
  findings: PilotFinding[];
  taskCompletions?: PilotTaskCompletion[];
  hasStructuredObservations: boolean;
};

export function recommendPilotDecision(input: DecisionInput): PilotDecision {
  const counts = countFindingsBySeverity(input.findings);

  if (counts.P0 > 0) {
    return "STOP PILOT";
  }

  if (counts.P1 > 0) {
    return "FIX BEFORE NEXT PARTICIPANT";
  }

  const coreTasks = input.taskCompletions?.filter((task) =>
    ["resume-analysis", "job-comparison", "career-plan", "resume-input", "result-interpretation"].includes(
      task.taskId,
    ),
  );

  const anyCoreIncomplete = coreTasks?.some((task) => !task.completed) ?? false;

  if (!input.hasStructuredObservations || (coreTasks && coreTasks.length === 0)) {
    return "INSUFFICIENT EVIDENCE";
  }

  if (anyCoreIncomplete && input.findings.length === 0) {
    return "INSUFFICIENT EVIDENCE";
  }

  return "CONTINUE TO NEXT PARTICIPANT";
}

export function mapDecisionToGithubLabel(decision: PilotDecision): string {
  switch (decision) {
    case "CONTINUE TO NEXT PARTICIPANT":
      return "CONTINUE TO P02";
    case "FIX BEFORE NEXT PARTICIPANT":
      return "FIX BEFORE P02";
    case "STOP PILOT":
      return "PILOT STOPPED AFTER P01";
    case "INSUFFICIENT EVIDENCE":
      return "INSUFFICIENT EVIDENCE";
    default:
      return decision;
  }
}

export function buildParticipantFrequencyLabel(
  sessionsWithPattern: number | undefined,
  totalParticipants: number | undefined,
): string {
  const observed = sessionsWithPattern ?? 1;
  const total = totalParticipants ?? 1;
  return `observado em ${observed} de ${total} participante(s)`;
}
