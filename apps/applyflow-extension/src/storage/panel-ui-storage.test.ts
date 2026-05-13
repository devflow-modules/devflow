import { beforeEach, describe, expect, it } from "vitest";

import { chromeStorageBag } from "../test/chrome-storage-mock.js";
import { getPanelUiPrefs, savePanelDock, STORAGE_PANEL_UI_KEY } from "./panel-ui-storage.js";

describe("panel-ui-storage", () => {
  beforeEach(() => {
    chromeStorageBag.clear();
  });

  it("sem dados retorna dock direita", async () => {
    const p = await getPanelUiPrefs();
    expect(p.dock).toBe("right");
  });

  it("persiste dock esquerda", async () => {
    await savePanelDock("left");
    expect(chromeStorageBag.get(STORAGE_PANEL_UI_KEY)).toEqual({ version: 1, dock: "left" });
    const p = await getPanelUiPrefs();
    expect(p.dock).toBe("left");
  });

  it("ignora payload inválido e volta ao default", async () => {
    chromeStorageBag.set(STORAGE_PANEL_UI_KEY, { version: 1, dock: "center" } as unknown);
    const p = await getPanelUiPrefs();
    expect(p.dock).toBe("right");
  });
});
