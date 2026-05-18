/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./inject-applyflow-panel.js", () => ({
  initApplyFlowPanel: vi.fn(),
  teardownApplyFlowPanel: vi.fn(),
}));

vi.mock("./linkedin-easy-apply-detector.js", () => ({
  startApplyFlowObserver: vi.fn(() => vi.fn()),
}));

import { initApplyFlowPanel, teardownApplyFlowPanel } from "./inject-applyflow-panel.js";
import {
  shouldActivateApplyFlowOnPage,
  startApplyFlowContentScript,
  stopApplyFlowContentScript,
  syncApplyFlowContentScript,
} from "./content-bootstrap.js";
import { startApplyFlowObserver } from "./linkedin-easy-apply-detector.js";

describe("content-bootstrap", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    stopApplyFlowContentScript();
    vi.clearAllMocks();
  });

  it("shouldActivateApplyFlowOnPage é false em /notifications", () => {
    vi.stubGlobal("chrome", {
      runtime: {
        id: "abcdefghij",
        getManifest: vi.fn().mockReturnValue({ manifest_version: 3 }),
      },
    } as typeof chrome);

    expect(
      shouldActivateApplyFlowOnPage("https://www.linkedin.com/notifications/?filter=all"),
    ).toBe(false);
  });

  it("syncApplyFlowContentScript não inicia painel em /notifications", () => {
    vi.stubGlobal("chrome", {
      runtime: {
        id: "abcdefghij",
        getManifest: vi.fn().mockReturnValue({ manifest_version: 3 }),
      },
    } as typeof chrome);

    syncApplyFlowContentScript("https://www.linkedin.com/notifications/?filter=all");
    expect(initApplyFlowPanel).not.toHaveBeenCalled();
    expect(startApplyFlowObserver).not.toHaveBeenCalled();
  });

  it("syncApplyFlowContentScript inicia em /jobs/view", () => {
    vi.stubGlobal("chrome", {
      runtime: {
        id: "abcdefghij",
        getManifest: vi.fn().mockReturnValue({ manifest_version: 3 }),
      },
    } as typeof chrome);

    syncApplyFlowContentScript("https://www.linkedin.com/jobs/view/1/");
    expect(initApplyFlowPanel).toHaveBeenCalledOnce();
    expect(startApplyFlowObserver).toHaveBeenCalledOnce();
  });

  it("stopApplyFlowContentScript desmonta painel e observer", () => {
    vi.stubGlobal("chrome", {
      runtime: {
        id: "abcdefghij",
        getManifest: vi.fn().mockReturnValue({ manifest_version: 3 }),
      },
    } as typeof chrome);

    startApplyFlowContentScript("https://www.linkedin.com/jobs/view/1/");
    stopApplyFlowContentScript();
    expect(teardownApplyFlowPanel).toHaveBeenCalledOnce();
  });
});
