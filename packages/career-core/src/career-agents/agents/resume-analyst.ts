import type {
  CareerAgentContext,
  CareerAgentFinding,
  CareerAgentRecommendation,
  CareerResumeSnapshot,
  ResumeAnalysis,
  ResumeBulletRecommendation,
} from "../types.js";

/**
 * Deterministic resume analysis. No LLM is involved here: every output is derived
 * from documented heuristics over the sanitized resume snapshot. The agent never
 * invents metrics, skills, or experience and never rewrites the resume automatically.
 *
 * Rubric (normalized 0..100 — only applicable dimensions count):
 * | Dimension                         | Max |
 * |-----------------------------------|-----|
 * | Resumo profissional               |  15 |
 * | Skills                            |  20 |
 * | Qualidade dos bullets             |  30 |
 * | Resultados mensuráveis            |  25 |
 * | Evidência de contexto/liderança   |  10 |
 * | Total                             | 100 |
 *
 * Projects and education are optional inputs; they are never penalized when absent.
 */

const ACTION_VERBS_EN = new Set([
  "led",
  "built",
  "designed",
  "implemented",
  "shipped",
  "delivered",
  "migrated",
  "optimized",
  "reduced",
  "increased",
  "launched",
  "automated",
  "created",
  "developed",
  "architected",
  "improved",
  "scaled",
  "owned",
  "drove",
  "refactored",
  "managed",
  "coordinated",
  "structured",
  "integrated",
]);

const ACTION_VERBS_PT = new Set([
  "desenvolvi",
  "implementei",
  "criei",
  "liderei",
  "reduzi",
  "aumentei",
  "automatizei",
  "migrei",
  "otimizei",
  "entreguei",
  "projetei",
  "arquitetei",
  "refatorei",
  "gerenciei",
  "coordenei",
  "estruturei",
  "integrei",
  "construí",
  "construi",
  "melhorei",
  "participei",
  "desenvolveu",
  "implementou",
  "criou",
  "liderou",
  "reduziu",
  "automatizou",
  "otimizou",
  "integrou",
  "construiu",
  "melhorou",
  "entregou",
  "projetou",
  "arquitetou",
  "refatorou",
  "gerenciou",
  "coordenou",
  "estruturou",
  "migrou",
  "aumentou",
  "participou",
]);

const EXAGGERATION_TERMS = [
  "expert",
  "guru",
  "ninja",
  "rockstar",
  "world-class",
  "best",
  "flawless",
  "perfect",
  "unmatched",
  "10x",
  "especialista",
  "perfeito",
  "perfeita",
  "imbatível",
  "imbativel",
  "melhor engenheiro",
  "world class",
];

const NON_VERB_PREFIXES = new Set([
  "desenvolvimento",
  "implementação",
  "implementacao",
  "liderança",
  "lideranca",
  "experiência",
  "experiencia",
]);

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function firstToken(bullet: string): string {
  const raw = bullet.trim().split(/\s+/)[0] ?? "";
  return raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase();
}

function hasNumber(text: string): boolean {
  return /\d/.test(text);
}

function isCompanyOrPeriodHeader(text: string): boolean {
  const trimmed = text.trim();
  return (
    /[\(（]\s*(19|20)\d{2}\s*[–\-—]\s*(presente|(19|20)\d{2})\s*[\)）]/i.test(trimmed) ||
    /[\—\-–]\s*(19|20)\d{2}\s*(a|até|–|-)\s*(19|20)\d{2}\b/i.test(trimmed)
  );
}

function hasMeaningfulMetric(bullet: string): boolean {
  const trimmed = bullet.trim();

  if (isCompanyOrPeriodHeader(trimmed)) {
    return false;
  }

  if (/\d+\s*%/.test(trimmed)) {
    return true;
  }

  if (
    /\b\d+\s*(pessoas?|membros?|devs?|engenheiros?|squads?|times?|clientes?|parceiros?|usuários?|usuarios?)\b/i.test(
      trimmed,
    )
  ) {
    return true;
  }

  if (/R\$\s*[\d.,]+(\s*(mil|milhões?|mi))?/i.test(trimmed)) {
    return true;
  }

  if (/\b\d+[\d.,]*\s*(mil|milhões?|mi)\b/i.test(trimmed)) {
    return true;
  }

  if (/\b\d+x\b/i.test(trimmed)) {
    return true;
  }

  if (/\b\d+\s*(horas?|dias?|semanas?|meses?)\b/i.test(trimmed)) {
    return true;
  }

  if (/\b(19|20)\d{2}\b/.test(trimmed)) {
    return false;
  }

  if (hasNumber(trimmed)) {
    if (/\b(node\.js|react|vue|angular|python|java|go|ruby|typescript)\s*\d+/i.test(trimmed)) {
      return false;
    }
    return true;
  }

  return trimmed.includes("%");
}

function hasMetric(bullet: string): boolean {
  return hasMeaningfulMetric(bullet);
}

function hasLeadershipEvidence(bullet: string): boolean {
  return (
    /\b(liderei|liderou|gerenciei|gerenciou|coordenei|coordenou)\b/i.test(bullet) ||
    /\b(squad|time|equipe)\b/i.test(bullet)
  );
}

function startsWithActionVerb(bullet: string): boolean {
  const token = firstToken(bullet);
  if (!token || token.length < 3) {
    return false;
  }
  if (NON_VERB_PREFIXES.has(token)) {
    return false;
  }
  return ACTION_VERBS_EN.has(token) || ACTION_VERBS_PT.has(token);
}

function wordCount(bullet: string): number {
  return bullet.trim().split(/\s+/).filter(Boolean).length;
}

function isStrongBullet(bullet: string): boolean {
  const hasAction = startsWithActionVerb(bullet);
  const measurable = hasMetric(bullet);
  if (measurable && hasAction) {
    return true;
  }
  if (measurable && hasLeadershipEvidence(bullet)) {
    return true;
  }
  return false;
}

function isVagueBullet(bullet: string): boolean {
  if (isStrongBullet(bullet)) {
    return false;
  }
  if (wordCount(bullet) < 6) {
    return true;
  }
  return !hasMetric(bullet);
}

function collectBullets(resume: CareerResumeSnapshot): Array<{ section: string; text: string }> {
  const bullets: Array<{ section: string; text: string }> = [];
  for (const experience of resume.experiences) {
    for (const bullet of experience.bullets) {
      bullets.push({ section: `${experience.title} @ ${experience.company}`, text: bullet });
    }
  }
  for (const project of resume.projects ?? []) {
    for (const bullet of project.bullets) {
      bullets.push({ section: `Projeto: ${project.name}`, text: bullet });
    }
  }
  return bullets;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildBulletRecommendation(bullet: { section: string; text: string }): ResumeBulletRecommendation {
  const text = bullet.text;
  if (isStrongBullet(text)) {
    return {
      section: bullet.section,
      originalSummary: text.slice(0, 160),
      recommendation: "Este bullet já contém ação, resultado mensurável e contexto técnico.",
      reason: "Bullet forte — nenhuma alteração obrigatória.",
    };
  }

  if (startsWithActionVerb(text) && !hasMetric(text)) {
    return {
      section: bullet.section,
      originalSummary: text.slice(0, 160),
      recommendation:
        "Explique qual ganho operacional, escopo ou volume ocorreu, somente se esses dados forem reais e verificáveis.",
      reason: "O bullet inicia com verbo de ação, mas ainda não apresenta impacto mensurável.",
    };
  }

  if (hasMetric(text) && !startsWithActionVerb(text)) {
    return {
      section: bullet.section,
      originalSummary: text.slice(0, 160),
      recommendation:
        "Reescreva iniciando com um verbo de ação claro (por exemplo, Desenvolvi, Implementei, Reduzi) mantendo a métrica informada.",
      reason: "Há métrica, mas falta um verbo de ação no início.",
    };
  }

  const contextualHint = text.toLowerCase().includes("api")
    ? "Explique quantos parceiros foram integrados, qual processo foi automatizado ou qual ganho operacional ocorreu, somente se esses dados forem reais."
    : "Reescreva iniciando com um verbo de ação concreto e inclua um resultado verificável que você já alcançou — sem inventar números.";

  return {
    section: bullet.section,
    originalSummary: text.slice(0, 160),
    recommendation: contextualHint,
    reason: "Bullet vago: falta verbo de ação claro e resultado mensurável.",
  };
}

export type ResumeAnalystOutput = {
  summary: string;
  findings: CareerAgentFinding[];
  recommendations: CareerAgentRecommendation[];
  evidence: string[];
  resumeAnalysis: ResumeAnalysis;
};

export function runResumeAnalyst(context: CareerAgentContext): ResumeAnalystOutput {
  const resume: CareerResumeSnapshot = context.analysisInput.resumeSnapshot ?? {
    skills: [],
    experiences: [],
  };
  const targetStack = (context.analysisInput.targetStack ?? []).map(normalize).filter(Boolean);
  const skills = resume.skills.map(normalize).filter(Boolean);
  const skillSet = new Set(skills);
  const bullets = collectBullets(resume);
  const totalBullets = bullets.length;

  const quantifiedBullets = bullets.filter((bullet) => hasMetric(bullet.text)).length;
  const vagueBullets = bullets.filter((bullet) => isVagueBullet(bullet.text));
  const strongBullets = bullets.filter((bullet) => isStrongBullet(bullet.text));
  const actionBullets = bullets.filter((bullet) => startsWithActionVerb(bullet.text)).length;
  const adequateLengthBullets = bullets.filter((bullet) => wordCount(bullet.text) >= 6).length;
  const hasContextEvidence = bullets.some(
    (bullet) => hasLeadershipEvidence(bullet.text) || wordCount(bullet.text) >= 10,
  );

  const hasSummary = Boolean(resume.summary && resume.summary.trim().length > 0);
  const summaryPoints = hasSummary ? 15 : 0;
  const skillsPoints = totalBullets === 0 && skills.length === 0 ? 0 : (Math.min(skills.length, 8) / 8) * 20;
  const actionRatio = totalBullets === 0 ? 0 : actionBullets / totalBullets;
  const lengthRatio = totalBullets === 0 ? 0 : adequateLengthBullets / totalBullets;
  const bulletQualityPoints = totalBullets === 0 ? 0 : actionRatio * 15 + lengthRatio * 15;
  const measurableRatio = totalBullets === 0 ? 0 : quantifiedBullets / totalBullets;
  const measurablePoints = measurableRatio * 25;
  const contextPoints = hasContextEvidence ? 10 : 0;

  const applicableMax =
    15 +
    (skills.length > 0 || totalBullets > 0 ? 20 : 0) +
    (totalBullets > 0 ? 30 : 0) +
    (totalBullets > 0 ? 25 : 0) +
    (totalBullets > 0 ? 10 : 0);

  const rawPoints =
    summaryPoints + skillsPoints + bulletQualityPoints + measurablePoints + contextPoints;
  const score =
    applicableMax === 0 ? 0 : clampScore((rawPoints / applicableMax) * 100);

  const strengths: string[] = [];
  if (hasSummary) strengths.push("O currículo apresenta um resumo profissional.");
  if (skills.length >= 5)
    strengths.push(`A seção de competências contém ${skills.length} tecnologias.`);
  else if (skills.length >= 3)
    strengths.push(`Foram identificadas ${skills.length} competências técnicas.`);
  if (quantifiedBullets > 0)
    strengths.push(
      `${quantifiedBullets} resultado${quantifiedBullets > 1 ? "s" : ""} apresenta${quantifiedBullets > 1 ? "m" : ""} métricas verificáveis.`,
    );
  if (strongBullets.length > 0)
    strengths.push(`${strongBullets.length} bullet(s) combinam ação clara e impacto mensurável.`);
  if (bullets.some((b) => hasLeadershipEvidence(b.text)))
    strengths.push("Há evidência de liderança de equipe.");
  if (strengths.length === 0)
    strengths.push("O currículo oferece uma base estrutural para evoluir com mais clareza de impacto.");

  const weaknesses: string[] = [];
  if (!hasSummary) weaknesses.push("Não há resumo profissional identificado.");
  if (skills.length < 5 && skills.length > 0)
    weaknesses.push("A seção de competências está enxuta (menos de 5 tecnologias).");
  if (skills.length === 0) weaknesses.push("Nenhuma competência técnica foi identificada.");
  if (totalBullets > 0 && quantifiedBullets === 0)
    weaknesses.push("Nenhum resultado apresenta impacto mensurável.");
  if (vagueBullets.length > 0)
    weaknesses.push(`${vagueBullets.length} bullet(s) ainda não apresentam impacto mensurável.`);
  if (totalBullets > 0 && !hasContextEvidence)
    weaknesses.push("A experiência pode ganhar mais contexto sobre escopo e responsabilidade.");

  const missingStack = targetStack.filter((item) => !skillSet.has(item));
  const missingEvidence: string[] = [];
  for (const experience of resume.experiences) {
    if (experience.bullets.length === 0) {
      missingEvidence.push(
        `Sem bullets de evidência para ${experience.title} @ ${experience.company}.`,
      );
    }
  }
  for (const item of missingStack) {
    missingEvidence.push(`A stack alvo "${item}" não aparece nas competências listadas.`);
  }

  const vagueOnly = vagueBullets.slice(0, 10);
  const bulletRecommendations: ResumeBulletRecommendation[] = [
    ...vagueOnly.map((bullet) => buildBulletRecommendation(bullet)),
    ...bullets
      .filter((b) => isStrongBullet(b.text))
      .slice(0, 3)
      .map((bullet) => buildBulletRecommendation(bullet)),
  ].slice(0, 10);

  const sectionRecommendations: string[] = [];
  if (!hasSummary)
    sectionRecommendations.push(
      "Adicione um parágrafo inicial com seu perfil e foco profissional alinhado ao cargo desejado.",
    );
  if (skills.length < 5 && skills.length > 0)
    sectionRecommendations.push(
      "Amplie a seção de competências com tecnologias que você consegue evidenciar na prática.",
    );
  if (resume.experiences.length > 1)
    sectionRecommendations.push(
      "Ordene as experiências pela relevância para o cargo alvo, começando pela mais recente.",
    );

  const risks: string[] = [];
  for (const bullet of bullets) {
    const lowered = normalize(bullet.text);
    const term = EXAGGERATION_TERMS.find((candidate) => lowered.includes(candidate));
    if (term) {
      risks.push(
        `Possível exagero ("${term}") em ${bullet.section}; mantenha apenas afirmações verificáveis.`,
      );
    }
  }
  if (risks.length === 0)
    risks.push(
      "Nenhuma afirmação automática foi adicionada; confirme que cada bullet permanece factual antes de compartilhar.",
    );

  const nextActions: string[] = [
    "Revise os bullets sugeridos e mantenha apenas alterações factuais.",
    "Confirme os resultados mensuráveis antes de incluí-los.",
    "Adicione evidências somente quando corresponderem à sua experiência real.",
  ];

  const clarityNote =
    vagueBullets.length > 0
      ? `${vagueBullets.length} ponto(s) podem ganhar mais clareza.`
      : "A estrutura geral está clara; refine detalhes conforme necessário.";

  const findings: CareerAgentFinding[] = [
    {
      kind: "evidence",
      title: "Visão geral da estrutura do currículo",
      category: "structure",
      evidence: [
        `pontuação:${score}`,
        `competências:${skills.length}`,
        `bullets:${totalBullets}`,
        `mensuráveis:${quantifiedBullets}`,
        `vagos:${vagueBullets.length}`,
      ],
      recommendation:
        weaknesses.length > 0
          ? "Enderece os pontos de atenção antes de aplicar para o cargo alvo."
          : "A estrutura do currículo está sólida; refine o impacto dos bullets onde fizer sentido.",
      priority: vagueBullets.length > 0 || quantifiedBullets === 0 ? "high" : "medium",
    },
  ];
  if (missingEvidence.length > 0) {
    findings.push({
      kind: "gap",
      title: "Evidências ausentes",
      category: "evidence",
      evidence: missingEvidence.slice(0, 8),
      recommendation: "Colete evidências verificáveis; não invente métricas ou competências.",
      priority: "high",
    });
  }

  const recommendations: CareerAgentRecommendation[] = [
    {
      title: "Melhorar impacto dos bullets",
      category: "next_steps",
      evidence: bulletRecommendations.slice(0, 5).map((item) => item.section),
      recommendation:
        "Reescreva bullets vagos iniciando com ação e resultado real, preservando a factualidade.",
      priority: vagueBullets.length > 0 ? "high" : "low",
    },
  ];

  const summary =
    `Análise concluída com pontuação estrutural de ${score}/100. ` +
    `Foram identificados ${quantifiedBullets} resultado${quantifiedBullets === 1 ? "" : "s"} ${quantifiedBullets === 1 ? "mensurável" : "mensuráveis"} e ${clarityNote}`;

  const resumeAnalysis: ResumeAnalysis = {
    score,
    strengths,
    weaknesses,
    missingEvidence,
    bulletRecommendations,
    sectionRecommendations,
    risks,
    nextActions,
    reviewRequired: true,
  };

  return {
    summary,
    findings,
    recommendations,
    evidence: [`pontuação_currículo:${score}`, ...skills.slice(0, 10)],
    resumeAnalysis,
  };
}

// Exported for tests
export const __resumeAnalystTestUtils = {
  firstToken,
  startsWithActionVerb,
  hasNumber,
  hasMeaningfulMetric,
  hasMetric,
  isVagueBullet,
  isStrongBullet,
  ACTION_VERBS_PT,
  ACTION_VERBS_EN,
};
