import {
  classifyLinkedInField,
  detectApplyProviderFromModal,
  extractJobContextFromText,
  parseEasyApplyModalFields,
} from "@devflow/applyflow-linkedin";
import { hasValidExtensionContext } from "../runtime/extension-runtime.js";
import { invalidateStoredProfileCache } from "../storage/profile-storage.js";
import { STORAGE_PROFILE_KEY } from "../storage/storage-types.js";
import { applyFlowDebugEnabled, applyFlowDebugLog } from "./applyflow-debug.js";
import {
  debugScanEasyApplyModals,
  findEasyApplyModal,
  findEasyApplyModalWithMeta,
} from "./easy-apply-modal.js";
import { isApplyFlowSupportedLinkedInPage } from "./linkedin-page-guard.js";
import { renderApplyFlowPanel } from "./inject-applyflow-panel.js";

export { findEasyApplyModal, findEasyApplyModalWithMeta, debugScanEasyApplyModals };

const SCAN_DEBOUNCE_MS = 150;

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

export type StartApplyFlowObserverOptions = {
  onDeactivate?: () => void;
};

export function startApplyFlowObserver(options: StartApplyFlowObserverOptions = {}): () => void {
  const { onDeactivate } = options;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const deactivate = () => {
    if (stopped) return;
    stopped = true;
    onDeactivate?.();
  };

  const scan = async (): Promise<void> => {
    if (stopped) return;
    if (!isApplyFlowSupportedLinkedInPage() || !hasValidExtensionContext()) {
      deactivate();
      return;
    }

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

  const scheduleScan = () => {
    if (stopped) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void scan();
    }, SCAN_DEBOUNCE_MS);
  };

  const obs = new MutationObserver(scheduleScan);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  const onPopState = () => scheduleScan();
  const onVisibility = () => scheduleScan();

  window.addEventListener("popstate", onPopState);
  document.addEventListener("visibilitychange", onVisibility);

  const storageListener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (stopped || areaName !== "local" || !(STORAGE_PROFILE_KEY in changes)) return;
    invalidateStoredProfileCache();
    lastSignature = "";
    applyFlowDebugLog("storage: perfil alterado — reavaliar painel");
    scheduleScan();
  };

  try {
    chrome.storage?.onChanged.addListener(storageListener);
  } catch {
    /* ambiente de teste / sem chrome */
  }

  void scan();

  return () => {
    stopped = true;
    if (debounceTimer) clearTimeout(debounceTimer);
    obs.disconnect();
    window.removeEventListener("popstate", onPopState);
    document.removeEventListener("visibilitychange", onVisibility);
    try {
      chrome.storage?.onChanged.removeListener(storageListener);
    } catch {
      /* noop */
    }
  };
}
