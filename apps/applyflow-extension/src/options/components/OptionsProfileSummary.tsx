import type { CandidateProfile } from "@devflow/applyflow-core";
import { APPLYFLOW_SKILL_KEYS, validateCandidateProfile } from "@devflow/applyflow-core";

function countSkillsWithYears(skills: CandidateProfile["skills"]): number {
  return APPLYFLOW_SKILL_KEYS.filter((k) => (skills[k] ?? 0) > 0).length;
}

function countSalaryFilled(salary: CandidateProfile["salary"]): number {
  return (Object.keys(salary) as (keyof CandidateProfile["salary"])[]).filter(
    (k) => String(salary[k] ?? "").trim().length > 0,
  ).length;
}

export function OptionsProfileSummary(props: { profile: CandidateProfile }) {
  const { profile } = props;

  let schemaValid = false;
  let schemaMessage = "";
  try {
    validateCandidateProfile(profile);
    schemaValid = true;
  } catch (e) {
    schemaMessage = e instanceof Error ? e.message : "Perfil inválido";
  }

  const nameOk = profile.name.trim().length > 0;
  const rolesOk = profile.roles.length > 0;
  const skillsOk = countSkillsWithYears(profile.skills) >= 1;
  const salaryOk = countSalaryFilled(profile.salary) >= 1;

  const readyForSuggestions = schemaValid && nameOk && rolesOk;

  return (
    <aside className="af-opt-summary" aria-label="Resumo do perfil local">
      <div className="af-opt-summary-card">
        <p className="af-opt-summary-kicker">Estado</p>
        <p className={readyForSuggestions ? "af-opt-summary-title af-opt-summary-title--ok" : "af-opt-summary-title"}>
          {readyForSuggestions ? "Perfil pronto para sugestões" : "Complete os campos obrigatórios"}
        </p>
        {!schemaValid && schemaMessage ? (
          <p className="af-opt-summary-warn" role="status">
            {schemaMessage}
          </p>
        ) : null}
        <ul className="af-opt-checklist">
          <li className={nameOk ? "af-opt-checklist__item af-opt-checklist__item--ok" : "af-opt-checklist__item"}>
            Nome preenchido
          </li>
          <li className={rolesOk ? "af-opt-checklist__item af-opt-checklist__item--ok" : "af-opt-checklist__item"}>
            Roles configuradas
          </li>
          <li className={skillsOk ? "af-opt-checklist__item af-opt-checklist__item--ok" : "af-opt-checklist__item"}>
            Pelo menos uma skill com anos declarados
          </li>
          <li className={salaryOk ? "af-opt-checklist__item af-opt-checklist__item--ok" : "af-opt-checklist__item"}>
            Pretensões (pelo menos um campo)
          </li>
          <li className="af-opt-checklist__item af-opt-checklist__item--ok">Dados locais (sem envio remoto)</li>
          <li className="af-opt-checklist__item af-opt-checklist__item--ok">Sem auto-submit</li>
        </ul>
      </div>

      <div className="af-opt-summary-card af-opt-summary-card--muted">
        <p className="af-opt-summary-kicker">Confiança</p>
        <div className="af-opt-pill-row">
          <span className="af-opt-pill">Local-first</span>
          <span className="af-opt-pill">chrome.storage.local</span>
          <span className="af-opt-pill">Sem backend</span>
          <span className="af-opt-pill">Sem auto-submit</span>
        </div>
        <p className="af-opt-summary-foot">
          Sugestões no LinkedIn são informativas; o envio da candidatura é sempre seu no site oficial.
        </p>
      </div>
    </aside>
  );
}
