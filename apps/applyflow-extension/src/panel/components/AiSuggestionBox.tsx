import { useState } from "react";

import { ExtensionButton } from "../../components/ExtensionButton.js";
import type { AiTextTask } from "@devflow/applyflow-core";

import type { AiAvailability } from "../panel-ai.js";

export function AiSuggestionBox(props: {
  task: AiTextTask;
  availability: AiAvailability;
  onRun: () => Promise<void>;
  generatedText: string;
  busy: boolean;
  error?: string;
  onCopy: () => void;
  onFill?: () => void;
  onClear: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (props.availability === "disabled") {
    return (
      <div className="af-card af-card-muted" style={{ marginTop: "10px", padding: "10px" }}>
        <p className="af-panel-header" style={{ marginBottom: "4px" }}>
          IA (opt-in)
        </p>
        <p className="af-muted" style={{ margin: 0, fontSize: "12px" }}>
          IA desactivada nas opções da extensão.
        </p>
      </div>
    );
  }
  if (props.availability === "no_key") {
    return (
      <div className="af-card af-card-muted" style={{ marginTop: "10px", padding: "10px" }}>
        <p className="af-panel-header" style={{ marginBottom: "4px" }}>
          IA (opt-in)
        </p>
        <p className="af-muted" style={{ margin: 0, fontSize: "12px" }}>
          Configure a API key OpenAI em Opções › IA para usar «Gerar com IA».
        </p>
      </div>
    );
  }

  return (
    <div className="af-card af-card-muted" style={{ marginTop: "10px" }}>
      <p className="af-meta" style={{ marginBottom: "8px" }}>
        IA (opt-in) · {props.task}
      </p>
      <div className="af-action-row" style={{ marginTop: 0, marginBottom: "8px" }}>
        <ExtensionButton type="button" className="af-btn" disabled={props.busy} onClick={() => void props.onRun()}>
          {props.busy ? "A gerar…" : props.generatedText ? "Regerar com IA" : "Gerar com IA"}
        </ExtensionButton>
        {props.generatedText ? (
          <>
            <ExtensionButton
              type="button"
              className={`af-btn-secondary ${copied ? "af-btn-copied" : ""}`}
              onClick={() => {
                void props.onCopy();
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              }}
            >
              {copied ? "Copiado" : "Copiar texto IA"}
            </ExtensionButton>
            {props.onFill ? (
              <ExtensionButton type="button" className="af-btn-secondary" onClick={props.onFill}>
                Preencher com texto IA
              </ExtensionButton>
            ) : null}
            <ExtensionButton type="button" className="af-btn-secondary" onClick={props.onClear}>
              Limpar IA
            </ExtensionButton>
          </>
        ) : null}
      </div>
      {props.error ? <p className="af-warning">{props.error}</p> : null}
      {props.generatedText ? <pre className="af-ai-pre">{props.generatedText}</pre> : null}
    </div>
  );
}
