import type { CandidateProfile } from "@devflow/applyflow-core";

const FIELDS: { key: keyof CandidateProfile["salary"]; label: string }[] = [
  { key: "cltPleno", label: "CLT pleno — texto livre sugerido" },
  { key: "cltSenior", label: "CLT sénior — texto livre sugerido" },
  { key: "pjSenior", label: "PJ sénior — texto livre sugerido" },
  { key: "usdMonthly", label: "USD mensal — texto livre sugerido" },
  { key: "usdHourly", label: "USD hora — texto livre sugerido" },
];

export function SalaryEditor(props: {
  profile: CandidateProfile;
  onChange: (next: CandidateProfile) => void;
}) {
  const { profile, onChange } = props;

  return (
    <section className="af-card" style={{ marginBottom: "16px" }}>
      <h2 className="af-title" style={{ fontSize: "16px", marginBottom: "14px" }}>
        Pretensões (textos usados pelo motor de sugestão)
      </h2>
      <p className="af-muted" style={{ marginTop: "-6px", marginBottom: "12px" }}>
        Estes valores substituem o perfil pré-definido; inclua formato claro para CLT/PJ quando fizer sentido.
      </p>
      <div style={{ display: "grid", gap: "12px" }}>
        {FIELDS.map((f) => (
          <label key={f.key} className="af-field-label">
            {f.label}
            <input
              className="af-input"
              value={profile.salary[f.key]}
              onChange={(e) =>
                onChange({ ...profile, salary: { ...profile.salary, [f.key]: e.target.value } })
              }
              autoComplete="off"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
