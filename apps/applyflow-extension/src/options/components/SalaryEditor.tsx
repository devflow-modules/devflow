import type { CandidateProfile } from "@devflow/applyflow-core";

const FIELDS: { key: keyof CandidateProfile["salary"]; label: string; short: string }[] = [
  { key: "cltPleno", label: "CLT pleno — texto livre sugerido", short: "CLT pleno" },
  { key: "cltSenior", label: "CLT sénior — texto livre sugerido", short: "CLT sénior" },
  { key: "pjSenior", label: "PJ sénior — texto livre sugerido", short: "PJ sénior" },
  { key: "usdMonthly", label: "USD mensal — texto livre sugerido", short: "USD mensal" },
  { key: "usdHourly", label: "USD hora — texto livre sugerido", short: "USD hora" },
];

export function SalaryEditor(props: {
  profile: CandidateProfile;
  onChange: (next: CandidateProfile) => void;
}) {
  const { profile, onChange } = props;

  return (
    <section className="af-card af-opt-form-card" aria-labelledby="af-opt-salary-heading">
      <p className="af-opt-section-kicker">Remuneração</p>
      <h2 id="af-opt-salary-heading" className="af-opt-section-title">
        Pretensões usadas nas sugestões
      </h2>
      <p className="af-opt-section-lead">
        Valores em texto livre usados apenas para respostas assistidas no Easy Apply. Ajuste conforme CLT, PJ ou
        contractor; inclua formato claro quando fizer sentido.
      </p>
      <div className="af-opt-salary-grid">
        {FIELDS.map((f) => (
          <label key={f.key} className="af-opt-label">
            <span className="af-opt-label-text">{f.short}</span>
            <span className="af-opt-label-hint">{f.label}</span>
            <input
              className="af-input"
              value={profile.salary[f.key]}
              onChange={(e) => onChange({ ...profile, salary: { ...profile.salary, [f.key]: e.target.value } })}
              autoComplete="off"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
