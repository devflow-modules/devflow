import { useCallback, useState } from "react";

import { ExtensionButton } from "../../components/ExtensionButton.js";
import {
  APPLYFLOW_APPLICATION_STATUS_LABELS_PT,
  type ApplyFlowApplication,
  type ApplyFlowApplicationStatus,
  saveApplication,
  updateApplicationStatus,
  type SaveApplicationInput,
} from "../../storage/application-storage.js";

export function PanelHistorySection(props: {
  /** Chave estável por URL para reset local ao mudar de vaga */
  fingerprint: string;
  existingApplication: ApplyFlowApplication | null;
  /** Metadados do painel atual (sessão Easy Apply); nunca texto completo nem respostas */
  buildDraftBase: () => SaveApplicationInput;
  /** Permitir criar entrada (ex.: sempre que houver URL da página). */
  canSaveToHistory: boolean;
}) {
  const [persistedId, setPersistedId] = useState<string | null>(() => props.existingApplication?.id ?? null);
  const [status, setStatus] = useState<ApplyFlowApplicationStatus>(
    () => props.existingApplication?.status ?? "reviewing",
  );
  const [savedMsg, setSavedMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onChangeStatus = useCallback(
    async (next: ApplyFlowApplicationStatus) => {
      setStatus(next);
      setErr("");
      const idToUpdate = persistedId;
      if (!idToUpdate) return;
      setBusy(true);
      try {
        const res = await updateApplicationStatus(idToUpdate, next);
        if (!res) {
          setErr("Registo não encontrado ao actualizar estado.");
          return;
        }
        setPersistedId(res.id);
      } catch {
        setErr("Não foi possível actualizar o estado no histórico local.");
      } finally {
        setBusy(false);
      }
    },
    [persistedId],
  );

  async function onSave() {
    if (!props.canSaveToHistory) return;
    setBusy(true);
    setErr("");
    try {
      const draft = props.buildDraftBase();
      const cloud = await new Promise<{
        ok?: boolean;
        error?: string;
        status?: number;
        reused?: boolean;
        reconnect?: string;
      } | undefined>((resolve) => {
        try {
          chrome.runtime.sendMessage(
            { type: "APPLYFLOW_REGISTER_CLOUD_APPLICATION", draft: { ...draft, status } },
            (response) => {
              void chrome.runtime.lastError;
              resolve(response as { ok?: boolean; error?: string; status?: number; reused?: boolean; reconnect?: string });
            },
          );
        } catch {
          resolve(undefined);
        }
      });

      if (cloud?.ok) {
        const app = await saveApplication({ ...draft, status });
        setPersistedId(app.id);
        setStatus(app.status);
        setSavedMsg(cloud.reused ? "Já registado na conta (sem duplicar)" : "Registado na conta ApplyFlow");
        window.setTimeout(() => setSavedMsg(""), 5200);
        return;
      }

      if (cloud && (cloud.status === 401 || cloud.error === "signed_out")) {
        setErr(cloud.reconnect ?? "Sessão da extensão ausente. Reconecte em /account.");
        return;
      }

      if (cloud && cloud.error && cloud.error !== "signed_out") {
        const conflictHint =
          cloud.error === "version_conflict"
            ? "Conflito de versão (OCC). Recarregue o dashboard e revise antes de gravar de novo — a versão no servidor prevalece."
            : cloud.error === "conflict_incompatible"
              ? "Registo existente incompatível com esta vaga. Não foi reutilizado automaticamente."
              : cloud.error === "conflict_unknown"
                ? "Conflito 409 desconhecido. Não tratado como sucesso."
                : cloud.status === 409
                  ? "Conflito ao gravar na conta. Recarregue o dashboard e tente de novo."
                  : null;
        setErr(
          conflictHint ??
            (cloud.status === 403
              ? "Conta sem escrita cloud (read-only, paused ou migração pendente)."
              : `Não foi possível gravar na conta (${cloud.error}). O histórico local não foi usado como fallback cloud.`),
        );
        return;
      }

      // Modo local (sem grant): histórico só no browser.
      const app = await saveApplication({ ...draft, status });
      setPersistedId(app.id);
      setStatus(app.status);
      setSavedMsg("Salvo no histórico local");
      window.setTimeout(() => setSavedMsg(""), 5200);
    } catch {
      setErr("Falha ao guardar.");
    } finally {
      setBusy(false);
    }
  }

  const statusSelectId = `af-history-status-${props.fingerprint}`;

  return (
    <section className="af-card af-card-muted" aria-label="Histórico de candidaturas">
      <p className="af-meta" style={{ marginBottom: "8px" }}>
        Histórico
      </p>
      <p className="af-muted" style={{ marginTop: 0 }}>
        Registo manual. Com a extensão ligada à conta, Job e Application vão para o ApplyFlow cloud. Sem ligação, fica só
        no browser. Registar aqui não submete a candidatura ao empregador.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
        <label className="af-muted" htmlFor={statusSelectId} style={{ fontSize: "12px", marginBottom: "-4px" }}>
          Estado rápido
        </label>
        <select
          id={statusSelectId}
          className="af-input"
          style={{ maxWidth: "100%" }}
          value={status}
          disabled={busy}
          onChange={(e) => void onChangeStatus(e.target.value as ApplyFlowApplicationStatus)}
        >
          {(Object.entries(APPLYFLOW_APPLICATION_STATUS_LABELS_PT) as [ApplyFlowApplicationStatus, string][]).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>
        <ExtensionButton
          type="button"
          className="af-btn-secondary"
          disabled={busy || !props.canSaveToHistory}
          style={{ width: "auto" }}
          onClick={() => void onSave()}
          title={
            props.canSaveToHistory
              ? "Grava apenas metadados (título/empresa/URL contagens)."
              : "Aguarde página com URL válida."
          }
        >
          Salvar no histórico
        </ExtensionButton>
        {savedMsg ? <p className="af-text-success" style={{ margin: 0, fontSize: "12px" }}>{savedMsg}</p> : null}
        {err ? <p className="af-warning">{err}</p> : null}
        {persistedId ? (
          <p className="af-muted" style={{ margin: 0 }}>
            Este registo pode ser gerido também em Opções › Histórico.
          </p>
        ) : null}
      </div>
    </section>
  );
}
