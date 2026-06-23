import type {
  AffectedFlow,
  ConfidenceLevel,
  FindingSeverity,
  PilotFinding,
  PilotObservation,
} from "./curator-contracts.js";

let findingCounter = 0;

export function resetFindingCounterForTests(): void {
  findingCounter = 0;
}

function nextFindingId(sessionId: string): string {
  findingCounter += 1;
  return `${sessionId}-finding-${findingCounter}`;
}

type ClassificationRule = {
  severities: FindingSeverity[];
  pattern: RegExp;
  affectedFlow: AffectedFlow;
  finding: string;
  recommendation: string;
  confidence: ConfidenceLevel;
};

const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    severities: ["P0"],
    pattern: /(vazamento|persistência|persistiu|production|provider externo|execução externa)/i,
    affectedFlow: "privacy",
    finding: "Incidente crítico de privacidade, ambiente ou execução externa.",
    recommendation: "Interromper piloto e investigar imediatamente antes de qualquer nova sessão.",
    confidence: "high",
  },
  {
    severities: ["P1"],
    pattern: /(moderador (indicou|mostrou|disse onde)|não conseguiu concluir|fluxo principal)/i,
    affectedFlow: "navigation",
    finding: "Participante não concluiu fluxo principal sem orientação direta.",
    recommendation: "Revisar hierarquia visual, copy do CTA e ordem das tarefas antes do próximo participante.",
    confidence: "high",
  },
  {
    severities: ["P1"],
    pattern: /(heading|skill|contato|educaç|idioma).*(bullet|lista)|parser/i,
    affectedFlow: "parser",
    finding: "Parsing materialmente incorreto observado na revisão.",
    recommendation: "Corrigir parser e repetir smoke com currículo multisseção antes do próximo participante.",
    confidence: "high",
  },
  {
    severities: ["P1"],
    pattern: /(score).*(punitiv|engan|ruído|inventad)/i,
    affectedFlow: "resume",
    finding: "Score ou recomendação potencialmente enganosa.",
    recommendation: "Revisar copy do score, evidências exibidas e métricas do analista.",
    confidence: "medium",
  },
  {
    severities: ["P1"],
    pattern: /(404|500|4xx|5xx|erro técnico)/i,
    affectedFlow: "general",
    finding: "Erro técnico bloqueou ou degradou o fluxo principal.",
    recommendation: "Reproduzir erro no Preview, corrigir e repetir preflight.",
    confidence: "high",
  },
  {
    severities: ["P2"],
    pattern: /(perguntou se|não entendeu|confus|copy|densidade|nomenclatura)/i,
    affectedFlow: "discovery",
    finding: "Fricção moderada de compreensão ou copy.",
    recommendation: "Testar mensagem alternativa e observar novamente no próximo participante.",
    confidence: "medium",
  },
  {
    severities: ["P2"],
    pattern: /(\d+\s*(segundos?|minutos?)).*(procurando|localizar)/i,
    affectedFlow: "navigation",
    finding: "Fricção moderada para localizar ação principal.",
    recommendation: "Avaliar destaque visual e rótulo do CTA.",
    confidence: "medium",
  },
  {
    severities: ["P3"],
    pattern: /(estétic|preferência|futur|opcional|documentação)/i,
    affectedFlow: "general",
    finding: "Melhoria opcional ou preferência estética.",
    recommendation: "Registrar no backlog pós-piloto.",
    confidence: "low",
  },
];

function observationToFinding(
  observation: PilotObservation,
  sessionId: string,
  rule: ClassificationRule,
): PilotFinding {
  return {
    id: nextFindingId(sessionId),
    severity: rule.severities[0] ?? "P2",
    finding: rule.finding,
    observation: observation.observation,
    interpretation: observation.interpretation,
    evidence: observation.evidence.length ? observation.evidence : [observation.observation],
    confidence: rule.confidence,
    affectedFlow: observation.affectedFlow ?? rule.affectedFlow,
    recommendation: rule.recommendation,
    requiresHumanReview: true,
  };
}

export function classifyObservations(
  observations: PilotObservation[],
  sessionId: string,
): PilotFinding[] {
  const findings: PilotFinding[] = [];
  const seen = new Set<string>();

  for (const observation of observations) {
    if (observation.type === "task_completion" || observation.type === "positive_moment") {
      continue;
    }

    const haystack = `${observation.observation} ${observation.interpretation ?? ""} ${observation.evidence.join(" ")}`;
    const rule = CLASSIFICATION_RULES.find((candidate) => candidate.pattern.test(haystack));
    if (!rule) continue;

    const key = `${rule.finding}:${observation.observation}`;
    if (seen.has(key)) continue;
    seen.add(key);

    findings.push(observationToFinding(observation, sessionId, rule));
  }

  return findings;
}

export function classifyFindings(
  observations: PilotObservation[],
  existingFindings: PilotFinding[] | undefined,
  sessionId: string,
): PilotFinding[] {
  const generated = classifyObservations(observations, sessionId);
  if (!existingFindings?.length) return generated;

  const merged = [...existingFindings];
  const existingKeys = new Set(existingFindings.map((f) => `${f.severity}:${f.finding}`));

  for (const finding of generated) {
    const key = `${finding.severity}:${finding.finding}`;
    if (existingKeys.has(key)) continue;
    merged.push(finding);
    existingKeys.add(key);
  }

  return merged;
}

export function countFindingsBySeverity(findings: PilotFinding[]): Record<FindingSeverity, number> {
  return findings.reduce(
    (acc, finding) => {
      acc[finding.severity] += 1;
      return acc;
    },
    {
      P0: 0,
      P1: 0,
      P2: 0,
      P3: 0,
      insufficient_evidence: 0,
    },
  );
}
