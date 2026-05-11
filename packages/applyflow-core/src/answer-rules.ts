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

  if (/comfortable|confort(a|á)vel/i.test(n) && /english|ingles|inglês/i.test(n)) {
    return {
      label,
      value: p.comfortableInEnglish ? "Yes" : "No",
      confidence: "high",
    };
  }

  if (
    /english|ingles|inglês/i.test(n) &&
    /(level|proficiency|fluen|how well|qual seu|nivel|nível)/i.test(n)
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

  return {
    label,
    value: "",
    confidence: "low",
    warning: "Não foi possível inferir uma resposta segura a partir do rótulo — preencha manualmente.",
  };
}
