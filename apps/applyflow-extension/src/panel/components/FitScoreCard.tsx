import type { CandidateProfile } from "@devflow/applyflow-core";
import { calculateFitScore } from "@devflow/applyflow-core";
import { useState } from "react";

import { AiSuggestionBox } from "./AiSuggestionBox.js";
import type { PanelAiBundle } from "../panel-ai.js";

function badge(conf: ReturnType<typeof calculateFitScore>["confidence"]) {
  if (conf === "high") return "af-badge af-badge-high";
  if (conf === "medium") return "af-badge af-badge-medium";
  return "af-badge af-badge-low";
}

export function FitScoreCard(props: { jobText: string; profile: CandidateProfile; panelAi?: PanelAiBundle }) {
  const r = calculateFitScore(props.jobText, props.profile);
  const confLabel =
    r.confidence === "high" ? "Alta" : r.confidence === "medium" ? "Média" : "Baixa";

  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState("");

  return (
    <section className="af-card">
      <p className="af-panel-header" style={{ marginBottom: "6px" }}>
        Fit heurístico
      </p>
      <div className="af-fit">
        <div className="af-score">{r.score}</div>
        <div>
          <p className="af-sub" style={{ marginBottom: "6px", marginTop: 0 }}>
            Skills com experiência &gt; 0 mencionadas na vaga
          </p>
          <span className={badge(r.confidence)} title="Confiança do score">
            {confLabel}
          </span>
        </div>
      </div>
      {r.matchedSkills.length ? (
        <p className="af-muted">{r.matchedSkills.slice(0, 12).join(", ")}</p>
      ) : (
        <p className="af-muted">Não foi possível extrair texto rico da vaga nesta página.</p>
      )}
      {props.panelAi ? (
        <AiSuggestionBox
          task="fit_summary"
          availability={props.panelAi.availability}
          busy={aiBusy}
          error={aiErr}
          generatedText={aiText}
          onRun={async () => {
            if (!props.panelAi) return;
            setAiBusy(true);
            setAiErr("");
            const res = await props.panelAi.runTask("fit_summary", {
              questionLabel: "Resumo de alinhamento (fit) entre perfil e vaga",
            });
            setAiBusy(false);
            if (res.ok && res.text) setAiText(res.text);
            else setAiErr(res.reason ?? "Erro ao gerar.");
          }}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(aiText);
            } catch {
              window.prompt("Copiar:", aiText);
            }
          }}
          onClear={() => {
            setAiText("");
            setAiErr("");
          }}
        />
      ) : null}
    </section>
  );
}
