import type { CandidateProfile } from "@devflow/applyflow-core";

const FIELDS: {
  key: keyof CandidateProfile["answerBank"];
  label: string;
  hint: string;
  rows: number;
}[] = [
  {
    key: "professionalSummary",
    label: "Resumo profissional / About",
    hint: "Professional summary, bio, cover letter genérico, descrever experiência.",
    rows: 10,
  },
  {
    key: "tellUsAboutYourself",
    label: "Tell us about yourself",
    hint: "Apresentação pessoal e percurso em primeira pessoa.",
    rows: 8,
  },
  {
    key: "whyGoodFit",
    label: "Why are you a good fit?",
    hint: "Motivação, alinhamento com o papel e valor que trazes.",
    rows: 8,
  },
  {
    key: "availability",
    label: "Availability / remote work",
    hint: "Disponibilidade, remoto, equipas internacionais, ambiente anglófono.",
    rows: 5,
  },
  {
    key: "hardestChallenge",
    label: "Hardest challenge",
    hint: "Desafio mais difícil — só o que realmente aconteceu.",
    rows: 6,
  },
  {
    key: "productCase",
    label: "Product case",
    hint: "Ownership, SaaS, discovery, entrega end-to-end.",
    rows: 6,
  },
  {
    key: "frontendCase",
    label: "Frontend case",
    hint: "Exemplo concreto de UI / React / Next.js.",
    rows: 6,
  },
  {
    key: "backendCase",
    label: "Backend case",
    hint: "APIs, Node.js, dados — sem inventar stack.",
    rows: 6,
  },
  {
    key: "automationCase",
    label: "Automation / RPA case",
    hint: "Python, RPA, Selenium/Playwright, fluxos operacionais.",
    rows: 6,
  },
  {
    key: "leadershipCase",
    label: "Leadership case",
    hint: "Liderança, mentoria, ownership de time — só se tiveres.",
    rows: 6,
  },
];

export function AnswerBankEditor(props: {
  profile: CandidateProfile;
  onChange: (next: CandidateProfile) => void;
}) {
  const { profile, onChange } = props;
  const bank = profile.answerBank;

  return (
    <section className="af-card af-opt-form-card" aria-labelledby="af-opt-answer-bank-heading">
      <p className="af-opt-section-kicker">Respostas abertas</p>
      <h2 id="af-opt-answer-bank-heading" className="af-opt-section-title">
        Banco de respostas do perfil
      </h2>
      <p className="af-opt-section-lead">
        Textos usados para perguntas abertas do Easy Apply. Ficam apenas neste navegador — sem backend, sem IA
        automática e sem envio de candidatura.
      </p>
      <div className="af-opt-answer-bank-stack">
        {FIELDS.map((f) => (
          <label key={f.key} className="af-opt-label af-opt-label--full">
            <span className="af-opt-label-text">{f.label}</span>
            <span className="af-opt-label-hint">{f.hint}</span>
            <textarea
              className="af-input af-input-area af-input-area--answer-bank"
              rows={f.rows}
              spellCheck={true}
              value={bank[f.key]}
              onChange={(e) =>
                onChange({
                  ...profile,
                  answerBank: { ...bank, [f.key]: e.target.value },
                })
              }
              autoComplete="off"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
