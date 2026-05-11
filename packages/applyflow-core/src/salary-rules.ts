import { gustavoProfile } from "./candidate-profile.js";
import type { CandidateProfile } from "./profile-schema.js";
import type { SalaryContext, SalarySuggestion } from "./types.js";

function ensureToken(text: string, token: string): string {
  const t = text.trim();
  const re = new RegExp(`\\b${token}\\b`, "i");
  return re.test(t) ? t : `${t} ${token}`.trim();
}

export function getSalarySuggestion(
  context: SalaryContext,
  profile: CandidateProfile = gustavoProfile,
): SalarySuggestion {
  const { salary } = profile;

  switch (context.kind) {
    case "clt_pleno":
      return { display: ensureToken(salary.cltPleno, "CLT"), confidence: "high" };
    case "clt_senior":
      return { display: ensureToken(salary.cltSenior, "CLT"), confidence: "high" };
    case "pj_senior":
      return { display: ensureToken(salary.pjSenior, "PJ"), confidence: "high" };
    case "usd_monthly":
      return {
        display: salary.usdMonthly.trim(),
        confidence: "high",
        warning:
          "Valor configurado no perfil; confira se o recrutador pede líquido, bruto, USD ou beneficios.",
      };
    case "usd_hourly":
      return {
        display: salary.usdHourly.trim(),
        confidence: "medium",
      };
    case "generic":
    default:
      return {
        display: `${salary.cltSenior.trim()} ou ${salary.usdMonthly.trim()}`,
        confidence: "low",
        warning:
          "Pergunta genérica de salário — confira se pedem CLT, PJ ou valor em USD antes de responder.",
      };
  }
}
