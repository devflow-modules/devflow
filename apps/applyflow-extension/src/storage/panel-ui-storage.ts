export const STORAGE_PANEL_UI_KEY = "APPLYFLOW_PANEL_UI_V1" as const;

export type PanelDockSide = "left" | "right";

export type PanelUiPrefsV1 = {
  version: 1;
  dock: PanelDockSide;
};

const DEFAULT_PREFS: PanelUiPrefsV1 = { version: 1, dock: "right" };

function isDock(v: unknown): v is PanelDockSide {
  return v === "left" || v === "right";
}

export async function getPanelUiPrefs(): Promise<PanelUiPrefsV1> {
  try {
    const bag = await chrome.storage.local.get(STORAGE_PANEL_UI_KEY);
    const raw = bag[STORAGE_PANEL_UI_KEY as keyof typeof bag] as PanelUiPrefsV1 | undefined;
    if (raw?.version === 1 && isDock(raw.dock)) return raw;
  } catch {
    /* chrome indisponível em testes sem mock */
  }
  return DEFAULT_PREFS;
}

export async function savePanelDock(dock: PanelDockSide): Promise<void> {
  const prefs: PanelUiPrefsV1 = { version: 1, dock };
  await chrome.storage.local.set({ [STORAGE_PANEL_UI_KEY]: prefs });
}
