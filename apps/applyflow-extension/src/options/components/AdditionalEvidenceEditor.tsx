import {
  SUPABASE_COMPONENT_LABELS,
  SUPABASE_COMPONENT_TOPICS,
  buildRecordedFact,
  type CandidateProfile,
  type Evidence,
  type EvidenceKind,
  type EvidenceOrigin,
} from "@devflow/applyflow-core";
import { useState } from "react";

function updateEvidence(profile: CandidateProfile, evidence: Evidence[]): CandidateProfile {
  return { ...profile, evidence };
}

export function AdditionalEvidenceEditor(props: {
  profile: CandidateProfile;
  onChange: (next: CandidateProfile) => void;
}) {
  const { profile, onChange } = props;
  const evidence = profile.evidence ?? [];
  const [kind, setKind] = useState<Exclude<EvidenceKind, "other">>("skill_component");
  const [origin, setOrigin] = useState<EvidenceOrigin>("candidate_declaration");
  const [topic, setTopic] = useState<(typeof SUPABASE_COMPONENT_TOPICS)[number]>("supabase.database");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [hoursLabel, setHoursLabel] = useState("");
  const [relatedJobId, setRelatedJobId] = useState("");
  const [sourceRef, setSourceRef] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="af-card af-opt-form-card" aria-labelledby="af-opt-evidence-heading">
      <p className="af-opt-section-kicker">Evidências adicionais</p>
      <h2 id="af-opt-evidence-heading" className="af-opt-section-title">
        Experiência e informações adicionais
      </h2>
      <p className="af-opt-section-lead">
        Origem e contexto entram aqui. Declaração do candidato não é auditoria. Storage e Edge Functions não são
        inferidos de Database/Auth.
      </p>
      {evidence.length === 0 ? (
        <p className="af-muted">Nenhum fato adicional gravado.</p>
      ) : (
        <ul className="af-opt-evidence-list">
          {evidence.map((item) => (
            <li key={item.id}>
              <span>
                {item.label}
                {item.periodStart ? ` · ${item.periodStart}–${item.periodEnd ?? "present"}` : ""}
                {item.relatedJobId ? ` · ${item.relatedJobId}` : ""}
              </span>
              <button
                type="button"
                className="af-opt-linkish"
                onClick={() => onChange(updateEvidence(profile, evidence.filter((fact) => fact.id !== item.id)))}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="af-opt-field-grid">
        <label className="af-opt-label">
          <span className="af-opt-label-text">Tipo</span>
          <select className="af-input" value={kind} onChange={(event) => setKind(event.target.value as Exclude<EvidenceKind, "other">)}>
            <option value="skill_component">Componente Supabase</option>
            <option value="joint_skill">TypeScript no backend</option>
            <option value="experience_period">Período full stack</option>
            <option value="availability">Disponibilidade</option>
          </select>
        </label>
        {kind === "skill_component" ? (
          <label className="af-opt-label">
            <span className="af-opt-label-text">Componente</span>
            <select
              className="af-input"
              value={topic}
              onChange={(event) => setTopic(event.target.value as (typeof SUPABASE_COMPONENT_TOPICS)[number])}
            >
              {SUPABASE_COMPONENT_TOPICS.map((item) => (
                <option key={item} value={item}>
                  {SUPABASE_COMPONENT_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="af-opt-label">
          <span className="af-opt-label-text">Origem</span>
          <select className="af-input" value={origin} onChange={(event) => setOrigin(event.target.value as EvidenceOrigin)}>
            <option value="candidate_declaration">Declaração do candidato</option>
            <option value="document">Documento</option>
          </select>
        </label>
        <label className="af-opt-label">
          <span className="af-opt-label-text">Referência da fonte</span>
          <input className="af-input" value={sourceRef} onChange={(event) => setSourceRef(event.target.value)} />
        </label>
        {kind === "experience_period" ? (
          <>
            <label className="af-opt-label">
              <span className="af-opt-label-text">Início YYYY-MM</span>
              <input className="af-input" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
            </label>
            <label className="af-opt-label">
              <span className="af-opt-label-text">Fim YYYY-MM</span>
              <input className="af-input" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
            </label>
          </>
        ) : null}
        {kind === "availability" ? (
          <>
            <label className="af-opt-label">
              <span className="af-opt-label-text">Faixa de horário</span>
              <input className="af-input" value={hoursLabel} onChange={(event) => setHoursLabel(event.target.value)} />
            </label>
            <label className="af-opt-label">
              <span className="af-opt-label-text">ID da vaga (opcional)</span>
              <input className="af-input" value={relatedJobId} onChange={(event) => setRelatedJobId(event.target.value)} />
            </label>
          </>
        ) : null}
      </div>
      {error ? (
        <p className="af-opt-err" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="af-opt-linkish"
        onClick={() => {
          try {
            const fact = buildRecordedFact({
              kind,
              origin,
              sourceRef: sourceRef || undefined,
              topic: kind === "skill_component" ? topic : kind === "joint_skill" ? "typescript.backend" : kind === "experience_period" ? "fullstack.period" : "availability.window",
              label:
                kind === "skill_component"
                  ? SUPABASE_COMPONENT_LABELS[topic]
                  : kind === "joint_skill"
                    ? "TypeScript on the backend"
                    : kind === "experience_period"
                      ? "Full-stack autonomous work"
                      : hoursLabel,
              periodStart: kind === "experience_period" ? periodStart : undefined,
              periodEnd: kind === "experience_period" ? periodEnd || "present" : undefined,
              scheduleWindow:
                kind === "availability"
                  ? { label: hoursLabel, dstPolicy: "ambiguous" }
                  : undefined,
              relatedJobId: kind === "availability" ? relatedJobId || undefined : undefined,
              declaredValue: kind === "availability" ? "can_meet" : undefined,
              technologies:
                kind === "skill_component"
                  ? [SUPABASE_COMPONENT_LABELS[topic], "Supabase"]
                  : kind === "joint_skill"
                    ? ["TypeScript", "Node.js"]
                    : undefined,
              description:
                kind === "joint_skill"
                  ? "Direct participation writing TypeScript backend APIs on Node.js runtime."
                  : undefined,
            });
            onChange(updateEvidence(profile, [...evidence, fact]));
            setError(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Fato adicional inválido.");
          }
        }}
      >
        Adicionar fato
      </button>
    </section>
  );
}
