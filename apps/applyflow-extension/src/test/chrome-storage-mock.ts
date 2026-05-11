/** Mapa mutável espelhado por `chrome.storage.local` nos testes. */
export const chromeStorageBag = new Map<string, unknown>();

function normalizeKeys(keys: string | string[] | Record<string, unknown> | null | undefined): string[] {
  if (keys == null) return [...chromeStorageBag.keys()];
  if (typeof keys === "string") return [keys];
  if (Array.isArray(keys)) return keys;
  return Object.keys(keys);
}

/** Instala `globalThis.chrome.storage.local` lendo/escrevendo `chromeStorageBag`. */
export function installChromeStorageLocalMock(): void {
  const local = {
    get: async (keys: string | string[] | Record<string, unknown> | null | undefined) => {
      const out: Record<string, unknown> = {};
      for (const k of normalizeKeys(keys)) {
        if (chromeStorageBag.has(k)) out[k] = chromeStorageBag.get(k);
      }
      return out;
    },
    set: async (items: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(items)) chromeStorageBag.set(k, v);
    },
    remove: async (keys: string | string[]) => {
      for (const k of typeof keys === "string" ? [keys] : keys) chromeStorageBag.delete(k);
    },
  };

  globalThis.chrome = {
    storage: { local },
  } as typeof chrome;
}
