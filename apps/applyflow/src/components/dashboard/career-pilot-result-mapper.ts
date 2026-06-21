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

export type CareerPilotResultModel = {
  flowTitle: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  nextActions: string[];
  risks: string[];
  scores: CareerPilotScoreItem[];
  evidence: string[];
  technicalLines: string[];
  traceSteps: { code: string; message: string }[];
};

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

function mapResumeAnalysis(
  summary: string,
  analysis: ResumeAnalysis,
  agentResult: CareerAgentResult,
): Omit<CareerPilotResultModel, "flowTitle" | "technicalLines" | "traceSteps"> {
  return {
    summary,
    strengths: takeTopUnique(analysis.strengths, 3),
    improvements: takeTopUnique([...analysis.weaknesses, ...analysis.missingEvidence], 3),
    nextActions: takeTopUnique(
      [...analysis.nextActions, ...analysis.sectionRecommendations],
      3,
    ),
    risks: takeTopUnique(analysis.risks, 5),
    scores: [{ label: "Qualidade da estrutura", value: analysis.score, max: 100 }],
    evidence: takeTopUnique(
      [
        ...analysis.bulletRecommendations.map(
          (item) => `${item.section}: ${item.recommendation}`,
        ),
        ...analysis.sectionRecommendations,
        ...agentResult.evidence,
      ],
      8,
    ),
  };
}

function mapAtsAnalysis(
  summary: string,
  analysis: AtsAnalysis,
  agentResult: CareerAgentResult,
): Omit<CareerPilotResultModel, "flowTitle" | "technicalLines" | "traceSteps"> {
  const covered = analysis.requiredRequirementCoverage
    .filter((item) => item.status === "covered")
    .map((item) => item.requirement);
  const gaps = analysis.requiredRequirementCoverage
    .filter((item) => item.status !== "covered")
    .map((item) => `${item.requirement} (${item.status === "partial" ? "parcial" : "ausente"})`);

  return {
    summary,
    strengths: takeTopUnique(
      [
        ...analysis.matchedKeywords.map((keyword) => `Palavra-chave presente: ${keyword}`),
        ...covered.map((requirement) => `Requisito atendido: ${requirement}`),
      ],
      3,
    ),
    improvements: takeTopUnique(
      [
        ...analysis.missingKeywords.map((keyword) => `Palavra-chave ausente: ${keyword}`),
        ...gaps,
      ],
      3,
    ),
    nextActions: takeTopUnique(analysis.recommendations, 3),
    risks: takeTopUnique(
      [
        ...analysis.structureRisks,
        ...analysis.parsingRisks,
        ...analysis.keywordStuffingWarnings,
      ],
      5,
    ),
    scores: [
      { label: "Compatibilidade estimada", value: analysis.compatibilityScore, max: 100 },
    ],
    evidence: takeTopUnique(
      [
        ...analysis.requiredRequirementCoverage.map(
          (item) => `${item.requirement}: ${item.status}`,
        ),
        ...agentResult.evidence,
      ],
      8,
    ),
  };
}

function mapCareerStrategyPlan(
  summary: string,
  plan: CareerStrategyPlan,
  agentResult: CareerAgentResult,
): Omit<CareerPilotResultModel, "flowTitle" | "technicalLines" | "traceSteps"> {
  return {
    summary: plan.positioningSummary || summary,
    strengths: takeTopUnique(
      plan.priorityRoles.map((role) => `${role.role} — ${role.rationale}`),
      3,
    ),
    improvements: takeTopUnique(
      plan.skillPriorities.map((item) => `${item.skill}: ${item.reason}`),
      3,
    ),
    nextActions: takeTopUnique(
      [...plan.thirtyDayPlan, ...plan.applicationStrategy],
      3,
    ),
    risks: takeTopUnique(plan.risks, 5),
    scores: [],
    evidence: takeTopUnique(
      [
        ...plan.portfolioPriorities,
        ...plan.sixtyDayPlan.map((item) => `60 dias: ${item}`),
        ...plan.ninetyDayPlan.map((item) => `90 dias: ${item}`),
        ...agentResult.evidence,
      ],
      8,
    ),
  };
}

function fallbackFromAgentResult(agentResult: CareerAgentResult): Omit<
  CareerPilotResultModel,
  "flowTitle" | "technicalLines" | "traceSteps"
> {
  return {
    summary: agentResult.summary,
    strengths: takeTopUnique(
      agentResult.findings
        .filter((item) => item.priority !== "high")
        .map((item) => item.title),
      3,
    ),
    improvements: takeTopUnique(
      agentResult.findings
        .filter((item) => item.priority === "high")
        .map((item) => item.title),
      3,
    ),
    nextActions: takeTopUnique(agentResult.recommendations.map((item) => item.title), 3),
    risks: takeTopUnique(agentResult.warnings.map((item) => item.message), 5),
    scores: [],
    evidence: takeTopUnique(agentResult.evidence, 8),
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
}): CareerPilotResultModel | null {
  const agentResult = input.response.agentResult;
  if (!agentResult || input.response.status !== "completed") {
    return null;
  }

  const summary = agentResult.summary.trim();
  let core: Omit<CareerPilotResultModel, "flowTitle" | "technicalLines" | "traceSteps">;

  if (agentResult.resumeAnalysis) {
    core = mapResumeAnalysis(summary, agentResult.resumeAnalysis, agentResult);
  } else if (agentResult.atsAnalysis) {
    core = mapAtsAnalysis(summary, agentResult.atsAnalysis, agentResult);
  } else if (agentResult.careerStrategyPlan) {
    core = mapCareerStrategyPlan(summary, agentResult.careerStrategyPlan, agentResult);
  } else {
    core = fallbackFromAgentResult(agentResult);
  }

  const technicalLines = [
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
    traceSteps: input.response.trace?.steps ?? [],
  };
}
