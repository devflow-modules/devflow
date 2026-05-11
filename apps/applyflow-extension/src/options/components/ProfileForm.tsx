import type { CandidateProfile, EnglishLevel } from "@devflow/applyflow-core";

const LEVELS: EnglishLevel[] = ["Basic", "Intermediate", "Advanced", "Fluent"];

export function ProfileForm(props: {
  profile: CandidateProfile;
  onChange: (next: CandidateProfile) => void;
}) {
  const { profile, onChange } = props;

  return (
    <section className="af-card af-opt-form-card" aria-labelledby="af-opt-identity-heading">
      <p className="af-opt-section-kicker">Perfil</p>
      <h2 id="af-opt-identity-heading" className="af-opt-section-title">
        Identidade
      </h2>
      <p className="af-opt-section-lead">
        Estes campos alimentam sugestões e classificações no Easy Apply. Edição usada apenas na extensão — sem backend nem
        envio ao LinkedIn; sugestões informativas; envio da candidatura é sempre seu.
      </p>
      <div className="af-opt-field-grid">
        <label className="af-opt-label">
          <span className="af-opt-label-text">Nome público profissional</span>
          <input
            className="af-input"
            value={profile.name}
            onChange={(e) => onChange({ ...profile, name: e.target.value })}
            autoComplete="off"
          />
        </label>
        <label className="af-opt-label">
          <span className="af-opt-label-text">Localização (texto livre)</span>
          <input
            className="af-input"
            value={profile.location}
            onChange={(e) => onChange({ ...profile, location: e.target.value })}
            autoComplete="off"
          />
        </label>
        <label className="af-opt-label">
          <span className="af-opt-label-text">Nível de inglês para candidaturas</span>
          <select
            className="af-input"
            value={profile.englishLevel}
            onChange={(e) => onChange({ ...profile, englishLevel: e.target.value as EnglishLevel })}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="af-opt-label af-opt-label--row">
          <input
            type="checkbox"
            checked={profile.comfortableInEnglish}
            onChange={(e) => onChange({ ...profile, comfortableInEnglish: e.target.checked })}
          />
          <span className="af-opt-label-text">À vontade a trabalhar em inglês (respostas sim/não)</span>
        </label>
        <label className="af-opt-label af-opt-label--full">
          <span className="af-opt-label-text">Roles principais — uma por linha</span>
          <span className="af-opt-label-hint">Alimenta contexto de cargo nas sugestões; seja específico (ex.: Staff Engineer, Product).</span>
          <textarea
            className="af-input af-input-area"
            rows={4}
            value={profile.roles.join("\n")}
            onChange={(e) =>
              onChange({
                ...profile,
                roles: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      </div>
    </section>
  );
}
