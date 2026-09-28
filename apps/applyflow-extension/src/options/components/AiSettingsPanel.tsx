import { useEffect, useMemo, useState } from "react";

import { ExtensionButton } from "../../components/ExtensionButton.js";
import {
  exportApplyFlowSettingsJson,
  getApplyFlowPrivateSettings,
  getApplyFlowPublicSettings,
  saveApplyFlowAiSettingsPatch,
} from "../../storage/applyflow-storage.js";
import { DEFAULT_AI_SETTINGS } from "../../storage/storage-types.js";
import { getRuntime, hasValidExtensionContext } from "../../runtime/extension-runtime.js";
import { TEST_AI_MESSAGE, type TestAiResponse } from "../../runtime/ai-messages.js";

type AiUiStatus = "disabled" | "incomplete" | "ready";

function deriveAiStatus(enabled: boolean, keyConfigured: boolean): AiUiStatus {
  if (!enabled) return "disabled";
  if (!keyConfigured) return "incomplete";
  return "ready";
}

async function sendTestAiMessage(args: {
  draftApiKey?: string;
  model?: string;
}): Promise<TestAiResponse> {
  const rt = getRuntime();
  if (!rt?.sendMessage || !hasValidExtensionContext()) {
    return { ok: false, error: "provider_error", reason: "Extension context unavailable" };
  }
  return new Promise((resolve) => {
    try {
      rt.sendMessage(
        { type: TEST_AI_MESSAGE, draftApiKey: args.draftApiKey, model: args.model },
        (response: TestAiResponse | undefined) => {
          if (chrome.runtime?.lastError || !response) {
            resolve({
              ok: false,
              error: "provider_error",
              reason: chrome.runtime?.lastError?.message ?? "empty_response",
            });
            return;
          }
          resolve(response);
        },
      );
    } catch (e) {
      resolve({
        ok: false,
        error: "provider_error",
        reason: e instanceof Error ? e.message : "send_failed",
      });
    }
  });
}

export function AiSettingsPanel() {
  const [enabled, setEnabled] = useState(false);
  /** Draft only — never prefilled from storage plaintext (AF-AI-001). */
  const [draftApiKey, setDraftApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [clearStoredKey, setClearStoredKey] = useState(false);
  const [model, setModel] = useState(DEFAULT_AI_SETTINGS.model);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_AI_SETTINGS.maxTokens);
  const [temperature, setTemperature] = useState(DEFAULT_AI_SETTINGS.temperature);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getApplyFlowPublicSettings().then((s) => {
      const ai = s.ai;
      setEnabled(ai?.enabled ?? false);
      setKeyConfigured(Boolean(ai?.keyConfigured));
      setModel(ai?.model ?? DEFAULT_AI_SETTINGS.model);
      setMaxTokens(ai?.maxTokens ?? DEFAULT_AI_SETTINGS.maxTokens);
      setTemperature(ai?.temperature ?? DEFAULT_AI_SETTINGS.temperature);
      setDraftApiKey("");
      setClearStoredKey(false);
      setLoading(false);
    });
  }, []);

  const hasDraft = draftApiKey.trim().length > 0;
  const effectiveConfigured = clearStoredKey ? hasDraft : keyConfigured || hasDraft;
  const modelOk = model.trim().length > 0;
  const uiStatus = deriveAiStatus(enabled, effectiveConfigured);

  const statusCopy = useMemo(() => {
    if (uiStatus === "disabled") {
      return {
        title: "IA desactivada",
        detail: "O painel usa só sugestões locais do núcleo ApplyFlow. Active abaixo quando quiser assistência opcional.",
        variant: "muted" as const,
      };
    }
    if (uiStatus === "incomplete") {
      return {
        title: "Configuração incompleta",
        detail: "A IA está activada no painel, mas falta uma API key válida para gerar texto.",
        variant: "warn" as const,
      };
    }
    return {
      title: "IA pronta para sugestões assistidas",
      detail: "Chave guardada neste navegador (service worker). O envio da candidatura continua sempre manual no LinkedIn.",
      variant: "ok" as const,
    };
  }, [uiStatus]);

  async function handleSave() {
    setErr("");
    setMsg("");
    const publicNext = await saveApplyFlowAiSettingsPatch({
      enabled,
      model: model.trim() || DEFAULT_AI_SETTINGS.model,
      maxTokens: Math.min(4096, Math.max(64, Math.round(Number(maxTokens)) || DEFAULT_AI_SETTINGS.maxTokens)),
      temperature: Math.min(2, Math.max(0, Number(temperature) || DEFAULT_AI_SETTINGS.temperature)),
      ...(clearStoredKey && !hasDraft
        ? { apiKey: "" }
        : hasDraft
          ? { apiKey: draftApiKey.trim() }
          : { preserveExistingKey: true }),
    });
    setKeyConfigured(Boolean(publicNext.ai?.keyConfigured));
    setDraftApiKey("");
    setClearStoredKey(false);
    setShowKey(false);
    setMsg("Definições de IA guardadas localmente.");
    window.setTimeout(() => setMsg(""), 4000);
  }

  async function handleTest() {
    setErr("");
    setMsg("");
    const draft = draftApiKey.trim();
    if (!draft && (clearStoredKey || !keyConfigured)) {
      setErr("Introduza a API key para testar.");
      return;
    }
    const r = await sendTestAiMessage({
      draftApiKey: draft || undefined,
      model: model.trim() || DEFAULT_AI_SETTINGS.model,
    });
    if (r.ok) setMsg("Teste OK — a API respondeu.");
    else setErr(r.reason ?? r.error);
  }

  function handleExportSettingsSafe() {
    void getApplyFlowPrivateSettings().then((s) => {
      const keyConfigured = Boolean(s.ai?.apiKey?.trim());
      const blob = new Blob([exportApplyFlowSettingsJson(s, keyConfigured)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "applyflow-settings-export.json";
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Export de definições — apiKey mascarada.");
      window.setTimeout(() => setMsg(""), 4000);
    });
  }

  function handleClearKey() {
    setDraftApiKey("");
    setClearStoredKey(true);
    setShowKey(false);
  }

  if (loading) {
    return (
      <div className="af-opt-ai-root">
        <p className="af-muted">A carregar definições…</p>
      </div>
    );
  }

  return (
    <div className="af-opt-ai-root">
      <section
        className={`af-card af-opt-form-card af-opt-ai-status-card af-opt-ai-status-card--${statusCopy.variant}`}
        aria-live="polite"
      >
        <p className="af-opt-section-kicker">Estado da IA</p>
        <h3 className="af-opt-ai-status-title">{statusCopy.title}</h3>
        <p className="af-opt-ai-status-detail">{statusCopy.detail}</p>
        <div className="af-opt-pill-row af-opt-ai-status-pills">
          <span className="af-opt-pill">Opt-in</span>
          <span className="af-opt-pill">Chave só neste browser</span>
          <span className="af-opt-pill">Sem auto-submit</span>
          <span className="af-opt-pill">Só sugestões</span>
        </div>
      </section>

      <section className="af-card af-opt-form-card af-opt-privacy-card" aria-labelledby="af-opt-ai-privacy-heading">
        <p className="af-opt-section-kicker">Transparência</p>
        <h2 id="af-opt-ai-privacy-heading" className="af-opt-section-title">
          Privacidade e controlo
        </h2>
        <ul className="af-opt-privacy-list">
          <li>
            <strong>Chave OpenAI</strong> guardada em <code className="af-opt-code">chrome.storage.local</code> neste
            dispositivo; o content script do LinkedIn <strong>não</strong> a lê — só o service worker.
          </li>
          <li>
            <strong>Envio à OpenAI</strong> só quando usar a função de gerar texto no painel — nunca em segundo plano automático.
          </li>
          <li>
            <strong>ApplyFlow nunca envia a candidatura</strong> automaticamente; o texto gerado é sugestão, não submissão.
          </li>
          <li>
            <strong>Sugestões</strong> com ou sem IA são opcionais e informativas; o envio continua sempre seu no site oficial.
          </li>
        </ul>
        <p className="af-opt-privacy-foot">
          Sem chave, o painel continua útil com sugestões locais do perfil e do núcleo ApplyFlow. Ao gerar com IA, excertos do
          perfil e da vaga seguem a política da OpenAI.
        </p>
      </section>

      <section className="af-card af-opt-form-card" aria-labelledby="af-opt-ai-activate-heading">
        <p className="af-opt-section-kicker">Escolha consciente</p>
        <h2 id="af-opt-ai-activate-heading" className="af-opt-section-title">
          Activação no painel
        </h2>
        <p className="af-opt-section-lead">
          Permite que o painel do Easy Apply mostre acções de IA quando houver chave e modelo válidos. Não substitui sugestões
          locais nem o envio manual da candidatura.
        </p>
        <label className="af-opt-ai-toggle-row">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span className="af-opt-ai-toggle-text">
            <span className="af-opt-ai-toggle-label">Ativar IA no painel (opt-in)</span>
            <span className="af-opt-ai-toggle-hint">Desligado por omissão — activa só quando precisar de rascunhos assistidos.</span>
          </span>
        </label>
      </section>

      <section className="af-card af-opt-form-card" aria-labelledby="af-opt-ai-provider-heading">
        <p className="af-opt-section-kicker">Fornecedor</p>
        <h2 id="af-opt-ai-provider-heading" className="af-opt-section-title">
          OpenAI
        </h2>
        <p className="af-opt-section-lead">Configuração usada apenas neste navegador; não há servidor ApplyFlow para IA.</p>

        <div className="af-opt-ai-key-header">
          <span className="af-opt-label-text">API key</span>
          <span className={effectiveConfigured ? "af-opt-key-badge af-opt-key-badge--ok" : "af-opt-key-badge"}>
            {effectiveConfigured ? "Chave configurada" : "Sem chave"}
          </span>
        </div>
        <div className="af-opt-ai-key-row">
          <input
            type={showKey ? "text" : "password"}
            className="af-input af-opt-ai-key-input"
            autoComplete="off"
            value={draftApiKey}
            placeholder={
              keyConfigured && !clearStoredKey
                ? "••••••••  (deixe vazio para manter; escreva para substituir)"
                : "sk-…"
            }
            onChange={(e) => {
              setDraftApiKey(e.target.value);
              if (e.target.value.trim()) setClearStoredKey(false);
            }}
            aria-describedby="af-opt-ai-key-hint"
          />
          <div className="af-opt-ai-key-actions">
            <ExtensionButton type="button" className="af-opt-btn-secondary" onClick={() => setShowKey(!showKey)}>
              {showKey ? "Ocultar" : "Mostrar"}
            </ExtensionButton>
            <ExtensionButton type="button" className="af-opt-btn-secondary" onClick={handleClearKey}>
              Remover chave
            </ExtensionButton>
          </div>
        </div>
        <p id="af-opt-ai-key-hint" className="af-opt-field-hint">
          A chave guardada não é reapresentada após gravar. Use «Remover chave» ou escreva uma nova para substituir.
        </p>

        <div className="af-opt-ai-fields">
          <label className="af-opt-label">
            <span className="af-opt-label-text">Modelo</span>
            <span className="af-opt-field-hint">Modelo usado para gerar sugestões quando pedir texto no painel.</span>
            <input
              className="af-input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              aria-invalid={!modelOk}
            />
          </label>
          <div className="af-opt-ai-fields-row">
            <label className="af-opt-label">
              <span className="af-opt-label-text">Max tokens</span>
              <span className="af-opt-field-hint">Limite de tamanho da resposta (64–4096).</span>
              <input
                type="number"
                className="af-input"
                min={64}
                max={4096}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
              />
            </label>
            <label className="af-opt-label">
              <span className="af-opt-label-text">Temperature (0–2)</span>
              <span className="af-opt-field-hint">Criatividade vs consistência; valores mais baixos tendem a respostas mais estáveis.</span>
              <input
                type="number"
                step="0.1"
                className="af-input"
                min={0}
                max={2}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="af-card af-opt-form-card af-opt-ai-actions-card" aria-labelledby="af-opt-ai-actions-heading">
        <p id="af-opt-ai-actions-heading" className="af-opt-section-kicker">
          Ações
        </p>
        <h2 className="af-opt-section-title af-opt-section-title--sm">Guardar, testar e cópia de definições</h2>
        <p className="af-opt-section-lead af-opt-section-lead--tight">
          Guarde depois de alterar a chave ou parâmetros. O export gera JSON sem expor a API key em claro.
        </p>
        <div className="af-opt-actions af-opt-actions--in-card">
          <ExtensionButton type="button" className="af-opt-btn-primary" onClick={() => void handleSave()}>
            Guardar IA
          </ExtensionButton>
          <ExtensionButton type="button" className="af-opt-btn-secondary" onClick={() => void handleTest()}>
            Testar configuração
          </ExtensionButton>
          <div className="af-opt-action-group">
            <span className="af-opt-action-group-label">Backup de definições</span>
            <ExtensionButton
              type="button"
              className="af-opt-btn-secondary"
              onClick={handleExportSettingsSafe}
              title="JSON sem apiKey em claro"
            >
              Exportar definições (seguro)
            </ExtensionButton>
          </div>
        </div>
        <div className="af-opt-feedback af-opt-feedback--in-card">
          {msg ? <span className="af-opt-ok">{msg}</span> : null}
          {err ? <span className="af-opt-err">{err}</span> : null}
        </div>
      </section>
    </div>
  );
}
