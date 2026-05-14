import type { AiTextTask, CandidateProfile } from "@devflow/applyflow-core";
import { getSuggestedAnswer, gustavoProfile } from "@devflow/applyflow-core";
import type { ApplyProvider, JobContext } from "@devflow/applyflow-linkedin";
import { classifyLinkedInField } from "@devflow/applyflow-linkedin";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { generateAiText } from "../ai/generate-ai-text.js";
import panelCss from "../styles/globals.css?inline";
import { addAutofillAuditEntry } from "../storage/autofill-audit-storage.js";
import { findApplicationByNormalizedJobUrl, normalizeStoredJobUrl, type ApplyFlowApplication } from "../storage/application-storage.js";
import { getStoredCandidateProfile } from "../storage/profile-storage.js";
import { getApplyFlowSettings, mergeAiSettings } from "../storage/applyflow-storage.js";
import { getPanelUiPrefs, savePanelDock, type PanelDockSide } from "../storage/panel-ui-storage.js";
import { App, type PanelField } from "../panel/App";
import type { PanelAiBundle } from "../panel/panel-ai.js";
import type { AutofillFieldTarget, AutofillResult } from "./autofill/autofill-types.js";
import { linkedInEasyApplyAutofill } from "./autofill/linkedin-field-autofill.js";
import { bumpAutofillSession, emptyAutofillSession, type AutofillSessionCounters } from "./autofill/autofill-session.js";
import { applyFlowDebugLog } from "./applyflow-debug.js";
import { computeJobSnapshotForHistory } from "./job-context-extractor.js";
import { findEasyApplyModal } from "./easy-apply-modal.js";
import type { FindEasyApplyModalMeta } from "./easy-apply-modal.js";
import { detectLinkedInMessagingChromeVisible } from "./linkedin-messaging-detect.js";
import { applyPanelHostLayout } from "./panel-host-layout.js";

type PanelDetectionMeta = {
  provider: ApplyProvider;
  /** Só para debug no detector — não exibir texto do modal no painel. */
  providerReason: string;
  via: FindEasyApplyModalMeta["via"];
  hintSelector?: string;
};

export type PanelPayload =
  | { phase: "waiting" }
  | ({ phase: "modal_no_fields" } & PanelDetectionMeta)
  | ({ phase: "ready"; labels: string[]; jobText: string; jobContext: JobContext } & PanelDetectionMeta);

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let panelAppMount: HTMLDivElement | null = null;

let lastPayload: PanelPayload = { phase: "waiting" };
let auditJobSnap: { jobTitle?: string; companyName?: string } = {};
let autofillSession: AutofillSessionCounters = emptyAutofillSession();

/** Minimizar apenas nesta aba (memória; não persiste). */
let panelMinimized = false;

function ensureHost(): Root {
  if (!host) {
    host = document.createElement("div");
    host.id = "applyflow-panel-host";
    host.setAttribute("data-applyflow-extension", "true");
    host.style.display = "none";
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    const styleEl = document.createElement("style");
    styleEl.textContent = panelCss;
    shadow.appendChild(styleEl);
    const appMount = document.createElement("div");
    appMount.className = "af-root af-panel-mount";
    Object.assign(appMount.style, {
      height: "100%",
      minHeight: "0",
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box",
    });
    shadow.appendChild(appMount);
    panelAppMount = appMount;
    root = createRoot(appMount);
  }
  if (!root) {
    throw new Error("ApplyFlow: painel não inicializado.");
  }
  return root;
}

function mapPayloadToProps(payload: PanelPayload, profile: CandidateProfile): {
  panelPhase: "waiting" | "modal_empty" | "fields";
  fieldCount: number;
  fields: PanelField[];
  jobText: string;
  jobContext: JobContext;
  profile: CandidateProfile;
  applyProvider?: ApplyProvider;
} {
  if (payload.phase === "waiting") {
    return {
      panelPhase: "waiting",
      fieldCount: 0,
      fields: [],
      jobText: "",
      jobContext: {},
      profile,
    };
  }
  if (payload.phase === "modal_no_fields") {
    return {
      panelPhase: "modal_empty",
      fieldCount: 0,
      fields: [],
      jobText: "",
      jobContext: {},
      profile,
      applyProvider: payload.provider,
    };
  }

  const fields: PanelField[] = payload.labels.map((label) => {
    const classification = classifyLinkedInField(label);
    const suggestion = getSuggestedAnswer(label, profile);
    applyFlowDebugLog("sugestão gerada", {
      label,
      classification: classification.type,
      confidence: suggestion.confidence,
    });
    return { label, classification, suggestion };
  });

  applyFlowDebugLog("painel renderizado", {
    estado: "pronto",
    campos: fields.length,
    provider: payload.provider,
  });

  return {
    panelPhase: "fields",
    fieldCount: fields.length,
    fields,
    jobText: payload.jobText,
    jobContext: payload.jobContext,
    profile,
    applyProvider: payload.provider,
  };
}

async function resolveProfile(): Promise<CandidateProfile> {
  try {
    return await getStoredCandidateProfile();
  } catch (e) {
    applyFlowDebugLog("falha ao ler chrome.storage.local — fallback gustavoProfile", e);
    return gustavoProfile;
  }
}

function resolvePanelLanguage(): "pt" | "en" {
  try {
    const lang = (typeof navigator !== "undefined" && navigator.language) || "en";
    return lang.toLowerCase().startsWith("pt") ? "pt" : "en";
  } catch {
    return "en";
  }
}

async function createPanelAiBundle(profile: CandidateProfile): Promise<PanelAiBundle> {
  const settings = await getApplyFlowSettings();
  const ai = mergeAiSettings(settings.ai);
  let availability: PanelAiBundle["availability"] = "ok";
  if (!ai.enabled) availability = "disabled";
  else if (!ai.apiKey?.trim()) availability = "no_key";

  const language = resolvePanelLanguage();

  const runTask = async (task: AiTextTask, ctx: { questionLabel?: string; visibleQuestionText?: string }) => {
    const fresh = await getApplyFlowSettings();
    const jobTitle =
      lastPayload.phase === "ready" ? lastPayload.jobContext.title : auditJobSnap.jobTitle;
    const companyName =
      lastPayload.phase === "ready" ? lastPayload.jobContext.company : auditJobSnap.companyName;
    const jobTextSlice =
      lastPayload.phase === "ready" && lastPayload.jobText?.trim()
        ? lastPayload.jobText.slice(0, 12_000)
        : undefined;

    return generateAiText({
      settings: fresh,
      profile,
      jobTitle: jobTitle ?? auditJobSnap.jobTitle,
      companyName: companyName ?? auditJobSnap.companyName,
      jobTextSlice,
      task,
      questionLabel: ctx.questionLabel,
      visibleQuestionText: ctx.visibleQuestionText,
      language,
    });
  };

  return { availability, language, runTask };
}

async function splashAuditAndSession(target: AutofillFieldTarget, result: AutofillResult): Promise<void> {
  const blocked =
    !result.ok &&
    (result.blockedBySafetyGate === true || /valor sugerido vazio/i.test(result.reason ?? ""));
  let outcome: "success" | "failed" | "blocked";
  if (result.ok) outcome = "success";
  else if (blocked) outcome = "blocked";
  else outcome = "failed";

  autofillSession = bumpAutofillSession(autofillSession, outcome);

  applyFlowDebugLog("session counters", autofillSession);

  const entryResult: "success" | "failed" | "blocked" = outcome;

  applyFlowDebugLog("autofill audit entry", {
    result: entryResult,
    classificationType: target.classificationType,
    confidence: target.suggestionConfidence ?? "medium",
    campoResolvido: result.resolvedControlKind ?? null,
    motivoLen: result.reason?.length ?? 0,
  });

  try {
    await addAutofillAuditEntry({
      jobTitle: auditJobSnap.jobTitle,
      companyName: auditJobSnap.companyName,
      fieldType: result.resolvedControlKind ?? "unresolved",
      classificationType: target.classificationType,
      confidence: target.suggestionConfidence ?? "medium",
      result: entryResult,
      reason: result.reason?.slice(0, 240),
    });
  } catch (e) {
    applyFlowDebugLog("audit: falha ao gravar", e);
  }
}

async function attemptAutofill(target: AutofillFieldTarget): Promise<AutofillResult> {
  let result: AutofillResult;
  const modal = findEasyApplyModal();

  if (!modal) {
    result = {
      ok: false,
      reason: "Modal Easy Apply não encontrado neste momento (abra o formulário primeiro).",
    };
  } else {
    try {
      result = linkedInEasyApplyAutofill(modal, target);
    } catch (e) {
      applyFlowDebugLog("autofill: exceção", e);
      result = {
        ok: false,
        reason: e instanceof Error ? e.message : "Erro ao preencher.",
      };
    }
  }

  await splashAuditAndSession(target, result);

  /** Re-render rápido para actualizar contadores de sessão. */
  await paintApplyFlowPanel();
  return result;
}

function handleClearSession(): void {
  autofillSession = emptyAutofillSession();
  applyFlowDebugLog("session counters", autofillSession);
  void paintApplyFlowPanel();
}

async function handleTogglePanelDock(): Promise<void> {
  const cur = await getPanelUiPrefs();
  const next: PanelDockSide = cur.dock === "right" ? "left" : "right";
  await savePanelDock(next);
  await paintApplyFlowPanel();
}

function handlePanelMinimize(): void {
  panelMinimized = true;
  void paintApplyFlowPanel();
}

function handlePanelRestore(): void {
  panelMinimized = false;
  void paintApplyFlowPanel();
}

async function paintApplyFlowPanel(): Promise<void> {
  const r = ensureHost();
  const panelPrefs = await getPanelUiPrefs();
  if (host) {
    applyPanelHostLayout(host, panelPrefs.dock, panelMinimized);
    host.style.display = "block";
  }
  if (panelAppMount) {
    if (panelMinimized) {
      Object.assign(panelAppMount.style, {
        height: "auto",
        minHeight: "0",
        display: "block",
        boxSizing: "border-box",
      });
    } else {
      Object.assign(panelAppMount.style, {
        height: "100%",
        minHeight: "0",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      });
    }
  }
  const profile = await resolveProfile();

  let existingApp: ApplyFlowApplication | null = null;
  try {
    if (typeof location !== "undefined") {
      existingApp = await findApplicationByNormalizedJobUrl(location.href);
    }
  } catch {
    /* swallow */
  }

  const historyFp =
    normalizeStoredJobUrl(typeof location !== "undefined" ? location.href : "") ?? "__no_url__";
  const historyAllowSave = historyFp !== "__no_url__";

  function buildApplicationsHistoryDraft() {
    const session = autofillSession;
    if (lastPayload.phase === "ready") {
      return computeJobSnapshotForHistory({
        jobContext: lastPayload.jobContext,
        jobText: lastPayload.jobText,
        profile,
        fieldsDetectedCount: lastPayload.labels.length,
        session,
        locationHref: typeof location !== "undefined" ? location.href : "",
      });
    }
    return computeJobSnapshotForHistory({
      jobContext: {},
      jobText: undefined,
      profile,
      fieldsDetectedCount: 0,
      session,
      locationHref: typeof location !== "undefined" ? location.href : "",
    });
  }

  const panelAi = await createPanelAiBundle(profile);
  const messagingChromeVisible = detectLinkedInMessagingChromeVisible();

  const props = {
    ...mapPayloadToProps(lastPayload, profile),
    attemptAutofill,
    autofillSession,
    onClearAutofillSession: handleClearSession,
    applicationsHistoryFingerprint: historyFp,
    existingApplicationRecord: existingApp,
    buildApplicationsHistoryDraft,
    applicationsHistoryAllowSave: historyAllowSave,
    panelAi,
    panelDock: panelPrefs.dock,
    panelMinimized,
    messagingChromeVisible,
    onToggleDock: () => {
      void handleTogglePanelDock();
    },
    onMinimizePanel: handlePanelMinimize,
    onRestorePanel: handlePanelRestore,
  };
  r.render(createElement(App, props));
}

/** Primeira montagem — estado \"aguardando modal\". */
export async function initApplyFlowPanel(): Promise<void> {
  lastPayload = { phase: "waiting" };
  await paintApplyFlowPanel();
  applyFlowDebugLog("painel inicializado");
}

export async function renderApplyFlowPanel(payload: PanelPayload): Promise<void> {
  lastPayload = payload;
  if (payload.phase === "ready") {
    auditJobSnap = {
      jobTitle: payload.jobContext.title,
      companyName: payload.jobContext.company,
    };
  }
  await paintApplyFlowPanel();
}
