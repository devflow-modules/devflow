import {
  classifyLinkedInField,
  extractJobContextFromText,
  parseEasyApplyModalFields,
} from "@devflow/applyflow-linkedin";
import { invalidateStoredProfileCache } from "../storage/profile-storage.js";
import { STORAGE_PROFILE_KEY } from "../storage/storage-types.js";
import { applyFlowDebugLog } from "./applyflow-debug.js";
import { findEasyApplyModal } from "./easy-apply-modal.js";
import { renderApplyFlowPanel } from "./inject-applyflow-panel.js";

export { findEasyApplyModal };

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
    const modal = findEasyApplyModal();
    if (!modal) {
      lastSignature = "";
      await renderApplyFlowPanel({ phase: "waiting" });
      applyFlowDebugLog("modal não encontrado");
      return;
    }

    applyFlowDebugLog("modal detectado");

    const labels = parseEasyApplyModalFields(modal);
    applyFlowDebugLog("campos parseados", { total: labels.length, labels });

    labels.forEach((label) => {
      const classification = classifyLinkedInField(label);
      if (classification.type === "unknown") {
        applyFlowDebugLog("campo desconhecido", { label });
      }
    });

    const sig = labels.join("|");
    if (!labels.length) {
      lastSignature = "";
      await renderApplyFlowPanel({ phase: "modal_no_fields" });
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
