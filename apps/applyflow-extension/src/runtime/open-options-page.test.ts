/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  OPEN_OPTIONS_MESSAGE,
  isValidExtensionUrl,
  openApplyFlowOptions,
  openOptionsPageInExtensionContext,
  openOptionsViaValidatedWindowUrl,
  sendOpenOptionsMessage,
} from "./open-options-page.js";

describe("isValidExtensionUrl", () => {
  it("aceita URL real de extensão", () => {
    expect(isValidExtensionUrl("chrome-extension://abcdefghij/options.html")).toBe(true);
  });

  it("rejeita chrome-extension://invalid/", () => {
    expect(isValidExtensionUrl("chrome-extension://invalid/options.html")).toBe(false);
    expect(isValidExtensionUrl("chrome-extension://invalid/")).toBe(false);
  });

  it("rejeita undefined e URLs não-extension", () => {
    expect(isValidExtensionUrl(undefined)).toBe(false);
    expect(isValidExtensionUrl("https://www.linkedin.com/")).toBe(false);
  });
});

describe("open-options-page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("sendOpenOptionsMessage resolve com resposta do background", async () => {
    const sendMessage = vi.fn((_payload: unknown, cb: (r: unknown) => void) => {
      cb({ ok: true });
    });
    vi.stubGlobal("chrome", {
      runtime: { sendMessage, lastError: undefined },
    } as typeof chrome);

    await expect(sendOpenOptionsMessage(500)).resolves.toEqual({ ok: true });
    expect(sendMessage).toHaveBeenCalledWith({ type: OPEN_OPTIONS_MESSAGE }, expect.any(Function));
  });

  it("sendOpenOptionsMessage termina em timeout sem resposta", async () => {
    vi.useFakeTimers();
    const sendMessage = vi.fn();
    vi.stubGlobal("chrome", {
      runtime: { sendMessage, lastError: undefined },
    } as typeof chrome);

    const pending = sendOpenOptionsMessage(1000);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toBeUndefined();
  });

  it("openOptionsPageInExtensionContext chama openOptionsPage", async () => {
    const openOptionsPage = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("chrome", {
      runtime: { id: "testid", openOptionsPage, getURL: vi.fn() },
      tabs: { create: vi.fn() },
    } as typeof chrome);

    await openOptionsPageInExtensionContext();
    expect(openOptionsPage).toHaveBeenCalledOnce();
  });

  it("openOptionsPageInExtensionContext usa tabs.create com URL válida se openOptionsPage falhar", async () => {
    const url = "chrome-extension://testid/options.html";
    const openOptionsPage = vi.fn().mockRejectedValue(new Error("fail"));
    const tabsCreate = vi.fn().mockResolvedValue({});
    vi.stubGlobal("chrome", {
      runtime: {
        id: "testid",
        openOptionsPage,
        getURL: vi.fn().mockReturnValue(url),
      },
      tabs: { create: tabsCreate },
    } as typeof chrome);

    await openOptionsPageInExtensionContext();
    expect(tabsCreate).toHaveBeenCalledWith({ url });
  });

  it("openOptionsPageInExtensionContext rejeita URL invalid", async () => {
    const openOptionsPage = vi.fn().mockRejectedValue(new Error("fail"));
    vi.stubGlobal("chrome", {
      runtime: {
        id: "testid",
        openOptionsPage,
        getURL: vi.fn().mockReturnValue("chrome-extension://invalid/options.html"),
      },
      tabs: { create: vi.fn() },
    } as typeof chrome);

    await expect(openOptionsPageInExtensionContext()).rejects.toThrow(/Invalid options page URL/i);
  });

  it("openApplyFlowOptions envia mensagem e não abre janela quando background responde ok", async () => {
    const sendMessage = vi.fn((_payload: unknown, cb: (r: unknown) => void) => {
      cb({ ok: true });
    });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    vi.stubGlobal("chrome", {
      runtime: {
        id: "testid",
        sendMessage,
        getURL: vi.fn(),
        lastError: undefined,
      },
    } as typeof chrome);

    await openApplyFlowOptions();
    expect(sendMessage).toHaveBeenCalledOnce();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("openApplyFlowOptions não chama window.open com getURL invalid", async () => {
    const sendMessage = vi.fn((_payload: unknown, cb: (r: unknown) => void) => {
      cb({ ok: false, error: "sw fail" });
    });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("chrome", {
      runtime: {
        id: "testid",
        sendMessage,
        getURL: vi.fn().mockReturnValue("chrome-extension://invalid/options.html"),
        lastError: undefined,
      },
    } as typeof chrome);

    await openApplyFlowOptions();
    expect(openSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("openOptionsViaValidatedWindowUrl abre só URL válida", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    vi.stubGlobal("chrome", {
      runtime: {
        getURL: vi.fn().mockReturnValue("chrome-extension://abc/options.html"),
      },
    } as typeof chrome);

    expect(openOptionsViaValidatedWindowUrl()).toBe(true);
    expect(openSpy).toHaveBeenCalledOnce();

    openSpy.mockClear();
    vi.stubGlobal("chrome", {
      runtime: {
        getURL: vi.fn().mockReturnValue("chrome-extension://invalid/options.html"),
      },
    } as typeof chrome);
    expect(openOptionsViaValidatedWindowUrl()).toBe(false);
    expect(openSpy).not.toHaveBeenCalled();
  });
});
