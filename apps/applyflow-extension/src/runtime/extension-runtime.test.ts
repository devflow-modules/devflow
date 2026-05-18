/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  hasValidExtensionContext,
  isValidExtensionUrl,
  safeExtensionUrl,
} from "./extension-runtime.js";

describe("extension-runtime", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("isValidExtensionUrl", () => {
    it("aceita URL real de extensão", () => {
      expect(isValidExtensionUrl("chrome-extension://abcdefghij/options.html")).toBe(true);
    });

    it("rejeita chrome-extension://invalid/", () => {
      expect(isValidExtensionUrl("chrome-extension://invalid/options.html")).toBe(false);
      expect(isValidExtensionUrl("chrome-extension://invalid/")).toBe(false);
    });
  });

  describe("hasValidExtensionContext", () => {
    it("retorna false quando getManifest falha (contexto invalidado)", () => {
      vi.stubGlobal("chrome", {
        runtime: {
          id: "ghost",
          getManifest: vi.fn(() => {
            throw new Error("Extension context invalidated.");
          }),
        },
      } as typeof chrome);
      expect(hasValidExtensionContext()).toBe(false);
    });

    it("retorna true quando getManifest responde", () => {
      vi.stubGlobal("chrome", {
        runtime: {
          id: "abcdefghij",
          getManifest: vi.fn().mockReturnValue({ manifest_version: 3 }),
        },
      } as typeof chrome);
      expect(hasValidExtensionContext()).toBe(true);
    });
  });

  describe("safeExtensionUrl", () => {
    it("não devolve path quando contexto é invalid", () => {
      vi.stubGlobal("chrome", {
        runtime: {
          id: "ghost",
          getManifest: vi.fn(() => {
            throw new Error("Extension context invalidated.");
          }),
          getURL: vi.fn().mockReturnValue("chrome-extension://invalid/options.html"),
        },
      } as typeof chrome);
      expect(safeExtensionUrl("options.html")).toBeUndefined();
    });

    it("devolve URL válida quando contexto é válido", () => {
      const url = "chrome-extension://abcdefghij/options.html";
      vi.stubGlobal("chrome", {
        runtime: {
          id: "abcdefghij",
          getManifest: vi.fn().mockReturnValue({ manifest_version: 3 }),
          getURL: vi.fn().mockReturnValue(url),
        },
      } as typeof chrome);
      expect(safeExtensionUrl("options.html")).toBe(url);
    });
  });
});
