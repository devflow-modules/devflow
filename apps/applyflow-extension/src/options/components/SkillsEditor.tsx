import type { ApplyflowSkillKey, CandidateProfile } from "@devflow/applyflow-core";
import { APPLYFLOW_SKILL_KEYS } from "@devflow/applyflow-core";

export function SkillsEditor(props: {
  profile: CandidateProfile;
  onChange: (next: CandidateProfile) => void;
}) {
  const { profile, onChange } = props;

  const setYears = (key: ApplyflowSkillKey, v: number) => {
    const n = Number.isFinite(v) ? Math.min(80, Math.max(0, Math.round(v))) : 0;
    onChange({ ...profile, skills: { ...profile.skills, [key]: n } });
  };

  return (
    <section className="af-card" style={{ marginBottom: "16px" }}>
      <h2 className="af-title" style={{ fontSize: "16px", marginBottom: "14px" }}>
        Skills (anos declarados)
      </h2>
      <div className="af-opt-skills-grid">
        {APPLYFLOW_SKILL_KEYS.map((k) => (
          <label key={k} className="af-opt-skill-cell">
            <span className="af-opt-skill-name">{k}</span>
            <input
              className="af-input af-input-compact"
              type="number"
              min={0}
              max={80}
              value={profile.skills[k]}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                setYears(k, Number.isFinite(n) ? n : 0);
              }}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
