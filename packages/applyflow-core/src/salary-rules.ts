import { salaryField, type CandidateProfile, type CandidateSalaryKey } from "./profile-schema.js";
import type { SalaryContext, SalarySuggestion } from "./types.js";

const UNKNOWN_SALARY: SalarySuggestion = {
  display: "",
  confidence: "low",
  warning: "Pretensão salarial não está no perfil. Não inventar um valor.",
};

function ensureToken(text: string, token: string): string {
  const t = text.trim();
  const re = new RegExp(`\\b${token}\\b`, "i");
  return re.test(t) ? t : `${t} ${token}`.trim();
}

function knownSalary(profile: CandidateProfile, key: CandidateSalaryKey, token?: string): SalarySuggestion {
  const value = salaryField(profile, key);
  if (!value) return UNKNOWN_SALARY;
  return {
    display: token ? ensureToken(value, token) : value,
    confidence: key === "usdHourly" ? "medium" : "high",
    ...(key === "usdMonthly"
      ? {
          warning:
            "Valor configurado no perfil; confira se o recrutador pede líquido, bruto, USD ou beneficios.",
        }
      : {}),
  };
}

export function getSalarySuggestion(context: SalaryContext, profile?: CandidateProfile): SalarySuggestion {
  if (!profile) return UNKNOWN_SALARY;
  switch (context.kind) {
    case "clt_pleno":
      return knownSalary(profile, "cltPleno", "CLT");
    case "clt_senior":
      return knownSalary(profile, "cltSenior", "CLT");
    case "pj_senior":
      return knownSalary(profile, "pjSenior", "PJ");
    case "usd_monthly":
      return knownSalary(profile, "usdMonthly");
    case "usd_hourly":
      return knownSalary(profile, "usdHourly");
    case "generic":
    default: {
      const clt = salaryField(profile, "cltSenior");
      const usd = salaryField(profile, "usdMonthly");
      if (!clt && !usd) return UNKNOWN_SALARY;
      return {
        display: [clt, usd].filter(Boolean).join(" ou "),
        confidence: "low",
        warning:
          "Pergunta genérica de salário — confira se pedem CLT, PJ ou valor em USD antes de responder.",
      };
    }
  }
}
