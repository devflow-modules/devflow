/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  OPEN_OPTIONS_MESSAGE,
  openApplyFlowOptions,
  openOptionsPageInExtensionContext,
  openOptionsViaExtensionTab,
  sendOpenOptionsMessage,
} from "./open-options-page.js";

function stubValidExtensionContext(
  overrides: Partial<{
    sendMessage: typeof chrome.runtime.sendMessage;
    openOptionsPage: typeof chrome.runtime.openOptionsPage;
    getURL: typeof chrome.runtime.getURL;
    tabsCreate: typeof chrome.tabs.create;
  }> = {},
) {
  const optionsUrl = "chrome-extension://abcdefghij/options.html";
  vi.stubGlobal("chrome", {
    runtime: {
      id: "abcdefghij",
      sendMessage: overrides.sendMessage,
      openOptionsPage: overrides.openOptionsPage,
      getManifest: vi.fn().mockReturnValue({ manifest_version: 3 }),
      getURL: overrides.getURL ?? vi.fn().mockReturnValue(optionsUrl),
      lastError: undefined,
    },
    tabs: { create: overrides.tabsCreate ?? vi.fn() },
  } as typeof chrome);
}

describe("open-options-page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("sendOpenOptionsMessage resolve com resposta do background", async () => {
    stubValidExtensionContext({
      sendMessage: vi.fn((_payload: unknown, cb: (r: unknown) => void) => {
        cb({ ok: true });
      }),
    });

    await expect(sendOpenOptionsMessage(500)).resolves.toEqual({ ok: true });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: OPEN_OPTIONS_MESSAGE },
      expect.any(Function),
    );
  });

  it("sendOpenOptionsMessage ignora lastError quando há resposta ok", async () => {
    stubValidExtensionContext({
      sendMessage: vi.fn((_payload: unknown, cb: (r: unknown) => void) => {
        Object.assign(chrome.runtime, { lastError: { message: "port closed" } });
        cb({ ok: true });
      }),
    });

    await expect(sendOpenOptionsMessage(500)).resolves.toEqual({ ok: true });
  });

  it("sendOpenOptionsMessage termina em timeout sem resposta", async () => {
    vi.useFakeTimers();
    stubValidExtensionContext({ sendMessage: vi.fn() });

    const pending = sendOpenOptionsMessage(1000);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toBeUndefined();
  });

  it("openOptionsPageInExtensionContext chama openOptionsPage", async () => {
    const openOptionsPage = vi.fn().mockResolvedValue(undefined);
    stubValidExtensionContext({ openOptionsPage });

    await openOptionsPageInExtensionContext();
    expect(openOptionsPage).toHaveBeenCalledOnce();
  });

  it("openOptionsPageInExtensionContext usa tabs.create com URL válida se openOptionsPage falhar", async () => {
    const tabsCreate = vi.fn().mockResolvedValue({});
    stubValidExtensionContext({
      openOptionsPage: vi.fn().mockRejectedValue(new Error("fail")),
      tabsCreate,
    });

    await openOptionsPageInExtensionContext();
    expect(tabsCreate).toHaveBeenCalledWith({
      url: "chrome-extension://abcdefghij/options.html",
    });
  });

  it("openOptionsViaExtensionTab não cria tab com URL invalid", async () => {
    const tabsCreate = vi.fn().mockResolvedValue({});
    vi.stubGlobal("chrome", {
      runtime: {
        id: "ghost",
        getManifest: vi.fn().mockReturnValue({ manifest_version: 3 }),
        getURL: vi.fn().mockReturnValue("chrome-extension://invalid/options.html"),
      },
      tabs: { create: tabsCreate },
    } as typeof chrome);

    await expect(openOptionsViaExtensionTab()).resolves.toBe(false);
    expect(tabsCreate).not.toHaveBeenCalled();
  });

  it("openApplyFlowOptions envia mensagem e não chama getURL no content script", async () => {
    const sendMessage = vi.fn((_payload: unknown, cb: (r: unknown) => void) => {
      cb({ ok: true });
    });
    const getURL = vi.fn();
    stubValidExtensionContext({ sendMessage, getURL });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await openApplyFlowOptions();
    expect(sendMessage).toHaveBeenCalledOnce();
    expect(getURL).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("openApplyFlowOptions não chama getURL com contexto invalid", async () => {
    const getURL = vi.fn().mockReturnValue("chrome-extension://invalid/options.html");
    vi.stubGlobal("chrome", {
      runtime: {
        id: "ghost",
        getURL,
        sendMessage: vi.fn(),
        getManifest: vi.fn(() => {
          throw new Error("Extension context invalidated.");
        }),
      },
    } as typeof chrome);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await openApplyFlowOptions();
    expect(getURL).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("openApplyFlowOptions avisa uma vez se o service worker não responder", async () => {
    stubValidExtensionContext({ sendMessage: vi.fn() });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await openApplyFlowOptions();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
