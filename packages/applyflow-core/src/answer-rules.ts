import { gustavoProfile } from "./candidate-profile.js";
import type { ApplyflowSkillKey } from "./profile-schema.js";
import type { CandidateProfile } from "./profile-schema.js";
import { getSalarySuggestion } from "./salary-rules.js";
import type { SalaryContext, SuggestedAnswer } from "./types.js";

function squeeze(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SKILL_ALIASES: { key: ApplyflowSkillKey; matchers: RegExp[] }[] = [
  { key: "Nextjs", matchers: [/next\.?\s*js/i, /nextjs/i] },
  { key: "Nodejs", matchers: [/node\.\s*js/i, /nodejs/i, /\bnode\b(?![a-z])/i] },
  { key: "React", matchers: [/\breact\b/i] },
  { key: "TypeScript", matchers: [/typescript/i, /\bts\b(?![a-z])/i] },
  { key: "AWS", matchers: [/\baws\b/i, /amazon web services/i] },
  { key: "Java", matchers: [/\bjava\b/i] },
  { key: "Elixir", matchers: [/\belixir\b/i] },
];

const ANCILLARY: Set<ApplyflowSkillKey> = new Set(["AWS", "Java"]);

function inferSkillKey(normalized: string): ApplyflowSkillKey | null {
  for (const { key, matchers } of SKILL_ALIASES) {
    if (matchers.some((re) => re.test(normalized))) return key;
  }
  return null;
}

function looksLikeYearsQuestion(normalized: string): boolean {
  return (
    /(\byears?\b|\banos?\b|\bhow many\b|\bha quanto\b|\bha quantos\b|\bquanto tempo\b|\bexperiencia\b|\bexperience\b)/i.test(
      normalized,
    ) &&
    /(experience|experiencia|anos|years|using|usa|usando|with|com|em|tem|trabalhando)/i.test(normalized)
  );
}

function inferSalaryContext(normalized: string): SalaryContext | null {
  const isUsd =
    /\busd\b|\bd[oó]lar(es)?\b|\bcontractor\b|\bcontrat(o|a|ando)\b|\bfreelance\b|\bremote international\b/i.test(
      normalized,
    );
  const isPj = /\bpj\b|pessoa juridica|mei\b/i.test(normalized);
  const isClt = /\bclt\b/i.test(normalized);
  const isSenior = /\bsenior\b|\bs[aê]nior\b/i.test(normalized);
  const isPleno = /\bpleno\b|\bmid\b/i.test(normalized);
  const isHourly = /\bhourly\b|\bhora\b|\/\s*hour|\bper hour\b/i.test(normalized);

  if (isUsd && isHourly) return { kind: "usd_hourly" };
  if (isUsd) return { kind: "usd_monthly" };

  if (isPj && isSenior) return { kind: "pj_senior" };
  if (isPj) return { kind: "pj_senior" };

  if (isClt && isSenior) return { kind: "clt_senior" };
  if (isClt && isPleno) return { kind: "clt_pleno" };
  if (isClt) return { kind: "clt_senior" };

  if (
    /salary|salario|pretens|compensation|remuneration|package|expectation|faixa|range/i.test(normalized)
  ) {
    return { kind: "generic" };
  }
  return null;
}

function inferBrazilPresenceAnswer(profile: CandidateProfile): string {
  return /\b(brazil|brasil)\b/i.test(profile.location.trim()) ? "Yes" : "No";
}

/**
 * Disponibilidade / remoto / inglês no trabalho — texto longo do Answer Bank.
 * Corre antes do Sim/Não de conforto em inglês (EN/PT/ES curto) e cobre PT/ES
 * onde o formulário pede texto longo (ex.: confortável / cómodo trabajando en inglés).
 */
function matchAnswerBankAvailability(n: string): boolean {
  return (
    /\bavailability\b/i.test(n) ||
    /\bavailable\s+to\s+start\b/i.test(n) ||
    /\bavailability\s+to\s+start\b/i.test(n) ||
    /\bwhen\s+can\s+you\s+start\b/i.test(n) ||
    /\bwhen\s+are\s+you\s+available\b/i.test(n) ||
    /\bstart\s+date\b/i.test(n) ||
    /\bremote\s+availability\b/i.test(n) ||
    /\bavailable\s+to\s+work\s+remotely\b/i.test(n) ||
    /\bavailable\s+for\s+remote\b/i.test(n) ||
    /\benglish-?speaking\s+environment\b/i.test(n) ||
    /\banglophone\s+environment\b/i.test(n) ||
    /\bwork\s+remotely\b/i.test(n) ||
    /\bremote\s+work\b/i.test(n) ||
    /\bwork\s+in\s+english\b/i.test(n) ||
    /\bambiente\s+(?:anglo|angl[oó]fono|de\s+ingles)\b/i.test(n) ||
    /\bdisponibilidade\b/i.test(n) ||
    /\bquando\s+voce\s+pode\s+comecar\b/i.test(n) ||
    /\bquando\s+pode\s+comecar\b/i.test(n) ||
    /\bdisponivel\s+para\s+inicio\b/i.test(n) ||
    /\bdisponibilidade\s+para\s+inicio\b/i.test(n) ||
    /\btrabalho\s+remoto\b/i.test(n) ||
    /\bdisponibilidade\s+para\s+remoto\b/i.test(n) ||
    /\bambiente\s+em\s+ingles\b/i.test(n) ||
    /\btrabalhar\s+em\s+ingles\b/i.test(n) ||
    /\bconfort[aá]vel\s+trabalhando\s+em\s+ingles\b/i.test(n) ||
    /\bsente\s+confort[aá]vel\s+trabalhando\s+em\s+ingles\b/i.test(n) ||
    /\bdisponibilidad\b/i.test(n) ||
    /\bcuando\s+puedes\s+empezar\b/i.test(n) ||
    /\bcuando\s+puede\s+empezar\b/i.test(n) ||
    /\bcuando\s+podrias\s+comenzar\b/i.test(n) ||
    /\bdisponible\s+para\s+empezar\b/i.test(n) ||
    /\bdisponibilidad\s+para\s+empezar\b/i.test(n) ||
    /\btrabajo\s+remoto\b/i.test(n) ||
    /\bdisponibilidad\s+para\s+remoto\b/i.test(n) ||
    /\bdisponibilidad\s+para\s+trabajo\s+remoto\b/i.test(n) ||
    /\bambiente\s+en\s+ingles\b/i.test(n) ||
    /\btrabajar\s+en\s+ingles\b/i.test(n) ||
    /\bcomodo\s+trabajando\s+en\s+ingles\b/i.test(n) ||
    /\bcomoda\s+trabajando\s+en\s+ingles\b/i.test(n) ||
    /\bte\s+sientes\s+comodo\s+trabajando\s+en\s+ingles\b/i.test(n) ||
    /\bte\s+sientes\s+comoda\s+trabajando\s+en\s+ingles\b/i.test(n)
  );
}

function matchAnswerBankTellUs(n: string): boolean {
  return (
    /\btell\s+(us|me)\s+about\s+yourself\b/i.test(n) ||
    /\bintroduce\s+yourself\b/i.test(n) ||
    /\bapresente-?se\b/i.test(n) ||
    /\bfale\s+sobre\s+(si|voce)\b/i.test(n) ||
    /\bconte\s+sobre\s+voce\b/i.test(n) ||
    /\bconte-?nos\s+sobre\s+voce\b/i.test(n) ||
    /\bresumo\s+sobre\s+voce\b/i.test(n) ||
    /\bquem\s+e\s+voce\s+profissionalmente\b/i.test(n) ||
    /\bcuentanos\s+sobre\s+ti\b/i.test(n) ||
    /\bcuentanos\s+sobre\s+usted\b/i.test(n) ||
    /\bcuentame\s+sobre\s+ti\b/i.test(n) ||
    /\bhablanos\s+de\s+ti\b/i.test(n) ||
    /\bhabla\s+sobre\s+ti\b/i.test(n) ||
    /\bpresentate\b/i.test(n) ||
    /\bpresentese\b/i.test(n) ||
    /\bquien\s+eres\s+profesionalmente\b/i.test(n) ||
    /\bresumen\s+sobre\s+ti\b/i.test(n) ||
    (/(^|[^a-z])about\s+yourself([^a-z]|$)/i.test(n) && !/\bgood\s+fit\b/i.test(n))
  );
}

function matchAnswerBankWhyFit(n: string): boolean {
  return (
    /\bwhy\s+are\s+you\s+a\s+good\s+fit\b/i.test(n) ||
    /\bwhy\s+should\s+we\s+hire\b/i.test(n) ||
    /\bwhy\s+do\s+you\s+want\s+(this|the)\s+role\b/i.test(n) ||
    /\bwhy\s+do\s+you\s+want\s+this\s+job\b/i.test(n) ||
    /\bwhy\s+do\s+you\s+want\s+to\s+work\s+here\b/i.test(n) ||
    /\bwhy\s+this\s+role\b/i.test(n) ||
    /\bwhy\s+do\s+you\s+want\s+to\s+(join|work)\b/i.test(n) ||
    /\bwhy\s+are\s+you\s+interested\b/i.test(n) ||
    /\bpor\s+que\s+voce\s+e\s+uma\s+boa\s+escolha\b/i.test(n) ||
    /\bpor\s+que\s+devemos\s+te\s+contratar\b/i.test(n) ||
    /\bpor\s+que\s+voce\s+quer\s+essa\s+vaga\b/i.test(n) ||
    /\bpor\s+que\s+voce\s+quer\s+trabalhar\s+aqui\b/i.test(n) ||
    /\bpor\s+que\s+voce\s+se\s+encaixa\b/i.test(n) ||
    /\bpor\s+que\s+voce\s+e\s+adequad[oa]\b/i.test(n) ||
    /\bpor\s+que\s+voce\s+seria\s+uma\s+boa\s+pessoa\b/i.test(n) ||
    /\bporque\s+voce\s+e\s+uma\s+boa\s+escolha\b/i.test(n) ||
    /\bporque\s+devemos\s+te\s+contratar\b/i.test(n) ||
    /\bpor\s+que\b.*\b(vaga|empresa|papel|funcao)\b/i.test(n) ||
    /\bpor\s+que\s+eres\s+una\s+buena\s+opcion\b/i.test(n) ||
    /\bpor\s+que\s+eres\s+un\s+buen\s+candidato\b/i.test(n) ||
    /\bpor\s+que\s+deberiamos\s+contratarte\b/i.test(n) ||
    /\bpor\s+que\s+deberiamos\s+contratarlo\b/i.test(n) ||
    /\bpor\s+que\s+quieres\s+este\s+puesto\b/i.test(n) ||
    /\bpor\s+que\s+quieres\s+esta\s+vacante\b/i.test(n) ||
    /\bpor\s+que\s+quieres\s+trabajar\s+aqui\b/i.test(n) ||
    /\bpor\s+que\s+encajas\b/i.test(n) ||
    /\bpor\s+que\s+eres\s+adecuado\b/i.test(n) ||
    /\bpor\s+que\s+eres\s+adecuada\b/i.test(n) ||
    /\bpor\s+que\s+serias\s+una\s+buena\s+persona\b/i.test(n) ||
    /\bpor\s+que\s+esta\s+empresa\b/i.test(n) ||
    /\bpor\s+que\s+este\s+rol\b/i.test(n) ||
    /\bporque\s+eres\s+un\s+buen\s+candidato\b/i.test(n) ||
    /\bporque\s+deberiamos\s+contratarte\b/i.test(n) ||
    /\bporque\s+deberiamos\s+contratarlo\b/i.test(n)
  );
}

function matchAnswerBankProfessional(n: string): boolean {
  if (
    /\bprofessional\s+summary\b/i.test(n) ||
    /\bcover\s+letter\b/i.test(n) ||
    /\bbio\b/i.test(n) ||
    /\bdescribe\s+your\s+(experience|background)\b/i.test(n) ||
    /\bprofessional\s+experience\b/i.test(n) ||
    /\bwork\s+history\b/i.test(n) ||
    /\blinkedin\s+summary\b/i.test(n) ||
    /\belevator\s+pitch\b/i.test(n) ||
    /\bresumo\s+profissional\b/i.test(n) ||
    /\bcarta\s+de\s+apresenta/i.test(n) ||
    /\bbiografia\b/i.test(n) ||
    /\bdescreva\s+sua\s+experiencia\b/i.test(n) ||
    /\bfale\s+sobre\s+sua\s+experiencia\b/i.test(n) ||
    /\bconte\s+sua\s+experiencia\b/i.test(n) ||
    /\bexperiencia\s+profissional\b/i.test(n) ||
    /\bexperiencia\s+profesional\b/i.test(n) ||
    /\btrajetoria\s+profissional\b/i.test(n) ||
    /\bresumen\s+profesional\b/i.test(n) ||
    /\bcarta\s+de\s+presentaci/i.test(n) ||
    /\bdescribe\s+tu\s+experiencia\b/i.test(n) ||
    /\bdescriba\s+su\s+experiencia\b/i.test(n) ||
    /\bhabla\s+sobre\s+tu\s+experiencia\b/i.test(n) ||
    /\bcuenta\s+tu\s+experiencia\b/i.test(n) ||
    /\btrayectoria\s+profesional\b/i.test(n) ||
    /\bperfil\s+profesional\b/i.test(n) ||
    /\bdescribe\s+tu\s+trayectoria\b/i.test(n) ||
    /\bbackground\s+profesional\b/i.test(n)
  ) {
    return true;
  }
  if (/\bresumo\b/i.test(n) && /\bsobre\s+voce\b/i.test(n)) {
    return false;
  }
  if (/\bresumen\b/i.test(n) && /\bsobre\s+ti\b/i.test(n)) {
    return false;
  }
  if (/\bresumo\b/i.test(n)) {
    return true;
  }
  if (/\bresumen\b/i.test(n)) {
    return true;
  }
  return /\bsummary\b/i.test(n) && /(professional|experience|qualification|your\s+background|skills)/i.test(n);
}

function pickAnswerBankText(label: string, value: string): SuggestedAnswer | null {
  const v = value.trim();
  if (!v) return null;
  return {
    label,
    value: v,
    confidence: "high",
  };
}

export function getSuggestedAnswer(questionLabel: string, profile?: CandidateProfile): SuggestedAnswer {
  const p = profile ?? gustavoProfile;
  const label = questionLabel.trim();
  const n = squeeze(label);

  const skill = inferSkillKey(n);
  if (skill && (looksLikeYearsQuestion(n) || /\b(react|next|node|typescript|aws|java|elixir)\b/i.test(n))) {
    const years = p.skills[skill];
    const base: SuggestedAnswer = {
      label,
      value: String(years),
      confidence: years > 0 ? "high" : "medium",
    };
    if (ANCILLARY.has(skill)) {
      return {
        ...base,
        confidence: "medium",
        warning: "Experiência pontual; não é stack principal do perfil — revisar antes de enviar.",
      };
    }
    if (years === 0) {
      return {
        ...base,
        confidence: "high",
        warning: "Sem experiência profissional declarada nesta stack; ajuste se tiver exposição informal.",
      };
    }
    return base;
  }

  const bank = p.answerBank;
  const availabilityHit = pickAnswerBankText(label, bank.availability);
  if (matchAnswerBankAvailability(n) && availabilityHit) {
    return availabilityHit;
  }

  const isComfortableEnglishYesNo =
    /\bcomfortable\b|\bconfortavel\b|\bcomodo\b|\bcomoda\b/i.test(n) &&
    /\benglish\b|\bingles\b/i.test(n) &&
    !/\benglish-?speaking\s+environment\b/i.test(n) &&
    !/\banglophone\s+environment\b/i.test(n) &&
    !/\bconfortavel\s+trabalhando\s+em\s+ingles\b/i.test(n) &&
    !/\bsente\s+confortavel\s+trabalhando\s+em\s+ingles\b/i.test(n) &&
    !/\bcomodo\s+trabajando\s+en\s+ingles\b/i.test(n) &&
    !/\bcomoda\s+trabajando\s+en\s+ingles\b/i.test(n) &&
    !/\bte\s+sientes\s+comodo\s+trabajando\s+en\s+ingles\b/i.test(n) &&
    !/\bte\s+sientes\s+comoda\s+trabajando\s+en\s+ingles\b/i.test(n);

  if (isComfortableEnglishYesNo) {
    return {
      label,
      value: p.comfortableInEnglish ? "Yes" : "No",
      confidence: "high",
    };
  }

  if (
    /\benglish\b|\bingles\b/i.test(n) &&
    /(level|proficiency|fluen|how well|qual seu|nivel)/i.test(n)
  ) {
    return {
      label,
      value: p.englishLevel,
      confidence: "high",
    };
  }

  if (
    (/(live|reside|currently|mora|moras|reside|localiza)/i.test(n) && /brazil|brasil/i.test(n)) ||
    /(atualmente voce mora no brasil|voce mora no brasil)/i.test(n)
  ) {
    return {
      label,
      value: inferBrazilPresenceAnswer(p),
      confidence: "high",
    };
  }

  const salaryCtx = inferSalaryContext(n);
  if (salaryCtx) {
    const s = getSalarySuggestion(salaryCtx, p);
    return {
      label,
      value: s.display,
      confidence: s.confidence,
      warning: s.warning,
    };
  }

  const tellHit = pickAnswerBankText(label, bank.tellUsAboutYourself);
  if (matchAnswerBankTellUs(n) && tellHit) {
    return tellHit;
  }

  const whyHit = pickAnswerBankText(label, bank.whyGoodFit);
  if (matchAnswerBankWhyFit(n) && whyHit) {
    return whyHit;
  }

  const profHit = pickAnswerBankText(label, bank.professionalSummary);
  if (matchAnswerBankProfessional(n) && profHit) {
    return profHit;
  }

  return {
    label,
    value: "",
    confidence: "low",
    warning: "Não foi possível inferir uma resposta segura a partir do rótulo — preencha manualmente.",
  };
}
