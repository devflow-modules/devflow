import {
  classifyLinkedInField,
  detectApplyProviderFromModal,
  extractJobContextFromText,
  parseEasyApplyModalFields,
} from "@devflow/applyflow-linkedin";
import { invalidateStoredProfileCache } from "../storage/profile-storage.js";
import { STORAGE_PROFILE_KEY } from "../storage/storage-types.js";
import { applyFlowDebugEnabled, applyFlowDebugLog } from "./applyflow-debug.js";
import {
  debugScanEasyApplyModals,
  findEasyApplyModal,
  findEasyApplyModalWithMeta,
} from "./easy-apply-modal.js";
import { renderApplyFlowPanel } from "./inject-applyflow-panel.js";

export { findEasyApplyModal, findEasyApplyModalWithMeta, debugScanEasyApplyModals };

function truncateDebugLabel(label: string, max = 80): string {
  const t = label.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function scrapeJobPageText(): string {
  const candidates = [
    ".jobs-description-content__text",
    ".jobs-details-top-card",
    ".job-details-jobs-unified-top-card__container",
    ".jobs-unified-top-card__job-title",
  ];
  const parts: string[] = [];
  for (const sel of candidates) {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      const t = el.innerText?.trim();
      if (t) parts.push(t);
    });
  }
  return parts.join("\n\n").trim();
}

let lastSignature = "";

export function startApplyFlowObserver(): void {
  const scan = async (): Promise<void> => {
    const meta = findEasyApplyModalWithMeta();
    const modal = meta.modal;
    if (!modal) {
      lastSignature = "";
      await renderApplyFlowPanel({ phase: "waiting" });
      if (applyFlowDebugEnabled()) {
        applyFlowDebugLog("modal não encontrado", { via: meta.via, scan: debugScanEasyApplyModals() });
      } else {
        applyFlowDebugLog("modal não encontrado");
      }
      return;
    }

    const providerDet = detectApplyProviderFromModal(modal);

    if (applyFlowDebugEnabled()) {
      applyFlowDebugLog("modal detectado", {
        via: meta.via,
        hintSelector: meta.hintSelector,
        scan: debugScanEasyApplyModals(),
        provider: providerDet.provider,
        providerReason: providerDet.reason,
      });
    } else {
      applyFlowDebugLog("modal detectado");
    }

    const labels = parseEasyApplyModalFields(modal);
    if (applyFlowDebugEnabled()) {
      applyFlowDebugLog("campos parseados", {
        total: labels.length,
        provider: providerDet.provider,
        providerReason: providerDet.reason,
        via: meta.via,
        hintSelector: meta.hintSelector,
        labelsPreview: labels.map(truncateDebugLabel),
        fieldTypes: labels.map((label) => classifyLinkedInField(label).type),
      });
    } else {
      applyFlowDebugLog("campos parseados", { total: labels.length });
    }

    labels.forEach((label) => {
      const classification = classifyLinkedInField(label);
      if (classification.type === "unknown") {
        applyFlowDebugLog("campo desconhecido", { label: truncateDebugLabel(label) });
      }
    });

    const sig = `${providerDet.provider}\u241e${labels.join("|")}`;
    if (!labels.length) {
      lastSignature = "";
      await renderApplyFlowPanel({
        phase: "modal_no_fields",
        provider: providerDet.provider,
        providerReason: providerDet.reason,
        via: meta.via,
        hintSelector: meta.hintSelector,
      });
      applyFlowDebugLog("painel atualizado — sem campos neste step");
      return;
    }

    if (sig === lastSignature) {
      return;
    }
    lastSignature = sig;

    const jobText = scrapeJobPageText();
    const jobContext = extractJobContextFromText(jobText);

    await renderApplyFlowPanel({
      phase: "ready",
      provider: providerDet.provider,
      providerReason: providerDet.reason,
      via: meta.via,
      hintSelector: meta.hintSelector,
      labels,
      jobText,
      jobContext,
    });
    applyFlowDebugLog("painel atualizado — pronto para revisão");
  };

  const obs = new MutationObserver(() => {
    void scan();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("popstate", () => {
    void scan();
  });
  document.addEventListener("visibilitychange", () => {
    void scan();
  });

  try {
    chrome.storage?.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !(STORAGE_PROFILE_KEY in changes)) return;
      invalidateStoredProfileCache();
      lastSignature = "";
      applyFlowDebugLog("storage: perfil alterado — reavaliar painel");
      void scan();
    });
  } catch {
    /* ambiente de teste / sem chrome */
  }

  void scan();
}
