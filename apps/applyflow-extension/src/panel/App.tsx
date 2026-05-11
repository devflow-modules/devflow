import type { CandidateProfile } from "@devflow/applyflow-core";
import type { SuggestedAnswer } from "@devflow/applyflow-core";
import type { FieldClassification } from "@devflow/applyflow-linkedin";
import type { JobContext } from "@devflow/applyflow-linkedin";

import {
  fieldIdFromApplyFlowLabel,
  type AutofillFieldTarget,
  type AutofillResult,
} from "../content/autofill/autofill-types.js";
import type { AutofillSessionCounters } from "../content/autofill/autofill-session.js";
import type { ApplyFlowApplication, SaveApplicationInput } from "../storage/application-storage.js";
import { FieldSuggestionCard } from "./components/FieldSuggestionCard";
import { FitScoreCard } from "./components/FitScoreCard";
import { JobIntelligenceCard } from "./components/JobIntelligenceCard";
import { JobSummaryCard } from "./components/JobSummaryCard";
import type { PanelAiBundle } from "./panel/panel-ai.js";
import { PanelHistorySection } from "./components/PanelHistorySection";

export type PanelPhaseView = "waiting" | "modal_empty" | "fields";

export type PanelField = {
  label: string;
  suggestion: SuggestedAnswer;
  classification: FieldClassification;
};

function phaseCopy(phase: PanelPhaseView, fieldCount: number): { title: string; detail: string } {
  if (phase === "waiting") {
    return {
      title: "Aguardando modal Easy Apply…",
      detail: "Abra uma candidatura simplificada no LinkedIn para ver sugestões de resposta aqui.",
    };
  }
  if (phase === "modal_empty") {
    return {
      title: "Modal detectado",
      detail: "Nenhum campo reconhecido neste passo. Avance ou aguarde o formulário carregar.",
    };
  }
  return {
    title: "Modal detectado",
    detail:
      fieldCount === 1
        ? "1 campo encontrado — use Copiar ou Preencher campo a campo (opcional)."
        : `${fieldCount} campos encontrados — use Copiar ou Preencher campo a campo (opcional).`,
  };
}

export function App(props: {
  panelPhase: PanelPhaseView;
  fieldCount: number;
  fields: PanelField[];
  jobText: string;
  jobContext: JobContext;
  profile: CandidateProfile;
  attemptAutofill?: (target: AutofillFieldTarget) => Promise<AutofillResult>;
  autofillSession?: AutofillSessionCounters;
  onClearAutofillSession?: () => void;
  /** Histórico local Sprint 4 */
  applicationsHistoryFingerprint: string;
  existingApplicationRecord: ApplyFlowApplication | null;
  buildApplicationsHistoryDraft: () => SaveApplicationInput;
  applicationsHistoryAllowSave: boolean;
  panelAi?: PanelAiBundle;
}) {
  const { title, detail } = phaseCopy(props.panelPhase, props.fieldCount);
  const sess = props.autofillSession ?? { filled: 0, failed: 0, blocked: 0 };

  return (
    <div style={{ maxHeight: "100%", overflowY: "auto", paddingBottom: "8px" }} className="af-root">
      <section className="af-card af-status-card">
        <p className="af-panel-header">Estado do Easy Apply</p>
        <p className="af-status-main">{title}</p>
        <p className="af-status-detail">{detail}</p>
      </section>

      <section className="af-card">
        <p className="af-panel-header">ApplyFlow</p>
        <h1 className="af-title" style={{ marginTop: 0 }}>
          Copiloto assistido
        </h1>
        <p className="af-muted">
          Copiloto assistido — esta extensão nunca envia a candidatura, não resolve CAPTCHA nem ignora políticas da
          plataforma.
        </p>
      </section>

      <section className="af-card af-card-muted">
        <p className="af-session-title">Autofill — sessão desta aba</p>
        <p className="af-muted" style={{ marginBottom: "6px", marginTop: 0 }}>
          Memória local; sem backend. Contadores reiniciam ao recarregar a página.
        </p>
        <ul className="af-muted" style={{ margin: "0 0 10px 16px", padding: 0, fontSize: "13px" }}>
          <li>Preenchidos com sucesso: {sess.filled}</li>
          <li>Falhas (DOM / modal): {sess.failed}</li>
          <li>Bloqueados (segurança / confirmação): {sess.blocked}</li>
        </ul>
        {props.onClearAutofillSession ? (
          <button type="button" className="af-btn-secondary" style={{ width: "auto" }} onClick={props.onClearAutofillSession}>
            Limpar sessão
          </button>
        ) : null}
      </section>

      <PanelHistorySection
        key={`${props.applicationsHistoryFingerprint}__${props.existingApplicationRecord?.id ?? "none"}__${props.existingApplicationRecord?.updatedAt ?? ""}`}
        fingerprint={props.applicationsHistoryFingerprint}
        existingApplication={props.existingApplicationRecord}
        buildDraftBase={props.buildApplicationsHistoryDraft}
        canSaveToHistory={props.applicationsHistoryAllowSave}
      />

      {props.panelPhase === "fields" ? (
        <>
          <FitScoreCard jobText={props.jobText} profile={props.profile} panelAi={props.panelAi} />
          <JobIntelligenceCard jobText={props.jobText} />
          <JobSummaryCard ctx={props.jobContext} />
        </>
      ) : (
        <section className="af-card af-card-muted">
          <p className="af-muted">
            Fit e resumo da vaga aparecem quando houver campos detetados no passo atual do Easy Apply.
          </p>
        </section>
      )}

      {props.panelPhase === "fields" ? (
        <div>
          {props.fields.map((f, i) => (
            <FieldSuggestionCard
              key={[
                fieldIdFromApplyFlowLabel(f.label),
                f.label,
                f.classification.type,
                f.classification.skill ?? "",
                f.classification.confidence,
                f.suggestion.confidence,
                f.suggestion.value.length,
                f.suggestion.value.slice(0, 96),
                i,
              ].join("\u241e")}
              fieldId={fieldIdFromApplyFlowLabel(f.label)}
              label={f.label}
              classification={f.classification}
              suggestion={f.suggestion}
              attemptAutofill={props.attemptAutofill}
              panelAi={props.panelAi}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
