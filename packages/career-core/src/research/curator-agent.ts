import {
  type ModeratorAssistOutput,
  type PilotCuratorRequest,
  type PilotCuratorResponse,
  type PilotFinding,
  type PilotObservation,
  type PrepareSessionOutput,
  parsePilotCuratorRequest,
} from "./curator-contracts.js";
import {
  buildParticipantFrequencyLabel,
  mapDecisionToGithubLabel,
  recommendPilotDecision,
} from "./decision-engine.js";
import { mergeObservations, structurePilotNotes } from "./evidence-normalizer.js";
import { classifyFindings, countFindingsBySeverity } from "./finding-classifier.js";
import { sanitizeGithubCommentDraft, sanitizePilotTextList } from "./privacy-sanitizer.js";
import { formatMethodologySourceLabels, INTERNAL_PILOT_RUNBOOK_SOURCE } from "./sources/index.js";

function buildWarningsFromSanitization(warnings: string[]): string[] {
  return warnings.map((warning) => `[privacy] ${warning}`);
}

function runPrepare(request: PilotCuratorRequest): PrepareSessionOutput {
  const tasks =
    request.plannedTasks?.map((label, index) => ({
      id: `custom-${index + 1}`,
      prompt: label,
      observe: ["Comportamento observável", "Tempo até ação", "Comentários em voz alta"],
    })) ??
    INTERNAL_PILOT_RUNBOOK_SOURCE.defaultTasks.map((task) => ({
      id: task.id,
      prompt: task.prompt,
      observe: Array.from(task.observe),
    }));

  return {
    objective:
      "Validar se a Career Suite ajuda um participante real a analisar currículo, comparar com vaga e organizar próximos passos — sem orientação excessiva.",
    risks: [
      "Indução do moderador (perguntas fechadas ou indicação de clique).",
      "Persistência acidental de currículo ou vaga no browser.",
      "Uso de Production ou provider externo.",
      "Registro de PII em notas ou GitHub.",
      ...(request.participantProfile?.includes("developer")
        ? ["Perfil técnico pode avaliar implementação em vez da experiência de produto."]
        : []),
    ],
    preflightChecklist: [...INTERNAL_PILOT_RUNBOOK_SOURCE.preflightChecklist],
    openingScript: [...INTERNAL_PILOT_RUNBOOK_SOURCE.openingScript],
    tasks,
    successCriteria: [...INTERNAL_PILOT_RUNBOOK_SOURCE.successCriteria],
    closingCriteria: [
      "Perguntar chance de uso futuro (0–10) e motivos.",
      "Confirmar que currículo/vaga não foram armazenados.",
      "Limpar storage e fechar abas com dados.",
      "Classificar findings antes de publicar na issue.",
    ],
    methodologySources: formatMethodologySourceLabels(),
    requiresHumanReview: true,
  };
}

function runModeratorAssist(request: PilotCuratorRequest): ModeratorAssistOutput {
  const question = request.moderatorQuestion?.toLowerCase() ?? "";
  const context = request.moderatorAssistContext;

  const interventionAllowed =
    context?.isTechnicalBlocker === true ||
    context?.isPiiRisk === true ||
    context?.isProductionAttempt === true ||
    (context?.sessionStalledMinutes ?? 0) >= 2;

  if (interventionAllowed) {
    return {
      guidance: [
        "Intervenção permitida: declare o bloqueio em voz neutra.",
        "Registre horário, motivo e tipo de ajuda (N1–N4).",
        "Retome observação passiva assim que o fluxo continuar.",
      ],
      avoid: ["Explicar implementação", "Defender o produto", "Revelar score esperado"],
      interventionAllowed: true,
      methodologySources: formatMethodologySourceLabels(),
      requiresHumanReview: true,
    };
  }

  if (/onde clicar|qual botão|clica aqui|deveria funcionar/.test(question)) {
    return {
      guidance: [
        "O que você esperaria que acontecesse?",
        "O que você está procurando neste momento?",
        "Faça o que parecer mais natural para você.",
      ],
      avoid: ["Indicar elemento", "Explicar fluxo", "Antecipar score"],
      interventionAllowed: false,
      methodologySources: formatMethodologySourceLabels(),
      requiresHumanReview: true,
    };
  }

  if (/não entendeu|usuário não entende|participante não sabe/.test(question)) {
    return {
      guidance: [
        "Registre o comportamento observável, não a capacidade da pessoa.",
        "Pergunte: 'O que você esperaria ver aqui?'",
      ],
      avoid: ["Rotular compreensão sem evidência", "Generalizar para 'os usuários'"],
      interventionAllowed: false,
      methodologySources: formatMethodologySourceLabels(),
      requiresHumanReview: true,
    };
  }

  return {
    guidance: [...INTERNAL_PILOT_RUNBOOK_SOURCE.neutralModeratorResponses],
    avoid: ["Respostas fechadas", "Demonstração não solicitada"],
    interventionAllowed: false,
    methodologySources: formatMethodologySourceLabels(),
    requiresHumanReview: true,
  };
}

function buildGithubCommentDraft(
  sessionId: string,
  decision: ReturnType<typeof recommendPilotDecision>,
  findings: PilotFinding[],
  taskCompletions: PilotCuratorRequest["taskCompletions"],
  anonymizedObservations: string[],
  durationMinutes?: number,
): string {
  const counts = countFindingsBySeverity(findings);
  const githubDecision = mapDecisionToGithubLabel(decision);

  const completionLines =
    taskCompletions?.map((task) => `- ${task.label}: ${task.completed ? "completed" : "not completed"}`) ??
    [];

  const draft = [
    `## ${sessionId} pilot result`,
    "",
    "Decision:",
    "",
    `\`${githubDecision}\``,
    "",
    "### Completion",
    "",
    ...(completionLines.length ? completionLines : ["- Tasks: not provided"]),
    "",
    "### Findings",
    "",
    `- P0: ${counts.P0}`,
    `- P1: ${counts.P1}`,
    `- P2: ${counts.P2}`,
    `- P3: ${counts.P3}`,
    ...(durationMinutes !== undefined ? ["", `Approximate duration: ${durationMinutes} minutes`] : []),
    "",
    "### Anonymized observations",
    "",
    ...(anonymizedObservations.length
      ? anonymizedObservations.map((line) => `- ${line}`)
      : ["- No anonymized observations provided."]),
    "",
    "No personal data, resume content or job content was retained.",
    "",
    "<!-- Requires human approval before publishing -->",
  ].join("\n");

  return sanitizeGithubCommentDraft(draft);
}

/**
 * Deterministic Career Pilot Curator — moderator support only.
 * Does not call external LLMs or persist participant data.
 */
export function runCareerPilotCurator(input: PilotCuratorRequest): PilotCuratorResponse {
  const request = parsePilotCuratorRequest(input);
  const methodologySources = formatMethodologySourceLabels();
  const warnings: string[] = [];

  if (request.mode === "prepare") {
    return {
      mode: request.mode,
      prepare: runPrepare(request),
      observations: [],
      findings: [],
      methodologySources,
      warnings,
      requiresHumanReview: true,
    };
  }

  if (request.mode === "moderator_assist") {
    if (!request.moderatorQuestion?.trim()) {
      warnings.push("moderatorQuestion is required for moderator_assist mode.");
    }
    return {
      mode: request.mode,
      moderatorAssist: runModeratorAssist(request),
      observations: [],
      findings: [],
      methodologySources,
      warnings,
      requiresHumanReview: true,
    };
  }

  let observations: PilotObservation[] = request.observations ?? [];

  if (request.notes?.length) {
    const { sanitized, warnings: sanitizationWarnings } = sanitizePilotTextList(request.notes);
    warnings.push(...buildWarningsFromSanitization(sanitizationWarnings));
    const structured = structurePilotNotes(sanitized);
    observations = mergeObservations(observations, structured);
  }

  if (request.mode === "structure_notes") {
    return {
      mode: request.mode,
      observations,
      findings: [],
      methodologySources,
      warnings,
      requiresHumanReview: true,
    };
  }

  let findings: PilotFinding[] = request.findings ?? [];

  if (request.mode === "classify" || request.mode === "synthesize") {
    findings = classifyFindings(observations, findings, request.sessionId);
  }

  if (request.mode === "classify") {
    return {
      mode: request.mode,
      observations,
      findings,
      methodologySources,
      warnings,
      requiresHumanReview: true,
    };
  }

  const recommendation = recommendPilotDecision({
    findings,
    taskCompletions: request.taskCompletions,
    hasStructuredObservations: observations.length > 0,
  });

  const anonymizedObservations = observations
    .map((item) => item.observation)
    .filter((line, index, all) => all.indexOf(line) === index)
    .slice(0, 8);

  const counts = countFindingsBySeverity(findings);
  const participantFrequencyLabel = buildParticipantFrequencyLabel(
    request.sessionsWithSamePattern,
    request.totalParticipantsInCohort,
  );

  const patterns =
    findings.length > 0
      ? findings.map(
          (finding) =>
            `${finding.finding} (${participantFrequencyLabel}, severidade ${finding.severity})`,
        )
      : ["Nenhum padrão classificado — revisar evidências brutas."];

  const summary = {
    sessionId: request.sessionId,
    participantId: request.participantId,
    productVersion: request.productVersion,
    durationMinutes: request.durationMinutes,
    tasksCompleted: request.taskCompletions ?? [],
    moderatorInterventions: request.moderatorInterventions ?? 0,
    findingsBySeverity: counts,
    anonymizedObservations,
    patterns,
    limitations: [
      "Síntese baseada apenas nas notas fornecidas; silêncio não implica compreensão.",
      "Decisão requer aprovação humana antes de publicação ou alteração de produto.",
      participantFrequencyLabel,
    ],
    recommendation,
    participantFrequencyLabel,
    requiresHumanReview: true as const,
  };

  const githubCommentDraft = buildGithubCommentDraft(
    request.sessionId,
    recommendation,
    findings,
    request.taskCompletions,
    anonymizedObservations,
    request.durationMinutes,
  );

  return {
    mode: request.mode,
    summary,
    observations,
    findings,
    recommendation,
    githubCommentDraft,
    methodologySources,
    warnings,
    requiresHumanReview: true,
  };
}

/** @deprecated Use runCareerPilotCurator */
export const runPilotCurator = runCareerPilotCurator;
