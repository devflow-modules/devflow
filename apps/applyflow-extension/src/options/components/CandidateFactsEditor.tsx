import type { CandidateFacts, CandidateProfile, EnglishLevel, RemotePreference } from "@devflow/applyflow-core";

const LEVELS: Array<EnglishLevel | ""> = ["", "Basic", "Intermediate", "Advanced", "Fluent"];
const REMOTE: Array<RemotePreference | ""> = ["", "remote", "hybrid", "onsite", "flexible"];

function yearInput(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function parseYear(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  const r = Math.round(n);
  if (r < 0 || r > 80) return undefined;
  return r;
}

function updateFacts(profile: CandidateProfile, patch: Partial<CandidateFacts>): CandidateProfile {
  const next: CandidateFacts = { ...profile.facts, ...patch };
  for (const [key, val] of Object.entries(patch)) {
    if (val === undefined) delete next[key as keyof CandidateFacts];
  }
  return { ...profile, facts: next };
}

export function CandidateFactsEditor(props: {
  profile: CandidateProfile;
  onChange: (next: CandidateProfile) => void;
}) {
  const { profile, onChange } = props;
  const facts = profile.facts;

  return (
    <section className="af-card af-opt-form-card" aria-labelledby="af-opt-facts-heading">
      <p className="af-opt-section-kicker">Fatos objectivos</p>
      <h2 id="af-opt-facts-heading" className="af-opt-section-title">
        Candidate facts
      </h2>
      <p className="af-opt-section-lead">
        Números e preferências só entram aqui quando você os declara. Campo vazio = unknown — o ApplyFlow não inventa
        anos, empresas nem URLs.
      </p>
      <div className="af-opt-field-grid">
        <label className="af-opt-label">
          <span className="af-opt-label-text">Localização (fato)</span>
          <span className="af-opt-label-hint">Se vazio, usa a localização da identidade. Não inventar.</span>
          <input
            className="af-input"
            value={facts.location ?? ""}
            placeholder="unknown"
            onChange={(e) => onChange(updateFacts(profile, { location: e.target.value.trim() || undefined }))}
            autoComplete="off"
          />
        </label>
        <label className="af-opt-label">
          <span className="af-opt-label-text">Anos totais de experiência</span>
          <input
            className="af-input"
            type="number"
            min={0}
            max={80}
            placeholder="unknown"
            value={yearInput(facts.totalYearsExperience)}
            onChange={(e) => onChange(updateFacts(profile, { totalYearsExperience: parseYear(e.target.value) }))}
          />
        </label>
        <label className="af-opt-label">
          <span className="af-opt-label-text">Anos CLT</span>
          <input
            className="af-input"
            type="number"
            min={0}
            max={80}
            placeholder="unknown"
            value={yearInput(facts.cltYearsExperience)}
            onChange={(e) => onChange(updateFacts(profile, { cltYearsExperience: parseYear(e.target.value) }))}
          />
        </label>
        <label className="af-opt-label">
          <span className="af-opt-label-text">Anos React</span>
          <input
            className="af-input"
            type="number"
            min={0}
            max={80}
            placeholder="unknown"
            value={yearInput(facts.reactYears)}
            onChange={(e) => onChange(updateFacts(profile, { reactYears: parseYear(e.target.value) }))}
          />
        </label>
        <label className="af-opt-label">
          <span className="af-opt-label-text">Anos Next.js</span>
          <input
            className="af-input"
            type="number"
            min={0}
            max={80}
            placeholder="unknown"
            value={yearInput(facts.nextYears)}
            onChange={(e) => onChange(updateFacts(profile, { nextYears: parseYear(e.target.value) }))}
          />
        </label>
        <label className="af-opt-label">
          <span className="af-opt-label-text">Anos Node.js</span>
          <input
            className="af-input"
            type="number"
            min={0}
            max={80}
            placeholder="unknown"
            value={yearInput(facts.nodeYears)}
            onChange={(e) => onChange(updateFacts(profile, { nodeYears: parseYear(e.target.value) }))}
          />
        </label>
        <label className="af-opt-label">
          <span className="af-opt-label-text">Anos TypeScript</span>
          <input
            className="af-input"
            type="number"
            min={0}
            max={80}
            placeholder="unknown"
            value={yearInput(facts.typescriptYears)}
            onChange={(e) => onChange(updateFacts(profile, { typescriptYears: parseYear(e.target.value) }))}
          />
        </label>
        <label className="af-opt-label">
          <span className="af-opt-label-text">Anos Python</span>
          <input
            className="af-input"
            type="number"
            min={0}
            max={80}
            placeholder="unknown"
            value={yearInput(facts.pythonYears)}
            onChange={(e) => onChange(updateFacts(profile, { pythonYears: parseYear(e.target.value) }))}
          />
        </label>
        <label className="af-opt-label">
          <span className="af-opt-label-text">Inglês (fato)</span>
          <select
            className="af-input"
            value={facts.englishLevel ?? ""}
            onChange={(e) =>
              onChange(
                updateFacts(profile, {
                  englishLevel: (e.target.value || undefined) as EnglishLevel | undefined,
                }),
              )
            }
          >
            {LEVELS.map((l) => (
              <option key={l || "unknown"} value={l}>
                {l || "unknown"}
              </option>
            ))}
          </select>
        </label>
        <label className="af-opt-label">
          <span className="af-opt-label-text">Preferência de trabalho</span>
          <select
            className="af-input"
            value={facts.remotePreference ?? ""}
            onChange={(e) =>
              onChange(
                updateFacts(profile, {
                  remotePreference: (e.target.value || undefined) as RemotePreference | undefined,
                }),
              )
            }
          >
            {REMOTE.map((l) => (
              <option key={l || "unknown"} value={l}>
                {l || "unknown"}
              </option>
            ))}
          </select>
        </label>
        <label className="af-opt-label">
          <span className="af-opt-label-text">Mudança de cidade / país</span>
          <select
            className="af-input"
            value={facts.relocation === undefined ? "" : facts.relocation ? "yes" : "no"}
            onChange={(e) => {
              const v = e.target.value;
              onChange(
                updateFacts(profile, {
                  relocation: v === "" ? undefined : v === "yes",
                }),
              );
            }}
          >
            <option value="">unknown</option>
            <option value="yes">Sim</option>
            <option value="no">Não</option>
          </select>
        </label>
        <label className="af-opt-label af-opt-label--full">
          <span className="af-opt-label-text">Disponibilidade (fato curto)</span>
          <input
            className="af-input"
            value={facts.availability ?? ""}
            placeholder="unknown"
            onChange={(e) => onChange(updateFacts(profile, { availability: e.target.value.trim() || undefined }))}
            autoComplete="off"
          />
        </label>
        <label className="af-opt-label">
          <span className="af-opt-label-text">LinkedIn URL</span>
          <input
            className="af-input"
            value={facts.linkedinUrl ?? ""}
            placeholder="https://…"
            onChange={(e) => onChange(updateFacts(profile, { linkedinUrl: e.target.value.trim() || undefined }))}
            autoComplete="off"
          />
        </label>
        <label className="af-opt-label">
          <span className="af-opt-label-text">GitHub URL</span>
          <input
            className="af-input"
            value={facts.githubUrl ?? ""}
            placeholder="https://…"
            onChange={(e) => onChange(updateFacts(profile, { githubUrl: e.target.value.trim() || undefined }))}
            autoComplete="off"
          />
        </label>
      </div>
    </section>
  );
}
