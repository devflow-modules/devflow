import type { SuggestedAnswer } from "@devflow/applyflow-core";
import type { FieldClassification } from "@devflow/applyflow-linkedin";
import { useCallback, useMemo, useRef, useState } from "react";

import type { AutofillFieldTarget, AutofillResult } from "../../content/autofill/autofill-types.js";
import { canAutofillField } from "../../content/autofill/autofill-safety.js";
import { AiSuggestionBox } from "./AiSuggestionBox.js";
import { inferPanelAiTask } from "../infer-panel-ai-task.js";
import type { PanelAiBundle } from "../panel-ai.js";

function badgeClass(c: SuggestedAnswer["confidence"]): string {
  if (c === "high") return "af-badge af-badge-high";
  if (c === "medium") return "af-badge af-badge-medium";
  return "af-badge af-badge-low";
}

function typeLabel(c: FieldClassification["type"]): string {
  const map: Record<FieldClassification["type"], string> = {
    cover_letter: "Carta / texto",
    english: "Inglês",
    location: "Localização",
    salary: "Salário",
    unknown: "Desconhecido",
    yes_no: "Sim / Não",
    years_experience: "Anos de experiência",
  };
  return map[c];
}

function classificationTypeString(classification: FieldClassification): string {
  return classification.skill ? `${classification.type}:${classification.skill}` : classification.type;
}

export function FieldSuggestionCard(props: {
  fieldId: string;
  label: string;
  suggestion: SuggestedAnswer;
  classification: FieldClassification;
  attemptAutofill?: (target: AutofillFieldTarget) => Promise<AutofillResult>;
  panelAi?: PanelAiBundle;
}) {
  const { suggestion } = props;
  const confidenceLabelPt =
    suggestion.confidence === "high" ? "Alta" : suggestion.confidence === "medium" ? "Média" : "Baixa";

  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [fillStatus, setFillStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [fillDetail, setFillDetail] = useState<string>("");
  /** Confirmação explícita para caminhos de baixa confiança / tipo desconhecido. */
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState("");

  const aiTask = useMemo(() => inferPanelAiTask(props.label, props.classification), [props.label, props.classification]);

  const displayValue = (aiText.trim() || props.suggestion.value).trim();

  const gate = useMemo(
    () =>
      canAutofillField({
        label: "",
        classificationType: classificationTypeString(props.classification),
        suggestionConfidence: props.suggestion.confidence,
        fieldConfidence: props.classification.confidence,
        suggestedValue: displayValue,
        requiresConfirmation: riskAcknowledged,
      }),
    [props.classification, props.suggestion.confidence, displayValue, riskAcknowledged],
  );

  const copy = useCallback(async () => {
    const text = suggestion.value?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copiar resposta:", text);
    }
  }, [suggestion.value]);

  async function fill() {
    if (!props.attemptAutofill || !displayValue) return;
    if (!gate.allowed) return;
    setFillStatus("loading");
    setFillDetail("");
    const target: AutofillFieldTarget = {
      fieldId: props.fieldId,
      label: props.label,
      classificationType: classificationTypeString(props.classification),
      suggestedValue: displayValue,
      suggestionConfidence: props.suggestion.confidence,
      classificationConfidence: props.classification.confidence,
      userConfirmedRisk: riskAcknowledged,
    };
    try {
      const r = await props.attemptAutofill(target);
      if (r.ok) {
        setFillStatus("ok");
        setFillDetail("Preenchido.");
        window.setTimeout(() => {
          setFillStatus("idle");
          setFillDetail("");
        }, 3200);
      } else {
        setFillStatus("err");
        setFillDetail(r.reason ?? "Não foi possível preencher este campo.");
      }
    } catch {
      setFillStatus("err");
      setFillDetail("Não foi possível preencher este campo.");
    }
  }

  const longDraft = props.classification.type === "cover_letter" && (props.suggestion.value?.length ?? 0) > 1200;

  const hardBlock = !gate.allowed && !gate.requiresConfirmation;
  const needsRiskConfirm = gate.requiresConfirmation && !riskAcknowledged;
  const preencherLabel =
    props.suggestion.confidence === "low" || props.classification.confidence === "low" || props.classification.type === "unknown"
      ? "Preencher (confirmado)"
      : "Preencher";

  return (
    <article className="af-card">
      <p className="af-meta">
        Campo inferido · {typeLabel(props.classification.type)}
        {props.classification.skill ? ` (${props.classification.skill})` : null}
      </p>
      <p className="af-field-label">{props.label}</p>
      <p className="af-field-value">
        {displayValue || "(vazio)"}
        <span className={badgeClass(suggestion.confidence)} title="Confiança da sugestão (applyflow-core)">
          {confidenceLabelPt} ({suggestion.confidence})
        </span>
      </p>
      <p className="af-muted" style={{ marginTop: "-4px" }}>
        Confiança da classificação: {props.classification.confidence}
      </p>
      {suggestion.warning ? <p className="af-warning">{suggestion.warning}</p> : null}
      {gate.reason ? (
        <p className={hardBlock ? "af-warning" : "af-muted"} style={{ fontSize: "13px", marginTop: "6px" }}>
          <strong>Segurança autofill:</strong> {gate.reason}
        </p>
      ) : null}
      {longDraft ? (
        <p className="af-muted">Texto longo: considerar Copiar e colar se o formulário usar um editor especial.</p>
      ) : null}
      <div className="af-action-row">
        <button type="button" className={`af-btn ${copied ? "af-btn-copied" : ""}`} onClick={() => void copy()}>
          {copied ? "Copiado" : "Copiar"}
        </button>
        {props.attemptAutofill && needsRiskConfirm ? (
          <button type="button" className="af-btn-secondary" onClick={() => setRiskAcknowledged(true)}>
            Confirmar preenchimento
          </button>
        ) : null}
        {props.attemptAutofill && gate.allowed ? (
          <button
            type="button"
            className="af-btn-secondary"
            disabled={fillStatus === "loading" || !displayValue || hardBlock}
            onClick={() => void fill()}
          >
            {fillStatus === "loading" ? "A preencher…" : preencherLabel}
          </button>
        ) : null}
      </div>
      {fillStatus === "ok" ? <p className="af-text-success">{fillDetail}</p> : null}
      {fillStatus === "err" ? (
        <p className="af-warning" style={{ marginTop: "10px", marginBottom: 0 }}>
          {fillDetail || "Não foi possível preencher este campo."}
        </p>
      ) : null}
      {aiTask && props.panelAi ? (
        <AiSuggestionBox
          task={aiTask}
          availability={props.panelAi.availability}
          busy={aiBusy}
          error={aiErr}
          generatedText={aiText}
          onRun={async () => {
            setAiBusy(true);
            setAiErr("");
            const res = await props.panelAi!.runTask(aiTask, {
              questionLabel: props.label,
              visibleQuestionText: props.suggestion.value,
            });
            setAiBusy(false);
            if (res.ok && res.text) setAiText(res.text);
            else setAiErr(res.reason ?? "Falha ao gerar.");
          }}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(aiText);
            } catch {
              window.prompt("Copiar:", aiText);
            }
          }}
          onFill={() => void fill()}
          onClear={() => {
            setAiText("");
            setAiErr("");
          }}
        />
      ) : null}
    </article>
  );
}
