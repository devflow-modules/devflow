import type {
  AtsAnalysis,
  CareerAgentResult,
  CareerChatIntent,
  CareerChatResponse,
  CareerStrategyPlan,
  ResumeAnalysis,
} from "@devflow/career-core";

export type CareerPilotScoreItem = {
  label: string;
  value: number;
  max?: number;
};

export type CareerPilotBulletSuggestion = {
  original: string;
  recommendation: string;
  section?: string;
};

export type CareerPilotResultModel = {
  flowTitle: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  nextActions: string[];
  risks: string[];
  scores: CareerPilotScoreItem[];
  evidence: string[];
  bulletSuggestions: CareerPilotBulletSuggestion[];
  humanReviewNotice: string;
  technicalLines: string[];
  traceSteps: { code: string; message: string }[];
};

const INTERNAL_EVIDENCE_PATTERN =
  /^(score:|pontuação|pontuacao|resume_score|pontuação_currículo|skills:|bullets:|quantified|mensuráveis|vagos:)/i;

function isParticipantSafeEvidence(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (INTERNAL_EVIDENCE_PATTERN.test(trimmed)) return false;
  if (/^[\w_]+:\d+/i.test(trimmed)) return false;
  return true;
}

export function takeTopUnique(items: string[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

function mapBulletSuggestions(analysis: ResumeAnalysis): CareerPilotBulletSuggestion[] {
  return (analysis.bulletRecommendations ?? [])
    .filter((item) => !item.reason?.includes("forte"))
    .slice(0, 5)
    .map((item) => ({
      original: item.originalSummary,
      recommendation: item.recommendation,
      section: item.section,
    }));
}

function mapResumeAnalysis(
  summary: string,
  analysis: ResumeAnalysis,
  agentResult: CareerAgentResult,
  participantSurface: boolean,
): Omit<CareerPilotResultModel, "flowTitle" | "technicalLines" | "traceSteps"> {
  const strengths = analysis.strengths ?? [];
  const weaknesses = analysis.weaknesses ?? [];
  const missingEvidence = analysis.missingEvidence ?? [];
  const sectionRecommendations = analysis.sectionRecommendations ?? [];
  const risks = analysis.risks ?? [];
  const nextActions = analysis.nextActions ?? [];
  const evidence = agentResult.evidence ?? [];

  const participantEvidence = participantSurface
    ? takeTopUnique(sectionRecommendations, 3)
    : takeTopUnique(
        [
          ...(analysis.bulletRecommendations ?? []).map(
            (item) => `${item.section}: ${item.recommendation}`,
          ),
          ...sectionRecommendations,
          ...evidence.filter(isParticipantSafeEvidence),
        ],
        8,
      );

  return {
    summary,
    strengths: takeTopUnique(strengths, 3),
    improvements: takeTopUnique([...weaknesses, ...missingEvidence], 3),
    nextActions: takeTopUnique([...nextActions, ...sectionRecommendations], 3),
    risks: takeTopUnique(risks, 5),
    scores: [{ label: "Qualidade da estrutura", value: analysis.score, max: 100 }],
    evidence: participantEvidence,
    bulletSuggestions: mapBulletSuggestions(analysis),
    humanReviewNotice: "Revise cada sugestão com critério humano antes de alterar seu currículo.",
  };
}

function mapAtsAnalysis(
  summary: string,
  analysis: AtsAnalysis,
  agentResult: CareerAgentResult,
  participantSurface: boolean,
): Omit<CareerPilotResultModel, "flowTitle" | "technicalLines" | "traceSteps"> {
  const requiredRequirementCoverage = analysis.requiredRequirementCoverage ?? [];
  const matchedKeywords = analysis.matchedKeywords ?? [];
  const missingKeywords = analysis.missingKeywords ?? [];
  const recommendations = analysis.recommendations ?? [];
  const structureRisks = analysis.structureRisks ?? [];
  const parsingRisks = analysis.parsingRisks ?? [];
  const keywordStuffingWarnings = analysis.keywordStuffingWarnings ?? [];
  const evidence = agentResult.evidence ?? [];

  const covered = requiredRequirementCoverage
    .filter((item) => item.status === "covered")
    .map((item) => item.requirement);
  const gaps = requiredRequirementCoverage
    .filter((item) => item.status !== "covered")
    .map((item) => `${item.requirement} (${item.status === "partial" ? "parcial" : "ausente"})`);

  return {
    summary,
    strengths: takeTopUnique(
      [
        ...matchedKeywords.map((keyword) => `Palavra-chave presente: ${keyword}`),
        ...covered.map((requirement) => `Requisito atendido: ${requirement}`),
      ],
      3,
    ),
    improvements: takeTopUnique(
      [
        ...missingKeywords.map((keyword) => `Palavra-chave ausente: ${keyword}`),
        ...gaps,
      ],
      3,
    ),
    nextActions: takeTopUnique(recommendations, 3),
    risks: takeTopUnique([...structureRisks, ...parsingRisks, ...keywordStuffingWarnings], 5),
    scores: [
      { label: "Compatibilidade estimada", value: analysis.compatibilityScore, max: 100 },
    ],
    evidence: participantSurface
      ? takeTopUnique(recommendations, 3)
      : takeTopUnique(
          [
            ...requiredRequirementCoverage.map((item) => `${item.requirement}: ${item.status}`),
            ...evidence.filter(isParticipantSafeEvidence),
          ],
          8,
        ),
    bulletSuggestions: [],
    humanReviewNotice: "Revise cada sugestão com critério humano antes de alterar seu currículo.",
  };
}

function mapCareerStrategyPlan(
  summary: string,
  plan: CareerStrategyPlan,
  agentResult: CareerAgentResult,
  participantSurface: boolean,
): Omit<CareerPilotResultModel, "flowTitle" | "technicalLines" | "traceSteps"> {
  const priorityRoles = plan.priorityRoles ?? [];
  const skillPriorities = plan.skillPriorities ?? [];
  const thirtyDayPlan = plan.thirtyDayPlan ?? [];
  const applicationStrategy = plan.applicationStrategy ?? [];
  const risks = plan.risks ?? [];
  const portfolioPriorities = plan.portfolioPriorities ?? [];
  const sixtyDayPlan = plan.sixtyDayPlan ?? [];
  const ninetyDayPlan = plan.ninetyDayPlan ?? [];
  const evidence = agentResult.evidence ?? [];

  return {
    summary: plan.positioningSummary || summary,
    strengths: takeTopUnique(
      priorityRoles.map((role) => `${role.role} — ${role.rationale}`),
      3,
    ),
    improvements: takeTopUnique(
      skillPriorities.map((item) => `${item.skill}: ${item.reason}`),
      3,
    ),
    nextActions: takeTopUnique([...thirtyDayPlan, ...applicationStrategy], 3),
    risks: takeTopUnique(risks, 5),
    scores: [],
    evidence: participantSurface
      ? takeTopUnique([...thirtyDayPlan, ...applicationStrategy], 3)
      : takeTopUnique(
          [
            ...portfolioPriorities,
            ...sixtyDayPlan.map((item) => `60 dias: ${item}`),
            ...ninetyDayPlan.map((item) => `90 dias: ${item}`),
            ...evidence.filter(isParticipantSafeEvidence),
          ],
          8,
        ),
    bulletSuggestions: [],
    humanReviewNotice: "Revise cada sugestão com critério humano antes de alterar seu currículo.",
  };
}

function fallbackFromAgentResult(
  agentResult: CareerAgentResult,
  participantSurface: boolean,
): Omit<CareerPilotResultModel, "flowTitle" | "technicalLines" | "traceSteps"> {
  const findings = agentResult.findings ?? [];
  const recommendations = agentResult.recommendations ?? [];
  const warnings = agentResult.warnings ?? [];
  const evidence = agentResult.evidence ?? [];

  return {
    summary: agentResult.summary,
    strengths: takeTopUnique(
      findings
        .filter((item) => item.priority !== "high")
        .map((item) => item.title),
      3,
    ),
    improvements: takeTopUnique(
      findings
        .filter((item) => item.priority === "high")
        .map((item) => item.title),
      3,
    ),
    nextActions: takeTopUnique(recommendations.map((item) => item.title), 3),
    risks: takeTopUnique(warnings.map((item) => item.message), 5),
    scores: [],
    evidence: participantSurface
      ? []
      : takeTopUnique(evidence.filter(isParticipantSafeEvidence), 8),
    bulletSuggestions: [],
    humanReviewNotice: "Revise cada sugestão com critério humano antes de alterar seu currículo.",
  };
}

function flowTitleForIntent(intent: CareerChatIntent): string {
  switch (intent) {
    case "analyze_resume":
      return "Análise do currículo";
    case "analyze_ats_compatibility":
      return "Compatibilidade com a vaga";
    case "plan_career_strategy":
      return "Plano de carreira";
    default:
      return "Resultado da análise";
  }
}

export function buildCareerPilotResultModel(input: {
  intent: CareerChatIntent;
  response: CareerChatResponse;
  participantSurface?: boolean;
}): CareerPilotResultModel | null {
  const participantSurface = input.participantSurface !== false;
  const agentResult = input.response.agentResult;
  if (!agentResult || input.response.status !== "completed") {
    return null;
  }

  const summary = (agentResult.summary ?? "").trim();
  if (!summary) {
    return null;
  }
  let core: Omit<CareerPilotResultModel, "flowTitle" | "technicalLines" | "traceSteps">;

  if (agentResult.resumeAnalysis) {
    core = mapResumeAnalysis(summary, agentResult.resumeAnalysis, agentResult, participantSurface);
  } else if (agentResult.atsAnalysis) {
    core = mapAtsAnalysis(summary, agentResult.atsAnalysis, agentResult, participantSurface);
  } else if (agentResult.careerStrategyPlan) {
    core = mapCareerStrategyPlan(summary, agentResult.careerStrategyPlan, agentResult, participantSurface);
  } else {
    core = fallbackFromAgentResult(agentResult, participantSurface);
  }

  const technicalLines = participantSurface
    ? []
    : [
        "Nenhuma candidatura foi enviada.",
        "Nenhuma alteração externa foi executada.",
        input.response.persisted === false
          ? "Seus dados não foram armazenados nesta sessão."
          : "Registro limitado conforme consentimento.",
        `Revisão humana necessária: ${input.response.reviewRequired ? "sim" : "não"}`,
      ];

  return {
    flowTitle: flowTitleForIntent(input.intent),
    ...core,
    technicalLines,
    traceSteps: participantSurface ? [] : (input.response.trace?.steps ?? []),
  };
}
