import type {
  AffectedFlow,
  ConfidenceLevel,
  ObservationType,
  PilotObservation,
} from "./curator-contracts.js";
import { sanitizePilotText } from "./privacy-sanitizer.js";

type NoteRule = {
  pattern: RegExp;
  type: ObservationType;
  affectedFlow: AffectedFlow;
  confidence: ConfidenceLevel;
  observation: (match: RegExpMatchArray, note: string) => string;
  interpretation?: (match: RegExpMatchArray, note: string) => string;
};

const NOTE_RULES: NoteRule[] = [
  {
    pattern: /(\d+)\s*(segundos?|minutos?)\s*(procurando|para (achar|encontrar|localizar)|até (achar|encontrar|clicar))/i,
    type: "navigation_friction",
    affectedFlow: "navigation",
    confidence: "medium",
    observation: (match) =>
      `Levou aproximadamente ${match[1]} ${match[2]} para localizar o elemento de ação.`,
    interpretation: () => "A hierarquia visual ou o rótulo do CTA pode não estar suficientemente claro.",
  },
  {
    pattern: /perguntou (se|sobre|onde|como).*(enviar|enviad|candidat|mandar|salv|armazen|persist)/i,
    type: "privacy_concern",
    affectedFlow: "privacy",
    confidence: "high",
    observation: () => "O participante questionou se dados seriam enviados, candidatados ou armazenados.",
    interpretation: () =>
      "A distinção entre análise local e candidatura/armazenamento pode não estar suficientemente clara.",
  },
  {
    pattern: /não (abriu|encontrou|conseguiu|clicou|localizou)/i,
    type: "navigation_friction",
    affectedFlow: "navigation",
    confidence: "medium",
    observation: (match, note) => `O participante não completou uma ação esperada (${match[0]}). Contexto: ${note}.`,
    interpretation: () => "Pode haver fricção de descoberta ou de nomenclatura na interface.",
  },
  {
    pattern: /(score|pontuação|nota).*(punitiv|confus|não entend|avaliação pessoal)/i,
    type: "score_interpretation",
    affectedFlow: "resume",
    confidence: "medium",
    observation: () => "O participante reagiu ao score com linguagem de julgamento pessoal ou confusão.",
    interpretation: () => "O score pode estar sendo lido como avaliação da pessoa, não orientação do currículo.",
  },
  {
    pattern: /moderador (indicou|precisou|interveio|mostrou|disse onde)/i,
    type: "moderator_intervention",
    affectedFlow: "general",
    confidence: "high",
    observation: () => "Houve intervenção explícita do moderador na condução da tarefa.",
    interpretation: () => "A tarefa pode não ser concluível sem orientação direta.",
  },
  {
    pattern: /(heading|skill|contato|educaç|idioma).*(bullet|lista)/i,
    type: "parser_issue",
    affectedFlow: "parser",
    confidence: "high",
    observation: (match) => `Possível erro de parsing: ${match[0]}.`,
    interpretation: () => "O parser pode estar classificando seções estáticas como experiência.",
  },
  {
    pattern: /(vazamento|persistiu|production|provider externo|openai|nango)/i,
    type: "security_incident",
    affectedFlow: "privacy",
    confidence: "high",
    observation: (match) => `Evento de segurança ou ambiente reportado: ${match[0]}.`,
    interpretation: () => "Verificar imediatamente ambiente, persistência e chamadas externas.",
  },
  {
    pattern: /(erro|falha).*(404|500|4xx|5xx)/i,
    type: "technical_error",
    affectedFlow: "general",
    confidence: "high",
    observation: () => "Erro técnico HTTP observado durante a sessão.",
  },
  {
    pattern: /(concluiu|completou|finalizou).*(fluxo|análise|vaga|plano|feedback)/i,
    type: "task_completion",
    affectedFlow: "general",
    confidence: "medium",
    observation: (match) => `Indício de conclusão de tarefa: ${match[0]}.`,
  },
  {
    pattern: /(útil|ajudou|gostou|valor|recomendaria)/i,
    type: "positive_moment",
    affectedFlow: "general",
    confidence: "low",
    observation: () => "Comentário positivo sobre utilidade percebida.",
  },
  {
    pattern: /(feedback|consentimento)/i,
    type: "feedback_behavior",
    affectedFlow: "feedback",
    confidence: "medium",
    observation: (match, note) => `Comportamento relacionado a feedback/consentimento: ${note}.`,
  },
];

function inferFlowFromNote(note: string): AffectedFlow {
  if (/vaga|ats|aderência|lacuna/i.test(note)) return "ats";
  if (/plano|estratégia|carreira/i.test(note)) return "career-plan";
  if (/currículo|resume|experiência/i.test(note)) return "resume";
  if (/descoberta|proposta|entende/i.test(note)) return "discovery";
  return "general";
}

export function structurePilotNotes(notes: string[]): PilotObservation[] {
  const observations: PilotObservation[] = [];

  notes.forEach((rawNote, index) => {
    const { sanitized, blocked, blockReason } = sanitizePilotText(rawNote);
    if (!sanitized.trim()) return;

    if (blocked) {
      observations.push({
        type: "unknown",
        observation: sanitized,
        interpretation: blockReason,
        evidence: [sanitized],
        confidence: "low",
        affectedFlow: inferFlowFromNote(rawNote),
        sourceNoteIndex: index,
      });
      return;
    }

    const matchedRule = NOTE_RULES.find((rule) => rule.pattern.test(sanitized));
    if (matchedRule) {
      const match = sanitized.match(matchedRule.pattern);
      if (match) {
        observations.push({
          type: matchedRule.type,
          observation: matchedRule.observation(match, sanitized),
          interpretation: matchedRule.interpretation?.(match, sanitized),
          evidence: [sanitized],
          confidence: matchedRule.confidence,
          affectedFlow: matchedRule.affectedFlow,
          sourceNoteIndex: index,
        });
        return;
      }
    }

    observations.push({
      type: "unknown",
      observation: sanitized,
      evidence: [sanitized],
      confidence: "low",
      affectedFlow: inferFlowFromNote(sanitized),
      sourceNoteIndex: index,
    });
  });

  return observations;
}

export function mergeObservations(
  existing: PilotObservation[] | undefined,
  fromNotes: PilotObservation[],
): PilotObservation[] {
  if (!existing?.length) return fromNotes;
  return [...existing, ...fromNotes];
}
