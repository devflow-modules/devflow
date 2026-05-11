import { useEffect, useState } from "react";

import { openAiPing } from "../../ai/openai-client.js";
import {
  exportApplyFlowSettingsJson,
  getApplyFlowSettings,
  mergeAiSettings,
  saveApplyFlowSettings,
} from "../../storage/applyflow-storage.js";
import { DEFAULT_AI_SETTINGS } from "../../storage/storage-types.js";

export function AiSettingsPanel() {
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(DEFAULT_AI_SETTINGS.model);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_AI_SETTINGS.maxTokens);
  const [temperature, setTemperature] = useState(DEFAULT_AI_SETTINGS.temperature);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getApplyFlowSettings().then((s) => {
      const ai = mergeAiSettings(s.ai);
      setEnabled(ai.enabled);
      setApiKey(ai.apiKey ?? "");
      setModel(ai.model);
      setMaxTokens(ai.maxTokens);
      setTemperature(ai.temperature);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setErr("");
    setMsg("");
    const cur = await getApplyFlowSettings();
    const nextKey = apiKey.trim() || undefined;
    await saveApplyFlowSettings({
      ...cur,
      version: 1,
      ai: {
        provider: "openai",
        enabled,
        apiKey: nextKey,
        model: model.trim() || DEFAULT_AI_SETTINGS.model,
        maxTokens: Math.min(4096, Math.max(64, Math.round(Number(maxTokens)) || DEFAULT_AI_SETTINGS.maxTokens)),
        temperature: Math.min(2, Math.max(0, Number(temperature) || DEFAULT_AI_SETTINGS.temperature)),
      },
    });
    setMsg("Definições de IA guardadas localmente.");
    window.setTimeout(() => setMsg(""), 4000);
  }

  async function handleTest() {
    setErr("");
    setMsg("");
    const key = apiKey.trim();
    if (!key) {
      setErr("Introduza a API key para testar.");
      return;
    }
    const r = await openAiPing({ apiKey: key, model: model.trim() || DEFAULT_AI_SETTINGS.model });
    if (r.ok) setMsg("Teste OK — a API respondeu.");
    else setErr(r.reason);
  }

  function handleExportSettingsSafe() {
    void getApplyFlowSettings().then((s) => {
      const blob = new Blob([exportApplyFlowSettingsJson(s)], { type: "application/json;charset=utf-8" });
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

  if (loading) {
    return <p className="af-muted">A carregar definições…</p>;
  }

  return (
    <div className="af-opt-ai-root">
      <section className="af-card af-opt-form-card af-opt-ai-intro">
        <p className="af-opt-section-kicker">Privacidade</p>
        <p className="af-opt-intro af-opt-intro--compact" style={{ marginBottom: 0 }}>
          A chave OpenAI é guardada apenas em <strong>chrome.storage.local</strong> neste dispositivo. Ao gerar texto,
          excertos do perfil e da vaga são enviados aos servidores da <strong>OpenAI</strong> conforme a política deles.
          ApplyFlow <strong>nunca envia a candidatura</strong> automaticamente.
        </p>
      </section>

      <section className="af-card af-opt-form-card" style={{ marginBottom: "16px" }}>
        <p className="af-opt-section-kicker">Painel</p>
        <label className="af-opt-label af-opt-label--row" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span className="af-opt-label-text">Ativar IA no painel (opt-in)</span>
        </label>
      </section>

      <section className="af-card af-opt-form-card" style={{ marginBottom: "16px" }}>
        <p className="af-opt-section-kicker">Fornecedor</p>
        <p className="af-opt-section-title af-opt-section-title--sm" style={{ marginBottom: "12px" }}>
          OpenAI
        </p>
        <label className="af-opt-label-text" style={{ display: "block", marginBottom: "6px" }}>
          API key
        </label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
          <input
            type={showKey ? "text" : "password"}
            className="af-input"
            style={{ flex: "1 1 220px" }}
            autoComplete="off"
            value={apiKey}
            placeholder="sk-…"
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button type="button" className="af-opt-btn-secondary" style={{ width: "auto" }} onClick={() => setShowKey(!showKey)}>
            {showKey ? "Ocultar" : "Mostrar"}
          </button>
          <button type="button" className="af-opt-btn-secondary" style={{ width: "auto" }} onClick={() => setApiKey("")}>
            Limpar chave
          </button>
        </div>

        <label className="af-opt-label-text" style={{ display: "block", marginBottom: "6px" }}>
          Modelo
        </label>
        <input className="af-input" style={{ marginBottom: "12px" }} value={model} onChange={(e) => setModel(e.target.value)} />

        <label className="af-opt-label-text" style={{ display: "block", marginBottom: "6px" }}>
          Max tokens
        </label>
        <input
          type="number"
          className="af-input af-input-compact"
          style={{ marginBottom: "12px" }}
          min={64}
          max={4096}
          value={maxTokens}
          onChange={(e) => setMaxTokens(Number(e.target.value))}
        />

        <label className="af-opt-label-text" style={{ display: "block", marginBottom: "6px" }}>
          Temperature (0–2)
        </label>
        <input
          type="number"
          step="0.1"
          className="af-input af-input-compact"
          style={{ marginBottom: "12px" }}
          min={0}
          max={2}
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
        />
      </section>

      <div className="af-opt-actions af-opt-actions--standalone">
        <button type="button" className="af-opt-btn-primary" onClick={() => void handleSave()}>
          Guardar IA
        </button>
        <button type="button" className="af-opt-btn-secondary" onClick={() => void handleTest()}>
          Testar configuração
        </button>
        <button
          type="button"
          className="af-opt-btn-secondary"
          onClick={handleExportSettingsSafe}
          title="JSON sem apiKey em claro"
        >
          Exportar definições (seguro)
        </button>
      </div>

      <div className="af-opt-feedback af-opt-feedback--standalone">
        {msg ? <span className="af-opt-ok">{msg}</span> : null}
        {err ? <span className="af-opt-err">{err}</span> : null}
      </div>
    </div>
  );
}
