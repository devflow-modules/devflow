import { describe, expect, it, vi } from "vitest";

import { gustavoProfile, LEGACY_RESUME_VARIANT_ID, parseResumeLibrary } from "@devflow/applyflow-core";

import {
  APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY,
  clearPersistedResumeLibrary,
  loadResumeLibrary,
  persistResumeLibrary,
} from "./local-resume-library-storage.js";

function stubStorage(initial?: Record<string, string>) {
  const storage: Record<string, string> = { ...initial };
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => (k in storage ? storage[k]! : null),
      setItem: (k: string, v: string) => {
        storage[k] = v;
      },
      removeItem: (k: string) => {
        delete storage[k];
      },
    },
  } as Window & typeof globalThis);
  return storage;
}

describe("local-resume-library-storage", () => {
  it("migra ausência de chave para Perfil principal e persiste", () => {
    const storage = stubStorage();
    const library = loadResumeLibrary();
    expect(library.variants).toHaveLength(1);
    expect(library.defaultVariantId).toBe(LEGACY_RESUME_VARIANT_ID);
    expect(library.variants[0]?.profile).toEqual(gustavoProfile);
    const stored = parseResumeLibrary(JSON.parse(storage[APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY]!));
    expect(stored.ok).toBe(true);
  });

  it("reload preserva duas variantes e o default escolhido", () => {
    const storage = stubStorage();
    const first = loadResumeLibrary();
    const next = {
      ...first,
      defaultVariantId: first.defaultVariantId,
      variants: [
        ...first.variants,
        {
          ...first.variants[0]!,
          id: "rv_frontend",
          name: "Frontend React/Next.js",
          isDefault: false,
        },
      ],
    };
    persistResumeLibrary(next);
    const reloaded = loadResumeLibrary();
    expect(reloaded.variants).toHaveLength(2);
    expect(reloaded.defaultVariantId).toBe(LEGACY_RESUME_VARIANT_ID);
    expect(reloaded.variants.map((variant) => variant.name)).toContain("Frontend React/Next.js");
    clearPersistedResumeLibrary();
    expect(storage[APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY]).toBeUndefined();
  });

  it("dados corrompidos não rebentam o load", () => {
    stubStorage({ [APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY]: "{not-json" });
    const library = loadResumeLibrary();
    expect(library.variants).toHaveLength(1);
    expect(library.defaultVariantId).toBe(LEGACY_RESUME_VARIANT_ID);
  });
});
