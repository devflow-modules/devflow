import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createResumeLibraryFromProfile,
  gustavoProfile,
  LEGACY_RESUME_VARIANT_ID,
  parseResumeLibrary,
} from "@devflow/applyflow-core";

import {
  APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY,
  clearPersistedResumeLibrary,
  hydrateResumeLibraryState,
  loadResumeLibrary,
  persistResumeLibrary,
} from "./local-resume-library-storage.js";

type DashboardLocalStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function stubStorage(
  initial?: Record<string, string>,
  localStorageOverrides?: Partial<DashboardLocalStorage>,
): Record<string, string> {
  const storage: Record<string, string> = { ...initial };
  const localStorage: DashboardLocalStorage = {
    getItem: (key: string) => (key in storage ? storage[key]! : null),
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    ...localStorageOverrides,
  };
  vi.stubGlobal("window", { localStorage });
  return storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("local-resume-library-storage", () => {
  it("primeira visita sem chave fica vazia e não persiste um perfil fictício", () => {
    const storage = stubStorage();
    const loaded = loadResumeLibrary();
    expect(loaded.status).toBe("empty");
    expect(loaded.library).toBeNull();
    expect(storage[APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY]).toBeUndefined();
    expect(JSON.stringify(loaded)).not.toMatch(/Gustavo/i);
  });

  it("hydrate expõe library|null — nunca o envelope { library, status } como ResumeLibrary", () => {
    stubStorage();
    const envelope = loadResumeLibrary();
    const state = hydrateResumeLibraryState();
    expect(envelope.status).toBe("empty");
    expect("variants" in envelope).toBe(false);
    expect(state.library).toBeNull();
    expect(state.status).toBe("empty");
    expect(state.library).toBe(envelope.library);
  });

  it("reload preserva duas variantes e o default escolhido", () => {
    const storage = stubStorage();
    const first = createResumeLibraryFromProfile(gustavoProfile, {
      now: new Date("2026-08-14T12:00:00.000Z"),
    });
    persistResumeLibrary({
      ...first,
      variants: [
        ...first.variants,
        {
          ...first.variants[0]!,
          id: "rv_frontend",
          name: "Frontend React/Next.js",
          isDefault: false,
        },
      ],
    });
    const reloaded = loadResumeLibrary();
    expect(reloaded.status).toBe("ok");
    expect(reloaded.library?.variants).toHaveLength(2);
    expect(reloaded.library?.defaultVariantId).toBe(LEGACY_RESUME_VARIANT_ID);
    expect(reloaded.library?.variants.map((variant) => variant.name)).toContain("Frontend React/Next.js");
    clearPersistedResumeLibrary();
    expect(storage[APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY]).toBeUndefined();
  });

  it("migra um CandidateProfile legado do próprio utilizador sem seed fictício extra", () => {
    const storage = stubStorage({
      [APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY]: JSON.stringify(gustavoProfile),
    });
    const loaded = loadResumeLibrary();
    expect(loaded.status).toBe("ok");
    expect(loaded.migrated).toBe(true);
    expect(loaded.library?.variants).toHaveLength(1);
    expect(loaded.library?.variants[0]?.profile.name).toBe(gustavoProfile.name);
    const stored = parseResumeLibrary(JSON.parse(storage[APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY]!));
    expect(stored.ok).toBe(true);
  });

  it("JSON corrompido não reescreve o blob nem apresenta Gustavo", () => {
    const raw = "{not-json";
    const storage = stubStorage({ [APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY]: raw });
    const loaded = loadResumeLibrary();
    expect(loaded.status).toBe("unreadable");
    expect(loaded.library).toBeNull();
    expect(storage[APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY]).toBe(raw);
    expect(JSON.stringify(loaded)).not.toMatch(/Gustavo/i);
  });

  it("falha de gravação não substitui o blob existente", () => {
    const first = createResumeLibraryFromProfile(gustavoProfile, {
      now: new Date("2026-08-14T12:00:00.000Z"),
    });
    const storage = stubStorage(
      {
        [APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY]: JSON.stringify(first),
      },
      {
        setItem: () => {
          throw new Error("quota");
        },
      },
    );
    const result = persistResumeLibrary({
      ...first,
      variants: first.variants.map((variant) => ({ ...variant, name: "Não gravar" })),
    });
    expect(result.ok).toBe(false);
    expect(storage[APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY]).toBe(JSON.stringify(first));
  });

  it("biblioteca inválida existente não é tratada como primeira visita", () => {
    const raw = JSON.stringify({ version: 1, defaultVariantId: "x", variants: [{ id: "x" }] });
    const storage = stubStorage({ [APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY]: raw });
    const loaded = loadResumeLibrary();
    expect(loaded.status).toBe("unreadable");
    expect(loaded.library).toBeNull();
    expect(storage[APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY]).toBe(raw);
  });
});
