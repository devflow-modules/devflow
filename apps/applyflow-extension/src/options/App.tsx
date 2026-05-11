import type { CandidateProfile } from "@devflow/applyflow-core";
import { gustavoProfile, validateCandidateProfile } from "@devflow/applyflow-core";
import { useEffect, useRef, useState } from "react";
import { getStoredCandidateProfile, resetCandidateProfile, saveCandidateProfile } from "../storage/profile-storage.js";
import { AiSettingsPanel } from "./components/AiSettingsPanel";
import { ApplicationsHistoryPanel } from "./components/ApplicationsHistoryPanel";
import { DefaultsPanel } from "./components/DefaultsPanel";
import { ProfileForm } from "./components/ProfileForm";
import { SalaryEditor } from "./components/SalaryEditor";
import { SkillsEditor } from "./components/SkillsEditor";

type OptionsTab = "profile" | "history" | "ai";

export function OptionsApp() {
  const [tab, setTab] = useState<OptionsTab>("profile");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CandidateProfile>(gustavoProfile);
  const [savedMsg, setSavedMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getStoredCandidateProfile()
      .then((p) => setProfile({ ...p, skills: { ...p.skills }, salary: { ...p.salary }, roles: [...p.roles] }))
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
      setProfile(v);
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
      <h1 className="af-opt-heading">ApplyFlow · Preferências locais</h1>

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
      </div>

      {tab === "profile" ? (
        <>
          <p className="af-opt-intro">
            Edição do perfil usado apenas na extensão — sem backend nem envio ao LinkedIn. As sugestões no painel continuam apenas
            informativas; o envio da candidatura é sempre sua.
          </p>

          <DefaultsPanel />

          <ProfileForm profile={profile} onChange={setProfile} />
          <SkillsEditor profile={profile} onChange={setProfile} />
          <SalaryEditor profile={profile} onChange={setProfile} />

          <div className="af-opt-actions">
            <button type="button" className="af-opt-btn-primary" onClick={() => void handleSave()}>
              Salvar perfil
            </button>
            <button type="button" className="af-opt-btn-secondary" onClick={() => void handleReset()}>
              Restaurar padrão de referência
            </button>
            <button type="button" className="af-opt-btn-secondary" onClick={handleExport}>
              Exportar JSON
            </button>
            <button type="button" className="af-opt-btn-secondary" onClick={handleImportPick}>
              Importar JSON
            </button>
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

          <div className="af-opt-feedback">
            {savedMsg ? <span className="af-opt-ok">{savedMsg}</span> : null}
            {errorMsg ? <span className="af-opt-err">{errorMsg}</span> : null}
          </div>
        </>
      ) : tab === "history" ? (
        <>
          <h2 className="af-opt-heading" style={{ fontSize: "18px", marginBottom: "8px" }}>
            Histórico de candidaturas
          </h2>
          <ApplicationsHistoryPanel />
        </>
      ) : (
        <>
          <h2 className="af-opt-heading" style={{ fontSize: "18px", marginBottom: "8px" }}>
            IA (opt-in)
          </h2>
          <AiSettingsPanel />
        </>
      )}
    </div>
  );
}
