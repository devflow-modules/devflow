import { useMemo } from "react";
import { extractJobIntelligence } from "@devflow/applyflow-core";

import {
  JOB_CONTRACT_LABEL_PT,
  JOB_ROLE_LABEL_PT,
  JOB_SENIORITY_LABEL_PT,
  JOB_WORK_MODEL_LABEL_PT,
} from "../job-meta-i18n.js";

const MAX_JOB_TEXT_INTEL = 16_000;

export function JobIntelligenceCard(props: { jobText: string }) {
  const intel = useMemo(
    () => extractJobIntelligence(props.jobText.trim().slice(0, MAX_JOB_TEXT_INTEL)),
    [props.jobText],
  );

  const contextChips = useMemo(() => {
    const parts = [
      JOB_SENIORITY_LABEL_PT[intel.seniority] ?? intel.seniority,
      JOB_ROLE_LABEL_PT[intel.roleType] ?? intel.roleType,
      JOB_WORK_MODEL_LABEL_PT[intel.workModel] ?? intel.workModel,
      JOB_CONTRACT_LABEL_PT[intel.contractType] ?? intel.contractType,
      `Inglês: ${intel.englishRequired ? "sim" : "não"}`,
    ].filter((p) => p && String(p).trim() !== "" && String(p) !== "unknown");
    return parts;
  }, [intel]);

  const mention = [intel.salaryMentioned ? "Menção salarial/faixa na descrição (heurística)" : null]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="af-card af-card-muted">
      <p className="af-meta" style={{ marginBottom: "8px" }}>
        Inteligência da vaga (local)
      </p>
      <p className="af-muted" style={{ marginTop: 0, fontSize: "12px", lineHeight: 1.45 }}>
        Heurísticas só sobre excerto de texto já visível na página — sem IA e sem guardar o corpo completo no painel.
      </p>
      <div className="af-intel-wrap" style={{ marginTop: "10px" }}>
        {contextChips.map((text, i) => (
          <span key={`ctx-${i}-${text}`} className="af-intel-chip">
            {text}
          </span>
        ))}
      </div>
      {intel.detectedSkills.length ? (
        <div className="af-intel-wrap" style={{ marginTop: "8px" }}>
          {intel.detectedSkills.map((s) => (
            <span key={s} className="af-intel-chip af-intel-chip-skill">
              {s}
            </span>
          ))}
        </div>
      ) : (
        <p className="af-muted" style={{ margin: "8px 0 4px", fontSize: "12px" }}>
          Nenhuma skill da lista detetada neste excerto.
        </p>
      )}
      {mention ? <p className="af-muted" style={{ margin: "8px 0 0", fontSize: "11px" }}>{mention}</p> : null}
    </section>
  );
}
