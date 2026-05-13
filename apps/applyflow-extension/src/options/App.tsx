import type { CandidateProfile } from "@devflow/applyflow-core";
import { gustavoProfile, validateCandidateProfile } from "@devflow/applyflow-core";
import { useEffect, useRef, useState } from "react";
import { getStoredCandidateProfile, resetCandidateProfile, saveCandidateProfile } from "../storage/profile-storage.js";
import { AnswerBankEditor } from "./components/AnswerBankEditor";
import { AiSettingsPanel } from "./components/AiSettingsPanel";
import { ApplicationsHistoryPanel } from "./components/ApplicationsHistoryPanel";
import { DefaultsPanel } from "./components/DefaultsPanel";
import { ExtensionPreview } from "./components/ExtensionPreview";
import { OptionsProfileSummary } from "./components/OptionsProfileSummary";
import { ProfileForm } from "./components/ProfileForm";
import { SalaryEditor } from "./components/SalaryEditor";
import { SkillsEditor } from "./components/SkillsEditor";

type OptionsTab = "profile" | "history" | "ai" | "preview";

export function OptionsApp() {
  const [tab, setTab] = useState<OptionsTab>("profile");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CandidateProfile>(gustavoProfile);
  const [savedMsg, setSavedMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getStoredCandidateProfile()
      .then((p) =>
        setProfile({
          ...p,
          skills: { ...p.skills },
          salary: { ...p.salary },
          answerBank: { ...p.answerBank },
          roles: [...p.roles],
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  function showSaved(text: string) {
    setErrorMsg("");
    setSavedMsg(text);
    window.setTimeout(() => setSavedMsg(""), 3500);
  }

  async function handleSave() {
    setErrorMsg("");
    try {
      const v = validateCandidateProfile(profile);
      await saveCandidateProfile(v);
      setProfile({
        ...v,
        skills: { ...v.skills },
        salary: { ...v.salary },
        answerBank: { ...v.answerBank },
        roles: [...v.roles],
      });
      showSaved("Perfil válido — guardado com sucesso.");
    } catch (e) {
      setSavedMsg("");
      setErrorMsg(e instanceof Error ? e.message : "Erro de validação");
    }
  }

  async function handleReset() {
    if (!confirm("Repôr perfil inicial de referência ApplyFlow neste dispositivo?")) return;
    setErrorMsg("");
    try {
      const p = await resetCandidateProfile();
      setProfile({
        ...p,
        skills: { ...p.skills },
        salary: { ...p.salary },
        answerBank: { ...p.answerBank },
        roles: [...p.roles],
      });
      showSaved("Perfil reposto — alterações locais foram descartadas; em uso está o padrão de referência.");
    } catch (e) {
      setSavedMsg("");
      setErrorMsg(e instanceof Error ? e.message : "Erro ao repor perfil.");
    }
  }

  function handleExport() {
    setErrorMsg("");
    try {
      const v = validateCandidateProfile(profile);
      const blob = new Blob([JSON.stringify(v, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "applyflow-profile.json";
      a.click();
      URL.revokeObjectURL(url);
      showSaved("Export concluído — o JSON contém apenas os campos do perfil (CandidateProfile) validado.");
    } catch (e) {
      setSavedMsg("");
      setErrorMsg(e instanceof Error ? e.message : "Perfil atual inválido para exportação.");
    }
  }

  function handleImportPick() {
    fileRef.current?.click();
  }

  async function onImportFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setErrorMsg("");
    const txt = await file.text();

    let raw: unknown;
    try {
      raw = JSON.parse(txt) as unknown;
    } catch (e) {
      setSavedMsg("");
      setErrorMsg(
        e instanceof SyntaxError
          ? "O ficheiro não é JSON válido (sintaxe incorreta). O perfil em memória não foi alterado."
          : "Não foi possível interpretar o ficheiro como JSON. O perfil em memória não foi alterado.",
      );
      return;
    }

    try {
      const v = validateCandidateProfile(raw);
      setProfile({
        ...v,
        skills: { ...v.skills },
        salary: { ...v.salary },
        answerBank: { ...v.answerBank },
        roles: [...v.roles],
      });
      await saveCandidateProfile(v);
      showSaved("Import válido — perfil guardado em chrome.storage.local.");
    } catch (e) {
      setSavedMsg("");
      const detail = e instanceof Error ? e.message : "dados rejeitados pela validação";
      setErrorMsg(`Import rejeitado — o perfil atual não foi substituído. ${detail}`);
    }
  }

  if (loading) {
    return (
      <div className="af-opt-shell">
        <p className="af-muted">A carregar perfil guardado…</p>
      </div>
    );
  }

  return (
    <div className="af-opt-shell af-root">
      <header className="af-opt-page-header">
        <div className="af-opt-page-header-text">
          <h1 className="af-opt-heading">ApplyFlow · Preferências locais</h1>
          <p className="af-opt-tagline">
            Copiloto <strong>local-first</strong> no dispositivo — sem backend obrigatório, sem auto-submit. Sugestões
            informativas; o envio de candidaturas é sempre teu no LinkedIn.
          </p>
        </div>
        <div className="af-opt-header-pills" aria-hidden="true">
          <span className="af-opt-pill af-opt-pill--outline">MV3</span>
          <span className="af-opt-pill af-opt-pill--outline">chrome.storage</span>
        </div>
      </header>

      <div className="af-opt-tabs" role="tablist" aria-label="Secções ApplyFlow">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "profile"}
          className="af-opt-tab"
          data-active={tab === "profile"}
          onClick={() => setTab("profile")}
        >
          Perfil
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "history"}
          className="af-opt-tab"
          data-active={tab === "history"}
          onClick={() => setTab("history")}
        >
          Histórico
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "ai"}
          className="af-opt-tab"
          data-active={tab === "ai"}
          onClick={() => setTab("ai")}
        >
          IA
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "preview"}
          className="af-opt-tab"
          data-active={tab === "preview"}
          onClick={() => setTab("preview")}
        >
          Preview (captura)
        </button>
      </div>

      {tab === "profile" ? (
        <div className="af-opt-profile-grid">
          <div className="af-opt-profile-main">
            <p className="af-opt-intro af-opt-intro--compact">
              Edição do perfil usada apenas na extensão — sem backend nem envio ao LinkedIn. As sugestões no painel
              continuam apenas informativas; o envio da candidatura é sempre seu.
            </p>

            <DefaultsPanel />

            <ProfileForm profile={profile} onChange={setProfile} />
            <SkillsEditor profile={profile} onChange={setProfile} />
            <SalaryEditor profile={profile} onChange={setProfile} />
            <AnswerBankEditor profile={profile} onChange={setProfile} />

            <section className="af-card af-opt-actions-card" aria-labelledby="af-opt-actions-heading">
              <p id="af-opt-actions-heading" className="af-opt-section-kicker">
                Ações locais
              </p>
              <h2 className="af-opt-section-title af-opt-section-title--sm">Guardar, repor e backup</h2>
              <p className="af-opt-section-lead af-opt-section-lead--tight">
                Salve o perfil localmente ou use JSON apenas para backup e migração entre navegadores.
              </p>
              <div className="af-opt-actions af-opt-actions--in-card">
                <button type="button" className="af-opt-btn-primary" onClick={() => void handleSave()}>
                  Salvar perfil
                </button>
                <button type="button" className="af-opt-btn-secondary" onClick={() => void handleReset()}>
                  Restaurar padrão de referência
                </button>
                <div className="af-opt-action-group">
                  <span className="af-opt-action-group-label">Backup local</span>
                  <div className="af-opt-action-group-row">
                    <button type="button" className="af-opt-btn-secondary" onClick={handleExport}>
                      Exportar JSON
                    </button>
                    <button type="button" className="af-opt-btn-secondary" onClick={handleImportPick}>
                      Importar JSON
                    </button>
                  </div>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    void onImportFile(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="af-opt-feedback af-opt-feedback--in-card">
                {savedMsg ? <span className="af-opt-ok">{savedMsg}</span> : null}
                {errorMsg ? <span className="af-opt-err">{errorMsg}</span> : null}
              </div>
            </section>
          </div>

          <OptionsProfileSummary profile={profile} />
        </div>
      ) : tab === "history" ? (
        <div className="af-opt-tab-panel">
          <div className="af-opt-tab-hero">
            <p className="af-opt-section-kicker">Candidaturas</p>
            <h2 className="af-opt-section-title">Histórico local</h2>
            <p className="af-opt-tab-lead">
              Registos em <code className="af-opt-code">chrome.storage.local</code> — sem servidor. Export CSV/JSON
              quando precisares de arquivo ou de importar no dashboard.
            </p>
          </div>
          <ApplicationsHistoryPanel />
        </div>
      ) : tab === "ai" ? (
        <div className="af-opt-tab-panel">
          <div className="af-opt-tab-hero">
            <p className="af-opt-section-kicker">Opcional</p>
            <h2 className="af-opt-section-title">IA assistida (opt-in)</h2>
            <p className="af-opt-tab-lead">
              Activa sugestões assistidas para campos longos. A chave fica neste navegador e a candidatura continua sempre
              manual — sem auto-submit e sem servidor ApplyFlow obrigatório.
            </p>
          </div>
          <AiSettingsPanel />
        </div>
      ) : (
        <div className="af-opt-tab-panel">
          <div className="af-opt-tab-hero">
            <p className="af-opt-section-kicker">Portefólio</p>
            <h2 className="af-opt-section-title">Preview da extensão (Print 6)</h2>
            <p className="af-opt-tab-lead">Dados fictícios — ideal para capturas públicas sem PII do LinkedIn.</p>
          </div>
          <ExtensionPreview />
        </div>
      )}
    </div>
  );
}
