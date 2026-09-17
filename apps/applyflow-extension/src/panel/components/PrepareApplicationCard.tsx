import type { ApplicationPreparation, PreparedField } from "@devflow/applyflow-core";
import { RESUME_TRACK_LABELS_PT } from "@devflow/applyflow-core";
import { useMemo, useState } from "react";

import { ExtensionButton } from "../../components/ExtensionButton.js";
import type { AutofillFieldTarget, AutofillResult } from "../../content/autofill/autofill-types.js";
import { selectSafeBulkFillTargets } from "../../content/autofill/safe-bulk-fill.js";

const SOURCE_LABEL: Record<PreparedField["source"], string> = {
  candidate_fact: "fato",
  answer_bank: "answer bank",
  heuristic: "heurística",
  ai: "IA",
  unknown: "unknown",
};

const STATUS_LABEL: Record<PreparedField["status"], string> = {
  ready: "pronto",
  needs_review: "revisar",
  missing: "faltando",
  blocked: "bloqueado",
};

function decisionClass(decision: ApplicationPreparation["match"]["decision"]): string {
  if (decision === "apply") return "af-match-decision af-match-decision--apply";
  if (decision === "review" || decision === "needs_info") return "af-match-decision af-match-decision--review";
  return "af-match-decision af-match-decision--skip";
}

function PreparedFieldRow(props: { field: PreparedField }) {
  const { field } = props;
  return (
    <article className={`af-prepare-field af-prepare-field--${field.status}`}>
      <p className="af-prepare-field-label">{field.label}</p>
      <p className="af-field-value">{field.suggestedValue?.trim() ? field.suggestedValue : "(sem valor)"}</p>
      <p className="af-muted" style={{ margin: 0, fontSize: "12px" }}>
        origem {SOURCE_LABEL[field.source]} · confiança {field.confidence} · {STATUS_LABEL[field.status]}
      </p>
      {field.reason ? (
        <p className="af-warning" style={{ margin: "6px 0 0", fontSize: "12px" }}>
          {field.reason}
        </p>
      ) : null}
    </article>
  );
}

export function PrepareApplicationCard(props: {
  jobTitle?: string;
  companyName?: string;
  preparation: ApplicationPreparation;
  attemptAutofill?: (target: AutofillFieldTarget) => Promise<AutofillResult>;
  onSavePreparation?: () => Promise<void> | void;
  historyBusy?: boolean;
}) {
  const { preparation } = props;
  const { match, resume, summary } = preparation;
  const [reviewOpen, setReviewOpen] = useState(false);
  const [resumeAck, setResumeAck] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const [bulkErr, setBulkErr] = useState("");

  const safeCount = useMemo(() => selectSafeBulkFillTargets(preparation.fields).length, [preparation.fields]);
  const awaitingReview = summary.needsReview + summary.missing + summary.blocked;

  async function runSafeBulkFill() {
    if (!props.attemptAutofill) return;
    const targets = selectSafeBulkFillTargets(preparation.fields);
    if (targets.length === 0) return;
    setBulkBusy(true);
    setBulkErr("");
    setBulkMsg("");
    let filled = 0;
    let failed = 0;
    try {
      for (const target of targets) {
        const result = await props.attemptAutofill(target);
        if (result.ok) filled += 1;
        else failed += 1;
      }
      setBulkMsg(`${filled} preenchidos · ${failed} falhas · ${awaitingReview} aguardando revisão`);
    } catch {
      setBulkErr("Não foi possível concluir o preenchimento seguro.");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <section className="af-card af-prepare-card" aria-labelledby="af-prepare-heading">
      <p className="af-panel-header">Preparar candidatura</p>
      <h2 id="af-prepare-heading" className="af-title" style={{ marginTop: 0, fontSize: "15px" }}>
        {props.jobTitle?.trim() || "Vaga detectada"}
      </h2>
      {props.companyName?.trim() ? <p className="af-sub">{props.companyName}</p> : null}

      <div className={decisionClass(match.decision)} role="status">
        <span className="af-prepare-kicker">MATCH</span>
        <strong>
          {match.score}% — {match.decision.toUpperCase()}
        </strong>
      </div>
      <p className="af-muted" style={{ fontSize: "12px" }}>
        {match.explanation}
      </p>

      <div className="af-prepare-split">
        <div>
          <p className="af-prepare-kicker">Pontos fortes</p>
          {match.strengths.length ? (
            <ul className="af-prepare-list af-prepare-list--ok">
              {match.strengths.map((item) => (
                <li key={item}>✓ {item}</li>
              ))}
            </ul>
          ) : (
            <p className="af-muted">Nenhum ponto forte claro nesta vaga.</p>
          )}
        </div>
        <div>
          <p className="af-prepare-kicker">Gaps</p>
          {match.gaps.length ? (
            <ul className="af-prepare-list af-prepare-list--gap">
              {match.gaps.map((item) => (
                <li key={item}>⚠ {item}</li>
              ))}
            </ul>
          ) : (
            <p className="af-muted">Sem gaps evidentes nas skills detectadas.</p>
          )}
        </div>
      </div>

      <div className="af-prepare-resume">
        <p className="af-prepare-kicker">CURRÍCULO</p>
        <p className="af-field-value" style={{ marginBottom: 4 }}>
          {RESUME_TRACK_LABELS_PT[resume.track]}
        </p>
        <p className="af-muted" style={{ margin: 0 }}>
          {resume.confidence} confidence
        </p>
        {!resumeAck ? (
          <>
            <p className="af-prepare-kicker" style={{ marginTop: 8 }}>
              Por quê
            </p>
            <ul className="af-prepare-list af-prepare-list--ok">
              {resume.reasons.map((reason) => (
                <li key={reason}>✓ {reason}</li>
              ))}
            </ul>
            <ExtensionButton type="button" className="af-btn-secondary" style={{ width: "auto" }} onClick={() => setResumeAck(true)}>
              Entendi
            </ExtensionButton>
          </>
        ) : null}
      </div>

      <div className="af-prepare-counts" role="status">
        <p className="af-prepare-kicker">CAMPOS</p>
        <p className="af-field-value" style={{ marginBottom: 4 }}>
          {summary.total} detectados
        </p>
        <ul className="af-muted" style={{ margin: "0 0 0 16px", padding: 0, fontSize: "13px" }}>
          <li>{summary.ready} prontos</li>
          <li>{summary.needsReview} revisar</li>
          <li>{summary.missing} faltando</li>
          <li>{summary.blocked} bloqueados</li>
        </ul>
      </div>

      <div className="af-action-row" style={{ marginTop: 12 }}>
        <ExtensionButton type="button" className="af-btn-secondary" onClick={() => setReviewOpen((open) => !open)}>
          {reviewOpen ? "Ocultar revisão" : "Revisar respostas"}
        </ExtensionButton>
        <ExtensionButton
          type="button"
          className="af-btn"
          disabled={!props.attemptAutofill || bulkBusy || safeCount === 0}
          onClick={() => void runSafeBulkFill()}
          title="Só preenche campos classificados, com valor conhecido e confiança alta/média. Nunca Submit/Next."
        >
          {bulkBusy ? "A preencher…" : "Preencher campos seguros"}
        </ExtensionButton>
      </div>
      <p className="af-muted" style={{ fontSize: "11px", marginBottom: 0 }}>
        O lote só corre depois deste clique. Submit e Next continuam só no LinkedIn. {safeCount} campo(s) elegível(eis).
      </p>
      {bulkMsg ? <p className="af-text-success">{bulkMsg}</p> : null}
      {bulkErr ? <p className="af-warning">{bulkErr}</p> : null}

      {props.onSavePreparation ? (
        <ExtensionButton
          type="button"
          className="af-btn-secondary"
          style={{ width: "auto", marginTop: 8 }}
          disabled={props.historyBusy}
          onClick={() => void props.onSavePreparation?.()}
        >
          Salvar preparação no histórico
        </ExtensionButton>
      ) : null}

      {reviewOpen ? (
        <div className="af-prepare-review" style={{ marginTop: 12 }}>
          <p className="af-prepare-kicker">Revisão dos campos</p>
          <p className="af-muted">Incerteza visível: origem, confiança e estado. Nada é preenchido só por abrir esta lista.</p>
          <div className="af-field-stack">
            {preparation.fields.map((field) => (
              <PreparedFieldRow key={field.fieldId} field={field} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
