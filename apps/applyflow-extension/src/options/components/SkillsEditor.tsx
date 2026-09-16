import type { ApplyflowSkillKey, CandidateProfile } from "@devflow/applyflow-core";
import { APPLYFLOW_SKILL_KEYS } from "@devflow/applyflow-core";

/** Labels só para UI — chaves em `profile.skills` permanecem canónicas. */
const SKILL_LABEL: Record<ApplyflowSkillKey, string> = {
  React: "React",
  Nextjs: "Next.js",
  TypeScript: "TypeScript",
  Nodejs: "Node.js",
  Python: "Python",
  PostgreSQL: "PostgreSQL",
  Prisma: "Prisma",
  Docker: "Docker",
  Jest: "Jest",
  Playwright: "Playwright",
  Tailwind: "Tailwind CSS",
  REST: "REST",
  OpenAPI: "OpenAPI / Swagger",
  AWS: "AWS",
  Java: "Java",
  Elixir: "Elixir",
  Ruby: "Ruby",
  WordPress: "WordPress",
  HTML: "HTML",
  CSS: "CSS",
  Git: "Git",
  CI_CD: "CI/CD",
};

export function SkillsEditor(props: {
  profile: CandidateProfile;
  onChange: (next: CandidateProfile) => void;
}) {
  const { profile, onChange } = props;

  const setYears = (key: ApplyflowSkillKey, raw: string) => {
    const nextSkills = { ...profile.skills };
    if (!raw.trim()) {
      delete nextSkills[key];
      onChange({ ...profile, skills: nextSkills });
      return;
    }
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) {
      delete nextSkills[key];
      onChange({ ...profile, skills: nextSkills });
      return;
    }
    nextSkills[key] = Math.min(80, Math.max(0, Math.round(n)));
    onChange({ ...profile, skills: nextSkills });
  };

  return (
    <section className="af-card af-opt-form-card" aria-labelledby="af-opt-skills-heading">
      <p className="af-opt-section-kicker">Competências</p>
      <h2 id="af-opt-skills-heading" className="af-opt-section-title">
        Skills — anos declarados
      </h2>
      <p className="af-opt-section-lead">
        {`Valores numéricos usados pelo motor de sugestão; chaves internas inalteradas (${String(APPLYFLOW_SKILL_KEYS.length)} competências no mapa).`}
      </p>
      <div className="af-opt-skills-premium">
        {APPLYFLOW_SKILL_KEYS.map((k) => (
          <div key={k} className="af-opt-skill-row">
            <span className="af-opt-skill-key" title={k}>
              {SKILL_LABEL[k]}
            </span>
            <label className="af-opt-skill-years">
              <span className="af-opt-sr-only">Anos {SKILL_LABEL[k]}</span>
              <input
                className="af-input af-opt-skill-input"
                type="number"
                min={0}
                max={80}
                value={profile.skills[k] === undefined || profile.skills[k] === null ? "" : profile.skills[k]}
                onChange={(e) => setYears(k, e.target.value)}
                aria-label={`Anos de experiência em ${SKILL_LABEL[k]}`}
              />
              <span className="af-opt-skill-suffix" aria-hidden="true">
                anos
              </span>
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}
