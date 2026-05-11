import type { CandidateProfile, EnglishLevel } from "@devflow/applyflow-core";

const LEVELS: EnglishLevel[] = ["Basic", "Intermediate", "Advanced", "Fluent"];

export function ProfileForm(props: {
  profile: CandidateProfile;
  onChange: (next: CandidateProfile) => void;
}) {
  const { profile, onChange } = props;

  return (
    <section className="af-card" style={{ marginBottom: "16px" }}>
      <h2 className="af-title" style={{ fontSize: "16px", marginBottom: "14px" }}>
        Identidade
      </h2>
      <div style={{ display: "grid", gap: "12px" }}>
        <label className="af-field-label">
          Nome público profissional
          <input
            className="af-input"
            value={profile.name}
            onChange={(e) => onChange({ ...profile, name: e.target.value })}
            autoComplete="off"
          />
        </label>
        <label className="af-field-label">
          Localização (texto livre)
          <input
            className="af-input"
            value={profile.location}
            onChange={(e) => onChange({ ...profile, location: e.target.value })}
            autoComplete="off"
          />
        </label>
        <label className="af-field-label">
          Nível de inglês declarado
          <select
            className="af-input"
            value={profile.englishLevel}
            onChange={(e) =>
              onChange({ ...profile, englishLevel: e.target.value as EnglishLevel })
            }
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="af-field-label af-row-check">
          <input
            type="checkbox"
            checked={profile.comfortableInEnglish}
            onChange={(e) => onChange({ ...profile, comfortableInEnglish: e.target.checked })}
          />
          À vontade a trabalhar em inglês (respostas sim/não)
        </label>
        <label className="af-field-label">
          Roles principais — um por linha
          <textarea
            className="af-input af-input-area"
            rows={4}
            value={profile.roles.join("\n")}
            onChange={(e) =>
              onChange({
                ...profile,
                roles: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
              })
            }
          />
        </label>
      </div>
    </section>
  );
}
