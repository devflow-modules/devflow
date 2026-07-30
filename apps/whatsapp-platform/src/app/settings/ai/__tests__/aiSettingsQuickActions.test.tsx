import { describe, expect, it } from "vitest";
import {
  AI_SETTINGS_HEADER_QUICK_LINKS,
  AI_SETTINGS_MAX_HEADER_QUICK_LINKS,
} from "../aiSettingsQuickActions";
import { aiSettingsHref } from "../aiSettingsAnchors";

describe("aiSettingsQuickActions (settings-ai F1)", () => {
  it("expõe no máximo 2 links de quick action no header", () => {
    expect(AI_SETTINGS_HEADER_QUICK_LINKS).toHaveLength(AI_SETTINGS_MAX_HEADER_QUICK_LINKS);
    expect(AI_SETTINGS_HEADER_QUICK_LINKS.length).toBeLessThanOrEqual(2);
  });

  it("mantém Ir para teste e Gerenciar canais", () => {
    const hrefs = AI_SETTINGS_HEADER_QUICK_LINKS.map((l) => l.href);
    const labels = AI_SETTINGS_HEADER_QUICK_LINKS.map((l) => l.label);
    expect(hrefs).toContain(aiSettingsHref("teste"));
    expect(hrefs).toContain("/admin/whatsapp");
    expect(labels).toEqual(["Ir para teste", "Gerenciar canais"]);
  });
});
