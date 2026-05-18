/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  OPEN_OPTIONS_MESSAGE,
  openApplyFlowOptions,
  openOptionsPageInExtensionContext,
} from "./open-options-page.js";

describe("open-options-page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("openOptionsPageInExtensionContext chama chrome.runtime.openOptionsPage", async () => {
    const openOptionsPage = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("chrome", {
      runtime: { openOptionsPage, getURL: vi.fn() },
      tabs: { create: vi.fn() },
    } as typeof chrome);

    await openOptionsPageInExtensionContext();
    expect(openOptionsPage).toHaveBeenCalledOnce();
  });

  it("openApplyFlowOptions delega ao service worker via sendMessage", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ ok: true });
    const openOptionsPage = vi.fn();
    vi.stubGlobal("chrome", {
      runtime: { sendMessage, openOptionsPage, getURL: vi.fn() },
    } as typeof chrome);

    await openApplyFlowOptions();
    expect(sendMessage).toHaveBeenCalledWith({ type: OPEN_OPTIONS_MESSAGE });
    expect(openOptionsPage).not.toHaveBeenCalled();
  });

  it("openApplyFlowOptions usa window.open com getURL se sendMessage falhar", async () => {
    const url = "chrome-extension://test/options.html";
    const sendMessage = vi.fn().mockRejectedValue(new Error("no sw"));
    const openOptionsPage = vi.fn().mockRejectedValue(new Error("not allowed"));
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage,
        openOptionsPage,
        getURL: vi.fn().mockReturnValue(url),
      },
    } as typeof chrome);

    await openApplyFlowOptions();
    expect(openSpy).toHaveBeenCalledWith(url, "_blank", "noopener,noreferrer");
  });
});
