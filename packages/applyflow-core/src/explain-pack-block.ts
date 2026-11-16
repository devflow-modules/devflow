import type { ApplicationPackV2 } from "./application-pack-v2.js";
import type { ApplicationDecision, JobDecisionV2 } from "./application-decision-types.js";
import type { EvidenceMatch } from "./evidence-matching.js";
import { incompleteAnalysisFacts } from "./evaluate-job-decision-v2.js";
import type { CandidateProfile } from "./profile-schema.js";
import { isSkillClaimed, isSkillKnown, resolveSkillCanonicalKey } from "./profile-schema.js";

function profileKnowsLabel(profile: CandidateProfile | null | undefined, label: string): boolean {
  if (!profile) return false;
  const canonical = resolveSkillCanonicalKey(label);
  if (canonical && (isSkillClaimed(profile.skills, canonical) || isSkillKnown(profile.skills, canonical))) {
    return true;
  }
  return Object.keys(profile.skills ?? {}).some((skill) => label.toLowerCase().includes(skill.toLowerCase()));
}

/** Where the unresolved fact primarily lives for the operator. */
export type PackBlockSourceKind = "announcement" | "profile" | "evidence" | "neutral";

export type PackBlockItem = {
  label: string;
  kind: PackBlockSourceKind;
  detail?: string;
};

export type PackBlockExplanation = {
  blocked: boolean;
  decision: ApplicationDecision | null;
  title: string;
  summary: string;
  nextAction: string;
  items: PackBlockItem[];
  /** True when the job still has enough local material for a read-only prep checklist. */
  canPrepareManually: boolean;
};

const NEUTRAL_SUMMARY =
  "O Pack permanece indisponível até a análise deixar de ser inconclusiva. O motivo estruturado não veio completo nesta avaliação.";
const NEUTRAL_NEXT =
  "Reveja o anúncio e o currículo; se ainda faltar contexto, prepare a candidatura manualmente com o que já tem.";

function pushUnique(items: PackBlockItem[], item: PackBlockItem): void {
  const key = `${item.kind}:${item.label.trim().toLowerCase()}`;
  if (!item.label.trim()) return;
  if (items.some((existing) => `${existing.kind}:${existing.label.trim().toLowerCase()}` === key)) return;
  items.push(item);
}

function classifyMatch(match: EvidenceMatch, profile?: CandidateProfile | null): PackBlockSourceKind {
  const type = match.requirement.requirementType;
  if (type === "location" || type === "work_model" || type === "salary" || type === "schedule") {
    return "announcement";
  }
  if (type === "years" || type === "experience") {
    return profileKnowsLabel(profile, match.requirement.label) ? "evidence" : "profile";
  }
  if (type === "skill" || type === "language") {
    if (!profileKnowsLabel(profile, match.requirement.label)) return "profile";
    if (match.status === "partial" || match.status === "unknown") return "evidence";
    return "profile";
  }
  return "neutral";
}

function classifyEligibilityReason(reason: string): PackBlockSourceKind {
  const text = reason.toLowerCase();
  if (
    text.includes("anúncio") ||
    text.includes("vaga") ||
    text.includes("posting") ||
    text.includes("job text") ||
    text.includes("não deixa claro") ||
    text.includes("nao deixa claro") ||
    text.includes("ambígu") ||
    text.includes("ambigu") ||
    text.includes("não informa") ||
    text.includes("nao informa")
  ) {
    return "announcement";
  }
  if (
    text.includes("perfil") ||
    text.includes("currículo") ||
    text.includes("curriculo") ||
    text.includes("localiza") ||
    text.includes("você") ||
    text.includes("voce")
  ) {
    return "profile";
  }
  return "neutral";
}

/** Detect mixed remote+hybrid wording in the posting (extraction may pick only one). */
export function postingHasWorkModelContradiction(jobText: string): boolean {
  const text = jobText.toLowerCase();
  const hybrid =
    /\bhybrid\b/.test(text) ||
    /\bh[ií]brido\b/.test(text) ||
    /\bmodelo\s+h[ií]brido\b/.test(text) ||
    /\bcultura\s+h[ií]brida\b/.test(text);
  const remote =
    /\bremote\b/.test(text) ||
    /\bremoto\b/.test(text) ||
    /\bremota\b/.test(text) ||
    /\b100\s*%?\s*remot/.test(text) ||
    /\bhome\s+office\b/.test(text) ||
    /\btrabalho\s+remoto\b/.test(text);
  return hybrid && remote;
}

function primaryKind(items: readonly PackBlockItem[]): PackBlockSourceKind {
  if (items.some((item) => item.kind === "announcement")) return "announcement";
  if (items.some((item) => item.kind === "evidence")) return "evidence";
  if (items.some((item) => item.kind === "profile")) return "profile";
  return "neutral";
}

function summarize(kind: PackBlockSourceKind, decision: ApplicationDecision | null, items: readonly PackBlockItem[]): {
  title: string;
  summary: string;
  nextAction: string;
} {
  if (decision === "skip") {
    return {
      title: "Pack indisponível",
      summary: "A decisão atual é SKIP, então o Pack não é uma recomendação de candidatura.",
      nextAction: "Se ainda quiser avançar, use a preparação manual e o envio externo — sem tratar o Pack como liberado.",
    };
  }

  if (kind === "announcement") {
    const labels = items.filter((item) => item.kind === "announcement").map((item) => item.label).slice(0, 3);
    return {
      title: "Pack bloqueado — falta contexto no anúncio",
      summary:
        labels.length > 0
          ? `A análise ficou inconclusiva porque o anúncio não fecha: ${labels.join(", ")}.`
          : "A análise ficou inconclusiva por informação incompleta ou ambígua no anúncio.",
      nextAction:
        "Volte ao anúncio original e confirme os requisitos em aberto. Não é necessário editar o perfil só para liberar o Pack.",
    };
  }

  if (kind === "evidence") {
    const labels = items.filter((item) => item.kind === "evidence").map((item) => item.label).slice(0, 3);
    return {
      title: "Pack bloqueado — evidência insuficiente",
      summary:
        labels.length > 0
          ? `Há requisitos reconhecidos, mas ainda sem evidência suficiente: ${labels.join(", ")}.`
          : "Há requisitos reconhecidos, mas a evidência atual não fecha a análise.",
      nextAction:
        "Revise as lacunas na preparação manual e só atualize o currículo se tiver evidência real a acrescentar.",
    };
  }

  if (kind === "profile") {
    const labels = items.filter((item) => item.kind === "profile").map((item) => item.label).slice(0, 3);
    return {
      title: "Pack bloqueado — dado ausente no perfil",
      summary:
        labels.length > 0
          ? `Faltam dados no perfil ou no currículo para fechar: ${labels.join(", ")}.`
          : "Faltam dados no perfil ou no currículo para concluir a análise.",
      nextAction: "Complete só os pontos listados no perfil/currículo, ou prepare a candidatura manualmente com o anúncio.",
    };
  }

  return {
    title: "Pack indisponível",
    summary: NEUTRAL_SUMMARY,
    nextAction: NEUTRAL_NEXT,
  };
}

/**
 * Pure explanation of why Application Pack is blocked / unavailable.
 * Does not persist, create packs, or change job status.
 */
export function explainPackBlock(input: {
  decision?: JobDecisionV2 | null;
  pack?: ApplicationPackV2 | null;
  profile?: CandidateProfile | null;
  /** Raw posting text — used to flag remote/hybrid contradictions without changing extraction. */
  jobText?: string | null;
  hasJobText?: boolean;
  hasResume?: boolean;
  hasSourceUrl?: boolean;
}): PackBlockExplanation {
  const decision = input.pack?.decision ?? input.decision?.decision ?? null;
  const evaluation = input.pack?.evaluation ?? input.decision ?? null;
  const jobText = input.jobText?.trim() ?? "";
  const hasJobText = input.hasJobText ?? (jobText.length > 0 ? true : undefined);
  const blocked =
    Boolean(input.pack && input.pack.status === "blocked") ||
    decision === "needs_info" ||
    decision === "skip" ||
    hasJobText === false ||
    input.hasResume === false;

  if (!blocked) {
    return {
      blocked: false,
      decision,
      title: "Pack disponível",
      summary: "A análise atual permite preparar o Application Pack.",
      nextAction: "Use Preparar candidatura quando quiser gerar o Pack.",
      items: [],
      canPrepareManually: false,
    };
  }

  const items: PackBlockItem[] = [];

  if (input.hasResume === false) {
    pushUnique(items, {
      label: "Currículo",
      kind: "profile",
      detail: "Sem currículo válido não há análise V2 nem Pack.",
    });
  }
  if (hasJobText === false) {
    pushUnique(items, {
      label: "Texto do anúncio",
      kind: "announcement",
      detail: "Sem descriptionSnapshot não há requisitos para avaliar.",
    });
  }

  if (jobText && postingHasWorkModelContradiction(jobText)) {
    pushUnique(items, {
      label: "Modelo de trabalho (contradição no anúncio)",
      kind: "announcement",
      detail:
        "O texto mistura sinais de remoto e híbrido. Confirme no portal oficial antes de candidatar — a preparação manual não resolve a contradição.",
    });
  }

  if (evaluation) {
    // Hard gate failures that block the pack take priority in the list.
    for (const gate of evaluation.gates) {
      if (!(gate.required && gate.result === "fail")) continue;
      if (gate.type === "salary" || gate.type === "hours") continue;
      pushUnique(items, {
        label: gate.label,
        kind: "evidence",
        detail: gate.reason,
      });
    }

    for (const finding of evaluation.eligibility?.findings ?? []) {
      if (finding.status !== "unknown" && finding.status !== "ineligible") continue;
      pushUnique(items, {
        label: finding.dimension,
        kind: classifyEligibilityReason(finding.reason),
        detail: finding.reason,
      });
    }

    for (const match of evaluation.matches) {
      if (match.status !== "unknown" && match.status !== "gap") continue;
      if (match.status === "gap" && !(match.requirement.mandatory || match.requirement.importance === "fundamental")) {
        continue;
      }
      if (match.status === "unknown") {
        if (
          match.requirement.requirementType === "salary" ||
          match.requirement.requirementType === "schedule"
        ) {
          continue;
        }
        // Associated uncertainties → items to verify (not assumed profile edits).
        pushUnique(items, {
          label: match.requirement.label,
          kind: classifyMatch(match, input.profile),
          detail: match.reason,
        });
      } else {
        pushUnique(items, {
          label: match.requirement.label,
          kind: "evidence",
          detail: match.reason,
        });
      }
    }

    for (const gate of evaluation.gates) {
      if (gate.result !== "unknown") continue;
      if (gate.type === "salary" || gate.type === "hours") continue;
      pushUnique(items, {
        label: gate.label,
        kind: "neutral",
        detail: gate.reason,
      });
    }

    if (items.length === 0) {
      for (const fact of incompleteAnalysisFacts({
        matches: evaluation.matches,
        gates: evaluation.gates,
      })) {
        pushUnique(items, { label: fact, kind: "neutral" });
      }
    }
  }

  for (const label of input.pack?.blockingRequirements ?? []) {
    pushUnique(items, { label, kind: "evidence" });
  }

  const kind = primaryKind(items);
  const copy = summarize(kind, decision, items);
  const canPrepareManually =
    Boolean(hasJobText !== false) &&
    (Boolean(input.hasSourceUrl) ||
      items.length > 0 ||
      Boolean(evaluation?.candidateInputRequests?.length) ||
      Boolean(input.hasResume));

  return {
    blocked: true,
    decision,
    title: copy.title,
    summary: copy.summary,
    nextAction: copy.nextAction,
    items: items.slice(0, 12),
    canPrepareManually,
  };
}
